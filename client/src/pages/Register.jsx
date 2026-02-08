import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    const [role, setRole] = useState('patient');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        specialization: '',
        experience: '',
        fee: '',
        bio: ''
    });

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auth/register', { ...formData, role });
            localStorage.setItem('suggestedEmail', formData.email);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            console.error('Registration Error:', err.response || err);
            const message = err.response?.data?.message || err.message || 'Registration failed';
            alert(message);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-[calc(100vh-72px)] bg-healsync-bg flex items-center justify-center p-4 py-12">
            <div className="bg-white w-full max-w-4xl shadow-healsync rounded-[2rem] overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 bg-healsync-indigo p-12 text-white hidden md:flex flex-col justify-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
                    <h2 className="text-4xl font-black leading-tight relative">Join the <br /> <span className="text-healsync-mint">HealSync</span> Network</h2>
                    <p className="text-lg opacity-80 relative">
                        {role === 'patient' && "Access thousands of doctors, manage your health journey, and keep your family safe."}
                        {role === 'doctor' && "Reach more patients, manage your practice effectively, and build your digital reputation."}
                        {role === 'admin' && "Oversee system operations, verify medical professionals, and manage platform health."}
                    </p>
                    <img
                        src={role === 'doctor' ? "/assets/consult.png" : "/assets/hero.png"}
                        alt="HealSync"
                        className="w-64 drop-shadow-2xl animate-float relative mx-auto"
                    />
                </div>

                <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                    <div className="space-y-8">
                        <header className="space-y-4">
                            <h3 className="text-2xl font-black text-[#111827]">Create Account</h3>

                            {/* Scrollable Role Selector */}
                            <div className="overflow-x-auto no-scrollbar pb-2">
                                <div className="flex gap-3 min-w-max">
                                    <button
                                        type="button"
                                        onClick={() => setRole('patient')}
                                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${role === 'patient' ? 'bg-healsync-indigo text-white border-healsync-indigo shadow-healsync' : 'bg-healsync-bg text-healsync-grey border-transparent hover:bg-healsync-border'}`}
                                    >
                                        I am a Patient
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('doctor')}
                                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${role === 'doctor' ? 'bg-healsync-indigo text-white border-healsync-indigo shadow-healsync' : 'bg-healsync-bg text-healsync-grey border-transparent hover:bg-healsync-border'}`}
                                    >
                                        I am a Doctor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('admin')}
                                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${role === 'admin' ? 'bg-healsync-indigo text-white border-healsync-indigo shadow-healsync' : 'bg-healsync-bg text-healsync-grey border-transparent hover:bg-healsync-border'}`}
                                    >
                                        I am an Admin
                                    </button>
                                </div>
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

                            {/* Conditional Doctor Fields */}
                            {role === 'doctor' && (
                                <div className="space-y-5 pt-4 border-t border-healsync-border animate-in slide-in-from-top-4 duration-500">
                                    <h4 className="text-xs font-black text-healsync-indigo uppercase bg-healsync-indigo/5 p-2 rounded text-center">Professional Information</h4>
                                    <div className="space-y-1">
                                        <label htmlFor="reg-specialization" className="text-xs font-black text-[#111827] uppercase tracking-wider">Specialization</label>
                                        <select id="reg-specialization" name="specialization" className="input-field w-full" onChange={handleChange} required>
                                            <option value="">Select Specialty</option>
                                            <option value="Dentist">Dentist</option>
                                            <option value="Cardiologist">Cardiologist</option>
                                            <option value="Neurologist">Neurologist</option>
                                            <option value="Physician">General Physician</option>
                                            <option value="Orthopedist">Orthopedist</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label htmlFor="reg-experience" className="text-xs font-black text-[#111827] uppercase tracking-wider">Experience (Yrs)</label>
                                            <input id="reg-experience" name="experience" type="number" className="input-field w-full" placeholder="5" onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="reg-fee" className="text-xs font-black text-[#111827] uppercase tracking-wider">Fee (Rs.)</label>
                                            <input id="reg-fee" name="fee" type="number" className="input-field w-full" placeholder="1000" onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="reg-bio" className="text-xs font-black text-[#111827] uppercase tracking-wider">Professional Bio</label>
                                        <textarea id="reg-bio" name="bio" className="input-field w-full h-24" placeholder="Briefly describe your expertise..." onChange={handleChange}></textarea>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn-primary w-full py-4 text-center mt-6">
                                Join HealSync
                            </button>
                        </form>

                        <p className="text-center text-sm text-healsync-grey font-bold">
                            Already have an account? {' '}
                            <Link to="/login" className="text-healsync-indigo hover:underline">Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
