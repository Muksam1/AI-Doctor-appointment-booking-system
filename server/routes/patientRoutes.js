const express = require('express');
const router = express.Router();
const { getPatientProfile, updatePatientProfile } = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile')
    .get(protect, getPatientProfile)
    .put(protect, updatePatientProfile);

module.exports = router;
