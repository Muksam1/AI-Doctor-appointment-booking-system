const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('./models/Review');
const Doctor = require('./models/Doctor');
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const doctor = await Doctor.findOne({ _id: '69c76251efec68109ad00cb8' }); // David White
        
        if (!doctor) {
            console.log('Doctor not found');
            process.exit(1);
        }

        const doctorReviews = await Review.find({ doctor: doctor._id })
            .populate({ path: 'patient', select: 'name image' })
            .sort({ createdAt: -1 })
            .lean();
            
        console.log(`Reviews count for doctor ${doctor._id}: ${doctorReviews.length}`);
        console.log(JSON.stringify(doctorReviews, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
