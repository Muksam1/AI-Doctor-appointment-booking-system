const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

dotenv.config();

const ALLOWED_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
    'icloud.com', 'me.com', 'mac.com', 'aol.com', 
    'protonmail.com', 'proton.me', 'zoho.com', 'ymail.com'
];

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Connected to MongoDB ---');

        // Find all unverified users
        const unverifiedUsers = await User.find({ isVerified: false });
        console.log(`Found ${unverifiedUsers.length} unverified users in total.`);

        let deletedCount = 0;

        for (const user of unverifiedUsers) {
            const domain = user.email.split('@')[1]?.toLowerCase();
            
            // If domain is NOT in the whitelist, we delete
            if (!ALLOWED_DOMAINS.includes(domain)) {
                console.log(`Cleaning up user: ${user.email} (Non-reputable domain: ${domain})`);
                
                // Cascade delete associated profile records
                if (user.role === 'doctor') {
                    await Doctor.deleteOne({ user: user._id });
                } else if (user.role === 'patient') {
                    await Patient.deleteOne({ user: user._id });
                }
                
                // Delete the user itself
                await User.deleteOne({ _id: user._id });
                deletedCount++;
            }
        }

        console.log('--- Cleanup Finished ---');
        console.log(`Total users deleted: ${deletedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error.message);
        process.exit(1);
    }
};

cleanup();
