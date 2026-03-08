const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Order = require('../models/Order');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
    const totalAppointments = await Appointment.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalAppointmentRevenue = await Appointment.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const totalPharmacyRevenue = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const combinedRevenue = (totalAppointmentRevenue[0]?.total || 0) + (totalPharmacyRevenue[0]?.total || 0);

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
        totalRevenue: combinedRevenue,
        appointmentRevenue: totalAppointmentRevenue[0]?.total || 0,
        pharmacyRevenue: totalPharmacyRevenue[0]?.total || 0,
        revenueByMonth
    });
};

module.exports = { getAdminStats };
