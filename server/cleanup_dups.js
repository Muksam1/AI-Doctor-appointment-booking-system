const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const cleanupDuplicates = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to cleanup duplicates...');

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

        console.log(`Found ${dups.length} duplicate groups. cleaning up...`);

        for (const group of dups) {
            // Keep the first (oldest) one, delete others
            const [toKeep, ...toDelete] = group.ids;
            const result = await Appointment.deleteMany({ _id: { $in: toDelete } });
            console.log(`- Kept ${toKeep}, deleted ${result.deletedCount} others at ${group._id.date} @ ${group._id.timeSlot}`);
        }

        console.log('\n--- Syncing Indexes... ---');
        await Appointment.syncIndexes();
        console.log('Indexes Synced! Double booking protection is now active.');

        await mongoose.disconnect();
        console.log('Cleanup Complete.');

    } catch (err) {
        console.error(err);
    }
};

cleanupDuplicates();
