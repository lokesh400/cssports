const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Flavour = require('../models/Flavour')
const Brand = require('../models/Brand')
const Category = require('../models/Category')
const router = express.Router();

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

router.post("/add/new/brand",saveRedirectUrl,isLoggedIn,isAdmin, async (req, res) => {
  try {
    const {imageUrl} = req.body;
    
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

router.get('/add/new/category', (req,res) => {
    res.render('admin/addCategory.ejs')
})

router.post("/add/new/category",saveRedirectUrl,isLoggedIn,isAdmin, async (req, res) => {
  try {
    const newProduct = new Category(req.body);
    await newProduct.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/add/new/category");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

module.exports = router;
