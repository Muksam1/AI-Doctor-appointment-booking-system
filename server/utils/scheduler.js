const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { sendEmail } = require('../config/sendEmail');
const { createNotification } = require('../controllers/notificationController');

/**
 * Automated Appointment Reminder Scheduler
 * Runs every hour to check for appointments happening in the next 24 hours.
 */
const initReminders = () => {
    // Schedule: Every hour at the top of the hour
    // For testing, you could use '* * * * *' to run every minute
    cron.schedule('0 * * * *', async () => {
        console.log('--- Running Appointment Reminder Job ---');
        
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            
            // Find confirmed appointments within the next 24 hours that haven't been reminded yet
            // We look for any appointment whose 'date' is between 'now' and 'tomorrow' 
            // and the 'reminded' flag is false.
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

                // 1. Send Email Notification
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

                // 2. Create In-App Notification
                await createNotification(
                    patient._id,
                    'reminder',
                    'Upcoming Appointment',
                    `Reminder: You have an appointment with Dr. ${doctorName} tomorrow at ${apptTime}.`,
                    { appointment: appointment._id }
                );

                // 3. Mark as reminded
                appointment.reminded = true;
                appointment.remindedAt = new Date();
                await appointment.save();
                
                console.log(`Sent reminder for appointment ID: ${appointment._id}`);
            }

        } catch (error) {
            console.error('Error in Appointment Reminder Job:', error);
        }
    });
};

module.exports = { initReminders };
