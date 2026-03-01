const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
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
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no token'));
    }
};

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

module.exports = { protect, admin, doctor };
