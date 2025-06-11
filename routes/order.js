const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Order = require("../models/Order");
const Product  = require("../models/Product");
const User = require("../models/User")

const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { error } = require("console");

const {
  isLoggedIn,
  saveRedirectUrl,
  isAdmin,
  ensureAuthenticated,
} = require("../middlewares/login.js");

cloudinary.config({
    cloud_name:process.env.cloud_name, 
    api_key:process.env.api_key, 
    api_secret:process.env.api_secret
});

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to 'uploads/' folder
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, Date.now() + path.extname(file.originalname));
  }
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
      throw new Error('Upload failed: ' + error.message);
    }
  }
};

router.get("/my/orders",isLoggedIn, async (req, res) => {
    try {
        const userId = req.user._id; // Assuming authentication is implemented

        const orders = await Order.find({ user: userId })
            .populate("products.product") // Populate product details
            .sort({ createdAt: -1 });
        res.render("myOrders.ejs", { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.render("my-orders", { orders: [] });
    }
});

router.get("/get/receipt/:id",isLoggedIn, async (req, res) => {
  try {
      const userId = req.user._id; // Assuming authentication is implemented
      const orderId = req.params.id;
      const order = await Order.findById(orderId)
          .populate("products.product") // Populate product details
          .sort({ createdAt: -1 });    
      res.render("productReceipt.ejs", { order });
  } catch (error) {
      console.error("Error fetching orders:", error);
      res.render("my-orders", { orders: [] });
  }
});

 
  module.exports = router;