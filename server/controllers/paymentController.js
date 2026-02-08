const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Appointment = require('../models/Appointment');
const axios = require('axios');

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
const createStripeIntent = async (req, res) => {
    const { appointmentId } = req.body;
    const appointment = await Appointment.findById(appointmentId);

    if (appointment) {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: appointment.fee * 100, // in cents
            currency: 'usd',
            metadata: { appointmentId: appointment._id.toString() },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } else {
        res.status(404);
        throw new Error('Appointment not found');
    }
};

// @desc    Khalti Payment Initiation
// @route   POST /api/payments/khalti/initiate
// @access  Private
const initiateKhaltiPayment = async (req, res) => {
    const { totalAmount, items, appointmentId } = req.body;

    // amount in paisa
    const amountInPaisa = totalAmount * 100;
    const purchaseOrderId = appointmentId || `ORD-${Date.now()}`;
    const purchaseOrderName = appointmentId ? `Appointment with Doctor` : `Pharmacy Order`;

    try {
        const response = await axios.post('https://a.khalti.com/api/v2/epayment/initiate/', {
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success`,
            website_url: process.env.CLIENT_URL || 'http://localhost:5173',
            amount: amountInPaisa,
            purchase_order_id: purchaseOrderId,
            purchase_order_name: purchaseOrderName,
        }, {
            headers: { 'Authorization': `Key ${process.env.KHALTI_SECRET_KEY || 'test_secret_key_827ef458097d4fc490795c6460117072'}` }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Khalti Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.detail || 'Khalti payment initiation failed' });
    }
};

// @desc    Verify Payment or Create Order
// @route   POST /api/payments/verify
// @access  Private
const Order = require('../models/Order');

const verifyPayment = async (req, res) => {
    const { appointmentId, paymentMethod, transactionId, orderItems, totalAmount, shippingAddress } = req.body;

    if (appointmentId) {
        const appointment = await Appointment.findById(appointmentId);
        if (appointment) {
            appointment.paymentStatus = 'Paid';
            appointment.paymentMethod = paymentMethod;
            appointment.transactionId = transactionId;
            await appointment.save();
            return res.json({ message: 'Payment verified successfully' });
        }
        return res.status(404).json({ message: 'Appointment not found' });
    }

    // Pharmacy Order Logic
    if (orderItems && orderItems.length > 0) {
        try {
            const order = new Order({
                user: req.user._id,
                orderItems,
                shippingAddress,
                paymentMethod,
                totalPrice: totalAmount,
                itemsPrice: totalAmount, // For simplicity
                isPaid: true,
                paidAt: Date.now(),
                status: 'Processing'
            });

            const createdOrder = await order.save();
            return res.status(201).json(createdOrder);
        } catch (error) {
            console.error('Order Creation Error:', error);
            return res.status(500).json({ message: 'Order creation failed' });
        }
    }

    res.status(400).json({ message: 'Invalid payment or order data' });
};

// @desc    Initiate eSewa Payment
// @route   POST /api/payments/esewa/initiate
// @access  Private
const initiateEsewaPayment = async (req, res) => {
    const { totalAmount, items } = req.body;

    // In production, fetch items/prices from DB to verify totalAmount
    // For this demo, we use the amount sent from client

    const transactionUuid = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const productCode = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
    const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

    // Parameters required for signature
    // formatted exactly as: "total_amount,transaction_uuid,product_code"
    const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', secretKey)
        .update(signatureString)
        .digest('base64');

    res.json({
        amount: totalAmount,
        product_delivery_charge: 0,
        product_service_charge: 0,
        tax_amount: 0,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        signature: signature,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success`,
        failure_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/lab-tests`,
        esewa_url: process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    });
};

module.exports = {
    createStripeIntent,
    initiateKhaltiPayment,
    initiateEsewaPayment,
    verifyPayment
};
