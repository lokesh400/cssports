const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  brand: String,
  keywords: [String],
  image:String,
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  products:{

  }
});

module.exports = mongoose.model("Product", ProductSchema);
