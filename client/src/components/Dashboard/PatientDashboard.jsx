import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaRobot, FaUserCircle, FaMapMarkerAlt, FaShieldAlt, FaBoxOpen, FaTruck, FaCheckCircle, FaClipboardList, FaUserEdit, FaSave, FaImage, FaVenusMars, FaTint, FaHome, FaHistory, FaPhone } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PatientDashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [orders, setOrders] = useState([]);
    const [paymentLoading, setPaymentLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('care'); // 'care' | 'profile'
    const { setUser } = useAuth();
    const [patientInfo, setPatientInfo] = useState({
        name: '',
        image: '',
        contact: '',
        dob: '',
        gender: 'Prefer not to say',
        bloodGroup: 'Unknown',
        address: '',
        bio: '',
        emergencyContact: ''
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const fileInputRef = useRef(null);

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

    useEffect(() => {
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
                        image: profile.user?.image || '',
                        contact: profile.user?.contact || '',
                        dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
                        gender: profile.gender || 'Prefer not to say',
                        bloodGroup: profile.bloodGroup || 'Unknown',
                        address: profile.address || '',
                        bio: profile.bio || '',
                        emergencyContact: profile.emergencyContact || ''
                    });
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            }
        };
        fetchData();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const { data } = await axios.put('/api/patients/profile', patientInfo);
            alert('Profile updated successfully!');
            // Update auth context
            const storedUser = JSON.parse(localStorage.getItem('userInfo'));
            if (storedUser) {
                const updatedUser = {
                    ...storedUser,
                    name: data.user?.name || storedUser.name,
                    image: data.user?.image || storedUser.image,
                    role: data.user?.role || storedUser.role
                };
                localStorage.setItem('userInfo', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            alert('Failed to update profile: ' + (err.response?.data?.message || err.message));
        } finally {
            setProfileLoading(false);
        }
    };

    const handleEsewaPayment = async (appointmentId) => {
        setPaymentLoading(appointmentId);
        try {
            const { data } = await axios.post('/api/payments/esewa/initiate', { appointmentId });

            // Create a dynamic form and submit to eSewa
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.esewa_url;

            Object.keys(data).forEach(key => {
                if (key !== 'esewa_url') {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = data[key];
                    form.appendChild(input);
                }
            });

            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            console.error("Payment initiation failed:", err);
            alert("Payment initiation failed. Please try again.");
            setPaymentLoading(null);
        }
    };

    const handleKhaltiPayment = async (appointmentId, amount) => {
        setPaymentLoading(appointmentId);
        try {
            const { data } = await axios.post('/api/payments/khalti/initiate', {
                appointmentId,
                totalAmount: amount
            });

            if (data.payment_url) {
                window.location.href = data.payment_url;
            } else {
                throw new Error("No payment URL received");
            }
        } catch (err) {
            console.error("Khalti initiation failed:", err);
            alert("Khalti initiation failed. Please try again.");
            setPaymentLoading(null);
        }
    };

    return (
        <div className="space-y-12 w-full animate-fade-up px-4">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-healsync-indigo font-black text-xs uppercase tracking-widest bg-healsync-indigo/5 px-4 py-2 rounded-full w-fit border border-healsync-indigo/10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-healsync-indigo opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-healsync-indigo"></span>
                        </span>
                        Patient Dashboard
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-[#111827] tracking-tighter">My Care Journey</h1>
                        <p className="text-healsync-grey font-medium">Manage your health appointments and medical history</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-healsync-bg p-1.5 rounded-2xl w-fit border border-healsync-border shadow-inner">
                        <button
                            onClick={() => setActiveTab('care')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'care' ? 'bg-white text-healsync-indigo shadow-md' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaCalendarAlt /> My Care
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-healsync-indigo shadow-md' : 'text-healsync-grey hover:text-healsync-indigo'}`}
                        >
                            <FaUserCircle /> My Profile
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link to="/lab-tests" className="btn-secondary px-6 py-3 border border-healsync-border rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all">
                        <FaClipboardList /> Shop Pharmacy
                    </Link>
                    <Link to="/doctors" className="btn-primary shadow-healsync hover:shadow-healsync-hover">
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
                                                        <p className="text-sm font-bold text-healsync-grey uppercase tracking-wider">{appt.doctor.specialization}</p>
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
                                                    <span className={`status-pill ${appt.status === 'Approved' ? 'bg-healsync-mint/10 text-teal-600' :
                                                        appt.status === 'Cancelled' ? 'bg-red-50 text-red-500' : 'bg-healsync-bg text-healsync-grey'
                                                        }`}>
                                                        {appt.status}
                                                    </span>
                                                    {appt.paymentStatus === 'Paid' ? (
                                                        <span className="status-pill bg-healsync-indigo/10 text-healsync-indigo font-black text-[10px] tracking-widest">
                                                            PAID
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEsewaPayment(appt._id)}
                                                                disabled={paymentLoading === appt._id}
                                                                className="px-4 py-2 bg-[#60bb46] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4a8a36] transition-all disabled:opacity-50"
                                                            >
                                                                {paymentLoading === appt._id ? "..." : "eSewa"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleKhaltiPayment(appt._id, appt.fee)}
                                                                disabled={paymentLoading === appt._id}
                                                                className="px-4 py-2 bg-[#5d2e8e] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4a2470] transition-all disabled:opacity-50"
                                                            >
                                                                {paymentLoading === appt._id ? "..." : "Khalti"}
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
                                        <label className="text-[11px] font-black text-[#111827] uppercase tracking-widest ml-1">Contact Number</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-healsync-grey group-focus-within:text-healsync-indigo transition-colors">
                                                <FaPhone size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-healsync-indigo font-medium transition-all"
                                                value={patientInfo.contact}
                                                onChange={e => setPatientInfo({ ...patientInfo, contact: e.target.value })}
                                            />
                                        </div>
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
                    </form>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
