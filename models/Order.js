const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, default: 1 },
      size:{type:String},
      price: { type: Number, required: true },
      flavour:String
    }
  ],
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    name:String,
  },
  subTotal: { type: Number },
  deliveryCharges: { type: Number },
  totalAmount: { type: Number },
  status: { type: String, enum: ["pending", "packed", "shipped", "delivered","printed"], default: "pending" },
  paymentMode:String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", OrderSchema);
