const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Cart = require("../models/Cart"); // Your Cart model
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Flavour = require("../models/Flavour");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const {
  isLoggedIn,
  saveRedirectUrl,
  isAdmin,
  ensureAuthenticated,
  hasAddress,
} = require("../middlewares/login.js");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.rzp_key_id,
  key_secret: process.env.rzp_key_secret,
});

router.use(express.json());

router.get("/my/cart", saveRedirectUrl, isLoggedIn, hasAddress, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.render("cart.ejs", {
        cart: { items: [], deliveryCharges: 0 },
        subTotal: 0,
        totalAmount: 0,
        keyId: process.env.rzp_key_id,
        currUser: req.user,
      });
    }

    cart.deliveryCharges = cart.subTotal > 1000 ? 0 : 80;
    cart.totalCharges = cart.subTotal + cart.deliveryCharges;
    await cart.save();

    res.render("cart.ejs", {
      cart,
      subTotal: cart.subTotal,
      totalAmount: cart.totalCharges,
      keyId: process.env.rzp_key_id,
      currUser: req.user,
    });

  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



// add to cart
router.post("/add/to/cart", saveRedirectUrl, isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, flavour, size, price, quantity } = req.body;

    // Check if flavour exists for the product
    const flavourDoc = await Flavour.findOne({ productId, flavour });

    if (!flavourDoc) {
      return res.status(404).json({ success: false, message: "Flavour not found for this product." });
    }

    // Validate selected size
    const selectedSize = flavourDoc.sizes.find(s => s.size === size);
    if (!selectedSize) {
      return res.status(400).json({ success: false, message: "Selected size is not available." });
    }

    // Convert quantity to number
    const qty = parseInt(quantity);

    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: "Invalid quantity." });
    }

    let cart = await Cart.findOne({ user: userId });

    const newItem = {
      product: productId,
      price: Number(price),
      size,
      flavour,
      quantity: qty
    };

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [newItem],
        deliveryCharges: 50,
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        item =>
          item.product.toString() === productId &&
          item.size === size &&
          item.flavour === flavour
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += qty;
      } else {
        cart.items.push(newItem);
      }
    }

    await cart.save();
    return res.status(200).json({ success: true, message: "Item added to cart!", cart });

  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


router.get("/this/product/:id",saveRedirectUrl, isLoggedIn, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const reviews = await Review.find({ product: req.params.id })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    let relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: req.params.id },
    });
    relatedProducts = await Promise.all(
      relatedProducts.map(async (prod) => {
        const review = await Review.find({ product: prod._id });
        prod = prod.toObject(); // Convert Mongoose document to plain object
        prod.avgRating =
          review.length > 0
            ? review.reduce((sum, r) => sum + r.rating, 0) / review.length
            : 0;
        return prod;
      })
    );
    relatedProducts.sort((a, b) => {
      if (b.avgRating === a.avgRating) {
        return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
      }
      return b.avgRating - a.avgRating; // Highest rating first
    });
    relatedProducts = relatedProducts.slice(0, 4);
    res.render("thisProduct.ejs", {
      product,
      reviews,
      relatedProducts,
    });
  } catch (err) {
    console.error("Error fetching product: ", err);
    res.status(500).send("Server error");
  }
});

//edit cart
router.post("/update-quantity",saveRedirectUrl, isLoggedIn, async (req, res) => {
  try {
    const { userId, productId, change } = req.body;
    if (!userId || !productId || change === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    let cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in cart" });
    cart.items[itemIndex].quantity += change;
    if (cart.items[itemIndex].quantity <= 0) {
      cart.items.splice(itemIndex, 1); // Remove item if quantity is 0
    }
    await cart.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// 🗑 Remove item from cart
router.delete("/delete/this/product", isLoggedIn, async (req, res) => {
  const userId = req.user;
  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.body.id
    );
    await cart.save();
    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
});

// 🔥 Create Razorpay Order
router.post("/cart/create-order", isLoggedIn, async (req, res) => {
  const { userId } = req.body;
  try {
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });
    const totalAmount = cart.deliveryCharges + cart.subTotal
    const options = {
      amount: totalAmount * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: `receipt_${Math.random().toString(36).substr(2, 9)}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: totalAmount });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Error creating order", error });
  }
});

router.post("/cart/verify-payment", isLoggedIn, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
    } = req.body;
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userId
    ) {
      return res
        .status(400)
        .json({ message: "Missing required payment details" });
    }
    const generatedSignature = crypto
      .createHmac("sha256", process.env.rzp_key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const cart = await Cart.findOne({ user: userObjectId }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart not found or is empty" });
    }
    const userAdd = await User.findById(userId);
    const userAddress = userAdd.address;
    const newOrder = new Order({
      user: userObjectId,
      products: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        size: item.size,
        price: item.price,
        flavour:item.flavour
      })),
      subTotal: cart.subTotal,
      deliveryCharges: cart.deliveryCharges,
      totalAmount: cart.deliveryCharges + cart.subTotal,
      paymentStatus: "paid",
      status: "pending",
      address: userAddress
    });
    await newOrder.save();
    await Cart.deleteOne({ user: userObjectId });
    res.json({ message: "Payment successful! Order placed.", order: newOrder });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment", error });
  }
});

//cash on delivery
router.get("/cart/cod",saveRedirectUrl, isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const generatedSignature = crypto
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const cart = await Cart.findOne({ user: userObjectId }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart not found or is empty" });
    }
    const userAdd = await User.findById(userId);
    const userAddress = userAdd.address;
    const newOrder = new Order({
      user: userObjectId,
      products: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        size: item.size,
        price: item.price,
        flavour:item.flavour
      })),
      subTotal: cart.subTotal,
      deliveryCharges: cart.deliveryCharges,
      totalAmount: cart.deliveryCharges + cart.subTotal,
      paymentStatus: "paid",
      status: "pending",
      address: userAddress
    });
    await newOrder.save();
    await Cart.deleteOne({ user: userObjectId });
    res.redirect('/my/order-success')
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment", error });
  }
});

router.get("/my/order-success", isLoggedIn, (req, res) => {
  res.render("orderPlaced.ejs");
});



//get delivery charges
router.get("/get/delivery/charges", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      res.json({ message: "no cart found" });
    }
    res.json({ charge: cart.deliveryCharges });
  } catch (error) {
    console.log(error);
  }
});

//update delivery charges of cart
router.get("/update/cart", isLoggedIn, async (req, res) => {
  const userId = req.user._id;
  try {
    const updatedCart = await Cart.findOneAndUpdate(
      { user: userId }, // Filter by user ID
      { deliveryCharges: 80 }, // Update delivery charges
      { new: true } // Return the updated document
    );
    if (!updatedCart) {
      console.log("Cart not found for this user.");
    }
    console.log("Updated Cart:", updatedCart);
    // return updatedCart;
  } catch (error) {
    console.error("Error updating delivery charges:", error);
    throw error;
  }
});

module.exports = router;
