const Doctor = require('../models/Doctor');
const User = require('../models/User');

// @desc    Get all doctors with filters
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res) => {
    const { specialization, minFee, maxFee, search } = req.query;

    let query = { isVerified: true };

    if (specialization) {
        query.specialization = specialization;
    }

    if (minFee || maxFee) {
        query.fee = {};
        if (minFee) query.fee.$gte = Number(minFee);
        if (maxFee) query.fee.$lte = Number(maxFee);
    }

    let doctors = await Doctor.find(query).populate('user', 'name image');

    if (search) {
        doctors = doctors.filter(doc =>
            doc.user.name.toLowerCase().includes(search.toLowerCase()) ||
            doc.specialization.toLowerCase().includes(search.toLowerCase())
        );
    }

    res.json(doctors);
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).populate('user', 'name image contact');

    if (doctor) {
        res.json(doctor);
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private/Doctor
const updateDoctorProfile = async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (doctor) {
        doctor.specialization = req.body.specialization || doctor.specialization;
        doctor.experience = req.body.experience || doctor.experience;
        doctor.bio = req.body.bio || doctor.bio;
        doctor.fee = req.body.fee || doctor.fee;
        doctor.availability = req.body.availability || doctor.availability;

        const updatedDoctor = await doctor.save();
        res.json(updatedDoctor);
    } else {
        res.status(404);
        throw new Error('Doctor profile not found');
    }
};

// @desc    Get doctor dashboard stats
// @route   GET /api/doctors/dashboard
// @access  Private/Doctor
const getDoctorDashboard = async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    // This will be expanded later with appointments
    res.json({ doctor });
};

module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorDashboard
};
