const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private/Patient
const createReview = async (req, res) => {
    try {
        const { appointmentId, rating, title, comment } = req.body;

        // Find the appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'user')
            .populate('patient', 'name');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if appointment belongs to user
        // Handle both populated object and raw ObjectId scenarios
        const patientId = appointment.patient && appointment.patient._id 
            ? appointment.patient._id.toString() 
            : appointment.patient.toString();
            
        if (patientId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to review this appointment' });
        }

        // Check if appointment is completed
        if (appointment.status !== 'Completed') {
            return res.status(400).json({ message: 'Can only review completed appointments' });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({ appointment: appointmentId });
        if (existingReview) {
            return res.status(400).json({ message: 'Review already exists for this appointment' });
        }

        // Create review
        const review = await Review.create({
            patient: req.user._id,
            doctor: appointment.doctor._id,
            appointment: appointmentId,
            rating,
            title,
            comment,
            isVerified: true // Auto-verify for completed appointments
        });

        // Populate the review for response
        const populatedReview = await Review.findById(review._id)
            .populate('patient', 'name image')
            .populate('doctor', 'user')
            .populate('doctor.user', 'name');

        res.status(201).json({
            success: true,
            review: populatedReview,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a doctor
// @route   GET /api/reviews/doctor/:doctorId
// @access  Public
const getDoctorReviews = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const reviews = await Review.find({
            doctor: doctorId,
            isVerified: true,
            reported: false
        })
        .populate('patient', 'name image')
        .populate('appointment', 'date')
        .sort({ [sortBy]: sortOrder })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Review.countDocuments({
            doctor: doctorId,
            isVerified: true,
            reported: false
        });

        // Get rating statistics
        const ratingStats = await Review.aggregate([
            {
                $match: {
                    doctor: new (require('mongoose').Types.ObjectId)(doctorId),
                    isVerified: true,
                    reported: false
                }
            },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);

        res.json({
            reviews,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalReviews: total,
            ratingStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get patient's reviews
// @route   GET /api/reviews/my
// @access  Private/Patient
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ patient: req.user._id })
            .populate('doctor', 'user specialization')
            .populate('doctor.user', 'name image')
            .populate('appointment', 'date status')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private/Patient
const updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check ownership
        if (review.patient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this review' });
        }

        // Check if still editable (within 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (review.createdAt < thirtyDaysAgo) {
            return res.status(400).json({ message: 'Reviews can only be edited within 30 days' });
        }

        const { rating, title, comment } = req.body;

        review.rating = rating || review.rating;
        review.title = title || review.title;
        review.comment = comment || review.comment;

        await review.save();

        res.json({
            success: true,
            review,
            message: 'Review updated successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Patient
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check ownership
        if (review.patient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }

        await review.deleteOne();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.helpful += 1;
        await review.save();

        res.json({
            success: true,
            helpful: review.helpful
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report a review
// @route   PUT /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res) => {
    try {
        const { reason } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.reported = true;
        review.reportReason = reason;
        await review.save();

        res.json({
            success: true,
            message: 'Review reported successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Doctor respond to review
// @route   PUT /api/reviews/:id/respond
// @access  Private/Doctor
const respondToReview = async (req, res) => {
    try {
        const { response } = req.body;
        const review = await Review.findById(req.params.id).populate('doctor');

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user is the doctor
        if (review.doctor.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to respond to this review' });
        }

        review.response = {
            doctorResponse: response,
            respondedAt: new Date()
        };

        await review.save();

        res.json({
            success: true,
            review,
            message: 'Response added successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createReview,
    getDoctorReviews,
    getMyReviews,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview,
    respondToReview
};