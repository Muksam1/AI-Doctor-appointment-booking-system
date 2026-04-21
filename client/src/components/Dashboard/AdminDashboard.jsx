import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import {
    FaUsers, FaUserMd, FaCalendarCheck, FaChartLine,
    FaPlus, FaTrash, FaEdit, FaBoxOpen,
    FaCheckCircle, FaTimesCircle, FaHospital,
    FaClock, FaCheck, FaUserShield, FaEnvelope, FaPhone, FaStar
} from 'react-icons/fa';

const AdminDashboard = () => {
    const initialProductState = {
        name: '',
        price: '',
        category: 'Medicines',
        description: '',
        icon: 'FaCapsules',
        countInStock: 10,
        image: ''
    };
    const [searchParams] = useSearchParams();
    const { socket } = useSocket();
    const [stats, setStats] = useState({ users: {}, appointments: {}, revenue: {} });
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [approvedDoctors, setApprovedDoctors] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [userPage, setUserPage] = useState(1);
    const [userPages, setUserPages] = useState(1);
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState(initialProductState);
    const [editingProduct, setEditingProduct] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'stats');
    const [actionLoading, setActionLoading] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [appointmentPage, setAppointmentPage] = useState(1);
    const [appointmentPages, setAppointmentPages] = useState(1);
    const productImageInputRef = useRef(null);

    // Sync tab from URL whenever navbar link changes
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    // Real-time updates for Admin
    useEffect(() => {
        if (socket) {
            socket.on('adminNotification', () => {
                fetchData(); // Refresh stats, users, etc.
            });
            return () => socket.off('adminNotification');
        }
    }, [socket]);

    const fetchData = async () => {
        try {
            const statsRes = await axios.get('/api/admin/stats');
            setStats(statsRes.data);

            const pendingRes = await axios.get('/api/admin/doctors?status=pending');
            setPendingDoctors(Array.isArray(pendingRes.data.doctors) ? pendingRes.data.doctors : []);

            const approvedRes = await axios.get('/api/admin/doctors?status=approved');
            setApprovedDoctors(Array.isArray(approvedRes.data.doctors) ? approvedRes.data.doctors : []);

            const usersRes = await axios.get(`/api/admin/users?pageNumber=${userPage}`);
            setAllUsers(usersRes.data.users);
            setUserPages(usersRes.data.pages);

            const prodData = await axios.get('/api/products');
            setProducts(prodData.data);

            if (activeTab === 'appointments') {
                const apptsRes = await axios.get(`/api/admin/appointments?page=${appointmentPage}`);
                setAppointments(apptsRes.data.appointments);
                setAppointmentPages(apptsRes.data.totalPages);
            }
        } catch (err) {
            console.error("Error fetching admin data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userPage, appointmentPage, activeTab]);

    const verifyDoctor = async (id, status) => {
        setActionLoading(id + status);
        try {
            await axios.put(`/api/admin/doctors/${id}/verify`, { status });
            await fetchData(); // Refresh all lists
        } catch (err) {
            toast.error('Failed to update doctor status');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user? This will also remove their doctor profile if applicable.")) {
            setActionLoading(id + 'delete');
            try {
                await axios.delete(`/api/admin/user/${id}`);
                await fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error deleting user');
            } finally {
                setActionLoading(null);
            }
        }
    };

    const toggleBanUser = async (id) => {
        setActionLoading(id + 'ban');
        try {
            const { data } = await axios.patch(`/api/admin/user/${id}/ban`);
            toast.success(data.message);
            await fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error banning/unbanning user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                const { data } = await axios.put(`/api/products/${editingProduct}`, newProduct);
                setProducts(products.map(p => p._id === editingProduct ? data : p));
                toast.success('Product updated successfully!');
                setEditingProduct(null);
            } else {
                const { data } = await axios.post('/api/products', newProduct);
                setProducts([...products, data]);
                toast.success('Product added successfully!');
            }
            setNewProduct(initialProductState);
            if (productImageInputRef.current) productImageInputRef.current.value = '';
        } catch (err) {
            toast.error(err.response?.data?.message || (editingProduct ? 'Error updating product' : 'Error adding product'));
        }
    };

    const handleProductImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file.');
            return;
        }

        const uploadProductImage = async () => {
            try {
                const formData = new FormData();
                formData.append('image', file);
                const { data } = await axios.post('/api/products/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const apiBaseUrl = axios.defaults.baseURL || `${window.location.protocol}//${window.location.hostname}:5000`;
                const normalizedImageUrl = data.imageUrl.startsWith('http')
                    ? data.imageUrl
                    : `${apiBaseUrl.replace(/\/$/, '')}${data.imageUrl}`;

                setNewProduct(prev => ({ ...prev, image: normalizedImageUrl }));
                toast.success('Product image uploaded.');
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to upload product image');
                if (productImageInputRef.current) productImageInputRef.current.value = '';
            }
        };

        uploadProductImage();
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product._id);
        setNewProduct({
            name: product.name,
            price: product.price,
            category: product.category,
            description: product.description,
            icon: product.icon || 'FaCapsules',
            countInStock: product.countInStock || 10,
            image: product.image || ''
        });
        // Scroll to the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure?")) {
            try {
                await axios.delete(`/api/products/${id}`);
                setProducts(products.filter(p => p._id !== id));
            } catch (err) {
                toast.error('Error deleting product');
            }
        }
    };
    const handleDeleteAppointment = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this appointment?")) {
            try {
                await axios.delete(`/api/admin/appointments/${id}`);
                setAppointments(appointments.filter(appt => appt._id !== id));
                fetchData(); // Refresh top level stats
            } catch (err) {
                toast.error('Error deleting appointment');
                console.error(err);
            }
        }
    };

    const handleDeleteAllAppointments = async () => {
        if (window.confirm("WARNING: Are you absolutely sure you want to delete ALL appointments? This cannot be undone.")) {
            try {
                await axios.delete('/api/admin/appointments');
                setAppointments([]);
                fetchData(); // Refresh top level stats
            } catch (err) {
                toast.error('Error deleting all appointments');
                console.error(err);
            }
        }
    };

    const safePendingDoctors = Array.isArray(pendingDoctors) ? pendingDoctors : [];
    const safeApprovedDoctors = Array.isArray(approvedDoctors) ? approvedDoctors : [];

    return (
        <div className="space-y-12">
            <header className="border-b border-healsync-border pb-8">
                <h1 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tighter uppercase">Command Center</h1>
                <p className="text-healsync-grey font-medium text-sm md:text-base">Platform overview and management console</p>
                {safePendingDoctors.length > 0 && activeTab !== 'doctors' && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block" />
                        {safePendingDoctors.length} doctor application{safePendingDoctors.length > 1 ? 's' : ''} awaiting review
                    </div>
                )}
            </header>

            {/* ════ STATS TAB ════ */}
            {activeTab === 'stats' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-healsync-indigo p-8 rounded-[2rem] text-white shadow-lg flex flex-col justify-between h-48">
                            <FaChartLine className="text-4xl opacity-20" />
                            <div>
                                <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Total Revenue</p>
                                <h3 className="text-3xl font-black">Rs. {stats.revenue?.total || 0}</h3>
                                <div className="mt-2 text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                                    Appt: Rs. {stats.revenue?.appointments || 0} | Meds: Rs. {stats.revenue?.orders || 0}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaUserMd className="text-4xl text-healsync-indigo opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Doctors</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.users?.doctors || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaUsers className="text-4xl text-healsync-mint opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Patients</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.users?.patients || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaHospital className="text-4xl text-healsync-violet opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Appointments</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.appointments?.total || 0}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Quick Pending preview */}
                    {pendingDoctors.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex justify-between items-center mt-6">
                            <div className="flex items-center gap-4">
                                <FaClock className="text-2xl text-amber-500" />
                                <div>
                                    <p className="font-black text-[#111827]">{pendingDoctors.length} Doctor Application{pendingDoctors.length > 1 ? 's' : ''} Awaiting Review</p>
                                    <p className="text-sm text-healsync-grey font-medium">Review and approve or reject doctor applications</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveTab('doctors')}
                                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-sm hover:bg-amber-600 transition-all shadow-md"
                            >
                                Review Now
                            </button>
                        </div>
                    )}

                    {/* Top Rated Doctors (Highest Reviews and Appointments) */}
                    {stats.topDoctors && stats.topDoctors.length > 0 && (
                        <div className="bg-white rounded-3xl border border-healsync-border p-8 mt-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black text-[#111827] uppercase tracking-widest flex items-center gap-2">
                                    <FaStar className="text-amber-500" /> Top Performing Doctors
                                </h2>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-healsync-bg px-3 py-1 rounded-full text-healsync-grey border border-healsync-border">
                                    BY RATING & VOLUME
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                {stats.topDoctors.map((doc, idx) => (
                                    <div key={doc._id} className="bg-gray-50/50 p-6 rounded-2xl border border-healsync-border/50 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-sm border-2 border-white mb-3 relative">
                                            <img src={doc.user?.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt="Doctor" className="w-full h-full object-cover" />
                                            <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] w-5 h-5 flex items-center justify-center font-black rounded-full border border-white">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <h3 className="font-black text-sm text-[#111827] line-clamp-1">{doc.user?.name || 'Unknown Doctor'}</h3>
                                        <p className="text-[10px] font-bold text-healsync-indigo uppercase tracking-widest mt-1 mb-3 line-clamp-1">{doc.specialization}</p>
                                        
                                        <div className="w-full flex justify-between items-center text-xs mt-auto pt-4 border-t border-healsync-border/60">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-amber-500 flex items-center gap-1"><FaStar size={10} /> {doc.ratings > 0 ? doc.ratings.toFixed(1) : 'New'}</span>
                                                <span className="text-[9px] font-medium text-healsync-grey uppercase">{doc.numReviews} Rev</span>
                                            </div>
                                            <div className="flex flex-col items-center border-l border-healsync-border/60 pl-3">
                                                <span className="font-black text-teal-600">{doc.totalAppointments || 0}</span>
                                                <span className="text-[9px] font-medium text-healsync-grey uppercase">Appts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ════ MANAGE USERS TAB ════ */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-[2.5rem] border border-healsync-border shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-healsync-border bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <FaUsers className="text-healsync-indigo text-xl" />
                            <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">All Registered Users</h2>
                        </div>
                        <span className="bg-healsync-indigo/10 text-healsync-indigo px-3 py-1 rounded-lg text-xs font-bold">
                            Page {userPage} of {userPages}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-healsync-bg/50 text-healsync-grey text-[12px] font-black uppercase tracking-widest">
                                    <th className="px-8 py-5">User</th>
                                    <th className="px-8 py-5">Email</th>
                                    <th className="px-8 py-5">Role</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-healsync-border">
                                {allUsers.map(u => (
                                    <tr key={u._id} className={`hover:bg-healsync-bg/30 transition-colors ${u.isBanned ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-healsync-indigo/10 overflow-hidden border border-healsync-border shrink-0">
                                                    <img
                                                        src={u.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[#111827] text-sm">{u.name}</span>
                                                    <span className="text-[10px] text-healsync-grey font-bold uppercase tracking-wider">{new Date(u.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-healsync-grey font-medium">{u.email}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border ${u.role === 'admin'
                                                ? 'bg-purple-50 text-purple-600 border-purple-200'
                                                : u.role === 'doctor'
                                                    ? 'bg-healsync-indigo/10 text-healsync-indigo border-healsync-indigo/20'
                                                    : 'bg-teal-50 text-teal-600 border-teal-200'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {u.isBanned ? (
                                                <span className="text-red-500 font-bold text-xs uppercase italic">Banned</span>
                                            ) : (
                                                <span className="text-green-500 font-bold text-xs uppercase">Active</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => toggleBanUser(u._id)}
                                                    disabled={u.role === 'admin' || actionLoading === u._id + 'ban'}
                                                    title={u.isBanned ? "Unban User" : "Ban User"}
                                                    className={`p-2 rounded-lg transition-all ${u.isBanned
                                                        ? 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'
                                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                >
                                                    <FaUserShield size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(u._id)}
                                                    disabled={u.role === 'admin' || actionLoading === u._id + 'delete'}
                                                    title="Delete User"
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {allUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-16 text-center text-healsync-grey font-bold">
                                            No users found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="p-6 bg-gray-50/50 border-t border-healsync-border flex justify-center gap-4">
                        <button
                            onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                            disabled={userPage === 1}
                            className="px-4 py-2 bg-white border border-healsync-border rounded-xl text-xs font-black uppercase tracking-wider hover:bg-healsync-indigo hover:text-white disabled:opacity-30 transition-all"
                        >
                            Previous
                        </button>
                        <div className="flex items-center text-xs font-black text-healsync-indigo">
                            {userPage} / {userPages}
                        </div>
                        <button
                            onClick={() => setUserPage(prev => Math.min(prev + 1, userPages))}
                            disabled={userPage === userPages}
                            className="px-4 py-2 bg-white border border-healsync-border rounded-xl text-xs font-black uppercase tracking-wider hover:bg-healsync-indigo hover:text-white disabled:opacity-30 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* ════ DOCTORS TAB ════ */}
            {activeTab === 'doctors' && (
                <div className="space-y-10">
                    {/* Pending Applications */}
                    <div className="bg-white rounded-[2.5rem] border border-healsync-border shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-healsync-border bg-amber-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <FaClock className="text-amber-500 text-xl" />
                                <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Pending Applications</h2>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${safePendingDoctors.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                {safePendingDoctors.length} Pending
                            </span>
                        </div>
                        <div className="divide-y divide-healsync-border">
                            {safePendingDoctors.map(doc => (
                                <div key={doc._id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-amber-50/30 transition-all">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className="w-16 h-16 rounded-2xl bg-healsync-bg overflow-hidden shrink-0 border border-healsync-border shadow-inner">
                                            <img
                                                src={doc.user?.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-black text-[#111827]">{doc.user?.name}</h3>
                                            <p className="text-xs font-bold text-healsync-indigo uppercase tracking-wider">{doc.specialization}</p>
                                            <p className="text-xs text-healsync-grey font-medium">{doc.user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs font-bold text-healsync-grey">
                                        <span className="bg-healsync-bg px-3 py-1.5 rounded-lg border border-healsync-border">
                                            {doc.experience} yrs exp
                                        </span>
                                        <span className="bg-healsync-bg px-3 py-1.5 rounded-lg border border-healsync-border">
                                            Rs. {doc.fee} fee
                                        </span>
                                    </div>
                                    {doc.bio && (
                                        <p className="text-sm text-healsync-grey font-medium max-w-xs hidden lg:block italic">
                                            "{doc.bio.slice(0, 80)}{doc.bio.length > 80 ? '...' : ''}"
                                        </p>
                                    )}
                                    <div className="flex gap-3 shrink-0">
                                        <button
                                            onClick={() => verifyDoctor(doc._id, 'approved')}
                                            disabled={actionLoading === doc._id + 'approved'}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-healsync-mint/20 text-teal-700 rounded-xl hover:bg-healsync-mint hover:text-white transition-all font-bold text-sm disabled:opacity-50"
                                        >
                                            {actionLoading === doc._id + 'approved' ? (
                                                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            ) : (
                                                <FaCheckCircle size={16} />
                                            )}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => verifyDoctor(doc._id, 'rejected')}
                                            disabled={actionLoading === doc._id + 'rejected'}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-sm disabled:opacity-50"
                                        >
                                            {actionLoading === doc._id + 'rejected' ? (
                                                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            ) : (
                                                <FaTimesCircle size={16} />
                                            )}
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {safePendingDoctors.length === 0 && (
                                <div className="p-16 text-center text-healsync-grey">
                                    <FaCheckCircle className="text-5xl mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-black uppercase tracking-widest opacity-40">No Pending Applications</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Approved Doctors */}
                    <div className="bg-white rounded-[2.5rem] border border-healsync-border shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-healsync-border bg-teal-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <FaCheck className="text-teal-500 text-xl" />
                                <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Approved Doctors</h2>
                            </div>
                            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg text-xs font-bold">
                                {safeApprovedDoctors.length} Active
                            </span>
                        </div>
                        <div className="divide-y divide-healsync-border">
                            {safeApprovedDoctors.map(doc => (
                                <div key={doc._id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-teal-50/20 transition-all">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className="w-14 h-14 rounded-2xl bg-healsync-bg overflow-hidden shrink-0 border border-healsync-border shadow-inner">
                                            <img
                                                src={doc.user?.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-black text-[#111827]">{doc.user?.name}</h3>
                                                <FaCheckCircle className="text-teal-500 text-sm" />
                                            </div>
                                            <p className="text-xs font-bold text-healsync-indigo uppercase tracking-wider">{doc.specialization}</p>
                                            <p className="text-xs text-healsync-grey font-medium">{doc.user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-xs font-bold text-healsync-grey">
                                        <span className="bg-healsync-bg px-3 py-1.5 rounded-lg border border-healsync-border">{doc.experience} yrs</span>
                                        <span className="bg-healsync-bg px-3 py-1.5 rounded-lg border border-healsync-border">Rs. {doc.fee}</span>
                                        <span className="bg-teal-50 text-teal-600 px-3 py-1.5 rounded-lg border border-teal-200 uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            ))}
                            {safeApprovedDoctors.length === 0 && (
                                <div className="p-16 text-center text-healsync-grey">
                                    <FaUserMd className="text-5xl mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-black uppercase tracking-widest opacity-40">No Approved Doctors Yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════ APPOINTMENTS TAB ════ */}
            {activeTab === 'appointments' && (
                <div className="bg-white rounded-[2.5rem] border border-healsync-border shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-healsync-border bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 whitespace-nowrap overflow-x-auto">
                        <div className="flex items-center gap-3">
                            <FaCalendarCheck className="text-healsync-indigo text-xl" />
                            <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">All Appointments</h2>
                        </div>
                        <div className="flex items-center gap-4 border-t border-healsync-border pt-4 md:border-t-0 md:pt-0 w-full md:w-auto overflow-x-auto">
                            {appointments.length > 0 && (
                                <button
                                    onClick={handleDeleteAllAppointments}
                                    className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                    <FaTrash size={12} /> Delete All
                                </button>
                            )}
                            <span className="bg-healsync-indigo/10 text-healsync-indigo px-3 py-1 rounded-lg text-xs font-bold shrink-0">
                                Total: {appointments.length} (Page {appointmentPage} of {appointmentPages})
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead>
                                <tr className="bg-healsync-bg/50 text-healsync-grey text-[12px] font-black uppercase tracking-widest">
                                    <th className="px-8 py-5">Patient</th>
                                    <th className="px-8 py-5">Doctor</th>
                                    <th className="px-8 py-5">Schedule</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Payment</th>
                                    <th className="px-8 py-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-healsync-border">
                                {appointments.map(appt => (
                                    <tr key={appt._id} className="hover:bg-healsync-bg/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-[#111827] text-sm">{appt.patient?.name || 'Deleted Patient'}</span>
                                                <span className="text-[10px] text-healsync-grey font-bold truncate max-w-[150px]">{appt.patient?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-[#111827] text-sm">{appt.doctor?.user?.name || 'Deleted Doctor'}</span>
                                                <span className="text-[10px] text-healsync-indigo font-black uppercase tracking-widest">{appt.doctor?.specialization}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm text-[#111827]">{new Date(appt.date).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-healsync-grey font-black uppercase tracking-widest flex items-center gap-1">
                                                    <FaClock size={8} /> {appt.timeSlot}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                appt.status === 'Confirmed' ? 'bg-teal-50 text-teal-600 border-teal-200' :
                                                appt.status === 'Cancelled' ? 'bg-red-50 text-red-500 border-red-200' :
                                                appt.status === 'Completed' ? 'bg-healsync-indigo/10 text-healsync-indigo border-healsync-indigo/20' :
                                                'bg-amber-50 text-amber-600 border-amber-200'
                                            }`}>
                                                {appt.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-sm text-[#111827]">
                                            <div className="flex flex-col items-end">
                                                <span>Rs. {appt.fee || 0}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    appt.paymentStatus === 'Paid' ? 'text-teal-600' : 
                                                    appt.paymentStatus === 'Refunded' ? 'text-green-600' : 
                                                    'text-amber-600'
                                                }`}>
                                                    {appt.paymentStatus === 'Refunded' ? '💳 Refunded' : appt.paymentStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <button
                                                onClick={() => handleDeleteAppointment(appt._id)}
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                title="Delete Appointment"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {appointments.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-16 text-center text-healsync-grey font-bold uppercase tracking-widest text-xs opacity-50">
                                            No appointments recorded
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {appointmentPages > 1 && (
                        <div className="p-6 bg-gray-50/50 border-t border-healsync-border flex justify-center gap-4">
                            <button
                                onClick={() => setAppointmentPage(prev => Math.max(prev - 1, 1))}
                                disabled={appointmentPage === 1}
                                className="px-4 py-2 bg-white border border-healsync-border rounded-xl text-xs font-black uppercase tracking-wider hover:bg-healsync-indigo hover:text-white disabled:opacity-30 transition-all"
                            > Previous </button>
                            <div className="flex items-center text-xs font-black text-healsync-indigo"> {appointmentPage} / {appointmentPages} </div>
                            <button
                                onClick={() => setAppointmentPage(prev => Math.min(prev + 1, appointmentPages))}
                                disabled={appointmentPage === appointmentPages}
                                className="px-4 py-2 bg-white border border-healsync-border rounded-xl text-xs font-black uppercase tracking-wider hover:bg-healsync-indigo hover:text-white disabled:opacity-30 transition-all"
                            > Next </button>
                        </div>
                    )}
                </div>
            )}

            {/* ════ INVENTORY TAB ════ */}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Add Product Form */}
                    <div className="lg:col-span-1">
                        <div className="healsync-card p-8 bg-white border border-healsync-border shadow-sm space-y-6 sticky top-8">
                            <h3 className="text-xl font-black text-[#111827] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {editingProduct ? <FaEdit className="text-healsync-indigo animate-pulse" /> : <FaPlus className="text-healsync-indigo" />}
                                    {editingProduct ? 'Update Product' : 'New Product'}
                                </div>
                                {editingProduct && (
                                    <button
                                        onClick={() => {
                                            setEditingProduct(null);
                                            setNewProduct(initialProductState);
                                            if (productImageInputRef.current) productImageInputRef.current.value = '';
                                        }}
                                        className="text-xs uppercase font-black text-red-500 hover:text-red-700"
                                    > Cancel </button>
                                )}
                            </h3>
                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-healsync-grey uppercase tracking-widest">Product Image</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            ref={productImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleProductImageUpload}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                                        />
                                        {newProduct.image && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewProduct(prev => ({ ...prev, image: '' }));
                                                    if (productImageInputRef.current) productImageInputRef.current.value = '';
                                                }}
                                                className="px-3 py-2 text-[10px] uppercase font-black text-red-500 hover:text-red-700 border border-red-200 rounded-lg"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {newProduct.image && (
                                        <div className="w-full h-32 rounded-xl overflow-hidden border border-healsync-border bg-healsync-bg p-2">
                                            <img src={newProduct.image} alt="Product Preview" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text" placeholder="Product Name" required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-all"
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                />
                                <div className="flex gap-3">
                                    <input
                                        type="number" placeholder="Price" required
                                        className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-all"
                                        value={newProduct.price}
                                        onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                    />
                                    <input
                                        type="number" placeholder="Stock" required
                                        className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-all"
                                        value={newProduct.countInStock}
                                        onChange={e => setNewProduct({ ...newProduct, countInStock: e.target.value })}
                                    />
                                </div>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-all appearance-none"
                                    value={newProduct.category}
                                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                >
                                    <option>Medicines</option>
                                    <option>Wellness</option>
                                    <option>Mother & Baby</option>
                                    <option>Devices</option>
                                </select>
                                <textarea
                                    placeholder="Description" required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-healsync-indigo transition-all h-24 resize-none"
                                    value={newProduct.description}
                                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                ></textarea>
                                <button type="submit" className={`w-full py-4 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all ${editingProduct ? 'bg-healsync-mint hover:bg-teal-600' : 'bg-healsync-indigo hover:bg-healsync-violet'}`}>
                                    {editingProduct ? 'Update Inventory Item' : 'Add to Inventory'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-black text-[#111827] uppercase tracking-widest">Active Inventory</h2>
                            <span className="text-xs font-bold text-healsync-indigo bg-healsync-indigo/5 px-3 py-1 rounded-lg">{products.length} Items</span>
                        </div>
                        <div className="space-y-4">
                            {products.map(product => (
                                <div key={product._id} className="p-6 bg-white border border-healsync-border rounded-3xl flex justify-between items-center group hover:shadow-md transition-all">
                                    <div className="flex gap-6 items-center">
                                        <div className="w-14 h-14 rounded-2xl bg-healsync-bg flex items-center justify-center text-2xl text-healsync-indigo border border-healsync-border shadow-inner">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-contain rounded-2xl p-1" />
                                            ) : (
                                                <FaBoxOpen />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#111827]">{product.name}</h4>
                                            <p className="text-[10px] font-bold text-healsync-grey uppercase tracking-wider">{product.category} • Rs. {product.price} • {product.countInStock} Left</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditProduct(product)}
                                            className={`p-3 transition-colors rounded-xl ${editingProduct === product._id ? 'bg-healsync-indigo text-white' : 'text-gray-400 hover:text-healsync-indigo hover:bg-healsync-indigo/5'}`}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(product._id)}
                                            className="p-3 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
