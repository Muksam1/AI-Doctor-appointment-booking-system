import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaUserMd, FaCheck, FaTimes, FaCalendarCheck, FaClock, FaStethoscope } from 'react-icons/fa';

const DoctorDashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });

    useEffect(() => {
        const fetchAppointments = async () => {
            const { data } = await axios.get('/api/appointments/doctor');
            setAppointments(data);
            const pending = data.filter(a => a.status === 'Pending').length;
            const approved = data.filter(a => a.status === 'Approved').length;
            setStats({ pending, approved, total: data.length });
        };
        fetchAppointments();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/appointments/${id}/status`, { status });
            // Refresh
            const { data } = await axios.get('/api/appointments/doctor');
            setAppointments(data);
            const pending = data.filter(a => a.status === 'Pending').length;
            const approved = data.filter(a => a.status === 'Approved').length;
            setStats({ pending, approved, total: data.length });
        } catch (err) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto animate-fade-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-4 text-healsync-indigo font-black text-sm uppercase tracking-widest bg-healsync-indigo/5 px-6 py-2.5 rounded-full w-fit border border-healsync-indigo/10">
                        <FaStethoscope className="animate-pulse text-lg" />
                        Professional Portal
                    </div>
                    <h1 className="text-5xl font-black text-[#111827] tracking-tighter">Doctor Console</h1>
                    <p className="text-healsync-grey font-medium text-lg">Coordinate your clinical schedule and patient data</p>
                </div>
                <div className="flex items-center gap-6 bg-white p-3 rounded-2xl border border-healsync-border shadow-healsync">
                    <div className="px-8 py-3 text-right">
                        <p className="text-[12px] font-black text-healsync-grey uppercase tracking-widest leading-none">Status</p>
                        <p className="text-lg font-black text-[#111827]">Online & Available</p>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-healsync-mint animate-pulse mr-6"></div>
                </div>
            </header>

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

            {/* Appointment Management Table */}
            <div className="glass-panel overflow-hidden">
                <div className="p-10 border-b border-healsync-border bg-white/40 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-[#111827] uppercase tracking-tighter">Patient Appointments</h2>
                    <div className="hidden md:flex items-center gap-6 text-sm font-black text-healsync-grey uppercase tracking-widest">
                        <label htmlFor="appt-filter">Filter:</label>
                        <select id="appt-filter" name="filter" className="bg-transparent focus:outline-none text-healsync-indigo font-black">
                            <option>Today</option>
                            <option>This Week</option>
                            <option>All-time</option>
                        </select>
                    </div>
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
                            {appointments.map((appt, idx) => (
                                <tr key={appt._id} className="hover:bg-healsync-indigo/[0.02] transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-full bg-healsync-indigo/10 flex items-center justify-center text-healsync-indigo font-black text-lg">
                                                {appt.patient.name.charAt(0)}
                                            </div>
                                            <span className="font-black text-[#111827] text-lg">{appt.patient.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="font-black text-lg text-[#111827]">{new Date(appt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        <p className="text-sm font-bold text-healsync-grey uppercase tracking-tighter mt-1">{appt.timeSlot}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`status-pill ${appt.status === 'Approved' ? 'bg-healsync-mint/10 text-teal-600 border-healsync-mint/20' :
                                            appt.status === 'Cancelled' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-healsync-bg text-healsync-grey border-healsync-border'
                                            }`}>
                                            {appt.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-black ${appt.paymentStatus === 'Paid' ? 'text-healsync-indigo' : 'text-healsync-grey opacity-50'}`}>
                                                {appt.paymentStatus}
                                            </span>
                                            {appt.paymentStatus === 'Paid' && <span className="text-[9px] uppercase font-black text-healsync-grey/50">via Khalti</span>}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        {appt.status === 'Pending' ? (
                                            <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => updateStatus(appt._id, 'Approved')}
                                                    className="w-12 h-12 flex items-center justify-center bg-healsync-mint/20 text-teal-700 rounded-xl hover:bg-healsync-mint hover:text-white transition-all shadow-sm text-xl"
                                                    title="Approve"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(appt._id, 'Cancelled')}
                                                    className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm text-xl"
                                                    title="Cancel"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] font-black text-healsync-grey uppercase tracking-tighter opacity-30 italic">Closed Case</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {appointments.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <FaCalendarCheck className="text-7xl mx-auto mb-6 opacity-5" />
                                        <p className="text-lg font-black text-healsync-grey/40 uppercase tracking-widest italic">No Patient Visits Logged</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
