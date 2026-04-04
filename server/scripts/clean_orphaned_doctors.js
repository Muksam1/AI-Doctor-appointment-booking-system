const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Doctor = require('./models/Doctor');
const User = require('./models/User');

dotenv.config();

const cleanOrphanedDoctors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find all doctors
        const doctors = await Doctor.find({});
        
        let deletedCount = 0;
        for (const doc of doctors) {
            // Check if user exists
            const user = await User.findById(doc.user);
            if (!user) {
                console.log(`Deleting orphaned doctor ${doc._id} (no associated user found)`);
                await Doctor.deleteOne({ _id: doc._id });
                deletedCount++;
            }
        }
        
        console.log(`Successfully deleted ${deletedCount} orphaned doctor(s).`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanOrphanedDoctors();
