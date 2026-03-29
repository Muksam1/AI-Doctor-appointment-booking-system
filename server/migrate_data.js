const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const Appointment = require('./models/Appointment');

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const migrateData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Migrating records...');

        // 1. Migrate Approved -> Confirmed
        const result = await Appointment.updateMany(
            { status: 'Approved' },
            { $set: { status: 'Confirmed' } }
        );
        console.log(`Migrated ${result.modifiedCount} 'Approved' records to 'Confirmed'.`);

        // 2. Clear out any duplicates that might have been hidden by status name differences
        console.log('\nScanning for duplicates across all non-cancelled statuses...');
        const dups = await Appointment.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { 
              $group: { 
                _id: { doctor: '$doctor', date: '$date', timeSlot: '$timeSlot' }, 
                ids: { $push: '$_id' }, 
                count: { $sum: 1 } 
              } 
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        for (const group of dups) {
            const [toKeep, ...toDelete] = group.ids;
            await Appointment.deleteMany({ _id: { $in: toDelete } });
            console.log(` - Resolved ${group.count} duplicates for ${group._id.date} @ ${group._id.timeSlot}`);
        }

        // 3. Create the unique index explicitly
        console.log('\n--- Syncing Indexes... ---');
        // Mongoose 9.x might need explicitly on the collection if it's struggling
        await Appointment.collection.dropIndexes().catch(() => {}); // Optional: fresh start
        await Appointment.syncIndexes();
        console.log('✓ Unique index successfully applied!');

        await mongoose.disconnect();
        console.log('Migration Complete.');
    } catch (err) {
        console.error('Migration Failed:', err);
    }
};

migrateData();
