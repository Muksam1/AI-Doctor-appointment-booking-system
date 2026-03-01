const Doctor = require('../models/Doctor');
const User = require('../models/User');

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
    const users = await User.find({});
    res.json(users);
};

module.exports = {
    getPendingDoctors,
    verifyDoctor,
    getApprovedDoctors,
    getAllUsers
};
