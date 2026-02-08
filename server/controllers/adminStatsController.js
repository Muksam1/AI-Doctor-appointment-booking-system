const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
    const totalAppointments = await Appointment.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalRevenue = await Appointment.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const revenueByMonth = await Appointment.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        {
            $group: {
                _id: { $month: '$createdAt' },
                revenue: { $sum: '$fee' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    res.json({
        totalAppointments,
        totalPatients,
        totalDoctors,
        totalRevenue: totalRevenue[0]?.total || 0,
        revenueByMonth
    });
};

module.exports = { getAdminStats };
