const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { sendEmail } = require('../config/sendEmail');
const { createNotification } = require('../controllers/notificationController');

/**
 * Automated Appointment Reminder Scheduler
 * Runs every hour to check for appointments happening in the next 24 hours.
 */
const initReminders = () => {
    // ── 1. APPOINTMENT REMINDERS — Every hour ──────────────────────────────────
    cron.schedule('0 * * * *', async () => {
        console.log('--- Running Appointment Reminder Job ---');
        
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            
            const upcomingAppointments = await Appointment.find({
                status: 'Confirmed',
                reminded: false,
                date: { 
                    $gte: now, 
                    $lte: tomorrow 
                }
            }).populate('patient', 'name email').populate('doctor', 'user').populate('doctor.user', 'name');

            console.log(`Found ${upcomingAppointments.length} upcoming appointments needing reminders.`);

            for (const appointment of upcomingAppointments) {
                const patient = appointment.patient;
                const doctorName = appointment.doctor.user.name;
                const apptDate = appointment.date.toDateString();
                const apptTime = appointment.timeSlot;

                // Send Email Reminder
                await sendEmail({
                    to: patient.email,
                    subject: 'HealSync Reminder: Upcoming Doctor Appointment Tomorrow',
                    html: `
                        <h2>Appointment Reminder</h2>
                        <p>Hello ${patient.name},</p>
                        <p>This is a friendly reminder of your upcoming appointment with <strong>Dr. ${doctorName}</strong>.</p>
                        <p><strong>Date:</strong> ${apptDate}</p>
                        <p><strong>Time Slot:</strong> ${apptTime}</p>
                        <hr />
                        <p>Please ensure you are available at least 10 minutes before the session starts.</p>
                        <p>Best regards,<br/>The HealSync Team</p>
                    `
                });

                // In-App Notification for Patient
                await createNotification(
                    patient._id,
                    'reminder',
                    'Appointment Reminder',
                    `Reminder: You have an appointment with Dr. ${doctorName} on ${apptDate} at ${apptTime}.`,
                    { appointment: appointment._id }
                );

                // Mark as reminded
                appointment.reminded = true;
                appointment.remindedAt = new Date();
                await appointment.save();
                
                console.log(`Sent reminder for appointment ID: ${appointment._id}`);
            }

        } catch (error) {
            console.error('Error in Appointment Reminder Job:', error);
        }
    });

    // ── 2. DAILY SCHEDULE SUMMARY — Every morning at 7:00 AM ──────────────────
    cron.schedule('0 7 * * *', async () => {
        console.log('--- Running Daily Schedule Summary Job ---');

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Get all doctors who have at least one appointment today
            const todayAppointments = await Appointment.find({
                date: { $gte: todayStart, $lte: todayEnd },
                status: { $in: ['Pending', 'Confirmed'] }
            }).select('doctor').lean();

            if (todayAppointments.length === 0) {
                console.log('No schedule summary needed — no appointments today.');
                return;
            }

            // Group by doctor
            const appointmentsByDoctor = {};
            for (const appt of todayAppointments) {
                const doctorId = appt.doctor.toString();
                appointmentsByDoctor[doctorId] = (appointmentsByDoctor[doctorId] || 0) + 1;
            }

            // Send a notification to each active doctor
            for (const [doctorId, count] of Object.entries(appointmentsByDoctor)) {
                const doctor = await Doctor.findById(doctorId).populate('user', '_id name').lean();
                if (!doctor || !doctor.user) continue;

                const greeting = `Good morning, Dr. ${doctor.user.name}!`;
                const summary = `You have ${count} appointment${count > 1 ? 's' : ''} scheduled for today.`;

                await createNotification(
                    doctor.user._id,
                    'reminder',
                    'Daily Schedule Summary',
                    `${greeting} ${summary}`,
                    { doctorId }
                );

                console.log(`Sent daily summary to Dr. ${doctor.user.name} (${count} appointments).`);
            }

        } catch (error) {
            console.error('Error in Daily Schedule Summary Job:', error);
        }
    });
};

module.exports = { initReminders };
