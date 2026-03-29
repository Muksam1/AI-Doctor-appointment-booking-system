const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('./models/Review');
const Doctor = require('./models/Doctor');
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const doctors = await Doctor.find().lean();
        for (const doc of doctors) {
            const reviews = await Review.find({ doctor: doc._id }).lean();
            console.log(`Doctor ID: ${doc._id}, found ${reviews.length} reviews`);
            if (reviews.length > 0) {
                console.log('Reviews:', JSON.stringify(reviews, null, 2));
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
