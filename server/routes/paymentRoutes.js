const express = require('express');
const { createStripeIntent, initiateKhaltiPayment, initiateEsewaPayment, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/stripe/create-intent', protect, createStripeIntent);
router.post('/khalti/initiate', protect, initiateKhaltiPayment);
router.post('/esewa/initiate', protect, initiateEsewaPayment);
router.post('/verify', protect, verifyPayment);

module.exports = router;
