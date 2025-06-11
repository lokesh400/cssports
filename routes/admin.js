const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const router = express.Router();

const CryptoJS = require("crypto-js");
const QR_SECRET = "my_super_secret_key"; // Use a strong, secure key

// Encrypt the order ID
function encryptOrderId(orderId) {
  return CryptoJS.AES.encrypt(orderId, QR_SECRET).toString();
}

// Decrypt the order ID
function decryptOrderId(encryptedOrderId) {
  const bytes = CryptoJS.AES.decrypt(encryptedOrderId, QR_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}

const {
  isLoggedIn,
  saveRedirectUrl,
  isAdmin,
  ensureAuthenticated,
} = require("../middlewares/login.js");

const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { error } = require("console");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to 'uploads/' folder
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Initialize multer with diskStorage
const upload = multer({ storage: storage });

// Function to upload files to Cloudinary
const Upload = {
  uploadFile: async (filePath) => {
    try {
      // Upload the file to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto", // Auto-detect file type (image, video, etc.)
      });
      return result;
    } catch (error) {
      throw new Error("Upload failed: " + error.message);
    }
  },
};


router.get("/admin",isLoggedIn,isAdmin, async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .populate("products.product")
    .sort({ createdAt: -1 });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const todayOrders = await Order.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }, // Filter today's orders
        paymentStatus: "paid", // Only include paid orders
      },
    },
    {
      $group: {
        _id: null, // No grouping by specific field
        totalSales: { $sum: "$totalAmount" }, // Sum the totalAmount field
      },
    },
  ]);
  const todaySales = result.length > 0 ? result[0].totalSales : 0;
  const result2 = await Order.aggregate([
    {
      $match: { paymentStatus: "paid" }, // Only include paid orders
    },
    {
      $group: {
        _id: null, // No grouping by specific field
        totalSales: { $sum: "$totalAmount" }, // Sum the totalAmount field
      },
    },
  ]);
  const totalSales = result2.length > 0 ? result2[0].totalSales : 0;
  const pendingOrders = await Order.find({ status: "pending" });
  res.render("admin/adminIndex.ejs", {
    todayOrders,
    todaySales,
    totalSales,
    totalOrders: orders.length,
    pending: pendingOrders.length,
  });
});



// Fetch all orders and send encrypted QR codes
router.get("/admin/orders",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("user");
    const encryptedOrders = orders.map((order) => ({
      ...order.toObject(),
      encryptedId: encryptOrderId(order._id.toString()),
    }));
    res.render("admin/admin-orders", { orders: encryptedOrders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders.");
  }
});

// Update status of orders to 'printed'
router.post("/admin/print/orders/mark-printed",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: "No order IDs provided." });
    }

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: "printed" } }
    );

    res.json({ success: true, message: "Orders marked as printed." });
  } catch (error) {
    console.error("Error updating orders:", error);
    res.status(500).json({ success: false, message: "Failed to update orders." });
  }
});

router.post("/admin/orders/update-status/:id",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    await Order.findByIdAndUpdate(orderId, { status });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.json({ success: false });
  }
});

router.get("/order/details/:orderId", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("products.product"); // Fetch order details

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/order-details", { order }); // Render EJS file with order details
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Fetch and decrypt order details
router.get("/order/details/:encryptedId",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const { encryptedId } = req.params;
    const decryptedOrderId = decryptOrderId(encryptedId);
    const order = await Order.findById(decryptedOrderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }
    res.render("order-details", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("Error retrieving order details.");
  }
});

// Render the QR scanner page
router.get("/admin/scan/order",isLoggedIn,isAdmin, (req, res) => {
  res.render("admin/scan-qr.ejs");
});


router.get("/admin/orders/count",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const pending = await Order.countDocuments({ status: "pending" });
    const packed = await Order.countDocuments({ status: "packed" });
    const shipped = await Order.countDocuments({ status: "shipped" });
    const delivered = await Order.countDocuments({ status: "delivered" });

    res.json({ pending, packed, shipped, delivered });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/order-details/:orderId",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.orderId, { status });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: "Error updating order status." });
  }
});

