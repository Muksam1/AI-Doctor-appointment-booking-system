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
        // Update user fields
        const user = await User.findById(req.user._id);
        if (user) {
            user.name = req.body.name || user.name;
            user.image = req.body.image || user.image;
            if (req.body.password) {
                user.password = req.body.password;
            }
            await user.save();
        }

        // Update doctor fields
        doctor.specialization = req.body.specialization || doctor.specialization;
        doctor.experience = req.body.experience || doctor.experience;
        doctor.bio = req.body.bio || doctor.bio;
        doctor.fee = req.body.fee || doctor.fee;
        doctor.availability = req.body.availability || doctor.availability;

        const updatedDoctor = await doctor.save();

        // Return combined data
        const fullDoctor = await Doctor.findById(updatedDoctor._id).populate('user', 'name email image role');
        res.json(fullDoctor);
    } else {
        res.status(404);
        throw new Error('Doctor profile not found');
    }
};

// @desc    Get doctor dashboard stats
// @route   GET /api/doctors/dashboard
// @access  Private/Doctor
const getDoctorDashboard = async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email image role');
    res.json({ doctor });
};

// @desc    Submit / Re-submit join application to HealSync
// @route   POST /api/doctors/join
// @access  Private/Doctor
const submitJoinApplication = async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    // Only allow re-application if not already approved
    if (doctor.applicationStatus === 'approved') {
        return res.json({ message: 'Your application is already approved', doctor });
    }

    // Update professional details from form
    doctor.specialization = req.body.specialization || doctor.specialization;
    doctor.experience = req.body.experience !== undefined ? req.body.experience : doctor.experience;
    doctor.bio = req.body.bio || doctor.bio;
    doctor.fee = req.body.fee !== undefined ? req.body.fee : doctor.fee;
    doctor.applicationStatus = 'pending';
    doctor.isVerified = false;

    // Also update user info (name/image)
    const user = await User.findById(req.user._id);
    if (user) {
        if (req.body.name) user.name = req.body.name;
        if (req.body.image) user.image = req.body.image;
        await user.save();
    }

    const updatedDoctor = await doctor.save();
    const fullDoctor = await Doctor.findById(updatedDoctor._id).populate('user', 'name email image role');
    res.json({ message: 'Application submitted! Pending admin approval.', doctor: fullDoctor });
};

module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorDashboard,
    submitJoinApplication
};
