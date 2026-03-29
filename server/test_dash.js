const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('./models/Review');
const Doctor = require('./models/Doctor');
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const doctor = await Doctor.findOne({ _id: '69c76251efec68109ad00cb7' }); // David White or whichever doc it is based on my earlier logs
        
        const doctorReviews = await Review.find({ doctor: doctor._id })
            .populate('patient', 'name image')
            .sort({ createdAt: -1 })
            .lean();
            
        console.log(`Reviews count for doctor ${doctor._id}: ${doctorReviews.length}`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();

