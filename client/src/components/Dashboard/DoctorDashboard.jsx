import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaUserMd, FaCheck, FaTimes, FaCalendarCheck, FaClock,
    FaStethoscope, FaUserCog, FaImage, FaSave, FaRocket,
    FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaPaperPlane,
    FaLock, FaLink, FaSync, FaPhone, FaEnvelope, FaStar
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const DoctorDashboard = () => {
    const { user, setUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [appointments, setAppointments] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ pending: 0, confirmed: 0, total: 0, rating: 0, numReviews: 0 });
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'join');
    const [loading, setLoading] = useState(true);
    const [submitStatus, setSubmitStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [submitMessage, setSubmitMessage] = useState('');

    const [doctorInfo, setDoctorInfo] = useState({
        name: '',
        email: '',
        contact: '',
        image: '',
        specialization: '',
        experience: 0,
        fee: 0,
        bio: ''
    });
    const [availability, setAvailability] = useState([
        { day: 'Monday', isAvailable: true, slots: [{ startTime: '09:00', endTime: '10:00' }] },
        { day: 'Tuesday', isAvailable: true, slots: [{ startTime: '09:00', endTime: '10:00' }] },
        { day: 'Wednesday', isAvailable: true, slots: [{ startTime: '09:00', endTime: '10:00' }] },
        { day: 'Thursday', isAvailable: true, slots: [{ startTime: '09:00', endTime: '10:00' }] },
        { day: 'Friday', isAvailable: true, slots: [{ startTime: '09:00', endTime: '10:00' }] },
        { day: 'Saturday', isAvailable: false, slots: [] },
        { day: 'Sunday', isAvailable: false, slots: [] }
    ]);
    const [customAvailability, setCustomAvailability] = useState([]);
    const [applicationStatus, setApplicationStatus] = useState('pending'); // pending | approved | rejected

    const { socket } = useSocket();

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
                const confirmed = apptData.filter(a => a.status === 'Confirmed').length;
                setStats(prev => ({ ...prev, pending, confirmed, total: apptData.length }));
            }

            // Handle dashboard info — this is the primary data source
            if (dashboardResult.status === 'fulfilled' && dashboardResult.value.data.doctor) {
                const data = dashboardResult.value.data;
                const doc = data.doctor;
                setDoctorInfo({
                    name: doc.user?.name || '',
                    email: doc.user?.email || '',
                    contact: doc.user?.contact || '',
                    image: doc.user?.image || '',
                    specialization: doc.specialization || '',
                    experience: doc.experience || 0,
                    fee: doc.fee || 0,
                    bio: doc.bio || ''
                });
                if (doc.availability && doc.availability.length > 0) {
                    setAvailability(doc.availability);
                }
                if (doc.customAvailability && doc.customAvailability.length > 0) {
                    setCustomAvailability(doc.customAvailability);
                }
                setApplicationStatus(doc.applicationStatus || (doc.isVerified ? 'approved' : 'pending'));
                setReviews(data.reviews || []);
                setStats(prev => ({
                    ...prev,
                    rating: data.stats?.averageRating || 0,
                    numReviews: data.stats?.totalReviews || 0
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Update tab from URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Update URL when tab changes
    useEffect(() => {
        setSearchParams({ tab: activeTab }, { replace: true });
        if (activeTab === 'feedback' || activeTab === 'appointments') {
            fetchData();
        }
    }, [activeTab]);

    // Socket listener for auto-refresh
    useEffect(() => {
        if (socket) {
            socket.on('newAppointment', () => {
                fetchData();
            });
            return () => socket.off('newAppointment');
        }
    }, [socket]);

    // Switch to appointments automatically once approved
    useEffect(() => {
        if (applicationStatus === 'approved' && activeTab === 'join') {
            setActiveTab('appointments');
        }
    }, [applicationStatus]);

    const refreshStatus = async () => {
        try {
            const { data } = await axios.get('/api/doctors/dashboard');
            if (data.doctor) {
                const newStatus = data.doctor.applicationStatus || (data.doctor.isVerified ? 'approved' : 'pending');
                setApplicationStatus(newStatus);
                if (newStatus === 'approved') {
                    setActiveTab('appointments');
                }
            }
        } catch (err) {
            console.error('Failed to refresh status', err);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/appointments/${id}/status`, { status });
            fetchData();
            if (status === 'Confirmed') toast.success('Appointment accepted! The patient has been notified.');
            else if (status === 'Cancelled') toast.error('Appointment rejected. Refund will be processed if payment was received.');
            else if (status === 'Completed') toast.success('Appointment marked as completed.');
        } catch (err) {
            toast.error('Failed to update appointment status.');
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
            const storedUser = JSON.parse(sessionStorage.getItem('userInfo'));
            if (storedUser) {
                const refreshedUser = { ...storedUser, name: data.doctor?.user?.name || storedUser.name };
                sessionStorage.setItem('userInfo', JSON.stringify(refreshedUser));
                setUser(refreshedUser);
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
            toast.success('Profile updated successfully!');
            const storedUser = JSON.parse(sessionStorage.getItem('userInfo'));
            const updatedUser = {
                ...storedUser,
                name: data.user?.name || storedUser.name,
                image: data.user?.image || storedUser.image,
                role: data.user?.role || storedUser.role
            };
            sessionStorage.setItem('userInfo', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (err) {
            toast.error('Failed to update profile');
        }
    };

    const handleAvailabilityUpdate = async () => {
        try {
            await axios.put('/api/doctors/availability', { availability, customAvailability });
            toast.success('Availability updated successfully!');
        } catch (err) {
            toast.error('Failed to update availability');
        }
    };

    const toggleDay = (index) => {
        const newAvail = [...availability];
        newAvail[index].isAvailable = !newAvail[index].isAvailable;
        if (newAvail[index].isAvailable && newAvail[index].slots.length === 0) {
            newAvail[index].slots = [{ startTime: '09:00', endTime: '10:00' }];
        }
        setAvailability(newAvail);
    };

    const addSlot = (dayIndex) => {
        const newAvail = [...availability];
        newAvail[dayIndex].slots.push({ startTime: '09:00', endTime: '10:00' });
        setAvailability(newAvail);
    };

    const removeSlot = (dayIndex, slotIndex) => {
        const newAvail = [...availability];
        newAvail[dayIndex].slots.splice(slotIndex, 1);
        setAvailability(newAvail);
    };

    const updateSlot = (dayIndex, slotIndex, field, value) => {
        const newAvail = [...availability];
        newAvail[dayIndex].slots[slotIndex][field] = value;
        setAvailability(newAvail);
    };

    const addCustomDate = () => {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        setCustomAvailability([...customAvailability, {
            date: today,
            isAvailable: true,
            slots: [{ startTime: '09:00', endTime: '10:00' }]
        }]);
    };

    const removeCustomDate = (index) => {
        const newCustom = [...customAvailability];
        newCustom.splice(index, 1);
        setCustomAvailability(newCustom);
    };

    const updateCustomDate = (index, field, value) => {
        const newCustom = [...customAvailability];
        newCustom[index][field] = value;
        setCustomAvailability(newCustom);
    };

    const addCustomSlot = (dateIndex) => {
        const newCustom = [...customAvailability];
        newCustom[dateIndex].slots.push({ startTime: '09:00', endTime: '10:00' });
        setCustomAvailability(newCustom);
    };

    const removeCustomSlot = (dateIndex, slotIndex) => {
        const newCustom = [...customAvailability];
        newCustom[dateIndex].slots.splice(slotIndex, 1);
        setCustomAvailability(newCustom);
    };

    const updateCustomSlot = (dateIndex, slotIndex, field, value) => {
        const newCustom = [...customAvailability];
        newCustom[dateIndex].slots[slotIndex][field] = value;
        setCustomAvailability(newCustom);
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
        <div className="space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-4 text-healsync-indigo font-black text-xs md:text-sm uppercase tracking-widest bg-healsync-indigo/5 px-4 md:px-6 py-2 md:py-2.5 rounded-full w-fit border border-healsync-indigo/10">
                        <FaStethoscope className="animate-pulse text-lg" />
                        Professional Portal
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#111827] tracking-tighter">Doctor Console</h1>
                    <p className="text-healsync-grey font-medium text-base md:text-lg">Manage your HealSync presence and patient schedule</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 bg-healsync-bg p-1.5 rounded-2xl border border-healsync-border overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setActiveTab('join')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'join' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                    >
                        <FaRocket /> Join Today
                    </button>
                    <button
                        onClick={() => applicationStatus === 'approved' && setActiveTab('appointments')}
                        disabled={applicationStatus !== 'approved'}
                        title={applicationStatus !== 'approved' ? 'Appointments locked until your application is approved' : ''}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
                            applicationStatus !== 'approved'
                                ? 'text-healsync-grey opacity-50 cursor-not-allowed'
                                : activeTab === 'appointments' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'
                        }`}
                    >
                        <FaCalendarCheck /> Appointments
                        {applicationStatus !== 'approved' && (
                            <FaLock className="text-xs" />
                        )}
                    </button>
                    {applicationStatus === 'approved' && (
                        <button
                            onClick={() => setActiveTab('feedback')}
                            className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'feedback' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaStar className="text-amber-400" /> Feedback
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'profile' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                    >
                        <FaUserCog /> Profile
                    </button>
                    {applicationStatus === 'approved' && (
                        <button
                            onClick={() => setActiveTab('availability')}
                            className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'availability' ? 'bg-white text-healsync-indigo shadow-sm' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaClock /> Availability
                        </button>
                    )}
                    {applicationStatus !== 'approved' && (
                        <button
                            onClick={refreshStatus}
                            title="Check if your application has been approved"
                            className="px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 text-healsync-indigo bg-healsync-indigo/10 hover:bg-healsync-indigo/20 shrink-0 whitespace-nowrap"
                        >
                            <FaSync /> Refresh
                        </button>
                    )}
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
                                        <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Profile Image</label>
                                        <div className="flex items-center gap-6 p-4 rounded-2xl bg-healsync-bg border border-healsync-border">
                                            <div className="w-16 h-16 rounded-2xl bg-white border border-healsync-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                {doctorInfo.image ? (
                                                    <img src={doctorInfo.image} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FaImage className="text-healsync-grey text-xl" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    ref={doctorFileInputRef}
                                                    onChange={handleDoctorImageUpload}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => doctorFileInputRef.current.click()}
                                                    className="px-6 py-2.5 bg-white border border-healsync-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-healsync-indigo hover:text-white transition-all shadow-sm"
                                                >
                                                    {doctorInfo.image ? 'Change Photo' : 'Upload Photo'}
                                                </button>
                                                <p className="text-[10px] text-healsync-grey font-medium mt-2">JPG, PNG or WEBP. Max 2MB.</p>
                                            </div>
                                        </div>
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
                                    { label: 'Confirmed', value: stats.confirmed, icon: <FaCheck />, color: 'bg-green-50 text-teal-600' }
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
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className={`inline-block px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border w-fit ${
                                                                appt.status === 'Confirmed' ? 'bg-healsync-mint/10 text-teal-600 border-healsync-mint/20' :
                                                                appt.status === 'Cancelled' ? 'bg-red-50 text-red-500 border-red-100' :
                                                                appt.status === 'Completed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                'bg-healsync-bg text-healsync-grey border-healsync-border'
                                                            }`}>
                                                                {appt.status}
                                                            </span>
                                                            {/* Urgent badge for paid-but-pending appointments */}
                                                            {appt.status === 'Pending' && appt.paymentStatus === 'Paid' && (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-widest w-fit animate-pulse">
                                                                    💳 Paid — Action Required
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                            appt.paymentStatus === 'Paid' ? 'bg-healsync-indigo/10 text-healsync-indigo border-healsync-indigo/20' :
                                                            appt.paymentStatus === 'Refunded' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            'bg-gray-100 text-gray-500 border-gray-200'
                                                        }`}>
                                                            {appt.paymentStatus === 'Refunded' ? '💳 Refunded' : appt.paymentStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {appt.status === 'Pending' && (
                                                                <>
                                                                    <button onClick={() => updateStatus(appt._id, 'Confirmed')} className="p-3 bg-healsync-mint/20 text-teal-700 rounded-xl hover:bg-healsync-mint hover:text-white transition-all shadow-sm" title="Confirm Appointment"><FaCheck /></button>
                                                                    <button onClick={() => updateStatus(appt._id, 'Cancelled')} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Cancel Appointment"><FaTimes /></button>
                                                                </>
                                                            )}
                                                            {appt.status === 'Confirmed' && (
                                                                <>
                                                                    <button onClick={() => updateStatus(appt._id, 'Completed')} className="p-3 bg-healsync-indigo/10 text-healsync-indigo rounded-xl hover:bg-healsync-indigo hover:text-white transition-all shadow-sm flex items-center gap-2 px-4 shadow-sm" title="Mark as Completed"><FaCheckCircle /> <span className="text-[10px] font-black uppercase">Finish</span></button>
                                                                    <button onClick={() => updateStatus(appt._id, 'Cancelled')} className="p-3 text-red-400 hover:text-red-600 transition-colors" title="Cancel Confirmed visit"><FaTimes /></button>
                                                                </>
                                                            )}
                                                        </div>
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

            {/* ════ FEEDBACK TAB ════ */}
            {activeTab === 'feedback' && (
                <div className="space-y-10 max-w-5xl mx-auto">
                    <div className="healsync-card p-10 bg-gradient-to-br from-indigo-50 to-violet-50 border-white flex flex-col md:flex-row items-center gap-10 shadow-healsync">
                        <div className="text-center md:text-left space-y-2">
                            <h3 className="text-sm font-black text-healsync-indigo uppercase tracking-widest">Reputation Overview</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-6xl font-black text-[#111827]">{stats.rating.toFixed(1)}</span>
                                <div>
                                    <div className="flex text-amber-400 text-xl">
                                        {[...Array(5)].map((_, i) => (
                                            <FaStar key={i} className={i < Math.round(stats.rating) ? 'fill-current' : 'text-gray-200'} />
                                        ))}
                                    </div>
                                    <p className="text-healsync-grey font-bold text-sm uppercase mt-1">Based on {stats.numReviews} reviews</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-px md:h-16 w-full md:w-px bg-healsync-indigo/10"></div>
                        <p className="text-healsync-grey font-medium text-center md:text-left flex-1 italic">
                            "Trust is the bridge between a doctor and their patient. Keep delivering excellent care."
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter ml-2">Recent Patient Feedback</h2>
                        {reviews.length > 0 ? (
                            <div className="grid gap-6">
                                {reviews.map((review) => (
                                    <div key={review._id} className="healsync-card p-8 bg-white/80 hover:bg-white transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-healsync-bg flex items-center justify-center overflow-hidden border border-healsync-border">
                                                    {review.patient?.image ? (
                                                        <img src={review.patient.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-black text-healsync-indigo">{review.patient?.name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#111827]">{review.patient?.name || 'Verified Patient'}</h4>
                                                    <p className="text-[10px] font-bold text-healsync-grey uppercase tracking-widest">
                                                        {new Date(review.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex text-amber-400 gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <FaStar key={i} className={`text-sm ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        {review.title && <h5 className="font-black text-[#111827] mb-2">{review.title}</h5>}
                                        <p className="text-healsync-grey font-medium italic">"{review.comment}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel p-20 text-center space-y-4">
                                <div className="text-5xl opacity-20">⭐</div>
                                <h3 className="text-xl font-black text-[#111827]">No reviews yet</h3>
                                <p className="text-healsync-grey font-medium">As you complete appointments, patients will be able to leave feedback about their experience.</p>
                            </div>
                        )}
                    </div>
                </div>
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
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                            <FaPhone size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={doctorInfo.contact}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, contact: e.target.value })}
                                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            placeholder="e.g., 9800000000"
                                        />
                                    </div>
                                    <p className="text-[10px] text-healsync-grey font-medium ml-1">Format: 98XXXXXXXX or +977 98XXXXXXXX</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-healsync-grey uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                            <FaEnvelope size={16} />
                                        </div>
                                        <input
                                            type="email"
                                            value={doctorInfo.email}
                                            onChange={(e) => setDoctorInfo({ ...doctorInfo, email: e.target.value })}
                                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-healsync-bg border border-healsync-border focus:ring-2 ring-healsync-indigo/20 outline-none font-bold text-[#111827]"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    <p className="text-[10px] text-healsync-grey font-medium ml-1">Used for account recovery via Forgot Password</p>
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

            {/* ════ AVAILABILITY TAB ════ */}
            {activeTab === 'availability' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="glass-panel p-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-[#111827] tracking-tighter uppercase">Weekly Availability</h2>
                            <button
                                onClick={handleAvailabilityUpdate}
                                className="btn-primary flex items-center gap-2 px-8 py-3"
                            >
                                <FaSave /> Save Schedule
                            </button>
                        </div>

                        <div className="space-y-6">
                            {availability.map((day, dIdx) => (
                                <div key={day.day} className="p-6 rounded-2xl bg-healsync-bg border border-healsync-border space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                checked={day.isAvailable}
                                                onChange={() => toggleDay(dIdx)}
                                                className="w-5 h-5 accent-healsync-indigo rounded"
                                            />
                                            <span className="font-black text-lg text-[#111827] uppercase tracking-widest">{day.day}</span>
                                        </div>
                                        {day.isAvailable && (
                                            <button
                                                onClick={() => addSlot(dIdx)}
                                                className="text-xs font-black uppercase text-healsync-indigo hover:underline"
                                            >
                                                + Add Slot
                                            </button>
                                        )}
                                    </div>

                                    {day.isAvailable ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {day.slots.map((slot, sIdx) => (
                                                <div key={sIdx} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-healsync-border">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] font-black text-healsync-grey uppercase">Start</label>
                                                        <input
                                                            type="time"
                                                            value={slot.startTime}
                                                            onChange={(e) => updateSlot(dIdx, sIdx, 'startTime', e.target.value)}
                                                            className="w-full font-bold text-[#111827] outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-[10px] font-black text-healsync-grey uppercase">End</label>
                                                        <input
                                                            type="time"
                                                            value={slot.endTime}
                                                            onChange={(e) => updateSlot(dIdx, sIdx, 'endTime', e.target.value)}
                                                            className="w-full font-bold text-[#111827] outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeSlot(dIdx, sIdx)}
                                                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ))}
                                            {day.slots.length === 0 && (
                                                <p className="text-sm italic text-healsync-grey">No slots added yet.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm italic text-healsync-grey pl-9">Not available today.</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Specific Date Availability */}
                        <div className="pt-10 border-t border-healsync-border space-y-8">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-[#111827] tracking-tighter uppercase">Specific Date Overrides</h2>
                                    <p className="text-xs text-healsync-grey font-bold uppercase tracking-widest">Set availability for special dates (Holidays, Extra Hours, etc.)</p>
                                </div>
                                <button
                                    onClick={addCustomDate}
                                    className="px-6 py-2 bg-healsync-indigo/10 text-healsync-indigo rounded-xl text-xs font-black uppercase tracking-widest hover:bg-healsync-indigo hover:text-white transition-all shadow-sm"
                                >
                                    + Add Specific Date
                                </button>
                            </div>

                            <div className="space-y-6">
                                {customAvailability.map((custom, cIdx) => (
                                    <div key={cIdx} className="p-8 rounded-3xl bg-white border-2 border-healsync-indigo/5 space-y-6 shadow-sm hover:border-healsync-indigo/20 transition-all">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full md:w-auto">
                                                <div className="space-y-1 w-full md:w-auto">
                                                    <label className="text-[10px] font-black text-healsync-grey uppercase tracking-widest">Date</label>
                                                    <input
                                                        type="date"
                                                        value={new Date(custom.date).toISOString().split('T')[0]}
                                                        onChange={(e) => updateCustomDate(cIdx, 'date', e.target.value)}
                                                        className="w-full px-5 py-3 rounded-xl bg-healsync-bg border border-healsync-border font-bold text-[#111827] outline-none focus:ring-2 ring-healsync-indigo/10"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 pt-6 md:pt-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={custom.isAvailable}
                                                        onChange={(e) => updateCustomDate(cIdx, 'isAvailable', e.target.checked)}
                                                        className="w-5 h-5 accent-healsync-indigo rounded"
                                                        id={`avail-${cIdx}`}
                                                    />
                                                    <label htmlFor={`avail-${cIdx}`} className="font-black text-sm text-[#111827] uppercase tracking-widest cursor-pointer">Available</label>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeCustomDate(cIdx)}
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center gap-2 group"
                                            >
                                                <FaTimes /> <span className="text-[10px] font-black uppercase hidden group-hover:inline">Remove Date</span>
                                            </button>
                                        </div>

                                        {custom.isAvailable ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-[11px] font-black text-healsync-grey uppercase tracking-widest flex items-center gap-2">
                                                        <FaClock className="text-healsync-indigo" /> Time Slots
                                                    </h4>
                                                    <button
                                                        onClick={() => addCustomSlot(cIdx)}
                                                        className="text-[10px] font-black uppercase text-healsync-indigo hover:underline flex items-center gap-1"
                                                    >
                                                        + Add Slot
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {custom.slots.map((slot, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-4 bg-healsync-bg/50 p-4 rounded-2xl border border-healsync-border group">
                                                            <div className="flex-1 space-y-1">
                                                                <label className="text-[9px] font-black text-healsync-grey uppercase">Start</label>
                                                                <input
                                                                    type="time"
                                                                    value={slot.startTime}
                                                                    onChange={(e) => updateCustomSlot(cIdx, sIdx, 'startTime', e.target.value)}
                                                                    className="w-full bg-transparent font-bold text-[#111827] outline-none text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <label className="text-[9px] font-black text-healsync-grey uppercase">End</label>
                                                                <input
                                                                    type="time"
                                                                    value={slot.endTime}
                                                                    onChange={(e) => updateCustomSlot(cIdx, sIdx, 'endTime', e.target.value)}
                                                                    className="w-full bg-transparent font-bold text-[#111827] outline-none text-sm"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => removeCustomSlot(cIdx, sIdx)}
                                                                className="p-2 text-red-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {custom.slots.length === 0 && (
                                                        <div className="col-span-3 py-6 text-center border-2 border-dashed border-healsync-border rounded-2xl">
                                                            <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest italic">No slots added. Patients won't be able to book.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-6 bg-red-50/50 rounded-2xl border border-dashed border-red-100 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                                    <FaCalendarCheck />
                                                </div>
                                                <div>
                                                    <p className="font-black text-red-800 text-sm uppercase tracking-widest">Marked as Unavailable</p>
                                                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest opacity-70">No appointments will be allowed for this host date.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {customAvailability.length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed border-healsync-border rounded-[2.5rem] bg-gray-50/30">
                                        <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-6">
                                            <FaClock className="text-3xl text-healsync-grey/30" />
                                        </div>
                                        <h3 className="text-lg font-black text-[#111827] uppercase tracking-tighter mb-2">No custom date overrides</h3>
                                        <p className="text-sm text-healsync-grey font-medium max-w-xs mx-auto mb-8">Add specific dates to override your weekly schedule for holidays or special events.</p>
                                        <button
                                            onClick={addCustomDate}
                                            className="px-8 py-3 bg-healsync-indigo text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-healsync-hover hover:-translate-y-0.5 transition-all"
                                        >
                                            + Add Your First Override
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
