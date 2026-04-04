const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const sendEmail = require('../config/sendEmail');
const { createNotification } = require('./notificationController');

// Helper to parse date consistently (forcing start of day as UTC midnight)
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    // Use Date.UTC to ensure we are creating a date instance at midnight UTC
    return new Date(Date.UTC(year, month - 1, day));
};

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/appointments/slots/:doctorId/:date
// @access  Public
const getAvailableSlots = async (req, res) => {
    const { doctorId, date: dateStr } = req.params;

    try {
        const bookingDate = parseDate(dateStr);
        if (!bookingDate || isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const [doctor, existingAppointments] = await Promise.all([
            Doctor.findById(doctorId).select('availability customAvailability fee isVerified').lean(),
            Appointment.find({
                doctor: doctorId,
                date: bookingDate,
                status: { $in: ['Pending', 'Confirmed'] }
            }).select('timeSlot').lean()
        ]);

        if (!doctor || !doctor.isVerified) {
            return res.status(404).json({ message: 'Doctor not found or not currently active' });
        }

        // Check for specific date override first
        const targetDateStr = bookingDate.toISOString().split('T')[0];

        const specificDateAvailability = doctor.customAvailability?.find(item => {
            const itemDateStr = new Date(item.date).toISOString().split('T')[0];
            return itemDateStr === targetDateStr;
        });

        let dayAvailability;
        if (specificDateAvailability) {
            dayAvailability = specificDateAvailability.isAvailable ? specificDateAvailability : null;
        } else {
            const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            dayAvailability = doctor.availability.find(day => day.day === dayOfWeek && day.isAvailable);
        }

        if (!dayAvailability) {
            return res.json({ slots: [] });
        }

        const bookedSlots = existingAppointments.map(apt => apt.timeSlot);

        // Filter available slots
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = todayStr === targetDateStr;

        const availableSlots = (dayAvailability.slots || [])
            .filter(slot => {
                const isBooked = bookedSlots.includes(slot.startTime);
                
                if (isToday) {
                    // Filter out past slots for today
                    const [hours, minutes] = slot.startTime.split(':').map(Number);
                    
                    // Create slot time precisely using UTC parts to avoid server timezone interference
                    // but we compare against 'now' (current point in time)
                    const [y, m, d] = targetDateStr.split('-').map(Number);
                    
                    // We need to know the offset for comparison. 
                    // Assuming the application logic follows local time of the user/doctor.
                    // A safer way is to create a date object for the slot in the current day's context.
                    const slotDateTime = new Date(); 
                    slotDateTime.setHours(hours, minutes, 0, 0);

                    return !isBooked && slotDateTime > now;
                }
                
                return !isBooked;
            })
            .map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                fee: doctor.fee
            }));

        res.json({ slots: availableSlots });
    } catch (error) {
        console.error('getAvailableSlots Error:', error);
        res.status(500).json({ message: 'Server error retrieving availability' });
    }
};

