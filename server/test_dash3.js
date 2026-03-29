const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('./models/Review');
const Doctor = require('./models/Doctor');
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const reviews = await Review.find().lean();
        if (reviews.length === 0) {
            console.log('No reviews in DB');
            process.exit(0);
        }

        const firstReview = reviews[0];
        console.log(`First Review for Doctor ID: ${firstReview.doctor}`);
        
        const doctorReviews = await Review.find({ doctor: firstReview.doctor })
            .populate('patient', 'name image')
            .sort({ createdAt: -1 })
            .lean();
            
        console.log(`Fetched reviews count: ${doctorReviews.length}`);
        console.log(JSON.stringify(doctorReviews[0], null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
