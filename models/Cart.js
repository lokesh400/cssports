const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      price: { type: Number },
      size: { type: String },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  subTotal: { type: Number}, // Default to 0
  deliveryCharges: { type: Number},
  totalAmount: { type: Number }, // Default to 0
});

cartSchema.pre("save", function (next) {
  this.subTotal = this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  this.totalCharges = this.subTotal + this.deliveryCharges;
  next();
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
