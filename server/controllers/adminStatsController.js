const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        // Run basic counts and static aggregates in parallel for performance
        const [
            userCounts,
            appointmentCounts,
            revenueAggregates,
            reviewStats,
            monthlyStats,
            recentActivities,
            topDoctors
        ] = await Promise.all([
            // Batch 1: User Demographics
            Promise.all([
                User.countDocuments(),
                User.countDocuments({ role: 'doctor' }),
                User.countDocuments({ role: 'patient' }),
                User.countDocuments({ role: 'admin' })
            ]),
            // Batch 2: Appointment Statuses
            Promise.all([
                Appointment.countDocuments(),
                Appointment.countDocuments({ status: 'Pending' }),
                Appointment.countDocuments({ status: 'Confirmed' }),
                Appointment.countDocuments({ status: 'Completed' }),
                Appointment.countDocuments({ status: 'Cancelled' })
            ]),
            // Batch 3: Revenue Calculation
            Promise.all([
                Appointment.aggregate([
                    { $match: { status: 'Completed', paymentStatus: 'Paid' } },
                    { $group: { _id: null, total: { $sum: '$fee' } } }
                ]),
                Order.aggregate([
                    { $match: { status: 'Delivered' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ])
            ]),
            // Batch 4: Quality Metrics
            Promise.all([
                Review.countDocuments(),
                Review.aggregate([
                    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                ])
            ]),
            // Batch 5: Growth Trends
            getMonthlyStatsHelper(),
            // Batch 6: Real-time Feed
            Promise.all([
                Appointment.find()
                    .populate('patient', 'name')
                    .populate({
                        path: 'doctor',
                        populate: { path: 'user', select: 'name' }
                    })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .lean(),
                User.find()
                    .select('name email role createdAt')
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .lean()
            ]),
            // Batch 7: Top Doctors
            Doctor.find({ isVerified: true })
                .populate('user', 'name image')
                .sort({ ratings: -1, numReviews: -1, totalAppointments: -1 })
                .limit(5)
                .lean()
        ]);

        const [totalUsers, totalDoctors, totalPatients, totalAdmins] = userCounts;
        const [totalAppts, pendingAppts, confirmedAppts, completedAppts, cancelledAppts] = appointmentCounts;
        const [appointmentRevenue, orderRevenue] = revenueAggregates;
        const [totalReviews, averageRatingAgg] = reviewStats;
        const [recentAppointments, recentUsers] = recentActivities;

        const totalAppointmentRev = appointmentRevenue[0]?.total || 0;
        const totalOrderRev = orderRevenue[0]?.total || 0;
        const totalRevenue = totalAppointmentRev + totalOrderRev;

        // Ensure we don't send orphaned doctor documents to the frontend (doctors with deleted users)
        const validTopDoctors = topDoctors.filter(doc => doc.user != null);

        res.json({
            users: {
                total: totalUsers,
                doctors: totalDoctors,
                patients: totalPatients,
                admins: totalAdmins
            },
            appointments: {
                total: totalAppts,
                pending: pendingAppts,
                confirmed: confirmedAppts,
                completed: completedAppts,
                cancelled: cancelledAppts
            },
            revenue: {
                total: totalRevenue,
                appointments: totalAppointmentRev,
                orders: totalOrderRev
            },
            reviews: {
                total: totalReviews,
                averageRating: averageRatingAgg[0]?.avgRating?.toFixed(1) || 0
            },
            monthlyStats,
            recentActivities: {
                appointments: recentAppointments,
                users: recentUsers
            },
            topDoctors: validTopDoctors
        });
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ message: 'Error retrieving dashboard statistics', error: error.message });
    }
};

// @desc    Get monthly statistics for charts
// @route   GET /api/admin/stats/monthly
// @access  Private/Admin
const getMonthlyStats = async (req, res) => {
    try {
        const stats = await getMonthlyStatsHelper();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function for monthly statistics
const getMonthlyStatsHelper = async () => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
        });
    }

    const monthlyData = await Promise.all(
        months.map(async (month) => {
            const users = await User.countDocuments({
                createdAt: { $gte: month.start, $lte: month.end }
            });

            const appointments = await Appointment.countDocuments({
                createdAt: { $gte: month.start, $lte: month.end }
            });

            const revenue = await Appointment.aggregate([
                {
                    $match: {
                        createdAt: { $gte: month.start, $lte: month.end },
                        status: 'Completed',
                        paymentStatus: 'Paid'
                    }
                },
                { $group: { _id: null, total: { $sum: '$fee' } } }
            ]);

            return {
                month: month.month,
                year: month.year,
                users,
                appointments,
                revenue: revenue[0]?.total || 0
            };
        })
    );

    return monthlyData;
};

