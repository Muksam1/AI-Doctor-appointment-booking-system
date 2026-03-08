const express = require('express');
const {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorDashboard,
    submitJoinApplication
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDoctors);
router.get('/dashboard', protect, authorize('doctor'), getDoctorDashboard);
router.post('/join', protect, authorize('doctor'), submitJoinApplication);
router.get('/:id', getDoctorById);
router.put('/profile', protect, authorize('doctor'), updateDoctorProfile);

module.exports = router;
