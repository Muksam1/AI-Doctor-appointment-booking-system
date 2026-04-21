import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        contact: ''
    });

    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard');
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auth/register', { ...formData, role: 'patient' });
            localStorage.setItem('verifyEmail', formData.email);
            toast.success('An OTP has been sent to your registered email. Please verify to continue.');
            navigate('/verify-email');
        } catch (err) {
            console.error('Registration Error:', err.response || err);
            const message = err.response?.data?.message || err.message || 'Registration failed';
            toast.error(message);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const { data } = await axios.post('/api/auth/google', { 
                token: credentialResponse.credential,
                role: 'patient'
            });
            const userInfo = { ...data };
            sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
            toast.success(`Welcome to HealSync, ${data.name}!`);
            setTimeout(() => { window.location.href = '/dashboard'; }, 800);
        } catch (err) {
            console.error('Google Auth Error:', err);
            toast.error('Google authentication failed. Please try again.');
        }
    };

    const renderRegisterForm = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 py-4">
            <header className="space-y-4 pb-4 border-b border-healsync-border">
                <h3 className="text-3xl font-black text-[#111827] tracking-tighter">Create Account</h3>
                <p className="text-healsync-grey font-medium text-sm">Join Nepal's first AI-powered healthcare network</p>
                
                <div className="pt-4">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => toast.error('Google Sign-In Failed.')}
                        useOneTap
                        shape="pill"
                        text="continue_with"
                    />
                </div>
                
                <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">or use your email address</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <label htmlFor="reg-name" className="text-xs font-black text-[#111827] uppercase tracking-wider">Full Name</label>
                    <input id="reg-name" name="name" type="text" className="input-field w-full" placeholder="John Doe" onChange={handleChange} required autoComplete="name" />
                </div>
                <div className="space-y-1">
                    <label htmlFor="reg-email" className="text-xs font-black text-[#111827] uppercase tracking-wider">Email Address</label>
                    <input id="reg-email" name="email" type="email" className="input-field w-full" placeholder="john@example.com" onChange={handleChange} required autoComplete="email" />
                </div>
                <div className="space-y-1">
                    <label htmlFor="reg-password" className="text-xs font-black text-[#111827] uppercase tracking-wider">Password</label>
                    <input id="reg-password" name="password" type="password" className="input-field w-full" placeholder="••••••••" onChange={handleChange} required autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                    <label htmlFor="reg-contact" className="text-xs font-black text-[#111827] uppercase tracking-wider">Phone Number</label>
                    <input id="reg-contact" name="contact" type="tel" className="input-field w-full" placeholder="98XXXXXXXX" onChange={handleChange} required />
                </div>

                <button type="submit" className="btn-primary w-full py-4 text-center mt-6">
                    Sign Up as Patient
                </button>
            </form>

            <div className="pt-6 border-t border-healsync-border">
                <p className="text-center text-sm text-healsync-grey font-bold">
                    Already have an account? {' '}
                    <Link to="/login" className="text-healsync-indigo hover:underline">Login</Link>
                </p>
            </div>
            
            <div className="mt-6 p-4 bg-healsync-indigo/5 rounded-2xl border border-healsync-indigo/10 flex items-center gap-4 group cursor-help transition-all hover:bg-white shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-healsync-indigo/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🩺</div>
                <div>
                    <h4 className="text-[11px] font-black text-healsync-indigo uppercase tracking-wider">Are you a Doctor?</h4>
                    <p className="text-[10px] text-healsync-grey font-medium leading-tight">Register as a patient first, then apply for professional status from your dashboard.</p>
                </div>
            </div>
        </div>
    );

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-[calc(100vh-72px)] bg-healsync-bg flex items-center justify-center p-4 py-12">
            <div className="bg-white w-full max-w-4xl shadow-healsync rounded-[2rem] overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 bg-healsync-indigo p-12 text-white hidden md:flex flex-col justify-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
                    <h2 className="text-4xl font-black leading-tight relative">Join the <br /> <span className="text-healsync-mint">HealSync</span> Network</h2>
                    <p className="text-lg opacity-80 relative font-medium">
                         Nepal's largest AI-powered platform for smart healthcare.
                    </p>
                    <img
                        src="/assets/hero.png"
                        alt="HealSync"
                        className="w-64 drop-shadow-2xl animate-float relative mx-auto"
                    />
                </div>

                <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[85vh] flex items-center justify-center">
                    <div className="w-full max-w-sm">
                        {renderRegisterForm()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
