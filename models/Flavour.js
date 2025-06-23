const mongoose = require("mongoose");

const FlavourSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  flavour:{type:String},
  images: [{ type: String }],
  sizes: [
    {
      size: { type: String },
      price: { type: String },
      quantity:Number
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Flavour", FlavourSchema);