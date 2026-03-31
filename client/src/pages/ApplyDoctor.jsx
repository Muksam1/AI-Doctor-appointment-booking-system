import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ApplyDoctor = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [status, setStatus] = useState(null); // null, 'pending', 'rejected', 'approved'
    const [rejectionReason, setRejectionReason] = useState('');
    const [formData, setFormData] = useState({
        specialization: '',
        experience: '',
        bio: '',
        fee: '',
        licenseNumber: '',
        education: [{ degree: '', institution: '', year: '' }],
        clinicAddress: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'Nepal'
        }
    });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${user?.token}`
                    }
                };
                const { data } = await axios.get('/api/doctors/dashboard', config);
                if (data.doctor) {
                    setStatus(data.doctor.applicationStatus);
                    setRejectionReason(data.doctor.rejectionReason || '');
                }
            } catch (err) {
                console.log('No existing application found');
            } finally {
                setFetching(false);
            }
        };

        if (user) checkStatus();
        else setFetching(false);
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEducationChange = (index, e) => {
        const { name, value } = e.target;
        const newEducation = [...formData.education];
        newEducation[index][name] = value;
        setFormData(prev => ({ ...prev, education: newEducation }));
    };

    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            education: [...prev.education, { degree: '', institution: '', year: '' }]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.post('/api/doctors/join', formData, config);
            toast.success('Application submitted successfully! Please wait for admin approval.');
            navigate('/dashboard');
        } catch (err) {
            console.error('Error submitting application:', err);
            toast.error(err.response?.data?.message || 'Failed to submit application.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-healsync-bg">
            <div className="w-12 h-12 border-4 border-healsync-indigo/30 border-t-healsync-indigo rounded-full animate-spin"></div>
        </div>
    );

    if (status === 'approved') {
        setTimeout(() => navigate('/dashboard'), 3000);
        return (
            <div className="min-h-screen flex items-center justify-center bg-healsync-bg">
                <div className="healsync-card p-12 text-center max-w-lg space-y-6">
                    <div className="w-24 h-24 bg-healsync-mint/20 text-healsync-mint rounded-full flex items-center justify-center text-5xl mx-auto shadow-healsync">✅</div>
                    <h2 className="text-3xl font-black text-[#111827]">You're already a Doctor!</h2>
                    <p className="text-healsync-grey font-medium leading-relaxed">Your application has been approved. Redirecting you to your doctor dashboard...</p>
                </div>
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-healsync-bg p-6">
                <div className="healsync-card p-12 text-center max-w-2xl space-y-8 bg-white shadow-2xl rounded-[3rem]">
                    <div className="w-32 h-32 bg-amber-50 text-amber-500 rounded-[2.5rem] flex items-center justify-center text-6xl mx-auto shadow-inner animate-pulse">⏳</div>
                    <div className="space-y-3">
                        <h2 className="text-4xl font-black text-[#111827] tracking-tighter">Application Under Review</h2>
                        <p className="text-healsync-grey font-bold text-lg">Our administrative team is currently verifying your professional credentials.</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm font-medium text-healsync-grey leading-relaxed">
                        Verification typically takes 24-48 business hours. You'll receive an email and a dashboard notification as soon as a decision is made.
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-healsync-border hover:bg-gray-50 transition-all">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-healsync-bg py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow-healsync rounded-[2.5rem] overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-healsync-indigo p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h1 className="text-4xl font-black tracking-tighter mb-2">Join as a Healthcare Partner</h1>
                            <p className="text-healsync-mint font-bold text-lg">Help us build the future of smart healthcare in Nepal</p>
                        </div>
                        <div className="absolute bottom-0 right-10 opacity-20 transform translate-y-1/4">
                            <span className="text-[12rem] font-black leading-none">🩺</span>
                        </div>
                    </div>

                    {status === 'rejected' && (
                        <div className="m-8 p-8 bg-red-50 border-2 border-red-200 rounded-3xl space-y-4">
                            <div className="flex items-center gap-4 text-red-600 font-black uppercase text-xs tracking-widest">
                                <span className="text-2xl">⚠️</span> Application Rejected
                            </div>
                            <p className="text-[#111827] font-bold">Feedback from Admin:</p>
                            <p className="text-red-700 font-medium italic">"{rejectionReason || 'No specific reason provided.'}"</p>
                            <p className="text-sm text-gray-600">Please review your information below and submit again.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
                        {/* Section 1: Professional Background */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-healsync-indigo/10 flex items-center justify-center text-2xl">👨‍⚕️</div>
                                <h3 className="text-xl font-black text-[#111827]">Professional Background</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Specialization</label>
                                    <input name="specialization" type="text" className="input-field w-full" placeholder="e.g. Cardiologist" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Years of Experience</label>
                                    <input name="experience" type="number" className="input-field w-full" placeholder="5" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Medical License Number</label>
                                    <input name="licenseNumber" type="text" className="input-field w-full" placeholder="NMC-XXXX" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Consultation Fee (Rs.)</label>
                                    <input name="fee" type="number" className="input-field w-full" placeholder="1000" onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Professional Bio</label>
                                <textarea name="bio" className="input-field w-full h-32" placeholder="Tell us about your expertise and journey..." onChange={handleChange} required></textarea>
                            </div>
                        </section>

                        {/* Section 2: Education */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-healsync-mint/10 flex items-center justify-center text-2xl">🎓</div>
                                    <h3 className="text-xl font-black text-[#111827]">Education</h3>
                                </div>
                                <button type="button" onClick={addEducation} className="text-xs font-black text-healsync-indigo hover:text-healsync-violet uppercase tracking-widest">+ Add More</button>
                            </div>
                            
                            {formData.education.map((edu, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-healsync-grey uppercase">Degree</label>
                                        <input name="degree" value={edu.degree} onChange={(e) => handleEducationChange(index, e)} type="text" className="input-field w-full" placeholder="MBBS, MD" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-healsync-grey uppercase">Institution</label>
                                        <input name="institution" value={edu.institution} onChange={(e) => handleEducationChange(index, e)} type="text" className="input-field w-full" placeholder="Institute Name" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-healsync-grey uppercase">Year</label>
                                        <input name="year" value={edu.year} onChange={(e) => handleEducationChange(index, e)} type="number" className="input-field w-full" placeholder="2015" required />
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* Section 3: Clinic/Hospital Address */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-healsync-violet/10 flex items-center justify-center text-2xl">🏥</div>
                                <h3 className="text-xl font-black text-[#111827]">Practicing Location</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Street Address</label>
                                    <input name="clinicAddress.street" type="text" className="input-field w-full" placeholder="123 Hospital Marg" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">City</label>
                                    <input name="clinicAddress.city" type="text" className="input-field w-full" placeholder="Kathmandu" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">State / Province</label>
                                    <input name="clinicAddress.state" type="text" className="input-field w-full" placeholder="Bagmati" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-[#111827] uppercase tracking-wider">Zip Code</label>
                                    <input name="clinicAddress.zipCode" type="text" className="input-field w-full" placeholder="44600" onChange={handleChange} required />
                                </div>
                            </div>
                        </section>

                        <div className="pt-8 border-t border-healsync-border">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="btn-primary w-full py-5 text-lg font-black tracking-wider flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {status === 'rejected' ? 'Re-submitting Application...' : 'Submitting Application...'}
                                    </>
                                ) : status === 'rejected' ? 'Re-submit Application' : 'Submit Application for Review'}
                            </button>
                            <p className="text-center text-[11px] text-healsync-grey font-bold mt-4 uppercase tracking-widest">
                                By clicking submit, you agree to our professional code of conduct and verification process.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ApplyDoctor;