// @desc    Book an appointment
// @route   POST /api/appointments
// @access  Private/Patient
const bookAppointment = async (req, res) => {
    const { doctorId, date: dateStr, timeSlot, notes } = req.body;

    try {
        if (!doctorId || !dateStr || !timeSlot) {
            return res.status(400).json({ message: 'Doctor, date, and time slot are required' });
        }

        const bookingDate = parseDate(dateStr);
        if (!bookingDate || isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const [doctor, existingAppointment, patientDoubleBooking, patient] = await Promise.all([
            Doctor.findById(doctorId).populate('user', 'name email'),
            Appointment.findOne({
                doctor: doctorId,
                date: bookingDate,
                timeSlot,
                status: { $ne: 'Cancelled' }
            }).lean(),
            Appointment.findOne({
                patient: req.user._id,
                date: bookingDate,
                timeSlot,
                status: { $ne: 'Cancelled' }
            }).lean(),
            User.findById(req.user._id).select('name email').lean()
        ]);

        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        if (!doctor.isVerified) return res.status(400).json({ message: 'Doctor is not verified for booking' });
        if (existingAppointment) return res.status(400).json({ message: 'This time slot is already taken' });
        if (patientDoubleBooking) return res.status(400).json({ message: 'You already have an appointment booked for this date and time' });
        if (!patient) return res.status(404).json({ message: 'Patient account not found' });

        // Check for specific date override first
        const targetDateStr = bookingDate.toISOString().split('T')[0];
        const specificDateAvailability = doctor.customAvailability?.find(item => {
            const itemDateStr = new Date(item.date).toISOString().split('T')[0];
            return itemDateStr === targetDateStr;
        });

        let dayAvailability;
        if (specificDateAvailability) {
            dayAvailability = specificDateAvailability.isAvailable ? specificDateAvailability : null;
        } else {
            const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            dayAvailability = doctor.availability.find(day => day.day === dayOfWeek && day.isAvailable);
        }
        
        if (!dayAvailability) {
            return res.status(400).json({ message: 'Doctor is not available on this day' });
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = todayStr === targetDateStr;

        const slot = dayAvailability.slots.find(slot => slot.startTime === timeSlot);
        if (!slot) {
            return res.status(400).json({ message: 'Invalid time slot for this doctor' });
        }

        if (isToday) {
            const [hours, minutes] = slot.startTime.split(':').map(Number);
            const slotTime = new Date(now);
            slotTime.setHours(hours, minutes, 0, 0);
            if (slotTime <= now) {
                return res.status(400).json({ message: 'This time slot has already passed' });
            }
        }

        // Create appointment and atomic increment
        const [appointment] = await Promise.all([
            Appointment.create({
                patient: req.user._id,
                doctor: doctorId,
                date: bookingDate,
                timeSlot,
                fee: doctor.fee,
                notes: notes || '',
                status: 'Pending'
            }),
            Doctor.findByIdAndUpdate(doctorId, { $inc: { totalAppointments: 1 } })
        ]);

        // Send email notifications
        try {
            await sendEmail({
                to: patient.email,
                subject: 'Appointment Booked Successfully',
                html: `
                    <h2>Appointment Confirmation</h2>
                    <p>Dear ${patient.name},</p>
                    <p>Your appointment has been booked successfully!</p>
                    <p><strong>Doctor:</strong> ${doctor.user.name}</p>
                    <p><strong>Date:</strong> ${bookingDate.toDateString()}</p>
                    <p><strong>Time:</strong> ${timeSlot}</p>
                    <p><strong>Fee:</strong> Rs. ${doctor.fee}</p>
                    <p><strong>Status:</strong> Pending (waiting for doctor approval)</p>
                    <p>You will receive a confirmation email once the doctor approves your appointment.</p>
                `
            });

            await sendEmail({
                to: doctor.user.email,
                subject: 'New Appointment Request',
                html: `
                    <h2>New Appointment Request</h2>
                    <p>Dear Dr. ${doctor.user.name},</p>
                    <p>You have a new appointment request from ${patient.name}.</p>
                    <p><strong>Date:</strong> ${bookingDate.toDateString()}</p>
                    <p><strong>Time:</strong> ${timeSlot}</p>
                    <p><strong>Patient Email:</strong> ${patient.email}</p>
                    <p>Please log in to your dashboard to approve or reject this appointment.</p>
                `
            });
        } catch (emailErr) {
            console.error('Failed to send appointment emails:', emailErr.message);
        }

        // Database Notification for Doctor
        await createNotification(
            doctor.user._id,
            'appointment',
            `New Request: ${bookingDate.toDateString()} at ${timeSlot}`,
            `You have a new appointment request from ${patient.name} for ${bookingDate.toDateString()} at ${timeSlot}`,
            { appointment: appointment._id }
        );

        // Self-Notification for Patient
        await createNotification(
            req.user._id,
            'appointment',
            `Booked: ${bookingDate.toDateString()} at ${timeSlot}`,
            `Your appointment with Dr. ${doctor.user.name} has been successfully booked for ${bookingDate.toDateString()} at ${timeSlot}.`,
            { appointment: appointment._id }
        );

        // Socket notification for real-time updates
        const io = req.app.get('socketio');
        if (io) {
            io.to(`doctor_${doctorId}`).emit('newAppointment', {
                appointment: appointment._id,
                patient: patient.name,
                date: bookingDate.toDateString(),
                time: timeSlot
            });
        }

        res.status(201).json({
            success: true,
            appointment,
            message: 'Appointment booked successfully. Waiting for doctor approval.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient appointments (with review status)
// @route   GET /api/appointments/my
// @access  Private/Patient
const getMyAppointments = async (req, res) => {
    try {
        const Appointment = require('../models/Appointment');
        const Review = require('../models/Review');

        const appointments = await Appointment.find({ patient: req.user._id })
            .populate({
                path: 'doctor',
                populate: { path: 'user', select: 'name image' },
                select: 'user specialization fee ratings numReviews'
            })
            .sort({ date: -1 });

        // Check which appointments already have reviews
        const apptIds = appointments.map(a => a._id);
        const reviews = await Review.find({ appointment: { $in: apptIds } }).select('appointment');
        const reviewedApptIds = reviews.map(r => r.appointment.toString());

        const appointmentsWithReviewStatus = appointments.map(appt => {
            const apptObj = appt.toObject();
            apptObj.reviewSubmitted = reviewedApptIds.includes(appt._id.toString());
            return apptObj;
        });

        res.json(appointmentsWithReviewStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get doctor appointments
// @route   GET /api/appointments/doctor
// @access  Private/Doctor
const getDoctorAppointments = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        const appointments = await Appointment.find({ doctor: doctor._id }).populate('patient', 'name email contact image');
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor or Admin)
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Logic check: Only the doctor assigned OR an admin can change this
        const doctorProfile = await Doctor.findOne({ user: req.user._id });
        const isSelfDoctor = doctorProfile && appointment.doctor.toString() === doctorProfile._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (isAdmin || isSelfDoctor) {
            const oldStatus = appointment.status;
            appointment.status = status;
            const updatedAppointment = await appointment.save();

            // Fetch patient and doctor details for the email
            const populatedAppt = await Appointment.findById(appointment._id)
                .populate('patient', 'name email')
                .populate({
                    path: 'doctor',
                    populate: { path: 'user', select: 'name' }
                });

            const patient = populatedAppt.patient;
            const doctor = populatedAppt.doctor;

            // Database Notification for patient
            let patientTitle = 'Appointment Status Update';
            let patientMessage = `Your appointment status has been updated to: ${status}`;

            if (status === 'Confirmed') {
                patientTitle = `Accepted: ${new Date(appointment.date).toDateString()} • ${appointment.timeSlot} ✅`;
                patientMessage = `Dr. ${doctor.user.name} has accepted your appointment request.`;
            } else if (status === 'Cancelled') {
                patientTitle = `Rejected: ${new Date(appointment.date).toDateString()} • ${appointment.timeSlot} ❌`;
                patientMessage = `Dr. ${doctor.user.name} has rejected your appointment request.`;

                // If patient already paid — trigger refund
                if (appointment.paymentStatus === 'Paid') {
                    appointment.paymentStatus = 'Refunded';
                    await appointment.save();

                    patientTitle = 'Appointment Rejected — Refund Initiated';
                    patientMessage = `Dr. ${doctor.user.name} has rejected your appointment for ${new Date(appointment.date).toDateString()} at ${appointment.timeSlot}. Since you already paid, a refund of Rs. ${appointment.fee} will be processed to your original payment method within 3–5 business days.`;

                    // Extra dedicated refund notification
                    await createNotification(
                        appointment.patient,
                        'payment',
                        `Refund: Rs. ${appointment.fee} for ${new Date(appointment.date).toDateString()} 💳`,
                        `A refund of Rs. ${appointment.fee} has been initiated for your cancelled appointment on ${new Date(appointment.date).toDateString()} with Dr. ${doctor.user.name}. It will arrive within 3–5 business days.`,
                        { appointment: appointment._id }
                    );
                }
            }

            await createNotification(
                appointment.patient,
                'appointment',
                patientTitle,
                patientMessage,
                { appointment: appointment._id }
            );

            // Self-Notification for the actionperformer (activity log)
            await createNotification(
                req.user._id,
                'system',
                'Status Updated',
                `You changed the appointment status to ${status} for ${patient.name}`,
                { appointment: appointment._id }
            );

            // Email Notification for patient
            if (status !== oldStatus) {
                try {
                    let subject = '';
                    let htmlContent = '';

                    if (status === 'Confirmed') {
                        subject = 'Appointment Confirmed - HealSync';
                        htmlContent = `
                            <h2>Appointment Confirmed</h2>
                            <p>Dear ${patient.name},</p>
                            <p>Your appointment with <strong>Dr. ${doctor.user.name}</strong> has been <strong>confirmed</strong>.</p>
                            <p><strong>Date:</strong> ${new Date(appointment.date).toDateString()}</p>
                            <p><strong>Time:</strong> ${appointment.timeSlot}</p>
                            <p>Please ensure you are available at the scheduled time.</p>
                            <p>Thank you for choosing HealSync!</p>
                        `;
                    } else if (status === 'Cancelled') {
                        const wasRefunded = populatedAppt.paymentStatus === 'Refunded';
                        subject = wasRefunded
                            ? 'Appointment Rejected — Refund Initiated | HealSync'
                            : 'Appointment Cancelled - HealSync';
                        htmlContent = `
                            <h2>Appointment ${wasRefunded ? 'Rejected' : 'Cancelled'}</h2>
                            <p>Dear ${patient.name},</p>
                            <p>Your appointment with <strong>Dr. ${doctor.user.name}</strong> on ${new Date(appointment.date).toDateString()} at ${appointment.timeSlot} has been <strong>${wasRefunded ? 'rejected by the doctor' : 'cancelled'}</strong>.</p>
                            ${wasRefunded ? `<p style="background:#f0fdf4;padding:12px;border-left:4px solid #16a34a;margin:12px 0;"><strong>💳 Refund Notice:</strong> Since your payment of <strong>Rs. ${appointment.fee}</strong> was already received, a refund will be processed to your original payment method within 3–5 business days.</p>` : ''}
                            <p>If you have any questions, please contact our support team.</p>
                            <p>Best regards,<br/>The HealSync Team</p>
                        `;
                    }

                    if (subject && htmlContent) {
                        await sendEmail({
                            to: patient.email,
                            subject: subject,
                            html: htmlContent
                        });
                    }
                } catch (emailErr) {
                    console.error('Failed to send status update email:', emailErr.message);
                }
            }

            // Socket notification for patient
            const io = req.app.get('socketio');
            if (io) {
                io.to(appointment.patient.toString()).emit('appointmentStatusUpdate', {
                    appointmentId: appointment._id,
                    status: status
                });
            }

            res.json(updatedAppointment);
        } else {
            res.status(403).json({ message: 'Not authorized to update this appointment status' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get booked slots for a doctor on a specific date
// @route   GET /api/appointments/booked-slots/:doctorId/:date
// @access  Public
const getBookedSlots = async (req, res) => {
    try {
        const { doctorId, date: dateStr } = req.params;
        const bookingDate = parseDate(dateStr);
        
        if (!bookingDate || isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const bookedAppointments = await Appointment.find({
            doctor: doctorId,
            date: bookingDate,
            status: { $ne: 'Cancelled' }
        }).select('timeSlot').lean();

        const bookedSlots = bookedAppointments.map(app => app.timeSlot);
        res.json(bookedSlots);
    } catch (error) {
        console.error('getBookedSlots Error:', error);
        res.status(500).json({ message: 'Error retrieving booked slots' });
    }
};

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private/Patient
const rescheduleAppointment = async (req, res) => {
    const { date: dateStr, timeSlot, notes } = req.body;

    try {
        if (!dateStr || !timeSlot) {
            return res.status(400).json({ message: 'Date and time slot are required' });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only the patient who booked it can reschedule
        if (appointment.patient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
        }

        // Must be at least 24 hours in advance (optional requirement)
        const apptFullDate = new Date(appointment.date);
        const [h, m] = appointment.timeSlot.split(':').map(Number);
        apptFullDate.setHours(h, m, 0, 0);

        if (apptFullDate.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
            return res.status(400).json({ message: 'Cannot reschedule less than 24 hours before the appointment' });
        }

        const newDate = parseDate(dateStr);
        if (!newDate || isNaN(newDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Check if the new slot is available
        const alreadyBooked = await Appointment.findOne({
            doctor: appointment.doctor,
            date: newDate,
            timeSlot,
            status: { $in: ['Pending', 'Confirmed'] },
            _id: { $ne: appointment._id } // exclude self
        });

        if (alreadyBooked) {
            return res.status(400).json({ message: 'The selected time slot is already taken' });
        }

        // Update appointment
        appointment.date = newDate;
        appointment.timeSlot = timeSlot;
        appointment.notes = notes || appointment.notes;
        appointment.status = 'Pending'; // Change back to pending for doctor re-approval if necessary
        appointment.reminded = false;   // Reset reminder flag
        
        const updatedAppointment = await appointment.save();

        // 1. Notify Doctor
        const doctor = await Doctor.findById(appointment.doctor).populate('user', 'name');
        await createNotification(
            doctor.user._id,
            'appointment',
            `Rescheduled: ${newDate.toDateString()} at ${timeSlot} 🔄`,
            `Patient ${req.user.name} has rescheduled their appointment to ${newDate.toDateString()} at ${timeSlot}.`,
            { appointment: appointment._id }
        );

        res.json({
            success: true,
            appointment: updatedAppointment,
            message: 'Appointment rescheduled successfully. Waiting for doctor re-approval.'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and download appointment invoice
// @route   GET /api/appointments/:id/invoice
// @access  Private
const getAppointmentInvoice = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient', 'name email')
            .populate({
                path: 'doctor',
                populate: { path: 'user', select: 'name' },
                select: 'user specialization'
            });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only patient or doctor or admin can view
        const isSelfPatient = appointment.patient._id.toString() === req.user._id.toString();
        const doctorProfile = await Doctor.findOne({ user: req.user._id });
        const isSelfDoctor = doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isSelfPatient && !isSelfDoctor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }

        const { generateInvoicePDF } = require('../utils/pdfGenerator');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${appointment._id}.pdf`);
        
        generateInvoicePDF(appointment, res);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and download appointment prescription
// @route   GET /api/appointments/:id/prescription
// @access  Private
const getAppointmentPrescription = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient', 'name email')
            .populate({
                path: 'doctor',
                populate: { path: 'user', select: 'name' },
                select: 'user specialization'
            });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only patient or doctor or admin can view
        const isSelfPatient = appointment.patient._id.toString() === req.user._id.toString();
        const doctorProfile = await Doctor.findOne({ user: req.user._id });
        const isSelfDoctor = doctorProfile && appointment.doctor._id.toString() === doctorProfile._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isSelfPatient && !isSelfDoctor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view this prescription' });
        }

        const { generatePrescriptionPDF } = require('../utils/pdfGenerator');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=prescription-${appointment._id}.pdf`);
        
        generatePrescriptionPDF(appointment, appointment.notes, res);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload digital prescription (doctor only)
// @route   PUT /api/appointments/:id/prescription/upload
// @access  Private/Doctor
const uploadPrescription = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify that the doctor is authorized to upload for this appointment
        const doctorProfile = await Doctor.findOne({ user: req.user._id });
        if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to upload prescription for this appointment' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Save the file path to the prescription field
        // Note: Using relative path from base server directory
        appointment.prescription = `${req.protocol}://${req.get('host')}/uploads/prescriptions/${req.file.filename}`;
        await appointment.save();

        // Notify patient
        await createNotification(
            appointment.patient,
            'appointment',
            'Prescription Available',
            `Dr. ${req.user.name} has uploaded your digital prescription.`,
            { appointment: appointment._id, prescription: appointment.prescription }
        );

        res.json({
            success: true,
            prescriptionUrl: appointment.prescription,
            message: 'Prescription uploaded successfully'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAvailableSlots,
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    updateAppointmentStatus,
    getBookedSlots,
    rescheduleAppointment,
    getAppointmentInvoice,
    getAppointmentPrescription,
    uploadPrescription
};
