const User = require('../models/User');
const Doctor = require('../models/Doctor');
const generateToken = require('../config/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role, contact } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'patient',
        contact
    });

    if (user) {
        if (user.role === 'doctor') {
            await Doctor.create({
                user: user._id,
                specialization: req.body.specialization || 'General',
                experience: req.body.experience || 0,
                bio: req.body.bio || '',
                fee: req.body.fee || 0
            });
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
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
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
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
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
        const sendEmail = require('../config/sendEmail');
        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message: `Your OTP for password reset is ${otp}. It expires in 10 minutes.`,
        });
        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();
        res.status(500);
        throw new Error('Email could not be sent');
    }
};

// @desc    Reset Password
// @route   POST /api/auth/resetpassword
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otp, password } = req.body;
    const user = await User.findOne({
        email,
        otp,
        otpExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    user.password = password;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
};

// @desc    Verify Email
// @route   POST /api/auth/verifyemail
// @access  Private
const verifyEmail = async (req, res) => {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (user.otp === otp && user.otpExpire > Date.now()) {
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();
        res.json({ message: 'Email verified successfully' });
    } else {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }
};

module.exports = {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    verifyEmail
};