//admin to show all costumers
router.get("/admin/all/costumers",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const costumers = await User.find({ role: "customer" });
    console.log(costumers);
    res.render("admin/allCostumers.ejs", { customers: costumers });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//all pending orders
router.get("/admin/all/pending/orders",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" });
    res.render("admin/pendingOrders.ejs", { orders });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//today's orders
//all pending orders
router.get("/admin/all/todays/orders",isLoggedIn,isAdmin, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    res.render("admin/todayOrders.ejs", { orders });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//admin product
// // Edit a product
router.get("/admin/update/product/:id",isLoggedIn,isAdmin, async (req, res) => {
  const {id} = req.params; 
  const product = await Product.findById(req.params.id);  
  console.log(id)
  res.render("admin/thisProduct.ejs",{product,id});
});

//edit a product
// Update product details
router.put("/admin/update/product/:id",isLoggedIn,isAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    madeFor,
    keywords,
    category,
    stock,
    sizes,
    coverPhoto,
    images,
  } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.madeFor = madeFor || product.madeFor;
    product.keywords = keywords ? keywords.split(",") : product.keywords;
    product.category = category || product.category;
    product.stock = stock || product.stock;
    product.sizes = sizes ? sizes.split(",") : product.sizes;
    product.coverPhoto = coverPhoto || product.coverPhoto;
    product.images = images || product.images;

    const updatedProduct = await product.save();
    res.status(200).json({ message: "Product updated successfully", updatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//update images 
// Upload images to a specific product
router.get("/upload-images/:id",isLoggedIn,isAdmin, upload.array("images", 5), async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.render('admin/addProductImages.ejs',{id});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.patch("/admin/update-image/:id",isLoggedIn,isAdmin, upload.single("file"), async (req, res) => {
  try {
    const result = await Upload.uploadFile(req.file.path); // Use the path for Cloudinary upload
    const imageUrl = result.secure_url;
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting local file:", err);
      } else {
        console.log("Local file deleted successfully");
      }
    });
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    product.images.push(imageUrl); // Add the new image to the images array
    await product.save();
    res.redirect(`/upload-images/${req.params.id}`);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

// Delete a product
router.post("/admin/delete/:id",isLoggedIn,isAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect("/product/management");
});

// Route to display product form
router.get("/add/new/product",isLoggedIn,isAdmin, (req, res) => {
  res.render("admin/addProduct.ejs"); // Renders views/index.ejs
});

router.post("/add-product",isLoggedIn,isAdmin, upload.single("file"), async (req, res) => {
  try {
    const { name, price, stock, description, category, sizes, madeFor, keywords } = req.body;
    const sizesArray = sizes ? sizes.split(",").map((size) => size.trim()) : [];
    const keywordsArray = keywords ? keywords.split(",").map((keyword) => keyword.trim()) : [];
    const result = await Upload.uploadFile(req.file.path); // Use the path for Cloudinary upload
    const imageUrl = result.secure_url;
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting local file:", err);
      } else {
        console.log("Local file deleted successfully");
      }
    });
    const newProduct = new Product({
      name,
      price,
      stock,
      description,
      category,
      sizes: sizesArray,
      madeFor,
      keywords: keywordsArray,
      coverPhoto: imageUrl,
    });
    await newProduct.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/admin");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

//specific order
router.get("/admin/view/this/product/:id", isLoggedIn,isAdmin, async (req, res) => {
    try {
        const userId = req.user._id; // Assuming authentication is implemented
        const order = await Order.findById(req.params.id)
            .populate("products.product") // Populate product details
            .sort({ createdAt: -1 });
            // console.log(orders.products)
            const orders = [order]
        res.render("admin/thisOrder.ejs", { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.render("my-orders", { orders: [] });
    }
});
module.exports = router;
