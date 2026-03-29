const express = require('express');
const {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    getBookedSlots,
    rescheduleAppointment,
    getAppointmentInvoice,
    getAppointmentPrescription,
    uploadPrescription,
    getAvailableSlots
} = require('../controllers/appointmentController');
const { protect, doctor, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/doctor', protect, doctor, getDoctorAppointments);
router.put('/:id/status', protect, updateAppointmentStatus);
router.get('/slots/:doctorId/:date', getAvailableSlots);
router.get('/booked-slots/:doctorId/:date', getBookedSlots);
router.put('/:id/reschedule', protect, rescheduleAppointment);
router.get('/:id/invoice', protect, getAppointmentInvoice);
router.get('/:id/prescription', protect, getAppointmentPrescription);
router.put('/:id/prescription/upload', protect, doctor, upload.single('prescription'), uploadPrescription);

module.exports = router;
