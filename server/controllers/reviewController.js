const Review = require('../models/Review');
const Doctor = require('../models/Doctor');

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
    const { doctorId, rating, comment } = req.body;

    const doctor = await Doctor.findById(doctorId);

    if (doctor) {
        const review = await Review.create({
            patient: req.user._id,
            doctor: doctorId,
            rating: Number(rating),
            comment,
        });

        // Update doctor rating
        const reviews = await Review.find({ doctor: doctorId });
        doctor.numReviews = reviews.length;
        doctor.ratings = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

        await doctor.save();
        res.status(201).json(review);
    } else {
        res.status(404);
        throw new Error('Doctor not found');
    }
};

// @desc    Get reviews for a doctor
// @route   GET /api/reviews/doctor/:id
// @access  Public
const getDoctorReviews = async (req, res) => {
    const reviews = await Review.find({ doctor: req.params.id }).populate('patient', 'name image');
    res.json(reviews);
};

module.exports = {
    createReview,
    getDoctorReviews,
};