// @desc    Get user demographics
// @route   GET /api/admin/stats/demographics
// @access  Private/Admin
const getUserDemographics = async (req, res) => {
    try {
        const ageGroups = await Patient.aggregate([
            {
                $match: { dob: { $exists: true } }
            },
            {
                $project: {
                    age: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), '$dob'] },
                                { $multiply: [365.25, 24, 60, 60, 1000] }
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lt: ['$age', 18] }, then: 'Under 18' },
                                { case: { $and: [{ $gte: ['$age', 18] }, { $lt: ['$age', 30] }] }, then: '18-29' },
                                { case: { $and: [{ $gte: ['$age', 30] }, { $lt: ['$age', 45] }] }, then: '30-44' },
                                { case: { $and: [{ $gte: ['$age', 45] }, { $lt: ['$age', 60] }] }, then: '45-59' },
                                { case: { $gte: ['$age', 60] }, then: '60+' }
                            ],
                            default: 'Unknown'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Gender distribution
        const genderStats = await Patient.aggregate([
            {
                $group: {
                    _id: '$gender',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Location distribution (top 10)
        const locationStats = await Patient.aggregate([
            {
                $match: {
                    address: { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$address',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            ageGroups,
            genderStats,
            locationStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get appointment analytics
// @route   GET /api/admin/stats/appointments
// @access  Private/Admin
const getAppointmentAnalytics = async (req, res) => {
    try {
        // Status distribution
        const statusStats = await Appointment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Popular specialties
        const specialtyStats = await Appointment.aggregate([
            {
                $lookup: {
                    from: 'doctors',
                    localField: 'doctor',
                    foreignField: '_id',
                    as: 'doctorInfo'
                }
            },
            { $unwind: '$doctorInfo' },
            {
                $group: {
                    _id: '$doctorInfo.specialization',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Hourly booking patterns
        const hourlyStats = await Appointment.aggregate([
            {
                $group: {
                    _id: { $hour: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Weekly patterns
        const weeklyStats = await Appointment.aggregate([
            {
                $group: {
                    _id: { $dayOfWeek: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        res.json({
            statusStats,
            specialtyStats,
            hourlyStats,
            weeklyStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get revenue analytics
// @route   GET /api/admin/stats/revenue
// @access  Private/Admin
const getRevenueAnalytics = async (req, res) => {
    try {
        // Revenue by payment method
        const paymentMethodStats = await Appointment.aggregate([
            {
                $match: { paymentStatus: 'Paid' }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$fee' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Revenue by specialty
        const specialtyRevenue = await Appointment.aggregate([
            {
                $match: { paymentStatus: 'Paid' }
            },
            {
                $lookup: {
                    from: 'doctors',
                    localField: 'doctor',
                    foreignField: '_id',
                    as: 'doctorInfo'
                }
            },
            { $unwind: '$doctorInfo' },
            {
                $group: {
                    _id: '$doctorInfo.specialization',
                    total: { $sum: '$fee' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        // Monthly revenue trend
        const monthlyRevenue = await getMonthlyStatsHelper();

        res.json({
            paymentMethodStats,
            specialtyRevenue,
            monthlyRevenue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get system health metrics
// @route   GET /api/admin/stats/health
// @access  Private/Admin
const getSystemHealth = async (req, res) => {
    try {
        // Database connection status
        const dbStatus = 'Connected'; // Assuming connection is established

        // Active users (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsers = await User.countDocuments({
            lastLogin: { $gte: twentyFourHoursAgo }
        });

        // Pending notifications
        const unreadNotifications = await Notification.countDocuments({ read: false });

        // System uptime (mock - would need actual implementation)
        const uptime = process.uptime();

        // Error rate (would need logging system)
        const errorRate = 0; // Placeholder

        res.json({
            database: dbStatus,
            activeUsers,
            unreadNotifications,
            uptime: Math.floor(uptime),
            errorRate
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getMonthlyStats,
    getUserDemographics,
    getAppointmentAnalytics,
    getRevenueAnalytics,
    getSystemHealth
};