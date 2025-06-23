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

// Route to display product form
// router.get("/add/new/product", (req, res) => {
//   res.render("admin/addProduct.ejs"); // Renders views/index.ejs
// });


router.post("/add/new/flavour/product", upload.single("file"), async (req, res) => {
  try {
    const { flavour,sizes,productId } = req.body;

    const result = await Upload.uploadFile(req.file.path); // Use the path for Cloudinary upload
    const imageUrl = result.secure_url;
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting local file:", err);
      } else {
        console.log("Local file deleted successfully");
      }
    });
    const newProduct = new Flavour({
      flavour,
      productId,
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
