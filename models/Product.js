const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  coverPhoto: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  madeFor: {type:String},
  keywords:[String],
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 1 },
  images: [{ type: String }],
  sizes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", ProductSchema);
