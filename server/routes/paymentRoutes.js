const express = require('express');
const {
    createStripePaymentIntent,
    initiateKhaltiPayment,
    initiateEsewaPayment,
    verifyEsewaPayment,
    verifyEsewaPaymentCallback,
    verifyKhaltiPayment,
    confirmStripePayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/stripe/create-intent', protect, createStripePaymentIntent);
router.post('/khalti/initiate', protect, initiateKhaltiPayment);
router.post('/khalti/verify', protect, verifyKhaltiPayment);
router.post('/esewa/initiate', protect, initiateEsewaPayment);
router.get('/esewa/verify', verifyEsewaPaymentCallback);
router.post('/stripe/confirm', protect, confirmStripePayment);

module.exports = router;
