const Doctor = require('../models/Doctor');
const User = require('../models/User');

// @desc    Get all pending doctor verifications
// @route   GET /api/admin/doctors/pending
// @access  Private/Admin
const getPendingDoctors = async (req, res) => {
    const doctors = await Doctor.find({ isVerified: false }).populate('user', 'name email');
    res.json(doctors);
};

// @desc    Verify doctor
// @route   PUT /api/admin/doctors/:id/verify
// @access  Private/Admin
const verifyDoctor = async (req, res) => {
    const { status } = req.body;
    const doctor = await Doctor.findById(req.params.id);

    if (doctor) {
        if (status === 'rejected') {
            await Doctor.findByIdAndDelete(req.params.id);
            res.json({ message: 'Doctor application rejected and removed' });
        } else {
            doctor.isVerified = true;
            await doctor.save();
            res.json({ message: 'Doctor verified successfully' });
        }
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
};

// @desc    Get all users (for admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    const users = await User.find({});
    res.json(users);
};

module.exports = {
    getPendingDoctors,
    verifyDoctor,
    getAllUsers
};
