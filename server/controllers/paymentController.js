const axios = require('axios');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { sendEmail } = require('../config/sendEmail');

// Khalti Configuration
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key';
const KHALTI_PUBLIC_KEY = process.env.KHALTI_PUBLIC_KEY || 'test_public_key';
const KHALTI_BASE_URL = 'https://a.khalti.com/api/v2';

// eSewa Configuration
const ESEWA_MERCHANT_ID = process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_GATEWAY_URL = process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// Stripe Configuration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// @desc    Initialize Khalti Payment
// @route   POST /api/payments/khalti/initiate
// @access  Private
const initiateKhaltiPayment = async (req, res) => {
    try {
        const { appointmentId, orderId, amount } = req.body;
        const entityId = appointmentId || orderId;
        const type = appointmentId ? 'appointment' : 'order';

        const frontendUrl = getFrontendUrl();
        const payload = {
            return_url: `${frontendUrl}/payment-verification?${type}=${entityId}&gateway=khalti`,
            website_url: frontendUrl,
            amount: amount * 100, // Khalti expects amount in paisa
            purchase_order_id: entityId,
            purchase_order_name: type === 'appointment' ? `Doctor Consultation` : `Pharmacy Order`,
            customer_info: {
                name: req.user.name,
                email: req.user.email,
                phone: req.user.contact || '9800000000'
            }
        };

        const response = await axios.post(`${KHALTI_BASE_URL}/epayment/initiate/`, payload, {
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            success: true,
            payment_url: response.data.payment_url,
            pidx: response.data.pidx
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Khalti Payment
// @route   POST /api/payments/khalti/verify
// @access  Private
const verifyKhaltiPayment = async (req, res) => {
    try {
        const { pidx, appointmentId, type } = req.body; // type can be 'appointment' or 'order'

        const payload = { pidx };
        const response = await axios.post(`${KHALTI_BASE_URL}/epayment/lookup/`, payload, {
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'Completed') {
            let entityData = null;

            if (type === 'order') {
                const Order = require('../models/Order');
                const order = await Order.findById(appointmentId);
                if (order) {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.status = 'Processing';
                    await order.save();
                    entityData = { name: 'Order for Pharmacy Items', amount: order.totalPrice, user: order.user };
                }
            } else {
                const appointment = await Appointment.findById(appointmentId);
                if (appointment) {
                    appointment.paymentStatus = 'Paid';
                    appointment.paymentMethod = 'Khalti';
                    await appointment.save();
                    entityData = { name: 'Doctor Appointment', amount: appointment.fee, user: appointment.patient };
                }
            }

            if (entityData) {
                // Send confirmation email
                const user = await User.findById(entityData.user);
                await sendEmail({
                    to: user.email,
                    subject: 'Payment Successful',
                    html: `
                        <h2>Payment Successful via Khalti!</h2>
                        <p>Your ${entityData.name} has been confirmed.</p>
                        <p>Amount Paid: Rs. ${entityData.amount}</p>
                    `
                });
            }

            res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Initialize eSewa Payment
// @route   POST /api/payments/esewa/initiate
// @access  Private
const initiateEsewaPayment = async (req, res) => {
    try {
        const { appointmentId, orderId, amount } = req.body;
        const entityId = appointmentId || orderId;
        const type = appointmentId ? 'appointment' : 'order';

        const frontendUrl = getFrontendUrl();
        const transactionId = `TXN_${type}_${Date.now()}_${entityId}`;
        const successUrl = `${frontendUrl}/api/payments/esewa/verify`;
        const failureUrl = `${frontendUrl}/payment-failed`;

        let formData;

        if (ESEWA_GATEWAY_URL.includes('v2')) {
            // eSewa v2 format
            // Message string needs total_amount,transaction_uuid,product_code
            const message = `total_amount=${amount},transaction_uuid=${transactionId},product_code=${ESEWA_MERCHANT_ID}`;
            const hash = crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64');

            formData = {
                amount: amount,
                tax_amount: 0,
                total_amount: amount,
                transaction_uuid: transactionId,
                product_code: ESEWA_MERCHANT_ID,
                product_service_charge: 0,
                product_delivery_charge: 0,
                success_url: successUrl,
                failure_url: failureUrl,
                signed_field_names: 'total_amount,transaction_uuid,product_code',
                signature: hash
            };
        } else {
            // eSewa v1 format
            formData = {
                amt: amount,
                psc: 0,
                pdc: 0,
                txAmt: 0,
                tAmt: amount,
                pid: entityId,
                scd: ESEWA_MERCHANT_ID,
                su: successUrl,
                fu: failureUrl
            };
        }

        res.json({
            success: true,
            formData,
            payment_url: ESEWA_GATEWAY_URL
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify eSewa Payment
// @route   POST /api/payments/esewa/verify
// @access  Private
const verifyEsewaPayment = async (req, res) => {
    try {
        const { oid, amt, refId, type } = req.body; // type: appointment or order

        // Verify with eSewa
        const verificationUrl = `https://uat.esewa.com.np/epay/transrec?scd=${ESEWA_MERCHANT_ID}&rid=${refId}&pid=${oid}&amt=${amt}`;

        const response = await axios.get(verificationUrl);

        if (response.data.includes('<response_code>Success</response_code>')) {
             let entityData = null;

            if (type === 'order') {
                const Order = require('../models/Order');
                const order = await Order.findById(oid);
                if (order) {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.status = 'Processing';
                    await order.save();
                    entityData = { name: 'HealthSync Pharmacy Order', amount: order.totalPrice, user: order.user };
                }
            } else {
                const appointment = await Appointment.findById(oid);
                if (appointment) {
                    appointment.paymentStatus = 'Paid';
                    appointment.paymentMethod = 'eSewa';
                    await appointment.save();
                    entityData = { name: 'Medical Consultation', amount: appointment.fee, user: appointment.patient };
                }
            }

            if (entityData) {
                const user = await User.findById(entityData.user);
                await sendEmail({
                    to: user.email,
                    subject: 'Payment Successful',
                    html: `<h2>Success!</h2><p>Your payment for ${entityData.name} has been verified via eSewa. Amount: Rs. ${entityData.amount}</p>`
                });
            }

            res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
const createStripePaymentIntent = async (req, res) => {
    try {
        const { appointmentId, amount } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe expects amount in cents
            currency: 'usd',
            metadata: {
                appointmentId: appointmentId,
                patientId: req.user._id.toString()
            }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm Stripe Payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
const confirmStripePayment = async (req, res) => {
    try {
        const { paymentIntentId, appointmentId } = req.body;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            const appointment = await Appointment.findById(appointmentId);
            if (appointment) {
                appointment.paymentStatus = 'Paid';
                appointment.paymentMethod = 'Stripe';
                await appointment.save();

                // Send confirmation email
                const patient = await User.findById(appointment.patient);
                await sendEmail({
                    to: patient.email,
                    subject: 'Payment Successful - Appointment Confirmed',
                    html: `
                        <h2>Payment Successful!</h2>
                        <p>Your appointment has been confirmed.</p>
                        <p>Payment Method: Stripe</p>
                        <p>Amount: $${appointment.fee}</p>
                    `
                });
            }

            res.json({ success: true, message: 'Payment confirmed successfully' });
        } else {
            res.status(400).json({ message: 'Payment not completed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process Refund
// @route   POST /api/payments/refund
// @access  Private/Admin
const processRefund = async (req, res) => {
    try {
        const { appointmentId, reason } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (appointment.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: 'Appointment is not paid' });
        }

        // Process refund based on payment method
        let refundResult = false;

        if (appointment.paymentMethod === 'Stripe') {
            // Implement Stripe refund logic
            refundResult = true; // Placeholder
        } else if (appointment.paymentMethod === 'Khalti') {
            // Implement Khalti refund logic
            refundResult = true; // Placeholder
        } else if (appointment.paymentMethod === 'eSewa') {
            // Implement eSewa refund logic
            refundResult = true; // Placeholder
        }

        if (refundResult) {
            appointment.paymentStatus = 'Refunded';
            await appointment.save();

            // Send refund confirmation email
            const patient = await User.findById(appointment.patient);
            await sendEmail({
                to: patient.email,
                subject: 'Refund Processed',
                html: `
                    <h2>Refund Processed</h2>
                    <p>Your refund has been processed successfully.</p>
                    <p>Appointment ID: ${appointment._id}</p>
                    <p>Amount Refunded: Rs. ${appointment.fee}</p>
                    <p>Reason: ${reason}</p>
                `
            });

            res.json({ success: true, message: 'Refund processed successfully' });
        } else {
            res.status(500).json({ message: 'Refund processing failed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify eSewa Payment via GET (callback URL)
// @route   GET /api/payments/esewa/verify
// @access  Public
const verifyEsewaPaymentCallback = async (req, res) => {
    try {
        let { oid, amt, refId } = req.query; 
        let type = req.query.type || 'appointment';
        const data = req.query.data;

        // Handle eSewa v2 callback data
        if (data) {
            try {
                const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
                amt = (decodedData.total_amount || decodedData.amount)?.toString().replace(/,/g, '');
                refId = decodedData.transaction_code || decodedData.refId;
                const transaction_uuid = decodedData.transaction_uuid;
                
                // Extract original entityId and type if it was prefixed (e.g., TXN_appointment_1743..._id)
                if (transaction_uuid && transaction_uuid.startsWith('TXN_')) {
                    const parts = transaction_uuid.split('_');
                    oid = parts[parts.length - 1]; // Take the last part which is our ID
                    if (parts.length >= 3) {
                        type = parts[1]; // appointment or order
                    }
                } else if (transaction_uuid) {
                    oid = transaction_uuid;
                }
            } catch (err) {
                console.error("Error decoding eSewa data:", err);
            }
        }

        if (!oid || !amt || !refId) {
             const frontendUrl = getFrontendUrl();
             // Include debug info if parameters are missing
             const debugInfo = `oid=${oid}&amt=${amt}&refId=${refId}&hasData=${!!data}`;
             return res.redirect(`${frontendUrl}/payment-verification?status=error&message=MissingParameters&debug=${encodeURIComponent(debugInfo)}`);
        }

        const isV2 = ESEWA_GATEWAY_URL.includes('v2');
        let isSuccess = false;

        if (isV2) {
            // eSewa v2 Verification (GET)
            try {
                // Get the original transaction_uuid from the callback 'data'
                let tx_uuid = oid; 
                if (data) {
                    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
                    tx_uuid = decodedData.transaction_uuid;
                }

                // Correct eSewa v2 status check URL (GET request)
                const v2VerifyUrl = `https://rc-epay.esewa.com.np/api/epay/transaction/status/?product_code=${ESEWA_MERCHANT_ID}&total_amount=${amt}&transaction_uuid=${tx_uuid}`;
                const v2Response = await axios.get(v2VerifyUrl);

                if (v2Response.data && v2Response.data.status === 'COMPLETE') {
                    isSuccess = true;
                }
            } catch (err) {
                console.error("eSewa v2 verification failed:", err.response?.data || err.message);
                // Fallback to v1 verification just in case
                const v1UrlFallback = `https://rc-epay.esewa.com.np/api/epay/main/v2/verify?scd=${ESEWA_MERCHANT_ID}&rid=${refId}&pid=${oid}&amt=${amt}`;
                const fallbackRes = await axios.get(v1UrlFallback).catch(() => ({ data: "" }));
                if (fallbackRes.data.includes('<response_code>Success</response_code>') || fallbackRes.data.includes('COMPLETE')) {
                    isSuccess = true;
                }
            }
        } else {
            // eSewa v1 Verification (GET)
            const verificationUrl = `https://uat.esewa.com.np/epay/transrec?scd=${ESEWA_MERCHANT_ID}&rid=${refId}&pid=${oid}&amt=${amt}`;
            const response = await axios.get(verificationUrl).catch(() => ({ data: "" }));
            if (response.data.includes('<response_code>Success</response_code>')) {
                isSuccess = true;
            }
        }

        if (isSuccess) {
            // Update database
            const Order = require('../models/Order');
            if (type === 'order') {
                await Order.findByIdAndUpdate(oid, { isPaid: true, paidAt: Date.now(), status: 'Processing' });
            } else {
                await Appointment.findByIdAndUpdate(oid, { paymentStatus: 'Paid', paymentMethod: 'eSewa' });
            }
            
            // If it's an API call (from frontend), return JSON
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.json({ success: true, message: 'Payment verified successfully' });
            }

            // If it's a redirect from eSewa, go to the frontend verification page
            return res.redirect(`${frontendUrl}/payment-verification?gateway=esewa&oid=${oid}&amt=${amt}&refId=${refId}&status=success&type=${type}`);
        } else {
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ message: 'Payment verification failed' });
            }
            return res.redirect(`${frontendUrl}/payment-verification?gateway=esewa&status=failure&oid=${oid}`);
        }
    } catch (error) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ message: error.message });
        }
        const frontendUrl = getFrontendUrl();
        return res.redirect(`${frontendUrl}/payment-verification?gateway=esewa&status=error&error=${encodeURIComponent(error.message)}`);
    }
};

module.exports = {
    initiateKhaltiPayment,
    verifyKhaltiPayment,
    initiateEsewaPayment,
    verifyEsewaPayment,
    verifyEsewaPaymentCallback,
    createStripePaymentIntent,
    confirmStripePayment,
    processRefund
};
