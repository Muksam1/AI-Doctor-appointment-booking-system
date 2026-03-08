const express = require('express');
const { createStripeIntent, initiateKhaltiPayment, initiateEsewaPayment, verifyPayment, verifyEsewaPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/stripe/create-intent', protect, createStripeIntent);
router.post('/khalti/initiate', protect, initiateKhaltiPayment);
router.post('/esewa/initiate', protect, initiateEsewaPayment);
router.get('/esewa/verify', protect, verifyEsewaPayment);
router.post('/verify', protect, verifyPayment);

module.exports = router;
