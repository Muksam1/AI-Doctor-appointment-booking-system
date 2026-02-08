import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaRobot, FaUserCircle, FaMapMarkerAlt, FaShieldAlt, FaBoxOpen, FaTruck, FaCheckCircle, FaClipboardList } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const PatientDashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: apptData } = await axios.get('/api/appointments/my');
                setAppointments(apptData);

                const { data: orderData } = await axios.get('/api/orders/my');
                setOrders(orderData);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-12 max-w-6xl mx-auto animate-fade-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-healsync-indigo font-black text-xs uppercase tracking-widest bg-healsync-indigo/5 px-4 py-2 rounded-full w-fit border border-healsync-indigo/10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-healsync-indigo opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-healsync-indigo"></span>
                        </span>
                        Patient Dashboard
                    </div>
                    <h1 className="text-4xl font-black text-[#111827] tracking-tighter">My Care Journey</h1>
                    <p className="text-healsync-grey font-medium">Manage your health appointments and medical history</p>
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
                                {appointments.map((appt, idx) => (
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
                                                        {appt.doctor.user.name.charAt(0)}
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
                                            {appt.paymentStatus === 'Paid' && (
                                                <span className="status-pill bg-healsync-indigo/10 text-healsync-indigo">
                                                    PAID
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
        </div>
    );
};

export default PatientDashboard;
