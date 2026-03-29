const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

dotenv.config();

const cleanupAllUnverified = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Connected to MongoDB ---');

        // Find all unverified users regardless of domain
        const unverifiedUsers = await User.find({ isVerified: false });
        console.log(`Found ${unverifiedUsers.length} unverified users to delete.`);

        let deletedCount = 0;

        for (const user of unverifiedUsers) {
            console.log(`Deleting unverified user: ${user.email}`);
            
            // Cascade delete profile records
            if (user.role === 'doctor') {
                await Doctor.deleteOne({ user: user._id });
            } else if (user.role === 'patient') {
                await Patient.deleteOne({ user: user._id });
            }
            
            // Delete the user record
            await User.deleteOne({ _id: user._id });
            deletedCount++;
        }

        console.log('--- Cleanup Finished ---');
        console.log(`Total unverified users deleted: ${deletedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error.message);
        process.exit(1);
    }
};

cleanupAllUnverified();
