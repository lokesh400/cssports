const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    otp: {
        type: String,
        required: true,
    },
    otpExpiration: {
        type: Date,
        required: true,
    },
});

// Create a TTL index on otpExpiration that expires after 5 minutes
OtpSchema.index({ otpExpiration: 1 }, { expireAfterSeconds: 300 });
const Otp = mongoose.model('Otp', OtpSchema);

module.exports = Otp;
