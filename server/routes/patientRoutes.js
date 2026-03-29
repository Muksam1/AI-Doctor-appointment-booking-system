const express = require('express');
const router = express.Router();
const {
    getPatientProfile,
    updatePatientProfile,
    getPatientAppointments,
    getPatientDashboard,
    getMedicalRecords,
    getPatientReviews,
    updatePatientPreferences,
    getAllPatients
} = require('../controllers/patientController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public to doctor & patient (for chat contact list)
router.get('/all', protect, authorize('doctor', 'patient', 'admin'), getAllPatients);

// All routes below require patient authentication
router.use(protect);
router.use(authorize('patient'));

router.get('/profile', getPatientProfile);
router.put('/profile', updatePatientProfile);
router.get('/appointments', getPatientAppointments);
router.get('/dashboard', getPatientDashboard);
router.get('/medical-records', getMedicalRecords);
router.get('/reviews', getPatientReviews);
router.put('/preferences', updatePatientPreferences);

module.exports = router;