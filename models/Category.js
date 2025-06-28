const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  imageUrl:String,
  name:String
});

module.exports = mongoose.model("Category", CategorySchema);