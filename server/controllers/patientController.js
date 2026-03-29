const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Review = require('../models/Review');
const Order = require('../models/Order');

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Private/Patient
const getPatientProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user._id })
            .populate('user', '-password');

        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update patient profile
// @route   PUT /api/patients/profile
// @access  Private/Patient
const updatePatientProfile = async (req, res) => {
    try {
        const {
            name,
            email,
            contact,
            image,
            dob,
            gender,
            bloodGroup,
            address,
            bio,
            emergencyContact,
            medicalConditions,
            allergies,
            currentMedications,
            pastSurgeries,
            familyHistory,
            vaccinationRecords,
            smokingStatus,
            alcoholConsumption,
            exerciseHabits,
            dietaryRestrictions
        } = req.body;

        // Update User model fields (name, email, contact, image)
        const user = await User.findById(req.user._id);
        if (user) {
            if (name) user.name = name;
            if (email) user.email = email;
            if (contact !== undefined) user.contact = contact;
            if (image) user.image = image;
            await user.save();
        }

        let patient = await Patient.findOne({ user: req.user._id });

        if (!patient) {
            // Create new patient profile if it doesn't exist
            patient = await Patient.create({
                user: req.user._id,
                dob,
                gender,
                bloodGroup,
                address,
                bio,
                emergencyContact,
                medicalConditions: medicalConditions || [],
                allergies: allergies || [],
                currentMedications: currentMedications || [],
                pastSurgeries: pastSurgeries || [],
                familyHistory: familyHistory || [],
                vaccinationRecords: vaccinationRecords || [],
                smokingStatus,
                alcoholConsumption,
                exerciseHabits,
                dietaryRestrictions: dietaryRestrictions || []
            });
        } else {
            // Update existing profile
            if (dob !== undefined) patient.dob = dob;
            if (gender !== undefined) patient.gender = gender;
            if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
            if (address !== undefined) patient.address = address;
            if (bio !== undefined) patient.bio = bio;
            if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
            if (medicalConditions !== undefined) patient.medicalConditions = medicalConditions;
            if (allergies !== undefined) patient.allergies = allergies;
            if (currentMedications !== undefined) patient.currentMedications = currentMedications;
            if (pastSurgeries !== undefined) patient.pastSurgeries = pastSurgeries;
            if (familyHistory !== undefined) patient.familyHistory = familyHistory;
            if (vaccinationRecords !== undefined) patient.vaccinationRecords = vaccinationRecords;
            if (smokingStatus !== undefined) patient.smokingStatus = smokingStatus;
            if (alcoholConsumption !== undefined) patient.alcoholConsumption = alcoholConsumption;
            if (exerciseHabits !== undefined) patient.exerciseHabits = exerciseHabits;
            if (dietaryRestrictions !== undefined) patient.dietaryRestrictions = dietaryRestrictions;

            await patient.save();
        }

        const updatedPatient = await Patient.findById(patient._id)
            .populate('user', '-password');

        res.json({
            success: true,
            patient: updatedPatient,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient appointments
// @route   GET /api/patients/appointments
// @access  Private/Patient
const getPatientAppointments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // upcoming, past, cancelled
        const sortBy = req.query.sortBy || 'date';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        let filter = { patient: req.user._id };

        if (status) {
            const now = new Date();
            switch (status) {
                case 'upcoming':
                    filter.date = { $gte: now };
                    filter.status = { $in: ['Pending', 'Confirmed'] };
                    break;
                case 'past':
                    filter.date = { $lt: now };
                    filter.status = 'Completed';
                    break;
                case 'cancelled':
                    filter.status = 'Cancelled';
                    break;
            }
        }

        const appointments = await Appointment.find(filter)
            .populate('doctor', 'user specialization clinicAddress')
            .populate('doctor.user', 'name image')
            .sort({ [sortBy]: sortOrder })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Appointment.countDocuments(filter);

        res.json({
            appointments,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalAppointments: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient dashboard data
// @route   GET /api/patients/dashboard
// @access  Private/Patient
const getPatientDashboard = async (req, res) => {
    try {
        const patientId = req.user._id;

        // Upcoming appointments
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            date: { $gte: new Date() },
            status: { $in: ['Pending', 'Confirmed'] }
        })
        .populate('doctor', 'user specialization')
        .populate('doctor.user', 'name image')
        .sort({ date: 1 })
        .limit(5);

        // Recent appointments
        const recentAppointments = await Appointment.find({
            patient: patientId,
            status: 'Completed'
        })
        .populate('doctor', 'user specialization')
        .populate('doctor.user', 'name image')
        .sort({ date: -1 })
        .limit(5);

        // Appointment statistics
        const totalAppointments = await Appointment.countDocuments({ patient: patientId });
        const completedAppointments = await Appointment.countDocuments({
            patient: patientId,
            status: 'Completed'
        });
        const pendingAppointments = await Appointment.countDocuments({
            patient: patientId,
            status: { $in: ['Pending', 'Confirmed'] }
        });

        // Favorite doctors (based on completed appointments)
        const favoriteDoctors = await Appointment.aggregate([
            { $match: { patient: patientId, status: 'Completed' } },
            {
                $group: {
                    _id: '$doctor',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'doctors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'doctor'
                }
            },
            { $unwind: '$doctor' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'doctor.user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$doctor._id',
                    name: '$user.name',
                    specialization: '$doctor.specialization',
                    image: '$user.image',
                    appointmentCount: '$count'
                }
            }
        ]);

        // Health reminders (based on medical history and upcoming appointments)
        const healthReminders = await generateHealthReminders(patientId);

        // Recent orders
        const recentOrders = await Order.find({ patient: patientId })
            .populate('products.product', 'name price')
            .sort({ createdAt: -1 })
            .limit(3);

        res.json({
            upcomingAppointments,
            recentAppointments,
            statistics: {
                totalAppointments,
                completedAppointments,
                pendingAppointments
            },
            favoriteDoctors,
            healthReminders,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient medical records
// @route   GET /api/patients/medical-records
// @access  Private/Patient
const getMedicalRecords = async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user._id });

        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        // Get completed appointments with doctor notes
        const medicalRecords = await Appointment.find({
            patient: req.user._id,
            status: 'Completed'
        })
        .populate('doctor', 'user specialization')
        .populate('doctor.user', 'name')
        .select('date symptoms diagnosis prescription notes followUpDate')
        .sort({ date: -1 });

        res.json({
            patientInfo: {
                medicalConditions: patient.medicalConditions,
                allergies: patient.allergies,
                currentMedications: patient.currentMedications
            },
            medicalRecords
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient reviews
// @route   GET /api/patients/reviews
// @access  Private/Patient
const getPatientReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ patient: req.user._id })
            .populate('doctor', 'user specialization')
            .populate('doctor.user', 'name image')
            .populate('appointment', 'date')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update patient preferences
// @route   PUT /api/patients/preferences
// @access  Private/Patient
const updatePatientPreferences = async (req, res) => {
    try {
        const { notificationSettings, language, theme, privacySettings } = req.body;

        let patient = await Patient.findOne({ user: req.user._id });

        if (!patient) {
            patient = await Patient.create({
                user: req.user._id,
                preferences: {}
            });
        }

        if (notificationSettings !== undefined) {
            patient.preferences.notificationSettings = notificationSettings;
        }
        if (language !== undefined) {
            patient.preferences.language = language;
        }
        if (theme !== undefined) {
            patient.preferences.theme = theme;
        }
        if (privacySettings !== undefined) {
            patient.preferences.privacySettings = privacySettings;
        }

        await patient.save();

        res.json({
            success: true,
            preferences: patient.preferences,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to generate health reminders
const generateHealthReminders = async (patientId) => {
    try {
        const patient = await Patient.findOne({ user: patientId });
        const reminders = [];

        if (!patient) return reminders;

        // Check for upcoming appointments
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            date: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            status: { $in: ['Pending', 'Confirmed'] }
        }).populate({
            path: 'doctor',
            populate: { path: 'user', select: 'name' }
        });

        if (upcomingAppointments.length > 0) {
            reminders.push({
                type: 'appointment',
                title: 'Upcoming Appointment',
                message: `You have ${upcomingAppointments.length} appointment(s) this week`,
                priority: 'high'
            });
        }

        // Medication reminders
        if (patient.currentMedications && patient.currentMedications.length > 0) {
            reminders.push({
                type: 'medication',
                title: 'Medication Reminder',
                message: `You have ${patient.currentMedications.length} active medication(s)`,
                priority: 'medium'
            });
        }

        // Follow-up reminders
        const appointmentsWithFollowUp = await Appointment.find({
            patient: patientId,
            followUpDate: { $exists: true, $gte: new Date() },
            status: 'Completed'
        });

        if (appointmentsWithFollowUp.length > 0) {
            reminders.push({
                type: 'followup',
                title: 'Follow-up Reminder',
                message: `You have ${appointmentsWithFollowUp.length} follow-up appointment(s) scheduled`,
                priority: 'medium'
            });
        }

        return reminders;
    } catch (error) {
        console.error('Error generating health reminders:', error);
        return [];
    }
};
// @desc    Get all patients (for doctors to use in chat)
// @route   GET /api/patients/all
// @access  Private/Doctor
const getAllPatients = async (req, res) => {
    try {
        const patients = await User.find({ role: 'patient' }, 'name email image _id');
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPatientProfile,
    updatePatientProfile,
    getPatientAppointments,
    getPatientDashboard,
    getMedicalRecords,
    getPatientReviews,
    updatePatientPreferences,
    getAllPatients
};