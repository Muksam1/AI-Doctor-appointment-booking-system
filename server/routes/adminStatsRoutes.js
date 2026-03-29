const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getMonthlyStats,
    getUserDemographics,
    getAppointmentAnalytics,
    getRevenueAnalytics,
    getSystemHealth
} = require('../controllers/adminStatsController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/monthly', getMonthlyStats);
router.get('/demographics', getUserDemographics);
router.get('/appointments', getAppointmentAnalytics);
router.get('/revenue', getRevenueAnalytics);
router.get('/health', getSystemHealth);

module.exports = router;