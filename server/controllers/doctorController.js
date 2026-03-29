const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');

// @desc    Get all doctors with filters
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res) => {
    try {
        const {
            specialization,
            city,
            minFee,
            maxFee,
            minRating,
            search,
            sortBy = 'ratings',
            sortOrder = 'desc',
            page = 1,
            limit = 50
        } = req.query;

        let query = { isVerified: true, applicationStatus: 'approved' };

        // Apply filters
        if (specialization) {
            query.specialization = { $regex: specialization, $options: 'i' };
        }
        if (city) {
            query['clinicAddress.city'] = { $regex: city, $options: 'i' };
        }
        if (minFee || maxFee) {
            query.fee = {};
            if (minFee) query.fee.$gte = parseInt(minFee);
            if (maxFee) query.fee.$lte = parseInt(maxFee);
        }
        if (minRating) {
            query.ratings = { $gte: parseFloat(minRating) };
        }
        if (search) {
            const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }, '_id');
            const userIds = matchingUsers.map(u => u._id);
            query.user = { $in: userIds };
        }

        // Sorting
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        let doctors = await Doctor.find(query)
            .populate('user', 'name email image')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');

        // Filter out any doctors whose attached user account has been deleted
        doctors = doctors.filter(doc => doc.user && doc.user.name);

        const total = await Doctor.countDocuments(query);

        res.json({
            doctors,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalDoctors: doctors.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single doctor details
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .populate('user', 'name email image contact')
            .populate({
                path: 'reviews',
                populate: { path: 'patient', select: 'name image' },
                options: { sort: { createdAt: -1 }, limit: 10 }
            });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get recent appointments count
        const recentAppointments = await Appointment.countDocuments({
            doctor: req.params.id,
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });

        res.json({
            ...doctor.toObject(),
            recentAppointments
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private/Doctor
const updateDoctorProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user._id });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        const {
            name,
            email,
            contact,
            specialization,
            experience,
            bio,
            fee,
            education,
            languages,
            clinicAddress,
            emergencyContact,
            profileImage
        } = req.body;

        const imageValue = profileImage || req.body.image;

        // Update User model fields
        const user = await require('../models/User').findById(req.user._id);
        if (user) {
            if (name) user.name = name;
            if (email) user.email = email;
            if (contact !== undefined) user.contact = contact;
            if (imageValue) user.image = imageValue;
            await user.save();
        }

        // Update Doctor model fields
        if (specialization) doctor.specialization = specialization;
        if (experience !== undefined) doctor.experience = experience;
        if (bio) doctor.bio = bio;
        if (fee !== undefined) doctor.fee = fee;
        if (education) doctor.education = education;
        if (languages) doctor.languages = languages;
        if (clinicAddress) doctor.clinicAddress = clinicAddress;
        if (emergencyContact) doctor.emergencyContact = emergencyContact;
        if (imageValue) doctor.profileImage = imageValue;

        const updatedDoctor = await doctor.save();

        res.json({
            success: true,
            doctor: updatedDoctor,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Set doctor availability
// @route   PUT /api/doctors/availability
// @access  Private/Doctor
const setDoctorAvailability = async (req, res) => {
    try {
        const { availability, customAvailability } = req.body;

        const doctor = await Doctor.findOne({ user: req.user._id });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        // Validate weekly availability format
        if (availability) {
            for (const day of availability) {
                if (!day.day || !Array.isArray(day.slots)) {
                    return res.status(400).json({ message: 'Invalid availability format' });
                }

                for (const slot of day.slots) {
                    if (!slot.startTime || !slot.endTime) {
                        return res.status(400).json({ message: 'Invalid slot format' });
                    }
                }
            }
            doctor.availability = availability;
        }

        // Validate customAvailability (specific dates)
        if (customAvailability) {
            for (const item of customAvailability) {
                if (!item.date || !Array.isArray(item.slots)) {
                    return res.status(400).json({ message: 'Invalid custom availability format' });
                }
                for (const slot of item.slots) {
                    if (!slot.startTime || !slot.endTime) {
                        return res.status(400).json({ message: 'Invalid slot format' });
                    }
                }
            }
            doctor.customAvailability = customAvailability;
        }

        await doctor.save();

        res.json({
            success: true,
            availability: doctor.availability,
            customAvailability: doctor.customAvailability,
            message: 'Availability updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get doctor's dashboard stats
// @route   GET /api/doctors/dashboard
// @access  Private/Doctor
const getDoctorDashboard = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user._id }).populate('user', 'name email image');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        // Get appointment statistics
        const totalAppointments = await Appointment.countDocuments({ doctor: doctor._id });
        const pendingAppointments = await Appointment.countDocuments({
            doctor: doctor._id,
            status: 'Pending'
        });
        const todayAppointments = await Appointment.countDocuments({
            doctor: doctor._id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            }
        });

        // Get monthly revenue
        const monthlyRevenue = await Appointment.aggregate([
            {
                $match: {
                    doctor: doctor._id,
                    status: 'Completed',
                    createdAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$fee' }
                }
            }
        ]);

        // Get today's appointments
        const todaysAppointments = await Appointment.find({
            doctor: doctor._id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            }
        })
        .populate('patient', 'name email contact image')
        .sort({ date: 1, timeSlot: 1 });

        // Get reviews with patient info
        const Review = require('../models/Review');
        const doctorReviews = await Review.find({ doctor: doctor._id })
            .populate('patient', 'name image')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            stats: {
                totalAppointments,
                pendingAppointments,
                todayAppointments,
                monthlyRevenue: monthlyRevenue[0]?.total || 0,
                averageRating: doctor.ratings,
                totalReviews: doctor.numReviews
            },
            todaysAppointments,
            reviews: doctorReviews || [],
            doctor: doctor
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply to become a doctor
// @route   POST /api/doctors/apply
// @access  Private/User
const applyForDoctor = async (req, res) => {
    try {
        const {
            specialization,
            experience,
            bio,
            fee,
            education,
            licenseNumber,
            clinicAddress
        } = req.body;

        // Check if user already has a doctor profile
        const existingDoctor = await Doctor.findOne({ user: req.user._id });
        if (existingDoctor) {
            return res.status(400).json({ message: 'You already have a doctor application' });
        }

        const doctor = await Doctor.create({
            user: req.user._id,
            specialization,
            experience,
            bio,
            fee,
            education,
            licenseNumber,
            clinicAddress,
            applicationStatus: 'pending'
        });

        res.status(201).json({
            success: true,
            doctor,
            message: 'Application submitted successfully. Please wait for admin approval.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    setDoctorAvailability,
    getDoctorDashboard,
    applyForDoctor
};