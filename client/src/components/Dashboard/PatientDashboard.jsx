import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCalendarAlt, FaRobot, FaUserCircle, FaMapMarkerAlt, FaShieldAlt, FaBoxOpen, FaTruck, FaCheckCircle, FaClipboardList, FaUserEdit, FaSave, FaImage, FaVenusMars, FaTint, FaHome, FaHistory, FaPhone, FaStar, FaTimes, FaEnvelope } from 'react-icons/fa';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const PatientDashboard = () => {
    const [searchParams] = useSearchParams();
    const [appointments, setAppointments] = useState([]);
    const [orders, setOrders] = useState([]);
    const [paymentLoading, setPaymentLoading] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'care'); // 'care' | 'profile'
    const { setUser } = useAuth();
    const [patientInfo, setPatientInfo] = useState({
        name: '',
        email: '',
        image: '',
        contact: '',
        dob: '',
        gender: 'Prefer not to say',
        bloodGroup: 'Unknown',
        address: '',
        bio: '',
        emergencyContact: '',
        medicalConditions: [],
        allergies: [],
        currentMedications: [],
        pastSurgeries: [],
        familyHistory: [],
        vaccinationRecords: [],
        smokingStatus: 'Prefer not to say',
        alcoholConsumption: 'Prefer not to say',
        exerciseHabits: '',
        dietaryRestrictions: []
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [reviewModal, setReviewModal] = useState({ isOpen: false, appointmentId: null });
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Sync tab from URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPatientInfo(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const { socket } = useSocket();

    const fetchData = async () => {
        try {
            const { data: apptData } = await axios.get('/api/appointments/my');
            setAppointments(apptData);

            const { data: orderData } = await axios.get('/api/orders/my');
            setOrders(orderData);

            const { data: profile } = await axios.get('/api/patients/profile');
            if (profile) {
                setPatientInfo({
                    name: profile.user?.name || '',
                    email: profile.user?.email || '',
                    image: profile.user?.image || '',
                    contact: profile.user?.contact || '',
                    dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
                    gender: profile.gender || 'Prefer not to say',
                    bloodGroup: profile.bloodGroup || 'Unknown',
                    address: profile.address || '',
                    bio: profile.bio || '',
                    emergencyContact: profile.emergencyContact || '',
                    medicalConditions: profile.medicalConditions || [],
                    allergies: profile.allergies || [],
                    currentMedications: profile.currentMedications || [],
                    pastSurgeries: profile.pastSurgeries || [],
                    familyHistory: profile.familyHistory || [],
                    vaccinationRecords: profile.vaccinationRecords || [],
                    smokingStatus: profile.smokingStatus || 'Prefer not to say',
                    alcoholConsumption: profile.alcoholConsumption || 'Prefer not to say',
                    exerciseHabits: profile.exerciseHabits || '',
                    dietaryRestrictions: profile.dietaryRestrictions || []
                });
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Socket listener for auto-refresh
    useEffect(() => {
        if (socket) {
            socket.on('appointmentStatusUpdate', ({ appointmentId, status }) => {
                // Update specific appointment in state or just re-fetch
                fetchData();
            });
            return () => socket.off('appointmentStatusUpdate');
        }
    }, [socket]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const { data } = await axios.put('/api/patients/profile', patientInfo);
            toast.success('Profile updated successfully!');
            // Update auth context
            const storedUser = JSON.parse(sessionStorage.getItem('userInfo'));
            if (storedUser) {
                const patientUser = data.patient?.user;
                const updatedUser = {
                    ...storedUser,
                    name: patientUser?.name || patientInfo.name || storedUser.name,
                    image: patientUser?.image || patientInfo.image || storedUser.image,
                    role: patientUser?.role || storedUser.role
                };
                sessionStorage.setItem('userInfo', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            toast.error('Failed to update profile: ' + (err.response?.data?.message || err.message));
        } finally {
            setProfileLoading(false);
        }
    };

    const handleEsewaPayment = async (appointmentId, amount) => {
        setPaymentLoading(appointmentId);
        try {
            const { data } = await axios.post('/api/payments/esewa/initiate', { appointmentId, amount });

            // Create a dynamic form and submit to eSewa
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.payment_url;

            Object.keys(data.formData || {}).forEach((key) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = data.formData[key];
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            console.error("Payment initiation failed:", err);
            toast.error('Payment initiation failed. Please try again.');
            setPaymentLoading(null);
        }
    };

    const handleKhaltiPayment = async (appointmentId, amount) => {
        setPaymentLoading(appointmentId);
        try {
            const { data } = await axios.post('/api/payments/khalti/initiate', {
                appointmentId,
                amount
            });

            if (data.payment_url) {
                window.location.href = data.payment_url;
            } else {
                throw new Error("No payment URL received");
            }
        } catch (err) {
            console.error("Khalti initiation failed:", err);
            toast.error('Khalti initiation failed. Please try again.');
            setPaymentLoading(null);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewSubmitting(true);
        try {
            await axios.post('/api/reviews', {
                appointmentId: reviewModal.appointmentId,
                ...reviewForm
            });
            toast.success('Review submitted successfully!');
            setReviewModal({ isOpen: false, appointmentId: null });
            setReviewForm({ rating: 5, title: '', comment: '' });
            // Optionally refresh appointments
            const { data: apptData } = await axios.get('/api/appointments/my');
            setAppointments(apptData);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    return (
        <div className="space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-healsync-indigo font-black text-[10px] md:text-xs uppercase tracking-widest bg-healsync-indigo/5 px-4 py-2 rounded-full w-fit border border-healsync-indigo/10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-healsync-indigo opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-healsync-indigo"></span>
                        </span>
                        Patient Dashboard
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tighter">My Care Journey</h1>
                        <p className="text-healsync-grey font-medium text-sm md:text-base">Manage your health appointments and medical history</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-healsync-bg p-1.5 rounded-2xl w-full md:w-fit border border-healsync-border shadow-inner overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => {
                                setActiveTab('care');
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'care');
                                window.history.pushState({}, '', url);
                            }}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'care' ? 'bg-white text-healsync-indigo shadow-md' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaCalendarAlt /> My Care
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('profile');
                                const url = new URL(window.location);
                                url.searchParams.set('tab', 'profile');
                                window.history.pushState({}, '', url);
                            }}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${activeTab === 'profile' ? 'bg-white text-healsync-indigo shadow-md' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaUserCircle /> My Profile
                        </button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Link to="/lab-tests" className="btn-secondary px-6 py-3 border border-healsync-border rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all text-sm md:text-base">
                        <FaClipboardList /> Shop Pharmacy
                    </Link>
                    <Link to="/doctors" className="btn-primary shadow-healsync hover:shadow-healsync-hover text-center py-3 text-sm md:text-base">
                        Book New Consultation
                    </Link>
                </div>
            </header>

            {activeTab === 'care' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* Appointments Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-lg font-black text-[#111827] uppercase tracking-widest">Upcoming Visits</h2>
                                <span className="text-xs font-bold text-healsync-indigo bg-healsync-indigo/5 px-3 py-1 rounded-lg">{appointments.length} active</span>
                            </div>
                            {appointments.length > 0 ? (
                                <div className="space-y-4">
                                    {appointments.map((appt, idx) => {
                                        if (!appt.doctor || !appt.doctor.user) return null;
                                        return (
                                            <div
                                                key={appt._id}
                                                className="healsync-card p-8 group flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/40 hover:bg-white transition-all duration-500"
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <div className="flex gap-6 items-center">
                                                    <div className="w-20 h-20 rounded-2xl bg-healsync-bg shrink-0 overflow-hidden border border-healsync-border shadow-inner">
                                                        {appt.doctor.user.image ? (
                                                            <img src={appt.doctor.user.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-healsync-indigo/10 text-healsync-indigo italic font-black text-2xl">
                                                                {appt.doctor.user.name?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-xl text-[#111827]">{appt.doctor.user.name}</h3>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-sm font-bold text-healsync-grey uppercase tracking-wider">{appt.doctor.specialization}</p>
                                                            <span className="flex items-center gap-1 text-xs font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                                                <FaStar /> {appt.doctor.ratings > 0 ? `${appt.doctor.ratings} (${appt.doctor.numReviews})` : 'New'}
                                                            </span>
                                                        </div>
                                                        <div className="flex wrap gap-4 mt-3">
                                                            <p className="text-sm font-black flex items-center gap-2 text-[#111827]">
                                                                <FaCalendarAlt className="text-healsync-indigo" />
                                                                {new Date(appt.date).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-sm font-black text-healsync-indigo bg-healsync-indigo/5 px-3 py-1 rounded-lg">
                                                                {appt.timeSlot}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`status-pill ${appt.status === 'Confirmed' ? 'bg-healsync-mint/10 text-teal-600' :
                                                        appt.status === 'Cancelled' ? 'bg-red-50 text-red-500' : 
                                                        appt.status === 'Completed' ? 'bg-teal-50 text-healsync-indigo border-healsync-indigo/20' :
                                                        'bg-healsync-bg text-healsync-grey'
                                                        }`}>
                                                        {appt.status}
                                                    </span>
                                                    {/* Show "Awaiting Doctor" when paid but still pending */}
                                                    {appt.status === 'Pending' && appt.paymentStatus === 'Paid' && (
                                                        <span className="status-pill bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black tracking-widest animate-pulse">
                                                            ⏳ Awaiting Doctor
                                                        </span>
                                                    )}
                                                    {appt.status === 'Completed' && (
                                                        appt.reviewSubmitted ? (
                                                            <span className="text-[10px] font-black uppercase text-healsync-mint mt-4 flex items-center gap-1 opacity-70">
                                                                <FaCheckCircle className="text-xs" /> Feedback Sent
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setReviewModal({ isOpen: true, appointmentId: appt._id })}
                                                                className="text-[10px] font-black uppercase text-healsync-indigo hover:underline mt-2 flex items-center gap-1"
                                                            >
                                                                <FaStar className="text-amber-400" /> Share Feedback
                                                            </button>
                                                        )
                                                    )}
                                                    {appt.paymentStatus === 'Refunded' ? (
                                                        <span className="status-pill bg-green-50 text-green-600 border border-green-200 font-black text-[10px] tracking-widest mt-2">
                                                            💳 REFUNDED
                                                        </span>
                                                    ) : appt.paymentStatus === 'Paid' ? (
                                                        <span className="status-pill bg-healsync-indigo/10 text-healsync-indigo font-black text-[10px] tracking-widest mt-2">
                                                            ✅ PAID
                                                        </span>
                                                    ) : (appt.status === 'Completed' || appt.status === 'Cancelled') ? (
                                                        <span className="status-pill bg-gray-100 text-gray-500 font-black text-[10px] tracking-widest mt-2">
                                                            {appt.status === 'Cancelled' ? 'PAYMENT N/A' : 'PAYMENT DUE AT CLINIC'}
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleEsewaPayment(appt._id, appt.fee)}
                                                                disabled={paymentLoading === appt._id}
                                                                className="px-4 py-2 bg-[#60bb46] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4a8a36] transition-all disabled:opacity-50"
                                                            >
                                                                {paymentLoading === appt._id ? "..." : "eSewa"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="glass-panel p-10 text-center text-healsync-grey font-medium">No upcoming appointments.</div>
                            )}
                        </div>

                        {/* Pharmacy Orders Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-lg font-black text-[#111827] uppercase tracking-widest">Pharmacy Orders</h2>
                                <span className="text-xs font-bold text-healsync-indigo bg-healsync-indigo/5 px-3 py-1 rounded-lg">{orders.length} orders</span>
                            </div>
                            {orders.length > 0 ? (
                                <div className="space-y-4">
                                    {orders.map((order, idx) => (
                                        <div key={order._id} className="healsync-card p-8 group flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/40 hover:bg-white transition-all duration-500">
                                            <div className="flex gap-6 items-center">
                                                <div className="w-16 h-16 rounded-2xl bg-healsync-bg flex items-center justify-center text-2xl text-healsync-indigo border border-healsync-border shadow-inner">
                                                    <FaBoxOpen />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg text-[#111827]">Order #{order._id.slice(-6).toUpperCase()}</h3>
                                                    <p className="text-sm font-bold text-healsync-grey">
                                                        {order.orderItems.length} items • Rs. {order.totalPrice}
                                                    </p>
                                                    <div className="flex wrap gap-4 mt-2">
                                                        <p className="text-xs font-black flex items-center gap-2 text-[#111827]">
                                                            <FaTruck className="text-healsync-indigo" />
                                                            Status: <span className="text-healsync-indigo">{order.status}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 text-right">
                                                <p className="text-xs font-bold text-healsync-grey italic">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                <span className="status-pill bg-healsync-mint/10 text-teal-600 border-none font-black text-[10px]">
                                                    {order.isPaid ? 'PAYMENT SUCCESS' : 'PAYMENT PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-panel p-10 text-center text-healsync-grey font-medium">You haven't ordered any medicines yet.</div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Utilities */}
                    <div className="space-y-8">
                        <div className="bg-healsync-indigo p-10 rounded-[2.5rem] text-white shadow-healsync relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[5rem] rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000"></div>
                            <FaRobot className="text-9xl absolute -bottom-6 -right-6 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            <h3 className="text-2xl font-black mb-4 relative z-10 leading-tight">AI Symptom <br /> Checker</h3>
                            <p className="text-[15px] opacity-80 mb-8 leading-relaxed font-medium relative z-10">
                                Feeling unwell? Chat with our neural assistant to understand your health patterns.
                            </p>
                            <button className="bg-healsync-mint text-[#064e3b] px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all relative z-10 shadow-lg">
                                Analyze Symptoms
                            </button>
                        </div>

                        <div className="bg-healsync-violet p-10 rounded-[2.5rem] text-white shadow-healsync relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[5rem] rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000"></div>
                            <div className="text-8xl absolute -bottom-6 -right-6 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700">🩺</div>
                            <h3 className="text-2xl font-black mb-4 relative z-10 leading-tight">Join our Doctor <br /> Network</h3>
                            <p className="text-[15px] opacity-80 mb-8 leading-relaxed font-medium relative z-10">
                                Are you a healthcare professional? Apply to join Nepal's smartest medical network.
                            </p>
                            <Link to="/apply-doctor" className="bg-white text-healsync-violet px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all relative z-10 shadow-lg inline-block text-center w-full">
                                Submit Application
                            </Link>
                        </div>

                        <div className="glass-panel p-8 space-y-6">
                            <h4 className="text-xs font-black text-[#111827] uppercase tracking-widest border-b border-healsync-border pb-4">Health Security</h4>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-healsync-bg flex items-center justify-center text-healsync-indigo shadow-inner">
                                        <FaShieldAlt />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[#111827]">256-bit Encryption</p>
                                        <p className="text-[10px] font-bold text-healsync-grey uppercase tracking-tighter leading-none mt-1">ISO Certified Privacy</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-healsync-bg flex items-center justify-center text-healsync-indigo shadow-inner">
                                        <FaMapMarkerAlt />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-[#111827]">Local Data Center</p>
                                        <p className="text-[10px] font-bold text-healsync-grey uppercase tracking-tighter leading-none mt-1">Kathmandu, Nepal</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-5xl animate-fade-up">
                    <form onSubmit={handleUpdateProfile} className="space-y-10">
                        <section className="bg-white rounded-[3rem] border border-healsync-border shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-healsync-border bg-gray-50/50 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-healsync-indigo/10 flex items-center justify-center text-healsync-indigo text-xl">
                                        <FaUserEdit />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Edit Personal Info</h2>
                                        <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest mt-1">Your basic profile settings</p>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="px-8 py-3 bg-healsync-indigo text-white rounded-xl font-black text-sm hover:bg-healsync-violet transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {profileLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave />}
                                    Save Changes
                                </button>
                            </div>

                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Profile Photo URL</label>
                                        <div className="flex flex-col xl:flex-row gap-4">
                                            <div className="relative group flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                                    <FaImage size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-healsync-indigo/5 focus:border-healsync-indigo font-medium transition-all text-sm"
                                                    placeholder="Paste image URL here..."
                                                    value={patientInfo.image}
                                                    onChange={e => setPatientInfo({ ...patientInfo, image: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current.click()}
                                                className="px-8 py-4 bg-healsync-indigo text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-healsync-indigo/90 hover:-translate-y-1 transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                <FaImage size={14} /> Upload photo
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                            value={patientInfo.name}
                                            required
                                            onChange={e => setPatientInfo({ ...patientInfo, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Phone Number</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                                <FaPhone size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                                placeholder="e.g., 9800000000"
                                                value={patientInfo.contact}
                                                onChange={e => setPatientInfo({ ...patientInfo, contact: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[10px] text-healsync-grey font-medium ml-1">Format: e.g. 984XXXXXXX or +977 98XXXXXXXX</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                                <FaEnvelope size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                                placeholder="your@email.com"
                                                value={patientInfo.email}
                                                onChange={e => setPatientInfo({ ...patientInfo, email: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[10px] text-healsync-grey font-medium ml-1">Used for account recovery via Forgot Password</p>
                                    </div>
                                </div>

                                <div className="space-y-8 flex flex-col justify-center items-center bg-gray-50/30 rounded-[2rem] border border-dashed border-gray-200 p-8">
                                    <div className="w-40 h-40 rounded-full border-4 border-white shadow-2xl relative overflow-hidden group">
                                        <img
                                            src={patientInfo.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                            alt="Profile Preview"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-[#111827] text-xl">{patientInfo.name || 'Your Name'}</p>
                                        <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest mt-1">Profile Preview</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[3rem] border border-healsync-border shadow-sm p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FaHistory /> Date of Birth
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                    value={patientInfo.dob}
                                    onChange={e => setPatientInfo({ ...patientInfo, dob: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FaVenusMars /> Gender
                                </label>
                                <select
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all appearance-none"
                                    value={patientInfo.gender}
                                    onChange={e => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                    <option>Prefer not to say</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FaTint /> Blood Group
                                </label>
                                <select
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all appearance-none"
                                    value={patientInfo.bloodGroup}
                                    onChange={e => setPatientInfo({ ...patientInfo, bloodGroup: e.target.value })}
                                >
                                    <option>A+</option>
                                    <option>A-</option>
                                    <option>B+</option>
                                    <option>B-</option>
                                    <option>AB+</option>
                                    <option>AB-</option>
                                    <option>O+</option>
                                    <option>O-</option>
                                    <option>Unknown</option>
                                </select>
                            </div>
                        </section>

                        <section className="bg-white rounded-[3rem] border border-healsync-border shadow-sm p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <FaHome /> Primary Address
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="City, Area, House No."
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                        value={patientInfo.address}
                                        onChange={e => setPatientInfo({ ...patientInfo, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <FaPhone /> Emergency Contact
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Name / Relationship / Phone"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                        value={patientInfo.emergencyContact}
                                        onChange={e => setPatientInfo({ ...patientInfo, emergencyContact: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Medical Bio / Notes</label>
                                <textarea
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-32 resize-none"
                                    placeholder="Tell us about any allergies or medical history..."
                                    value={patientInfo.bio}
                                    onChange={e => setPatientInfo({ ...patientInfo, bio: e.target.value })}
                                ></textarea>
                            </div>
                        </section>

                        <section className="bg-white rounded-[3rem] border border-healsync-border shadow-sm p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Smoking Status</label>
                                    <select
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all appearance-none"
                                        value={patientInfo.smokingStatus}
                                        onChange={e => setPatientInfo({ ...patientInfo, smokingStatus: e.target.value })}
                                    >
                                        <option>Never</option>
                                        <option>Former</option>
                                        <option>Current</option>
                                        <option>Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Alcohol Consumption</label>
                                    <select
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all appearance-none"
                                        value={patientInfo.alcoholConsumption}
                                        onChange={e => setPatientInfo({ ...patientInfo, alcoholConsumption: e.target.value })}
                                    >
                                        <option>None</option>
                                        <option>Occasional</option>
                                        <option>Moderate</option>
                                        <option>Heavy</option>
                                        <option>Prefer not to say</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Exercise Habits</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Daily walking, gym 3x/week"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                    value={patientInfo.exerciseHabits}
                                    onChange={e => setPatientInfo({ ...patientInfo, exerciseHabits: e.target.value })}
                                />
                            </div>
                        </section>

                        <section className="bg-white rounded-[3rem] border border-healsync-border shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-healsync-border bg-red-50/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 text-xl">
                                        <FaHistory />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Medical History</h2>
                                        <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest mt-1">Help doctors understand your health background</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Medical Conditions</label>
                                        <textarea
                                            placeholder="List any chronic conditions (diabetes, hypertension, asthma, etc.)"
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                            value={patientInfo.medicalConditions.join(', ')}
                                            onChange={e => setPatientInfo({ ...patientInfo, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                        ></textarea>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Allergies</label>
                                        <textarea
                                            placeholder="List any allergies (medications, foods, environmental)"
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                            value={patientInfo.allergies.join(', ')}
                                            onChange={e => setPatientInfo({ ...patientInfo, allergies: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Current Medications</label>
                                    <textarea
                                        placeholder="List current medications with dosage (e.g., Metformin 500mg daily, Amlodipine 5mg daily)"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                        value={patientInfo.currentMedications.map(med => `${med.name} ${med.dosage || ''} ${med.frequency || ''}`).join(', ')}
                                        onChange={e => {
                                            const meds = e.target.value.split(',').map(s => {
                                                const parts = s.trim().split(' ');
                                                return {
                                                    name: parts[0] || '',
                                                    dosage: parts[1] || '',
                                                    frequency: parts.slice(2).join(' ') || ''
                                                };
                                            }).filter(med => med.name);
                                            setPatientInfo({ ...patientInfo, currentMedications: meds });
                                        }}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Past Surgeries</label>
                                        <textarea
                                            placeholder="List any past surgeries with dates"
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                            value={patientInfo.pastSurgeries.map(surgery => `${surgery.procedure} (${surgery.date ? new Date(surgery.date).toLocaleDateString() : ''})`).join(', ')}
                                            onChange={e => {
                                                const surgeries = e.target.value.split(',').map(s => {
                                                    const match = s.trim().match(/^(.+?)\s*\((.+)\)$/);
                                                    if (match) {
                                                        return {
                                                            procedure: match[1].trim(),
                                                            date: new Date(match[2].trim()).toISOString().split('T')[0]
                                                        };
                                                    }
                                                    return { procedure: s.trim(), date: '' };
                                                }).filter(s => s.procedure);
                                                setPatientInfo({ ...patientInfo, pastSurgeries: surgeries });
                                            }}
                                        ></textarea>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Family History</label>
                                        <textarea
                                            placeholder="List relevant family medical history"
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                            value={patientInfo.familyHistory.map(fh => `${fh.condition} (${fh.relation})`).join(', ')}
                                            onChange={e => {
                                                const history = e.target.value.split(',').map(s => {
                                                    const match = s.trim().match(/^(.+?)\s*\((.+)\)$/);
                                                    if (match) {
                                                        return {
                                                            condition: match[1].trim(),
                                                            relation: match[2].trim()
                                                        };
                                                    }
                                                    return { condition: s.trim(), relation: '' };
                                                }).filter(fh => fh.condition);
                                                setPatientInfo({ ...patientInfo, familyHistory: history });
                                            }}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Vaccination Records</label>
                                    <textarea
                                        placeholder="List recent vaccinations with dates"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                        value={patientInfo.vaccinationRecords.map(vac => `${vac.vaccine} (${vac.date ? new Date(vac.date).toLocaleDateString() : ''})`).join(', ')}
                                        onChange={e => {
                                            const vaccines = e.target.value.split(',').map(s => {
                                                const match = s.trim().match(/^(.+?)\s*\((.+)\)$/);
                                                if (match) {
                                                    return {
                                                        vaccine: match[1].trim(),
                                                        date: new Date(match[2].trim()).toISOString().split('T')[0]
                                                    };
                                                }
                                                return { vaccine: s.trim(), date: '' };
                                            }).filter(v => v.vaccine);
                                            setPatientInfo({ ...patientInfo, vaccinationRecords: vaccines });
                                        }}
                                    ></textarea>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Dietary Restrictions</label>
                                    <textarea
                                        placeholder="List any dietary restrictions or preferences"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all h-24 resize-none"
                                        value={patientInfo.dietaryRestrictions.join(', ')}
                                        onChange={e => setPatientInfo({ ...patientInfo, dietaryRestrictions: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                    ></textarea>
                                </div>
                            </div>
                        </section>
                    </form>
                </div>
            )}
            {/* Review Modal */}
            {reviewModal.isOpen && (
                <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Rate Your Visit</h3>
                            <button onClick={() => setReviewModal({ isOpen: false, appointmentId: null })} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FaTimes />
                            </button>
                        </header>
                        <form onSubmit={handleReviewSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-healsync-grey uppercase tracking-widest block">Rating</label>
                                <div className="flex gap-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                            className={`text-3xl transition-all ${reviewForm.rating >= star ? 'text-amber-400 scale-110' : 'text-gray-200'}`}
                                        >
                                            <FaStar />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-healsync-grey uppercase tracking-widest block">Review Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:outline-none focus:border-healsync-indigo"
                                    placeholder="Briefly summarize your visit"
                                    value={reviewForm.title}
                                    onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-healsync-grey uppercase tracking-widest block">Detailed Experience</label>
                                <textarea
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium focus:outline-none focus:border-healsync-indigo h-32 resize-none"
                                    placeholder="How was the doctor's communication and diagnosis?"
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={reviewSubmitting}
                                className="w-full py-4 bg-healsync-indigo text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-xl hover:bg-healsync-violet transition-all active:scale-95 disabled:opacity-50"
                            >
                                {reviewSubmitting ? 'Submitting...' : 'Post Verified Review'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
