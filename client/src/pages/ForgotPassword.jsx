import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: identifier, 2: confirm user, 3: choose method, 4: OTP+new pw, 5: success
    const [identifier, setIdentifier] = useState('');
    const [method, setMethod] = useState('email');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [receiverMasked, setReceiverMasked] = useState('');
    
    const [foundUser, setFoundUser] = useState(null); // {name, image, email, hasPhone}
    const [availableOptions, setAvailableOptions] = useState([]);

    const handleNext = async () => {
        if (!identifier.trim()) {
            setError('Enter a phone number or email.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('/api/auth/check-recovery-options', { identifier });
            setAvailableOptions(data.options || []);
            setFoundUser(data.user);
            if (data.options && data.options.length > 0) {
                setMethod(data.options[0].method); // default to first available
            }
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'No account found with that email or phone number.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        // Double check safeguard for SMS
        if (method === 'sms' && !foundUser?.hasPhone) {
            setError('SMS verification is not available for this account.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('/api/auth/forgotpassword', { identifier, method });
            setReceiverMasked(data.receiver || identifier);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/resetpassword', { identifier, otp, password: newPassword });
            setStep(5);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#EFF1F5] dark:bg-slate-900 flex flex-col">
            {/* Main card */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm w-full max-w-3xl overflow-hidden"
                    style={{ minHeight: '330px' }}>
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Left pane */}
                        <div className="p-10 md:w-80 flex-shrink-0 flex flex-col justify-between">
                            <div>
                                <HealSyncLogo />
                                <h1 className="mt-6 text-3xl font-normal text-gray-800 dark:text-white leading-tight">
                                    {step === 1 && 'Find your account'}
                                    {step === 2 && 'Confirm account'}
                                    {step === 3 && 'Choose method'}
                                    {step === 4 && 'Verify it\'s you'}
                                    {step === 5 && 'Password changed'}
                                </h1>
                                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                                    {step === 1 && 'Enter your phone number or email to get started.'}
                                    {step === 2 && 'Is this the account you want to recover?'}
                                    {step === 3 && 'How do you want to receive your verification code?'}
                                    {step === 4 && <>We sent a 6-digit code to <span className="text-gray-800 dark:text-white font-medium">{receiverMasked}</span>. Enter it below along with your new password.</>}
                                    {step === 5 && 'Your password has been reset. You will be redirected to login.'}
                                </p>
                            </div>
                        </div>

                        {/* Right pane */}
                        <div className="flex-1 p-10 flex flex-col justify-between border-l border-gray-100 dark:border-slate-700">
                            <div className="space-y-5">
                                {error && (
                                    <p className="text-sm text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
                                )}

                                {/* Step 1: Enter email/phone */}
                                {step === 1 && (
                                    <FloatingInput
                                        label="Phone number or email"
                                        value={identifier}
                                        onChange={e => setIdentifier(e.target.value)}
                                        autoFocus
                                    />
                                )}

                                {/* Step 2: Confirm profile */}
                                {step === 2 && foundUser && (
                                    <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 dark:bg-slate-700/50 rounded-2xl">
                                        <div className="relative">
                                            <img 
                                                src={foundUser.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                                alt="Profile" 
                                                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-lg font-black text-[#111827] dark:text-white">{foundUser.name}</h4>
                                            <p className="text-sm text-gray-500 font-medium">{foundUser.email}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Choose method */}
                                {step === 3 && (
                                    <div className="space-y-3">
                                        {availableOptions.map(opt => (
                                            <label
                                                key={opt.method}
                                                className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer border-2 transition-all ${method === opt.method ? 'border-healsync-indigo bg-healsync-indigo/5' : 'border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}
                                                onClick={() => setMethod(opt.method)}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${method === opt.method ? 'border-healsync-indigo' : 'border-gray-300'}`}>
                                                    {method === opt.method && <div className="w-3 h-3 rounded-full bg-healsync-indigo"></div>}
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="font-black text-gray-900 dark:text-white text-sm">{opt.label}</p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">{opt.hint}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Step 4: OTP + new password */}
                                {step === 4 && (
                                    <div className="space-y-4">
                                        <FloatingInput
                                            label="6-digit verification code"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value)}
                                            autoFocus
                                        />
                                        <FloatingInput
                                            label="New password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            type="password"
                                        />
                                        <FloatingInput
                                            label="Confirm new password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            type="password"
                                        />
                                    </div>
                                )}

                                {/* Step 5: success */}
                                {step === 5 && (
                                    <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                                        <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">Password reset successful! Redirecting to login...</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer buttons */}
                            {step !== 5 && (
                                <div className="flex justify-between items-center mt-8">
                                    <button
                                        onClick={() => {
                                            if (step === 1) navigate('/login');
                                            else setStep(step - 1);
                                        }}
                                        className="text-sm font-bold text-gray-400 hover:text-healsync-indigo transition-colors"
                                    >
                                        {step === 1 ? 'Cancel' : 'Back'}
                                    </button>
                                    <button
                                        onClick={step === 1 ? handleNext : step === 2 ? () => setStep(3) : step === 3 ? handleSendOtp : handleResetPassword}
                                        disabled={loading || (step === 1 && !identifier.trim()) || (step === 4 && (!otp || !newPassword || !confirmPassword))}
                                        className="px-8 py-2.5 bg-healsync-indigo text-white rounded-full font-medium text-sm hover:bg-healsync-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading && (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                        {step === 3 ? 'Send Code' : step === 4 ? 'Reset Password' : 'Next'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <select className="bg-transparent text-gray-600 dark:text-slate-400 text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1">
                    <option>English (United States)</option>
                </select>
                <div className="flex gap-6">
                    {['Help', 'Privacy', 'Terms'].map(label => (
                        <a key={label} href="#" className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                            {label}
                        </a>
                    ))}
                </div>
            </footer>
        </div>
    );
}
