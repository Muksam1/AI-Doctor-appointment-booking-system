const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { getDoctorDashboard } = require('./controllers/doctorController');
const Doctor = require('./models/Doctor');
const User = require('./models/User');
const Review = require('./models/Review');

dotenv.config();

const testController = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const firstReview = await Review.findOne();
        if (!firstReview) throw new Error('No reviews found');
        const doctor = await Doctor.findOne({ _id: firstReview.doctor });
        if (!doctor) throw new Error('Doctor not found');

        const req = {
            user: { _id: doctor.user }
        };

        const res = {
            status: (code) => {
                console.log('Status set to:', code);
                return res;
            },
            json: (data) => {
                console.log('JSON Output length of reviews:', data.reviews ? data.reviews.length : 'undefined');
                if (data.reviews && data.reviews.length > 0) {
                    console.log('First Review patient name:', data.reviews[0].patient?.name);
                } else {
                    console.log('Reviews empty. Full data:', JSON.stringify(data, null, 2));
                }
            }
        };

        await getDoctorDashboard(req, res);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

testController();
