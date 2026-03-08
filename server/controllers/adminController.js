const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');

// @desc    Get all pending doctor applications
// @route   GET /api/admin/doctors/pending
// @access  Private/Admin
const getPendingDoctors = async (req, res) => {
    const doctors = await Doctor.find({ applicationStatus: 'pending' })
        .populate('user', 'name email image');
    res.json(doctors);
};

// @desc    Approve or reject a doctor application
// @route   PUT /api/admin/doctors/:id/verify
// @access  Private/Admin
const verifyDoctor = async (req, res) => {
    const { status } = req.body; // 'verified' or 'rejected'
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    if (status === 'rejected') {
        doctor.applicationStatus = 'rejected';
        doctor.isVerified = false;
        await doctor.save();
        res.json({ message: 'Doctor application rejected' });
    } else if (status === 'verified') {
        doctor.applicationStatus = 'approved';
        doctor.isVerified = true;
        await doctor.save();
        res.json({ message: 'Doctor approved and is now visible to patients' });
    } else {
        res.status(400);
        throw new Error('Invalid status value');
    }
};

// @desc    Get all approved doctors (for admin view)
// @route   GET /api/admin/doctors/approved
// @access  Private/Admin
const getApprovedDoctors = async (req, res) => {
    const doctors = await Doctor.find({ applicationStatus: 'approved' })
        .populate('user', 'name email image');
    res.json(doctors);
};

// @desc    Get all users (for admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    const count = await User.countDocuments({});
    const users = await User.find({})
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ users, page, pages: Math.ceil(count / pageSize) });
};

// @desc    Delete a user
// @route   DELETE /api/admin/user/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        if (user.role === 'admin') {
            res.status(400);
            throw new Error('Cannot delete admin user');
        }

        // Delete associated profile
        if (user.role === 'doctor') {
            await Doctor.findOneAndDelete({ user: user._id });
        } else if (user.role === 'patient') {
            await Patient.findOneAndDelete({ user: user._id });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Toggle Ban user
// @route   PATCH /api/admin/user/:id/ban
// @access  Private/Admin
const toggleBanUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        if (user.role === 'admin') {
            res.status(400);
            throw new Error('Cannot ban admin user');
        }
        user.isBanned = !user.isBanned;
        await user.save();
        res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`, isBanned: user.isBanned });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

const Order = require('../models/Order');

// ... (existing functions)

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
        order.status = status;
        await order.save();

        // Emit notification
        const io = req.app.get('socketio');
        if (io) {
            io.to(order.user.toString()).emit('receiveMessage', {
                senderId: 'system',
                text: `Your order #${order._id.toString().slice(-6).toUpperCase()} is now ${status}!`,
                type: 'text',
                timestamp: new Date().toLocaleTimeString()
            });
        }

        res.json({ message: 'Order status updated', order });
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
};

module.exports = {
    getPendingDoctors,
    verifyDoctor,
    getApprovedDoctors,
    getAllUsers,
    deleteUser,
    toggleBanUser,
    getAllOrders,
    updateOrderStatus
};
