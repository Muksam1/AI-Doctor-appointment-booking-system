import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const savedEmail = localStorage.getItem('suggestedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            alert('Invalid credentials');
        }
    };

    return (
        <div className="min-h-[calc(100vh-72px)] bg-healsync-bg flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl flex flex-col md:flex-row shadow-healsync rounded-[2rem] overflow-hidden">
                <div className="flex-1 bg-healsync-indigo p-12 text-white hidden md:flex flex-col justify-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
                    <h2 className="text-4xl font-black leading-tight relative">Welcome back to <br /><span className="text-healsync-mint">HealSync</span></h2>
                    <p className="text-lg opacity-80 leading-relaxed relative">
                        Log in to access your dashboard, manage appointments, and stay connected with your healthcare providers.
                    </p>
                    <div className="space-y-4 pt-8 relative">
                        <div className="flex items-center gap-4">
                            <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold border border-white/20">01</span>
                            <span className="font-medium">Secure Access</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold border border-white/20">02</span>
                            <span className="font-medium">Real-time Updates</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold border border-white/20">03</span>
                            <span className="font-medium">AI Health Insights</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-12 lg:p-16">
                    <div className="max-w-sm mx-auto space-y-10">
                        <header className="space-y-3">
                            <h3 className="text-3xl font-black text-[#111827]">Login</h3>
                            <p className="text-healsync-grey font-medium">Access your personalized healthcare hub</p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="login-email" className="text-xs font-black text-[#111827] uppercase tracking-wider">Email Address</label>
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    className="input-field w-full"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                {localStorage.getItem('suggestedEmail') === email && (
                                    <p className="text-[10px] text-healsync-indigo font-bold italic">Suggested from your registration</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="login-password" className="text-xs font-black text-[#111827] uppercase tracking-wider">Password</label>
                                    <Link to="/forgot-password" value="forgot-password" id="forgot-password" className="text-xs font-bold text-healsync-indigo hover:underline">Forgot?</Link>
                                </div>
                                <input
                                    id="login-password"
                                    name="password"
                                    type="password"
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <button type="submit" className="btn-primary w-full py-4 text-center mt-4">
                                Enter Dashboard
                            </button>
                        </form>

                        <div className="text-center pt-8 border-t border-healsync-border">
                            <p className="text-sm text-healsync-grey font-medium">
                                New to HealSync? {' '}
                                <Link to="/register" className="text-healsync-indigo font-black hover:underline">Create Account</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
