const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Flavour = require('../models/Flavour')
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

// // Edit a product
router.get("/admin/update/product/:id",isLoggedIn,isAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);  
  res.render("admin/addFlavour.ejs",{product});
});

//get route to update flavour images
router.get('/admin/update/flavour/:id', async (req,res) => {
    const flavours = await Flavour.find({productId:req.params.id});
    res.render("admin/flavourList.ejs",{flavours});
})

// Upload images to a specific product
router.get("/upload/flavour/images/:id",isLoggedIn,isAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const product = await Flavour.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.render('admin/addProductImages.ejs',{id:req.params.id});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/update/flavour/image/:id",isLoggedIn,isAdmin, upload.single("file"), async (req, res) => {
  try {
    console.log(req.params.id)
    const {image} = req.body
    const product = await Flavour.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    product.images.push(image); // Add the new image to the images array
    await product.save();
    res.redirect(`/upload/flavour/images/${req.params.id}`);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

//add new flavour

router.post("/add/new/flavour/product", async (req, res) => {
  try {
    const { flavour,sizes,productId,image } = req.body;

    const newProduct = new Flavour({
      flavour,
      productId,
      images: [image],
      sizes: Object.values(sizes)
    });
    await newProduct.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/add/new/product");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

router.post("/add/new/product", upload.single("file"), async (req, res) => {
  try {
    const { name, description, brand, keywords, category, sizes } = req.body;
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
      description,
      brand,
      keywords: keywordsArray,
      category,
      images: [imageUrl],
      sizes: Object.values(sizes)
    });
    
    await newProduct.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/add/new/product");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});


module.exports = router;
