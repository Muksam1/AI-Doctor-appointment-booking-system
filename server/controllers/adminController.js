const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const sendEmail = require('../config/sendEmail');
const { createNotification } = require('./notificationController');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getAdminDashboard = async (req, res) => {
    try {
        // User statistics
        const totalUsers = await User.countDocuments();
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalDoctors = await User.countDocuments({ role: 'doctor' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // Doctor statistics
        const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
        const pendingDoctors = await Doctor.countDocuments({ applicationStatus: 'pending' });
        const rejectedDoctors = await Doctor.countDocuments({ applicationStatus: 'rejected' });

        // Appointment statistics
        const totalAppointments = await Appointment.countDocuments();
        const pendingAppointments = await Appointment.countDocuments({ status: 'Pending' });
        const confirmedAppointments = await Appointment.countDocuments({ status: 'Confirmed' });
        const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
        const cancelledAppointments = await Appointment.countDocuments({ status: 'Cancelled' });

        // Revenue statistics (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyRevenue = await Appointment.aggregate([
            {
                $match: {
                    status: 'Completed',
                    paymentStatus: 'Paid',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$fee' }
                }
            }
        ]);

        // Recent activities
        const recentAppointments = await Appointment.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('patient', 'name')
            .populate('doctor', 'user')
            .populate('doctor.user', 'name');

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role createdAt');

        res.json({
            stats: {
                users: {
                    total: totalUsers,
                    patients: totalPatients,
                    doctors: totalDoctors,
                    admins: totalAdmins
                },
                doctors: {
                    verified: verifiedDoctors,
                    pending: pendingDoctors,
                    rejected: rejectedDoctors
                },
                appointments: {
                    total: totalAppointments,
                    pending: pendingAppointments,
                    confirmed: confirmedAppointments,
                    completed: completedAppointments,
                    cancelled: cancelledAppointments
                },
                revenue: {
                    monthly: monthlyRevenue[0]?.total || 0
                }
            },
            recentActivities: {
                appointments: recentAppointments,
                users: recentUsers
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || parseInt(req.query.pageNumber) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';

        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            users,
            pages: Math.ceil(total / limit),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalUsers: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all doctors with applications
// @route   GET /api/admin/doctors
// @access  Private/Admin
const getAllDoctors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || parseInt(req.query.pageNumber) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'all'; // all, pending, approved, rejected

        let query = {};
        if (status !== 'all') {
            query.applicationStatus = status;
        }

        const doctors = await Doctor.find(query)
            .populate('user', 'name email contact image')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Doctor.countDocuments(query);

        res.json({
            doctors,
            pages: Math.ceil(total / limit),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalDoctors: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve or reject doctor application
// @route   PUT /api/admin/doctors/:id/status
// @access  Private/Admin
const updateDoctorStatus = async (req, res) => {
    try {
        const { status, reason } = req.body; // status: 'approved' or 'rejected'

        const doctor = await Doctor.findById(req.params.id).populate('user', 'name email role');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        doctor.applicationStatus = status;
        doctor.isVerified = status === 'approved';

        if (status === 'rejected' && reason) {
            doctor.rejectionReason = reason;
        }

        await doctor.save();
        
        // Promote user role from patient to doctor if approved
        if (status === 'approved' && doctor.user && doctor.user.role === 'patient') {
            await User.findByIdAndUpdate(doctor.user._id, { role: 'doctor' });
            console.log(`User ${doctor.user.email} promoted to doctor role`);
        }

        const subject = status === 'approved' ? 'Application Approved!' : 'Application Status Update';
        const message = status === 'approved'
            ? `Congratulations! Your doctor application has been approved. You can now start accepting appointments.`
            : `Your doctor application has been ${status}. ${reason ? `Reason: ${reason}` : ''}`;

        // Send email notification (Wrapped in try-catch to prevent 500 if email fails)
        try {
            await sendEmail({
                to: doctor.user.email,
                subject,
                html: `<h2>${subject}</h2><p>${message}</p>`
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError.message);
        }

        // Database Notification for Doctor
        const statusTitle = status === 'approved' ? 'Profile Verified!' : 'Application Update';
        const statusMessage = status === 'approved' 
            ? 'Your profile has been verified by the Admin. You are now visible to patients.' 
            : `Your application status has been updated to: ${status}. ${reason ? `Reason: ${reason}` : ''}`;

        await createNotification(
            doctor.user._id,
            'system',
            statusTitle,
            statusMessage
        );

        // Self-notification for admin (activity log)
        await createNotification(
            req.user._id,
            'system',
            'Application Processed',
            `You successfully ${status} the doctor application for ${doctor.user.name}.`
        );

        res.json({
            success: true,
            doctor,
            message: `Doctor application ${status} successfully`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all appointments
// @route   GET /api/admin/appointments
// @access  Private/Admin
const getAllAppointments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || '';
        const date = req.query.date || '';

        let query = {};

        if (status) {
            query.status = status;
        }

        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.date = { $gte: startDate, $lt: endDate };
        }

        const appointments = await Appointment.find(query)
            .populate('patient', 'name email contact')
            .populate('doctor', 'user specialization')
            .populate('doctor.user', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Appointment.countDocuments(query);

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

// @desc    Ban or unban user
// @route   PATCH /api/admin/user/:id/ban
// @access  Private/Admin
const toggleUserBan = async (req, res) => {
    try {
        const { isBanned = true, reason = 'Violated system policies' } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from banning themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot perform action on yourself' });
        }

        user.isBanned = isBanned;
        if (isBanned) {
            user.banReason = reason;
        } else {
            user.banReason = '';
        }

        await user.save();

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isBanned: user.isBanned
            },
            message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user and all associated records
// @route   DELETE /api/admin/user/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        // 1. If Doctor, delete doctor profile, reviews, and appointments
        if (user.role === 'doctor') {
            const doctor = await Doctor.findOne({ user: user._id });
            if (doctor) {
                await Review.deleteMany({ doctor: doctor._id });
                await Appointment.deleteMany({ doctor: doctor._id });
                await Doctor.findByIdAndDelete(doctor._id);
            }
        }

        // 2. If Patient, delete reviews, appointments, and patient profile
        if (user.role === 'patient') {
            await Review.deleteMany({ patient: user._id });
            await Appointment.deleteMany({ patient: user._id });
            await Patient.findOneAndDelete({ user: user._id });
        }

        // 3. Delete the user
        await User.findByIdAndDelete(req.params.id);

        // Notify Admin of successful deletion
        await createNotification(
            req.user._id,
            'admin',
            'User Deleted',
            `You successfully deleted user ${user.name} and all of their associated records.`
        );

        res.json({
            success: true,
            message: 'User and all associated records deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get revenue analytics
// @route   GET /api/admin/analytics/revenue
// @access  Private/Admin
const getRevenueAnalytics = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

        let groupBy = {};
        let dateFormat = '';

        switch (period) {
            case 'daily':
                groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                dateFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                groupBy = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
                dateFormat = '%Y-%U';
                break;
            case 'monthly':
                groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                dateFormat = '%Y-%m';
                break;
            case 'yearly':
                groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
                dateFormat = '%Y';
                break;
        }

        const revenueData = await Appointment.aggregate([
            {
                $match: {
                    status: 'Completed',
                    paymentStatus: 'Paid'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                    revenue: { $sum: '$fee' },
                    appointments: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Get payment method breakdown
        const paymentMethods = await Appointment.aggregate([
            {
                $match: {
                    status: 'Completed',
                    paymentStatus: 'Paid'
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    revenue: { $sum: '$fee' }
                }
            }
        ]);

        res.json({
            revenue: revenueData,
            paymentMethods,
            period
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSystemSettings = async (req, res) => {
    try {
        // This would typically come from a settings collection
        const settings = {
            system: {
                maintenanceMode: false,
                registrationEnabled: true,
                emailNotifications: true
            },
            payments: {
                khaltiEnabled: true,
                esewaEnabled: true,
                stripeEnabled: true,
                refundPolicy: '24 hours before appointment'
            },
            appointments: {
                maxAdvanceBooking: 30, // days
                cancellationHours: 24,
                rescheduleHours: 24
            }
        };

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSystemSettings = async (req, res) => {
    try {
        const updates = req.body;

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: updates
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete single appointment
// @route   DELETE /api/admin/appointments/:id
// @access  Private/Admin
const deleteAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        await Appointment.findByIdAndDelete(appointmentId);
        
        // Also delete associated reviews
        await Review.deleteMany({ appointment: appointmentId });
        
        // Notify admin of deletion
        await createNotification(
            req.user._id,
            'admin',
            'Appointment Deleted',
            `You permanently deleted appointment ID: ${appointmentId}.`
        );

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete all appointments
// @route   DELETE /api/admin/appointments
// @access  Private/Admin
const deleteAllAppointments = async (req, res) => {
    try {
        // Warning: This physically drops all appointments and matching reviews
        await Appointment.deleteMany({});
        await Review.deleteMany({});
        
        // Notify admin of mass deletion
        await createNotification(
            req.user._id,
            'admin',
            'All Appointments Deleted',
            `You issued a bulk command and permanently deleted ALL system appointments.`
        );

        res.json({
            success: true,
            message: 'All appointments have been successfully deleted'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAdminDashboard,
    getAllUsers,
    getAllDoctors,
    updateDoctorStatus,
    getAllAppointments,
    toggleUserBan,
    deleteUser,
    getRevenueAnalytics,
    getSystemSettings,
    updateSystemSettings,
    deleteAppointment,
    deleteAllAppointments
};