const express = require('express');
const {
    getPendingDoctors,
    verifyDoctor,
    getApprovedDoctors,
    getAllUsers,
    deleteUser,
    toggleBanUser,
    getAllOrders,
    updateOrderStatus
} = require('../controllers/adminController');
const { getAdminStats } = require('../controllers/adminStatsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/doctors/pending', protect, authorize('admin'), getPendingDoctors);
router.get('/doctors/approved', protect, authorize('admin'), getApprovedDoctors);
router.put('/doctors/:id/verify', protect, authorize('admin'), verifyDoctor);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.delete('/user/:id', protect, authorize('admin'), deleteUser);
router.patch('/user/:id/ban', protect, authorize('admin'), toggleBanUser);
router.get('/stats', protect, authorize('admin'), getAdminStats);
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.put('/orders/:id/status', protect, authorize('admin'), updateOrderStatus);

module.exports = router;
