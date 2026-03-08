const express = require('express');
const {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    getBookedSlots
} = require('../controllers/appointmentController');
const { protect, doctor, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/doctor', protect, doctor, getDoctorAppointments);
router.put('/:id/status', protect, updateAppointmentStatus);
router.get('/booked-slots/:doctorId/:date', getBookedSlots);

module.exports = router;
