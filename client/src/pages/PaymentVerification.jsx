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
    const data = searchParams.get('data'); // eSewa returns base64 data in 'data' query param

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                if (gateway === 'esewa' && data) {
                    const response = await axios.get(`/api/payments/esewa/verify?encodedData=${data}`);
                    if (response.data.success) {
                        if (response.data.isOrder) {
                            navigate('/payment-success');
                        } else {
                            setStatus('success');
                            setMessage('Payment verified successfully! Your appointment is now confirmed.');
                        }
                    } else {
                        setStatus('error');
                        setMessage(response.data.message || 'Payment verification failed.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Invalid payment data received.');
                }
            } catch (err) {
                console.error("Verification Error:", err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Please contact support.');
            }
        };

        verifyPayment();
    }, [gateway, data]);

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
                        <h2 className="text-3xl font-black text-[#111827]">Payment Success!</h2>
                        <p className="text-healsync-grey font-medium">{message}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 bg-healsync-indigo text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-[#111827] transition-all"
                        >
                            Back to Dashboard
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
