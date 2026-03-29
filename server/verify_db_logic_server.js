const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const runVerification = async () => {
    try {
        console.log('--- Phase 1: DB Connection ---');
        await mongoose.connect(MONGODB_URI);
        await Appointment.syncIndexes();
        console.log('Connected and Indexes Synced!');

        console.log('\n--- Phase 2: User Setup ---');
        let doctor = await Doctor.findOne();
        let patient = await User.findOne({ role: 'patient' });

        if (!doctor || !patient) {
            console.error('Could not find both doctor and patient in DB.');
            process.exit(1);
        }

        console.log(`Doctor: ${doctor._id} | Patient: ${patient._id}`);

        console.log('\n--- Phase 3: Booking Test (Validation Check) ---');
        const bookingDate = new Date('2026-12-25T10:00:00'); // Way in future
        const timeSlot = '11:00';

        await Appointment.deleteMany({ doctor: doctor._id, date: bookingDate, timeSlot });

        try {
            const firstBooking = await Appointment.create({
                patient: patient._id,
                doctor: doctor._id,
                date: bookingDate,
                timeSlot: timeSlot,
                status: 'Confirmed',
                paymentStatus: 'Paid',
                fee: 500
            });
            console.log('Booking 1: Success!');
            
            // Try double booking
            try {
                await Appointment.create({
                    patient: patient._id,
                    doctor: doctor._id,
                    date: bookingDate,
                    timeSlot: timeSlot,
                    status: 'Confirmed',
                    paymentStatus: 'Paid',
                    fee: 500
                });
                console.error('ERROR: Double booking succeeded!');
            } catch (err) {
                if (err.code === 11000) {
                    console.log('✓ Success: Double booking BLOCKED by Unique Partial Index.');
                } else {
                    console.error('Unexpected error on double-booking:', err.message);
                }
            }
        } catch (err) {
            if (err.name === 'ValidationError') {
                console.error('Validation Errors:');
                Object.keys(err.errors).forEach(key => {
                    console.error(` - ${key}: ${err.errors[key].message}`);
                });
            } else {
                console.error('Other error during booking:', err);
            }
        }

        await mongoose.disconnect();
        console.log('\nDone.');
    } catch (err) {
        console.error('Script Failed:', err);
    }
};

runVerification();
