const Patient = require('../models/Patient');
const User = require('../models/User');

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Private/Patient
const getPatientProfile = async (req, res) => {
    let patient = await Patient.findOne({ user: req.user._id }).populate('user', 'name email image contact');

    // If patient profile doesn't exist, create an empty one
    if (!patient) {
        patient = await Patient.create({
            user: req.user._id
        });
        patient = await Patient.findById(patient._id).populate('user', 'name email image contact');
    }

    res.json(patient);
};

// @desc    Update patient profile
// @route   PUT /api/patients/profile
// @access  Private/Patient
const updatePatientProfile = async (req, res) => {
    let patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
        patient = await Patient.create({
            user: req.user._id
        });
    }

    // Update user fields
    const user = await User.findById(req.user._id);
    if (user) {
        user.name = req.body.name || user.name;
        user.image = req.body.image || user.image;
        user.contact = req.body.contact || user.contact;
        if (req.body.password) {
            user.password = req.body.password;
        }
        await user.save();
    }

    // Update patient fields
    patient.dob = req.body.dob || patient.dob;
    patient.gender = req.body.gender || patient.gender;
    patient.bloodGroup = req.body.bloodGroup || patient.bloodGroup;
    patient.address = req.body.address || patient.address;
    patient.bio = req.body.bio || patient.bio;
    patient.emergencyContact = req.body.emergencyContact || patient.emergencyContact;

    try {
        const updatedPatient = await patient.save();
        const fullPatient = await Patient.findById(updatedPatient._id).populate('user', 'name email image contact role');
        res.json(fullPatient);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getPatientProfile,
    updatePatientProfile
};
