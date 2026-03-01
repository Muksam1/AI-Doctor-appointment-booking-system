const express = require('express');
const {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorDashboard,
    submitJoinApplication
} = require('../controllers/doctorController');
const { protect, doctor } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDoctors);
router.get('/dashboard', protect, doctor, getDoctorDashboard);
router.post('/join', protect, doctor, submitJoinApplication);
router.get('/:id', getDoctorById);
router.put('/profile', protect, doctor, updateDoctorProfile);

module.exports = router;
