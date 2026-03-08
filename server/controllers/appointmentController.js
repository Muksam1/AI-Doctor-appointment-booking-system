const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// @desc    Book an appointment
// @route   POST /api/appointments
// @access  Private/Patient
const bookAppointment = async (req, res) => {
    const { doctorId, date, timeSlot } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
        doctor: doctorId,
        date: new Date(date),
        timeSlot,
        status: { $ne: 'Cancelled' }
    });

    if (existingAppointment) {
        res.status(400);
        throw new Error('This time slot is already booked');
    }

    const appointment = await Appointment.create({
        patient: req.user._id,
        doctor: doctorId,
        date: new Date(date),
        timeSlot,
        fee: doctor.fee,
        status: 'Pending'
    });

    // Notify Admins
    const io = req.app.get('socketio');
    if (io) {
        io.to('admins').emit('adminNotification', {
            text: `New Booking! ${req.user.name} booked an appointment.`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'booking'
        });
    }

    res.status(201).json(appointment);
};

// @desc    Get patient appointments
// @route   GET /api/appointments/my
// @access  Private/Patient
const getMyAppointments = async (req, res) => {
    const appointments = await Appointment.find({ patient: req.user._id })
        .populate({
            path: 'doctor',
            populate: { path: 'user', select: 'name image' },
            select: 'user specialization fee'
        });
    res.json(appointments);
};

// @desc    Get doctor appointments
// @route   GET /api/appointments/doctor
// @access  Private/Doctor
const getDoctorAppointments = async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const appointments = await Appointment.find({ doctor: doctor._id }).populate('patient', 'name email contact image');
    res.json(appointments);
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor or Admin)
const updateAppointmentStatus = async (req, res) => {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (appointment) {
        appointment.status = status;
        const updatedAppointment = await appointment.save();
        res.json(updatedAppointment);
    } else {
        res.status(404);
        throw new Error('Appointment not found');
    }
};

// @desc    Get booked slots for a doctor on a specific date
// @route   GET /api/appointments/booked-slots/:doctorId/:date
// @access  Public
const getBookedSlots = async (req, res) => {
    const { doctorId, date } = req.params;

    const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        date: new Date(date),
        status: { $ne: 'Cancelled' }
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map(app => app.timeSlot);
    res.json(bookedSlots);
};

module.exports = {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    getBookedSlots
};
