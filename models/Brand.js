const mongoose = require("mongoose");

const BrandSchema = new mongoose.Schema({
  imageUrl:String
});

module.exports = mongoose.model("Brand", BrandSchema);