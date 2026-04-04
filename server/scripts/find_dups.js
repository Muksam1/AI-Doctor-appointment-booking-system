const mongoose = require('mongoose');
const Appointment = require('../server/models/Appointment');
const DOTENV = require('dotenv').config({ path: '../server/.env' });

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const dups = await Appointment.aggregate([
            {
                $match: { status: { $ne: 'Cancelled' } }
            },
            {
                $group: {
                    _id: { doctor: '$doctor', date: '$date', timeSlot: '$timeSlot' },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);
        console.log(`Found ${dups.length} sets of duplicates.`);
        dups.forEach(d => {
            console.log(`- ${d._id.date} @ ${d._id.timeSlot}: ${d.count} appointments`);
        });
        
        // OPTIONAL: Delete the dups if you want to Clean Up
        if (dups.length > 0) {
            console.log('Use a script to cleanup if you want to apply the index.');
        }
    } catch (err) {
        console.error(err);
    }
    await mongoose.disconnect();
};

run();
