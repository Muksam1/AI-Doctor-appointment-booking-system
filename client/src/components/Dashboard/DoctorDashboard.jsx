import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
    FaUserMd, FaCheck, FaTimes, FaCalendarCheck, FaClock,
    FaStethoscope, FaUserCog, FaImage, FaSave, FaRocket,
    FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaPaperPlane,
    FaLock, FaLink
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const DoctorDashboard = () => {
    const { setUser } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
    const [activeTab, setActiveTab] = useState('join');
    const [loading, setLoading] = useState(true);
    const [submitStatus, setSubmitStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [submitMessage, setSubmitMessage] = useState('');

    const [doctorInfo, setDoctorInfo] = useState({
        name: '',
        image: '',
        specialization: '',
        experience: 0,
        fee: 0,
        bio: ''
    });
    const [applicationStatus, setApplicationStatus] = useState('pending'); // pending | approved | rejected

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use allSettled so a failing appointments call won't block the dashboard
                const [apptResult, dashboardResult] = await Promise.allSettled([
                    axios.get('/api/appointments/doctor'),
                    axios.get('/api/doctors/dashboard')
                ]);

                // Handle appointments (only doctors with approved status can access this)
                if (apptResult.status === 'fulfilled') {
                    const apptData = apptResult.value.data;
                    setAppointments(apptData);
                    const pending = apptData.filter(a => a.status === 'Pending').length;
                    const approved = apptData.filter(a => a.status === 'Approved').length;
                    setStats({ pending, approved, total: apptData.length });
                }

                // Handle dashboard info — this is the primary data source
                if (dashboardResult.status === 'fulfilled' && dashboardResult.value.data.doctor) {
                    const doc = dashboardResult.value.data.doctor;
                    setDoctorInfo({
                        name: doc.user?.name || '',
                        image: doc.user?.image || '',
                        specialization: doc.specialization || '',
                        experience: doc.experience || 0,
                        fee: doc.fee || 0,
                        bio: doc.bio || ''
                    });
                    setApplicationStatus(doc.applicationStatus || (doc.isVerified ? 'approved' : 'pending'));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/appointments/${id}/status`, { status });
            const { data } = await axios.get('/api/appointments/doctor');
            setAppointments(data);
            const pending = data.filter(a => a.status === 'Pending').length;
            const approved = data.filter(a => a.status === 'Approved').length;
            setStats({ pending, approved, total: data.length });
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus('loading');
        setSubmitMessage('');
        try {
            const { data } = await axios.post('/api/doctors/join', doctorInfo);
            setSubmitStatus('success');
            setSubmitMessage(data.message || 'Application submitted! Pending admin approval.');
            setApplicationStatus('pending');
            // Update auth context if name changed
            const storedUser = JSON.parse(localStorage.getItem('userInfo'));
            if (storedUser) {
                const updatedUser = { ...storedUser, name: data.doctor?.user?.name || storedUser.name };
                localStorage.setItem('userInfo', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            setSubmitStatus('error');
            setSubmitMessage(err.response?.data?.message || 'Failed to submit application. Please try again.');
        }
    };
    const doctorFileInputRef = useRef(null);

    const handleDoctorImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDoctorInfo(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.put('/api/doctors/profile', doctorInfo);
            alert('Profile updated successfully!');
            const storedUser = JSON.parse(localStorage.getItem('userInfo'));
            const updatedUser = {
                ...storedUser,
                name: data.user?.name || storedUser.name,
                image: data.user?.image || storedUser.image,
                role: data.user?.role || storedUser.role
            };
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (err) {
            alert('Failed to update profile');
        }
    };

    const statusConfig = {
        approved: {
            icon: <FaCheckCircle className="text-4xl text-teal-500" />,
            label: 'Approved',
            badge: 'bg-teal-50 text-teal-700 border-teal-200',
            headline: 'You are verified on HealSync!',
            description: 'Your profile is live and patients can now find and book appointments with you.',
            color: 'from-teal-50 to-emerald-50 border-teal-200'
        },
        pending: {
            icon: <FaHourglassHalf className="text-4xl text-amber-500" />,
            label: 'Pending Review',
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            headline: 'Application Under Review',
            description: 'Your application has been submitted and is being reviewed by our admin team. You\'ll be notified once approved.',
            color: 'from-amber-50 to-orange-50 border-amber-200'
        },
        rejected: {
            icon: <FaTimesCircle className="text-4xl text-red-400" />,
            label: 'Rejected',
            badge: 'bg-red-50 text-red-600 border-red-200',
            headline: 'Application Not Approved',
            description: 'Your previous application was not approved. Please update your details and re-apply below.',
            color: 'from-red-50 to-rose-50 border-red-200'
        }
    };

    const currentStatus = statusConfig[applicationStatus] || statusConfig.pending;

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-healsync-indigo"></div>
        </div>
    );

    return (
        <div className="space-y-12 max-w-7xl mx-auto animate-fade-up">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-4 text-healsync-indigo font-black text-sm uppercase tracking-widest bg-healsync-indigo/5 px-6 py-2.5 rounded-full w-fit border border-healsync-indigo/10">
                        <FaStethoscope className="animate-pulse text-lg" />
                        Professional Portal
                    </div>
                    <h1 className="text-5xl font-black text-[#111827] tracking-tighter">Doctor Console</h1>
                    <p className="text-healsync-grey font-medium text-lg">Manage your HealSync presence and patient schedule</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 bg-healsync-bg p-1.5 rounded-2xl border border-healsync-border">
                    <button
                        onClick={() => setActiveTab('join')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'join' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                    >
                        <FaRocket /> Join Today
                    </button>
                    <button
                        onClick={() => setActiveTab('appointments')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                    >
                        <FaCalendarCheck /> Appointments
                        {applicationStatus !== 'approved' && (
                            <FaLock className="text-xs opacity-50" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                    >
                        <FaUserCog /> Profile
                    </button>
                </div>
            </header>

            {/* ════ JOIN TODAY TAB ════ */}
            {activeTab === 'join' && (
                <div className="space-y-10">
                    {/* Status Banner */}
                    <div className={`healsync-card p-10 bg-gradient-to-br ${currentStatus.color} border-2 flex flex-col md:flex-row items-center gap-8`}>
                        <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center shadow-md shrink-0">
                            {currentStatus.icon}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-black text-[#111827]">{currentStatus.headline}</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${currentStatus.badge}`}>
                                    {currentStatus.label}
                                </span>
                            </div>
                            <p className="text-healsync-grey font-medium">{currentStatus.description}</p>
                        </div>
                        {applicationStatus === 'approved' && (
                            <button
                                onClick={() => setActiveTab('appointments')}
                                className="btn-primary shrink-0 flex items-center gap-2 whitespace-nowrap"
                            >
                                <FaCalendarCheck /> View Appointments
                            </button>
                        )}
                    </div>

                    {/* Submit message */}
                    {submitStatus === 'success' && (
                        <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center gap-3">
                            <FaCheckCircle className="text-xl shrink-0" />
                            {submitMessage}
                        </div>
                    )}
                    {submitStatus === 'error' && (
                        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold flex items-center gap-3">
                            <FaTimesCircle className="text-xl shrink-0" />
                            {submitMessage}
                        </div>
                    )}

                    {/* Application Form — hidden only if approved */}
                    {applicationStatus !== 'approved' && (
                        <div className="glass-panel p-10 bg-white/60 space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-[#111827] tracking-tighter">
                                    {applicationStatus === 'rejected' ? '🔄 Re-apply to HealSync' : '🚀 Apply to Join HealSync'}
                                </h3>
                                <p className="text-healsync-grey font-medium">
                                    Fill in your professional details below. Our admin team will review your application and get back to you shortly.
                                </p>
                            </div>

                            <form onSubmit={handleJoinSubmit} className="space-y-8">
                                {/* Personal Info Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={doctorInfo.name}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, name: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            placeholder="Dr. John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Profile Image URL</label>
                                        <input
                                            type="text"
                                            value={doctorInfo.image}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, image: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            placeholder="https://example.com/photo.jpg"
                                        />
                                    </div>
                                </div>

                                {/* Professional Info Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Specialization</label>
                                        <select
                                            value={doctorInfo.specialization}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, specialization: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            required
                                        >
                                            <option value="">Select Specialty</option>
                                            <option value="Dentist">Dentist</option>
                                            <option value="Cardiologist">Cardiologist</option>
                                            <option value="Neurologist">Neurologist</option>
                                            <option value="Physician">General Physician</option>
                                            <option value="Orthopedist">Orthopedist</option>
                                            <option value="Gynecologist">Gynecologist</option>
                                            <option value="Dermatologist">Dermatologist</option>
                                            <option value="Pediatrician">Pediatrician</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Experience (Years)</label>
                                        <input
                                            type="number"
                                            value={doctorInfo.experience}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, experience: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Consultation Fee (Rs.)</label>
                                        <input
                                            type="number"
                                            value={doctorInfo.fee}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, fee: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Professional Bio</label>
                                    <textarea
                                        rows="4"
                                        value={doctorInfo.bio}
                                        onChange={(e) => setDoctorInfo({ ...doctorInfo, bio: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827] resize-none"
                                        placeholder="Describe your medical background, expertise and why patients should choose you..."
                                    ></textarea>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitStatus === 'loading'}
                                        className="px-12 py-5 bg-healsync-indigo text-white rounded-2xl font-black text-lg shadow-healsync hover:shadow-healsync-hover hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {submitStatus === 'loading' ? (
                                            <>
                                                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FaPaperPlane /> Submit Application
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Benefits section when approved */}
                    {applicationStatus === 'approved' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { icon: <FaUserMd className="text-3xl text-healsync-indigo" />, title: 'Live Profile', desc: 'Patients can discover and book appointments with you.' },
                                { icon: <FaCalendarCheck className="text-3xl text-teal-500" />, title: 'Manage Bookings', desc: 'Approve or decline patient appointments from your dashboard.' },
                                { icon: <FaStethoscope className="text-3xl text-violet-500" />, title: 'Build Reputation', desc: 'Collect reviews and ratings to attract more patients.' }
                            ].map((item, i) => (
                                <div key={i} className="healsync-card p-8 bg-white/80 space-y-4 hover:shadow-healsync-hover transition-all">
                                    <div className="w-14 h-14 rounded-2xl bg-healsync-bg flex items-center justify-center border border-healsync-border">
                                        {item.icon}
                                    </div>
                                    <h4 className="font-black text-[#111827] text-lg">{item.title}</h4>
                                    <p className="text-healsync-grey font-medium text-sm">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ════ APPOINTMENTS TAB ════ */}
            {activeTab === 'appointments' && (
                <>
                    {applicationStatus !== 'approved' ? (
                        <div className="healsync-card p-16 text-center space-y-6 bg-white/80">
                            <FaLock className="text-6xl text-healsync-grey/30 mx-auto" />
                            <h3 className="text-2xl font-black text-[#111827]">Appointments Locked</h3>
                            <p className="text-healsync-grey font-medium max-w-md mx-auto">
                                You need to be approved on HealSync before you can manage appointments.
                                {applicationStatus === 'pending' ? ' Your application is currently under review.' : ' Please apply via the "Join Today" tab.'}
                            </p>
                            <button
                                onClick={() => setActiveTab('join')}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                <FaRocket /> Go to Join Today
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { label: 'Total Visits', value: stats.total, icon: <FaCalendarCheck />, color: 'bg-indigo-50 text-healsync-indigo' },
                                    { label: 'Pending Approval', value: stats.pending, icon: <FaClock />, color: 'bg-amber-50 text-amber-500' },
                                    { label: 'Confirmed', value: stats.approved, icon: <FaCheck />, color: 'bg-green-50 text-teal-600' }
                                ].map((stat, idx) => (
                                    <div key={idx} className="healsync-card p-12 flex items-center gap-10 bg-white/80 border-white/40 shadow-healsync hover:shadow-healsync-hover group">
                                        <div className={`w-20 h-20 rounded-[2rem] ${stat.color} flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <p className="text-healsync-grey text-sm font-black uppercase tracking-widest mb-2">{stat.label}</p>
                                            <h3 className="text-5xl font-black text-[#111827] tracking-tighter">{stat.value}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Appointments Table */}
                            <div className="glass-panel overflow-hidden">
                                <div className="p-10 border-b border-healsync-border bg-white/40 flex justify-between items-center">
                                    <h2 className="text-2xl font-black text-[#111827] uppercase tracking-tighter">Patient Appointments</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-healsync-bg/50 text-healsync-grey text-[13px] font-black uppercase tracking-widest">
                                                <th className="px-10 py-8">Patient Details</th>
                                                <th className="px-10 py-8">Schedule</th>
                                                <th className="px-10 py-8">Status</th>
                                                <th className="px-10 py-8">Payment</th>
                                                <th className="px-10 py-8 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-healsync-border">
                                            {appointments.map((appt) => (
                                                <tr key={appt._id} className="hover:bg-healsync-indigo/[0.02] transition-colors group">
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-12 h-12 rounded-full bg-healsync-indigo/10 flex items-center justify-center text-healsync-indigo font-black text-lg overflow-hidden border border-healsync-indigo/20">
                                                                {appt.patient?.image ? (
                                                                    <img src={appt.patient.image} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    appt.patient?.name ? appt.patient.name.charAt(0) : 'P'
                                                                )}
                                                            </div>
                                                            <span className="font-black text-[#111827] text-lg">{appt.patient?.name || 'Unknown Patient'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <p className="font-black text-lg text-[#111827]">{new Date(appt.date).toLocaleDateString()}</p>
                                                        <p className="text-sm font-bold text-healsync-grey uppercase mt-1">{appt.timeSlot}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${appt.status === 'Approved' ? 'bg-healsync-mint/10 text-teal-600 border-healsync-mint/20' :
                                                            appt.status === 'Cancelled' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-healsync-bg text-healsync-grey border-healsync-border'
                                                            }`}>
                                                            {appt.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 font-black text-sm text-healsync-indigo">
                                                        {appt.paymentStatus}
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                        {appt.status === 'Pending' && (
                                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => updateStatus(appt._id, 'Approved')} className="p-3 bg-healsync-mint/20 text-teal-700 rounded-xl hover:bg-healsync-mint hover:text-white transition-all"><FaCheck /></button>
                                                                <button onClick={() => updateStatus(appt._id, 'Cancelled')} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><FaTimes /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {appointments.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-10 py-16 text-center text-healsync-grey font-bold">
                                                        No appointments yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ════ PROFILE TAB ════ */}
            {activeTab === 'profile' && (
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleProfileUpdate} className="glass-panel p-12 space-y-10 bg-white/60">
                        <div className="flex flex-col md:flex-row gap-12 items-start">
                            <div className="relative group mx-auto md:mx-0">
                                <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-white shadow-healsync group-hover:scale-105 transition-transform duration-500">
                                    <img
                                        src={doctorInfo.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FaImage className="text-white text-3xl" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-healsync-grey uppercase tracking-widest text-center mt-4">Profile Picture</p>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={doctorInfo.name}
                                        onChange={(e) => setDoctorInfo({ ...doctorInfo, name: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Profile Image URL</label>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="relative flex-1 group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors font-black text-xs">
                                                <FaLink />
                                            </div>
                                            <input
                                                type="text"
                                                value={doctorInfo.image}
                                                onChange={(e) => setDoctorInfo({ ...doctorInfo, image: e.target.value })}
                                                className="w-full pl-12 pr-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827] text-sm"
                                                placeholder="https://example.com/photo.jpg"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => doctorFileInputRef.current.click()}
                                            className="px-8 py-4 bg-healsync-indigo text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-healsync-indigo/90 hover:-translate-y-1 transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <FaImage /> Upload Photo
                                        </button>
                                        <input
                                            type="file"
                                            ref={doctorFileInputRef}
                                            onChange={handleDoctorImageUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Specialization</label>
                                    <input
                                        type="text"
                                        value={doctorInfo.specialization}
                                        onChange={(e) => setDoctorInfo({ ...doctorInfo, specialization: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Experience (Years)</label>
                                    <input
                                        type="number"
                                        value={doctorInfo.experience}
                                        onChange={(e) => setDoctorInfo({ ...doctorInfo, experience: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Consultation Fee (Rs.)</label>
                                    <input
                                        type="number"
                                        value={doctorInfo.fee}
                                        onChange={(e) => setDoctorInfo({ ...doctorInfo, fee: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Professional Bio</label>
                            <textarea
                                rows="4"
                                value={doctorInfo.bio}
                                onChange={(e) => setDoctorInfo({ ...doctorInfo, bio: e.target.value })}
                                className="w-full px-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827] resize-none"
                                placeholder="Describe your medical background and expertise..."
                            ></textarea>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                className="px-12 py-5 bg-healsync-indigo text-white rounded-2xl font-black text-lg shadow-healsync hover:shadow-healsync-hover hover:-translate-y-1 transition-all flex items-center gap-3"
                            >
                                <FaSave /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
