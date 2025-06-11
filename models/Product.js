const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  brand: String,
  keywords: [String],
  category: { type: String, required: true },
  images: [{ type: String }],
  sizes: [
    {
      size: { type: String },
      price: { type: String }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", ProductSchema);
