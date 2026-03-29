const express = require('express');
const router = express.Router();
const {
    createReview,
    getDoctorReviews,
    getMyReviews,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview,
    respondToReview
} = require('../controllers/reviewController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/doctor/:doctorId', getDoctorReviews);

// Protected routes
router.use(protect);

// Patient routes
router.post('/', authorize('patient'), createReview);
router.get('/my', authorize('patient'), getMyReviews);
router.put('/:id', authorize('patient'), updateReview);
router.delete('/:id', authorize('patient'), deleteReview);

// General user routes
router.put('/:id/helpful', markHelpful);
router.put('/:id/report', reportReview);

// Doctor routes
router.put('/:id/respond', authorize('doctor'), respondToReview);

module.exports = router;