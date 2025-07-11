const express = require("express");
const router = express.Router();
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator'); 
require('dotenv').config();

const Otp = require('../models/Otp');

const {
    isLoggedIn,
    saveRedirectUrl,
    isAdmin,
    ensureAuthenticated,
  } = require("../middlewares/login.js");
const User = require("../models/User.js");


router.post('/new/send-otp', async (req, res) => {
    const { email } = req.body;

    const otp = otpGenerator.generate(6, { 
        digits: true, 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false, 
        specialChars: false 
    });
    
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    try {

        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            port: 587,
            auth: {
                user: "official.csnutrition@gmail.com",
                pass: process.env.mailpass // Ensure this is set in your environment variables
            }
        });
        const mailOptions = {
            from: "official.csnutrition@gmail.com",
            to: email, // Pass the email from the request body here
            subject: 'OTP to signup on keshvibe',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #007bff; text-align: center;">Welcome to CS Sports & Nutrition!</h1>
                        <p style="font-size: 16px; color: #333;">Hi there,</p>
                        <p style="font-size: 16px; color: #333;">Thank you for registering on CS Nutrition & Sports! We're excited to have you join our community.</p>
                        <p style="font-size: 16px; color: #333;">Here is your otp to sign
                        up on keshvibe</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <div style="
                                display: inline-block;
                                background-color: #007bff;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                font-size: 16px;
                            ">${otp}</div>
                        </div>
                        <p style="font-size: 16px; color: #333;">If you have any questions, feel free to reach out to us anytime at <a href="mailto:official.keshvibe@gmail.com" style="color: #007bff; text-decoration: none;">official.keshvibe@gmail.com</a>.</p>
                        <p style="font-size: 16px; color: #333;">Cheers,<br>CS Sports & Nutrition Team</p>
                        <hr style="border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #999; text-align: center;">You received this email because you subscribed to the CS Sports & Nutrition newsletter.</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        
        let user = await Otp.findOne({ email });
        if (!user) {
            // If user does not exist, create a new entry
            user = new Otp({ email, otp, otpExpiration: expirationTime });
        } else {
            // If the user already exists, just update the OTP and expiration
            user.otp = otp;
            user.otpExpiration = expirationTime;
        }
        await user.save();
        // Send OTP via email (this part is not shown)
        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Error sending OTP.' });
    }
});

// FORGET PASSWORD OTP SEND
router.post('/otp/forget-password', async (req, res) => {
    const { email } = req.body;
 
    const otp = otpGenerator.generate(6, { 
        digits: true, 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false, 
        specialChars: false 
    });

    const user = await User.findOne({username:email});
    if(!user){
        res.status(500).json({message:"User not registered"})
    }
    
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    try {

         const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            port: 587,
            auth: {
                user: "official.csnutrition@gmail.com",
                pass: process.env.mailpass // Ensure this is set in your environment variables
            }
        });
        const mailOptions = {
            from: "official.csnutrition@gmail.com",
            to: email, // Pass the email from the request body here
            subject: 'OTP to signup on CS Sports & Nutrition',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #007bff; text-align: center;">Welcome to CS Sports & Nutrition!</h1>
                        <p style="font-size: 16px; color: #333;">Hi there,</p>
                        <p style="font-size: 16px; color: #333;">Here is your otp to reset password</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <div style="
                                display: inline-block;
                                background-color: #007bff;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                font-size: 16px;
                            ">${otp}</div>
                        </div>
                        <p style="font-size: 16px; color: #333;">If you have any questions, feel free to reach out to us anytime at <a href="mailto:official.csnutrition@gmail.com" style="color: #007bff; text-decoration: none;">official.keshvibe@gmail.com</a>.</p>
                        <p style="font-size: 16px; color: #333;">Cheers,<br>CS Sports & Nutrition Team</p>
                        <hr style="border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #999; text-align: center;">You received this email because opted for resetting password on the CS Sports & Nutrition newsletter.</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        
        let user = await Otp.findOne({ email });
        if (!user) {
            // If user does not exist, create a new entry
            user = new Otp({ email, otp, otpExpiration: expirationTime });
        } else {
            // If the user already exists, just update the OTP and expiration
            user.otp = otp;
            user.otpExpiration = expirationTime;
        }
        await user.save();
        // Send OTP via email (this part is not shown)
        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Error sending OTP.' });
    }
});

module.exports = router;