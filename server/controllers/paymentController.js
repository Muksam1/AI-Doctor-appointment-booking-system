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
        const response = await axios.post(process.env.KHALTI_GATEWAY_URL || 'https://dev.khalti.com/api/v2/epayment/initiate/', {
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

            // Notify Admin
            const io = req.app.get('socketio');
            if (io) {
                io.to('admins').emit('adminNotification', {
                    text: `Payment Received! Appointment #${appointment._id.toString().slice(-6).toUpperCase()} confirmed.`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'appointment'
                });
            }

            return res.json({ message: 'Payment verified successfully' });
        }
        return res.status(404).json({ message: 'Appointment not found' });
    }

    // Pharmacy Order Logic
    if (orderItems && orderItems.length > 0) {
        try {
            const isCOD = paymentMethod === 'COD' || paymentMethod === 'Cod';
            const order = new Order({
                user: req.user._id,
                orderItems,
                shippingAddress,
                paymentMethod,
                totalPrice: totalAmount,
                itemsPrice: totalAmount, // For simplicity
                isPaid: !isCOD,
                paidAt: isCOD ? null : Date.now(),
                status: 'Processing'
            });

            const createdOrder = await order.save();

            // Emit notification if io is available
            const io = req.app.get('socketio');
            if (io) {
                // Notify User
                io.to(req.user._id.toString()).emit('receiveMessage', {
                    senderId: 'system',
                    text: `Your order #${createdOrder._id.toString().slice(-6).toUpperCase()} has been placed successfully!`,
                    type: 'text',
                    timestamp: new Date().toLocaleTimeString()
                });

                // Notify Al Admins
                io.to('admins').emit('adminNotification', {
                    text: `New Order! #${createdOrder._id.toString().slice(-6).toUpperCase()} placed by ${req.user.name}. Total: Rs. ${totalAmount}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'order'
                });
            }

            return res.status(201).json(createdOrder);
        } catch (error) {
            console.error('Order Creation Error:', error);
            return res.status(500).json({ message: 'Order creation failed', error: error.message });
        }
    }

    res.status(400).json({ message: 'Invalid payment or order data' });
};

// @desc    Initiate eSewa Payment
// @route   POST /api/payments/esewa/initiate
// @access  Private
const initiateEsewaPayment = async (req, res) => {
    const { appointmentId, totalAmount } = req.body;

    let amount;
    let transactionUuid;

    if (appointmentId) {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            res.status(404);
            throw new Error('Appointment not found');
        }
        amount = appointment.fee;
        transactionUuid = `${appointmentId}-${Date.now()}`;
    } else if (totalAmount) {
        amount = totalAmount;
        transactionUuid = `ORD-${Date.now()}`;
    } else {
        res.status(400);
        throw new Error('Appointment ID or Total Amount is required');
    }

    const productCode = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
    const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

    // Parameters for signature: total_amount,transaction_uuid,product_code
    const signatureString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', secretKey)
        .update(signatureString)
        .digest('base64');

    res.json({
        amount: amount,
        product_delivery_charge: 0,
        product_service_charge: 0,
        tax_amount: 0,
        total_amount: amount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        signature: signature,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-verification?gateway=esewa`,
        failure_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`,
        esewa_url: process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    });
};

// @desc    Verify eSewa Payment
// @route   GET /api/payments/esewa/verify
// @access  Private
const verifyEsewaPayment = async (req, res) => {
    const { encodedData } = req.query;

    if (!encodedData) {
        return res.status(400).json({ message: 'No data received from eSewa' });
    }

    try {
        // 1. Decode base64 data
        const decodedString = Buffer.from(encodedData, 'base64').toString('ascii');
        const decodedData = JSON.parse(decodedString);

        // 2. Validate status
        if (decodedData.status !== 'COMPLETE') {
            return res.status(400).json({ message: 'Payment status not complete', data: decodedData });
        }

        const uuidParts = decodedData.transaction_uuid.split('-');
        const idPrefix = uuidParts[0];

        if (idPrefix === 'ORD') {
            // It's a pharmacy order
            // Success page will handle the actual order creation from localStorage
            return res.json({ success: true, message: 'Payment verified successfully', isOrder: true });
        }

        // 3. Extract appointmentId from transactionUuid (we formatted it as appointmentId-timestamp)
        const appointmentId = idPrefix;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // 4. Update Appointment
        appointment.paymentStatus = 'Paid';
        appointment.paymentMethod = 'eSewa';
        appointment.transactionId = decodedData.transaction_code;
        await appointment.save();

        // Notify Admin
        const io = req.app.get('socketio');
        if (io) {
            io.to('admins').emit('adminNotification', {
                text: `eSewa Payment! Appointment #${appointment._id.toString().slice(-6).toUpperCase()} confirmed.`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'appointment'
            });
        }

        res.json({ success: true, message: 'Payment verified and appointment updated', appointment });
    } catch (error) {
        console.error('eSewa Verification Error:', error);
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

module.exports = {
    createStripeIntent,
    initiateKhaltiPayment,
    initiateEsewaPayment,
    verifyPayment,
    verifyEsewaPayment
};
