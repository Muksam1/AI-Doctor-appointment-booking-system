const express = require('express');
const {
    getAdminDashboard,
    getAllUsers,
    getAllDoctors,
    updateDoctorStatus,
    getAllAppointments,
    toggleUserBan,
    deleteUser,
    getRevenueAnalytics: getAdminRevenueAnalytics,
    getSystemSettings,
    updateSystemSettings,
    deleteAppointment,
    deleteAllAppointments
} = require('../controllers/adminController');
const { 
    getDashboardStats, 
    getMonthlyStats, 
    getUserDemographics, 
    getAppointmentAnalytics, 
    getRevenueAnalytics, 
    getSystemHealth 
} = require('../controllers/adminStatsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/doctors', protect, authorize('admin'), getAllDoctors);
router.get('/doctors/pending', protect, authorize('admin'), getAllDoctors);
router.get('/doctors/approved', protect, authorize('admin'), getAllDoctors);
router.put('/doctors/:id/verify', protect, authorize('admin'), updateDoctorStatus);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.delete('/user/:id', protect, authorize('admin'), deleteUser);
router.patch('/user/:id/ban', protect, authorize('admin'), toggleUserBan);
router.get('/stats', protect, authorize('admin'), getDashboardStats);
router.get('/stats/revenue', protect, authorize('admin'), getRevenueAnalytics);
router.get('/appointments', protect, authorize('admin'), getAllAppointments);
router.get('/settings', protect, authorize('admin'), getSystemSettings);
router.put('/settings', protect, authorize('admin'), updateSystemSettings);
router.delete('/appointments', protect, authorize('admin'), deleteAllAppointments);
router.delete('/appointments/:id', protect, authorize('admin'), deleteAppointment);

module.exports = router;
