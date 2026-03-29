const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const generateToken = require('../config/generateToken');
const smsService = require('../config/smsService');
const sendEmail = require('../config/sendEmail');

const ALLOWED_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
    'icloud.com', 'me.com', 'mac.com', 'aol.com', 
    'protonmail.com', 'proton.me', 'zoho.com', 'ymail.com'
];

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, contact } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please enter all required fields' });
        }

        // Validate email domain to ensure it's from a reputable provider (Google, Yahoo, etc.)
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!ALLOWED_DOMAINS.includes(emailDomain)) {
            return res.status(400).json({ 
                message: 'Please use a reputable email provider like Gmail, Yahoo, or Outlook to register.' 
            });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        if (role === 'admin') {
            return res.status(400).json({ message: 'Cannot register as an admin' });
        }

        // Generate OTP for email verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        const user = await User.create({
            name,
            email,
            password,
            role: 'patient',
            contact,
            otp,
            otpExpire,
            isVerified: false
        });

        if (user) {
            await Patient.create({
                user: user._id
            });

            // Send verification email
            try {
                await sendEmail({
                    to: user.email,
                    subject: 'HealSync - Verify Your Email',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                            <h2 style="color: #4338ca;">Welcome to HealSync!</h2>
                            <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
                            <div style="font-size: 24px; font-weight: bold; color: #4338ca; padding: 15px; background: #f3f4f6; text-align: center; border-radius: 5px; margin: 20px 0;">
                                ${otp}
                            </div>
                            <p>This code will expire in 10 minutes.</p>
                            <p>If you didn't create an account, you can safely ignore this email.</p>
                        </div>
                    `,
                });
            } catch (err) {
                console.error('Failed to send verification email:', err.message);
                // We keep the user but they will need to request a new OTP if they can't see it (handled by forgot password or future resend logic)
            }

            res.status(201).json({
                message: 'Registration successful! Please verify your email with the OTP sent to ' + user.email,
                email: user.email,
                isVerified: false
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                // If not verified, we can still trigger a new OTP here if needed, 
                // but for now just tell them to verify.
                return res.status(401).json({ 
                    message: 'Please verify your email address before logging in.',
                    isVerified: false,
                    email: user.email
                });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                isVerified: true
            });
        } else {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                contact: user.contact,
                image: user.image
            });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.contact = req.body.contact || user.contact;
            user.image = req.body.image || user.image;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                token: generateToken(updatedUser._id),
            });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check what recovery options are available for a given identifier
// @route   POST /api/auth/check-recovery-options
// @access  Public
const checkRecoveryOptions = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ message: 'Identifier is required' });

        const user = await User.findOne({
            $or: [{ email: identifier }, { contact: identifier }]
        }).select('name email contact image');

        if (!user) {
            return res.status(404).json({ message: 'No account found with that email or phone number.' });
        }

        const options = [];
        if (user.email) {
            // Mask email for privacy (e.g. jo***n@domain.com)
            const parts = user.email.split('@');
            const maskedLocal = parts[0].length > 2 
                ? parts[0].slice(0, 2) + '***' + parts[0].slice(-1)
                : parts[0] + '***';
            const maskedEmail = maskedLocal + '@' + parts[1];
            options.push({ method: 'email', label: 'Email verification', hint: `Sent to ${maskedEmail}` });
        }
        if (user.contact) {
            // Mask contact for privacy (e.g. 98******56)
            const masked = user.contact.length > 4
                ? user.contact.slice(0, 2) + '******' + user.contact.slice(-2)
                : user.contact.slice(0, 1) + '******';
            options.push({ method: 'sms', label: 'SMS OTP', hint: `Sent to ${masked}` });
        }

        res.json({ 
            options,
            user: {
                name: user.name,
                image: user.image,
                email: user.email.replace(/(?<=.{2}).(?=.*@)/g, '*'), // Basic mask for display
                hasPhone: !!user.contact
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { identifier, method } = req.body;
        const searchIdentifier = identifier || req.body.email;
        const deliveryMethod = method || 'email'; // 'email' or 'sms'

        if (!searchIdentifier) {
            return res.status(400).json({ message: 'Please provide email or phone number' });
        }

        const user = await User.findOne({ 
            $or: [{ email: searchIdentifier }, { contact: searchIdentifier }] 
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        try {
            if (deliveryMethod === 'sms') {
                if (!user.contact || user.contact.trim() === '') {
                    user.otp = undefined;
                    user.otpExpire = undefined;
                    await user.save();
                    return res.status(400).json({ message: 'No phone number linked to this account.' });
                }
                await smsService.sendSMS(user.contact, `HealSync Authentication: Your password reset OTP is ${otp}. It expires in 10 minutes.`);
                res.json({ message: 'OTP sent via SMS successfully', receiver: user.contact.slice(0, 2) + '******' + user.contact.slice(-2) });
            } else {
                await sendEmail({
                    to: user.email,
                    subject: 'Password Reset OTP',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>HealSync Password Reset</h2>
                            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                            <p>This code expires in 10 minutes.</p>
                        </div>
                    `,
                });
                const maskedEmail = user.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
                res.json({ message: 'OTP sent to email successfully', receiver: maskedEmail });
            }
        } catch (error) {
            user.otp = undefined;
            user.otpExpire = undefined;
            await user.save();
            return res.status(500).json({ message: `Could not send OTP via ${deliveryMethod}` });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/resetpassword
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { identifier, otp, password } = req.body;
        const searchIdentifier = identifier || req.body.email;

        if (!searchIdentifier || !otp || !password) {
            return res.status(400).json({ message: 'Please provide all details' });
        }

        const user = await User.findOne({
            $or: [{ email: searchIdentifier }, { contact: searchIdentifier }],
            otp,
            otpExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.password = password;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Email
// @route   POST /api/auth/verifyemail
// @access  Private
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide email and OTP' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        if (user.otp === otp && user.otpExpire > Date.now()) {
            user.isVerified = true;
            user.otp = undefined;
            user.otpExpire = undefined;
            await user.save();
            res.json({ 
                success: true,
                message: 'Email verified successfully! You can now login.' 
            });
        } else {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, sub, picture } = ticket.getPayload();

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Log in existing user
            user.googleId = sub;
            if (picture) user.image = picture;
            user.isVerified = true; 
            await user.save();
        } else {
            // Create new user with default 'patient' role
            user = await User.create({
                name,
                email,
                password: Math.random().toString(36).slice(-10), 
                role: 'patient', 
                googleId: sub,
                image: picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                isVerified: true
            });

            await Patient.create({ user: user._id });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            isVerified: true
        });
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        res.status(500).json({ message: 'Google authentication failed' });
    }
};

module.exports = {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    verifyEmail,
    checkRecoveryOptions,
    googleLogin
};
