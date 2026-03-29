const express = require('express');
const {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorDashboard,
    applyForDoctor,
    setDoctorAvailability
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDoctors);
router.get('/dashboard', protect, authorize('doctor', 'admin', 'patient'), getDoctorDashboard);
router.post('/join', protect, applyForDoctor);
router.get('/:id', getDoctorById);
router.put('/profile', protect, authorize('doctor'), updateDoctorProfile);
router.put('/availability', protect, authorize('doctor'), setDoctorAvailability);

module.exports = router;
