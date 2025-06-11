const mongoose = require("mongoose");

const NewsLetterSchema = new mongoose.Schema({
  email: {Type:String},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NewsLetter", NewsLetterSchema);
