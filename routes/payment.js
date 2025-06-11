const express = require("express");
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order')

// const razorpay = new Razorpay({
//   key_id: process.env.rzp_key_id,
//   key_secret: process.env.rzp_key_secret,
// });

// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     return next();
//   }
//   res.redirect('/user/login');
// }

// function isAdmin(req, res, next) {
//   if (req.isAuthenticated() && req.user.role === 'admin') {
//     return next();
//   }
//   res.render("./error/accessdenied.ejs");
// }

// const checkPurchasedBatch = (req, res, next) => {
//   const { id } = req.params;
//   if (req.user.purchasedBatches.includes(id) || req.user.role === 'admin') {
//     return next();
//   } else {
//     return res.status(403).send('Access denied: You have not purchased this batch.');
//   }
// };

// // Route to show all batches


// // Create Razorpay order on server-side
// router.post('/create-order', async (req, res) => {
//     const { productId } = req.body;
//     // Fetch the selected product from the database
//     const product = await Product.findById(productId);
//     // Check if the product exists
//     if (!product) {
//         return res.status(404).json({ error: 'Product not found' });
//     }
//     const options = {
//         amount: product.price * 100, // Convert amount to paise (e.g., 500 INR = 50000 paise)
//         currency: 'INR',
//         receipt: `receipt_${Math.floor(Math.random() * 1000000)}`,
//     };
//     try {
//         const order = await razorpay.orders.create(options);
//         res.json({ orderId: order.id, amount: product.price, productId });
//     } catch (error) {
//         console.error('Error creating Razorpay order:', error);
//         res.status(500).send(error);
//     }
// });

// //verifypayment
// router.post('/verify-payment', ensureAuthenticated, async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature, productId, email, amount } = req.body;
//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       console.log("❌ Missing payment data");
//       return res.status(400).json({ success: false, message: "Invalid payment data" });
//   }
//   // Verify Razorpay Signature
//   const generated_signature = crypto.createHmac('sha256', process.env.rzp_key_secret)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest('hex');
//   if (generated_signature !== razorpay_signature) {
//       console.log("❌ Signature Mismatch!");
//       return res.status(400).json({ success: false, message: "Invalid payment signature" });
//   }
//   try {
//       const newOrder = new Order({
//           user: req.user.id,
//           products: [{ product: productId, quantity: 1 }],
//           totalAmount: amount,
//           paymentStatus: "paid"
//       });

//       await newOrder.save();
//       res.json({ success: true, message: "Payment verified and order placed!" });
//   } catch (error) {
//       console.error("❌ Error saving order:", error);
//       res.status(500).json({ success: false, message: "Failed to process order" });
//   }
// });

// router.get("/my/order-success", (req,res)=>{
//   res.render('orderPlaced.ejs');
// })

module.exports = router;