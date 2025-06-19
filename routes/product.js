const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Product = require("../models/Product");

const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { error } = require("console");

const {
  isLoggedIn,
  saveRedirectUrl,
  isAdmin,
  ensureAuthenticated,
} = require("../middlewares/login.js");

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

// // // show all products
router.get("/all/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.render("allProducts.ejs", { products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/products', async (req, res) => {
  const products = await Product.find();
  console.log(products);
  res.json(products);
});


router.get('/search/products', async (req, res) => {
  try {
    const query = (req.query.query || '').trim();

    if (!query) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const regex = new RegExp(query, 'i'); // case-insensitive

    const products = await Product.find({
      $or: [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { brand: { $regex: regex } },
        { category: { $regex: regex } },
        { keywords: { $elemMatch: { $regex: regex } } } // ✅ works with partial matches in arrays
      ]
    });

    console.log('Search query:', query);
    console.log('Matched products:', products.length);
    res.render('allProducts.ejs', { products });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//to filter categories
router.get('/api/category/products', isLoggedIn,async (req,res)=>{
  try{
    const products = await Product.find()
    res.json(products)
  } catch (error){
    res.send("internal system error")
  }
})

//search products
router.get("/search/products", async (req, res) => {
  try {
    const query = req.query.query; // Get search term from URL
    if (!query || query.trim() === "") {
      return res.redirect("/search-error");
    }
    const terms = query.trim().split(" ").map((term) => ({
      $or: [
        { name: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
        { keywords: { $elemMatch: { $regex: term, $options: "i" } } }
      ]
    }));
    const products = await Product.find({ $and: terms });
    res.render("search", { products });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


//searcherror
router.get("/search-error",isLoggedIn, (req,res)=>{
  res.render("searchError.ejs");
})

//all products
router.get("/product/management",isLoggedIn, async (req, res) => {
  const products = await Product.find();
  res.render("admin/allProducts.ejs", { products });
});

//render particular product
router.get("/show/this/product/:id",saveRedirectUrl,isLoggedIn, async(req,res)=>{
  const product = await Product.findById(req.params.id);
  res.render('thisProduct.ejs',{product});
})

//related products 
router.get("/related/:productId",isLoggedIn, async (req, res) => {
  try {
      const productId = req.params.productId;

      // Find the current product
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ message: "Product not found" });
      }

      // Fetch related products (same category, excluding current product)
      const relatedProducts = await Product.find({
          category: product.category,
          _id: { $ne: productId },
      }).limit(4); // Limit to 4 related products

      res.json(relatedProducts);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
