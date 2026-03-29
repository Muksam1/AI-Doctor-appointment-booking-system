import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const HealSyncLogo = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#5D5FEF" />
        <path d="M20 8v24M8 20h24" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    </svg>
);

const FloatingInput = ({ label, value, onChange, type = 'text', autoFocus = false }) => {
    const [focused, setFocused] = useState(false);
    const active = focused || value.length > 0;
    return (
        <div className="relative w-full">
            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus={autoFocus}
                className="w-full px-4 pt-5 pb-2 border rounded-sm text-base outline-none transition-all bg-white dark:bg-slate-800 dark:text-white"
                style={{
                    borderColor: focused ? '#5D5FEF' : '#dadce0',
                    boxShadow: focused ? '0 0 0 2px rgba(93,95,239,0.2)' : 'none',
                }}
            />
            <label
                className="absolute left-4 transition-all duration-150 pointer-events-none"
                style={{
                    top: active ? '6px' : '50%',
                    transform: active ? 'translateY(0) scale(0.75)' : 'translateY(-50%) scale(1)',
                    transformOrigin: 'left top',
                    color: focused ? '#5D5FEF' : '#80868b',
                    fontSize: '16px',
                }}
            >
                {label}
            </label>
        </div>
    );
};

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const emailFromQuery = queryParams.get('email') || localStorage.getItem('verifyEmail');
        if (emailFromQuery) {
            setEmail(emailFromQuery);
        } else {
            // If no email found, redirect to login
            // navigate('/login');
        }
    }, [location, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp) {
            setError('Please enter the 6-digit verification code.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('/api/auth/verifyemail', { email, otp });
            setSuccess(data.message || 'Email verified successfully!');
            setTimeout(() => {
                localStorage.removeItem('verifyEmail');
                navigate('/login');
            }, 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP. Please check your email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-4 bg-[#EFF1F5] dark:bg-slate-900 rounded-3xl m-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden min-h-[400px]">
                <div className="flex flex-col md:flex-row h-full min-h-[400px]">
                    {/* Left Branding Side */}
                    <div className="p-10 md:w-80 bg-healsync-indigo/5 dark:bg-white/5 flex flex-col justify-between">
                        <div>
                            <HealSyncLogo />
                            <h1 className="mt-8 text-4xl font-black text-gray-900 dark:text-white leading-tight">
                                Verify Account
                            </h1>
                            <p className="mt-4 text-sm text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
                                To ensure security and prevent fake accounts, we've sent a 6-digit verification code to:
                            </p>
                            <div className="mt-4 p-3 bg-white dark:bg-slate-700 rounded-xl border border-healsync-indigo/20 shadow-sm inline-block">
                                <span className="text-healsync-indigo font-black text-sm break-all">{email || 'your email'}</span>
                            </div>
                        </div>
                        <div className="mt-8">
                            <Link 
                                to="/register" 
                                className="text-xs font-bold text-gray-500 hover:text-healsync-indigo flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Change registration info
                            </Link>
                        </div>
                    </div>

                    {/* Right Form Side */}
                    <div className="flex-1 p-10 flex flex-col justify-center border-l border-gray-100 dark:border-slate-700">
                        <form onSubmit={handleVerify} className="space-y-8">
                            {error && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className="text-sm text-red-500 font-bold bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center gap-3">
                                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </p>
                                </div>
                            )}

                            {success ? (
                                <div className="text-center space-y-4 animate-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Email Verified!</h3>
                                    <p className="text-gray-600 dark:text-slate-400 font-medium">{success}</p>
                                    <p className="text-xs text-healsync-indigo font-black animate-pulse">Redirecting to login dashboard...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">HealSync Security Code</label>
                                            <FloatingInput
                                                label="Enter 6-digit OTP"
                                                value={otp}
                                                onChange={e => setOtp(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                            Didn't receive the email? Check your <span className="font-bold">Spam</span> or <span className="font-bold">Promotions</span> tab. 
                                            The code is valid for 10 minutes.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <button
                                            type="submit"
                                            disabled={loading || otp.length < 4}
                                            className="w-full py-4 bg-healsync-indigo text-white rounded-2xl font-black text-sm hover:shadow-xl hover:bg-healsync-violet transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-healsync"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    Verify & Continue
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                        
                                        <div className="text-center pt-2">
                                            <p className="text-xs text-gray-500 font-medium">
                                                Already verified? <Link to="/login" className="text-healsync-indigo font-black hover:underline">Sign In</Link>
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
            
            {/* Security Notice */}
            <div className="mt-8 flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.908-3.067 9.126-7.403 10.84a1.001 1.001 0 01-.794 0C5.407 16.126 2.34 11.908 2.34 7c0-.68.056-1.35.166-2.001zM9 11a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-7a1 1 0 011 1v3a1 1 0 11-2 0V5a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Secure Verification System • HealSync 2026
            </div>
        </div>
    );
};

export default VerifyEmail;
