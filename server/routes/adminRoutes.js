const express = require('express');
const {
    getPendingDoctors,
    verifyDoctor,
    getApprovedDoctors,
    getAllUsers
} = require('../controllers/adminController');
const { getAdminStats } = require('../controllers/adminStatsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/doctors/pending', protect, admin, getPendingDoctors);
router.get('/doctors/approved', protect, admin, getApprovedDoctors);
router.put('/doctors/:id/verify', protect, admin, verifyDoctor);
router.get('/users', protect, admin, getAllUsers);
router.get('/stats', protect, admin, getAdminStats);

module.exports = router;
