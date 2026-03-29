const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

const router = express.Router();

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
    const { orderItems, shippingAddress, totalAmount, paymentMethod } = req.body;

    if (orderItems && orderItems.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    try {
        const order = new Order({
            user: req.user._id,
            orderItems,
            shippingAddress,
            totalAmount,
            paymentMethod,
            paymentStatus: paymentMethod === 'Cod' ? 'Pending' : 'Paid', // Adjust based on gateway verify
            status: 'Processing'
        });

        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
