import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const PaymentVerification = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Checking payment status...');

    const gateway = searchParams.get('gateway');
    const appointmentId = searchParams.get('appointment');
    const orderId = searchParams.get('order');
    const pidx = searchParams.get('pidx'); // Khalti
    const oid = searchParams.get('oid');  // eSewa
    const amt = searchParams.get('amt');
    const refId = searchParams.get('refId');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // Determine what we are verifying: Appointment or Order
                const entityId = appointmentId || orderId;
                const entityType = appointmentId ? 'appointment' : 'order';

                if (gateway === 'khalti' && pidx) {
                    const { data } = await axios.post('/api/payments/khalti/verify', { pidx, appointmentId: entityId, type: entityType });
                    if (data.success) {
                        setStatus('success');
                        setMessage('Payment verified via Khalti! Your appointment is now awaiting the doctor\'s confirmation.');
                    }
                } else if (gateway === 'esewa' && oid && amt && refId) {
                    const { data } = await axios.get('/api/payments/esewa/verify', {
                        params: { oid, amt, refId, type: entityType }
                    });
                    if (data.success) {
                        setStatus('success');
                        setMessage('Payment verified via eSewa! Your appointment is now awaiting the doctor\'s confirmation.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Missing valid payment parameters.');
                }
            } catch (err) {
                console.error("Verification Error:", err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Please contact support.');
            }
        };

        verifyPayment();
    }, [gateway, appointmentId, orderId, pidx, oid, amt, refId]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-healsync-bg p-6">
            <div className="bg-white p-12 rounded-[3rem] shadow-healsync border border-healsync-border max-w-lg w-full text-center space-y-8 animate-fade-up">
                {status === 'verifying' && (
                    <div className="space-y-6">
                        <div className="w-24 h-24 bg-healsync-indigo/10 rounded-full flex items-center justify-center mx-auto">
                            <FaSpinner className="text-4xl text-healsync-indigo animate-spin" />
                        </div>
                        <h2 className="text-3xl font-black text-[#111827]">Verifying Payment</h2>
                        <p className="text-healsync-grey font-medium">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-24 h-24 bg-healsync-mint/10 rounded-full flex items-center justify-center mx-auto">
                            <FaCheckCircle className="text-5xl text-healsync-mint" />
                        </div>
                        <h2 className="text-3xl font-black text-[#111827]">Payment Received!</h2>
                        <p className="text-healsync-grey font-medium">{message}</p>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 font-medium text-left">
                            ⏳ <strong>Next step:</strong> The doctor will review and accept or reject your appointment. You will be notified immediately.
                        </div>
                        <button
                            onClick={() => navigate('/dashboard?tab=appointments')}
                            className="w-full py-4 bg-healsync-indigo text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-[#111827] transition-all"
                        >
                            View My Appointments
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <FaTimesCircle className="text-5xl text-red-500" />
                        </div>
                        <h2 className="text-3xl font-black text-[#111827]">Verification Failed</h2>
                        <p className="text-healsync-grey font-medium">{message}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-red-600 transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentVerification;
