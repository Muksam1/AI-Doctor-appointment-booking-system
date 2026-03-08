const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect middleware: Verify JWT token from headers/cookies
const protect = async (req, res, next) => {
    let token;

    // Check headers for Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies for token (if cookie-parser is used)
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no token'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            res.status(401);
            return next(new Error('Not authorized, user not found'));
        }

        return next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401);
        return next(new Error('Not authorized, token failed'));
    }
};

// Authorize middleware: Check user role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403); // Forbidden
            return next(new Error(`Role (${req.user ? req.user.role : 'none'}) is not authorized to access this route`));
        }
        next();
    };
};

// Legacy middleware for backward compatibility (optional, but good to keep if used elsewhere)
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    } else {
        res.status(401);
        return next(new Error('Not authorized as an admin'));
    }
};

const doctor = (req, res, next) => {
    if (req.user && req.user.role === 'doctor') {
        return next();
    } else {
        res.status(401);
        return next(new Error('Not authorized as a doctor'));
    }
};

module.exports = { protect, authorize, admin, doctor };
