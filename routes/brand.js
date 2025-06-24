const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Flavour = require('../models/Flavour')
const Brand = require('../models/Brand')
const router = express.Router();

const CryptoJS = require("crypto-js");
const QR_SECRET = "my_super_secret_key"; // Use a strong, secure key

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

router.get('/add/new/brand', (req,res) => {
    res.render('admin/addBrand.ejs')
})

router.post("/add/new/brand",saveRedirectUrl,isLoggedIn,isAdmin, upload.single("file"), async (req, res) => {
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
    const newProduct = new Brand({
     imageUrl
    });
    await newProduct.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/add/new/brand");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

module.exports = router;
