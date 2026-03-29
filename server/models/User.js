const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Email validation
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },
    image: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    },
    contact: {
        type: String,
        trim: true,
        match: /^\+?[0-9\s-]{10,}$/ // More flexible phone validation (allows +, spaces, dashes)
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otpExpire: {
        type: Date
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    googleId: {
        type: String
    }
}, {
    timestamps: true
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Add indexes
userSchema.index({ email: 1 });
userSchema.index({ otp: 1 }, { expireAfterSeconds: 300 }); // 5 min TTL

const User = mongoose.model('User', userSchema);

module.exports = User;
