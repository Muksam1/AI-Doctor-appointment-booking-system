import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaUsers, FaUserMd, FaCalendarCheck, FaChartLine, FaPlus, FaTrash, FaEdit, FaBoxOpen, FaCheckCircle, FaTimesCircle, FaHospital } from 'react-icons/fa';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ doctors: 0, appointments: 0, revenue: 0, patients: 0 });
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Medicines', description: '', icon: 'FaCapsules', countInStock: 10 });
    const [activeTab, setActiveTab] = useState('stats');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await axios.get('/api/admin/stats');
                setStats(statsRes.data);

                const pendingRes = await axios.get('/api/admin/doctors/pending');
                setPendingDoctors(pendingRes.data);

                const prodData = await axios.get('/api/products');
                setProducts(prodData.data);
            } catch (err) {
                console.error("Error fetching admin data:", err);
            }
        };
        fetchData();
    }, []);

    const verifyDoctor = async (id, status) => {
        try {
            await axios.put(`/api/admin/doctors/${id}/verify`, { status });
            setPendingDoctors(pendingDoctors.filter(doc => doc._id !== id));
        } catch (err) {
            alert('Failed to update doctor status');
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/api/products', newProduct);
            setProducts([...products, data]);
            setNewProduct({ name: '', price: '', category: 'Medicines', description: '', icon: 'FaCapsules', countInStock: 10 });
        } catch (err) {
            alert("Error adding product");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure?")) {
            try {
                await axios.delete(`/api/products/${id}`);
                setProducts(products.filter(p => p._id !== id));
            } catch (err) {
                alert("Error deleting product");
            }
        }
    };

    return (
        <div className="space-y-12 animate-fade-up max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-healsync-border pb-8">
                <div>
                    <h1 className="text-4xl font-black text-[#111827] tracking-tighter uppercase">Command Center</h1>
                    <p className="text-healsync-grey font-medium">Platform overview and management console</p>
                </div>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    {['stats', 'inventory'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all capitalize ${activeTab === tab ? 'bg-white text-healsync-indigo shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab === 'stats' ? 'Overview' : 'Inventory'}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === 'stats' ? (
                <>
                    {/* Admin Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-healsync-indigo p-8 rounded-[2rem] text-white shadow-lg flex flex-col justify-between h-48">
                            <FaChartLine className="text-4xl opacity-20" />
                            <div>
                                <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Revenue</p>
                                <h3 className="text-3xl font-black">Rs. {stats.revenue || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaUserMd className="text-4xl text-healsync-indigo opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Doctors</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.doctors}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaUsers className="text-4xl text-healsync-mint opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Patients</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.patients || 0}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-healsync-border shadow-sm flex flex-col justify-between h-48">
                            <FaHospital className="text-4xl text-healsync-violet opacity-20" />
                            <div>
                                <p className="text-xs font-bold text-healsync-grey uppercase tracking-widest">Appts</p>
                                <h3 className="text-3xl font-black text-[#111827]">{stats.appointments}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Verification Queue */}
                    <div className="bg-white rounded-[2.5rem] border border-healsync-border shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-healsync-border bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-[#111827] uppercase tracking-tighter">Doctor Verification Queue</h2>
                            <span className="bg-healsync-indigo/10 text-healsync-indigo px-3 py-1 rounded-lg text-xs font-bold">{pendingDoctors.length} Pending</span>
                        </div>
                        <div className="divide-y divide-healsync-border">
                            {pendingDoctors.map(doc => (
                                <div key={doc._id} className="p-8 flex flex-col md:flex-row justify-between items-center gap-8 hover:bg-gray-50/50 transition-all">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className="w-16 h-16 rounded-2xl bg-healsync-bg overflow-hidden shrink-0 border border-healsync-border shadow-inner">
                                            <img src={doc.user.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-[#111827]">{doc.user.name}</h3>
                                            <p className="text-xs font-bold text-healsync-indigo uppercase tracking-wider">{doc.specialization}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => verifyDoctor(doc._id, 'verified')} className="p-3 bg-healsync-mint/20 text-teal-700 rounded-xl hover:bg-healsync-mint hover:text-white transition-all">
                                            <FaCheckCircle size={20} />
                                        </button>
                                        <button onClick={() => verifyDoctor(doc._id, 'rejected')} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                            <FaTimesCircle size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {pendingDoctors.length === 0 && (
                                <div className="p-16 text-center text-healsync-grey">
                                    <FaCheckCircle className="text-5xl mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-black uppercase tracking-widest opacity-40">Queue Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Add Product Form */}
                    <div className="lg:col-span-1">
                        <div className="healsync-card p-8 bg-white border border-healsync-border shadow-sm space-y-6 sticky top-8">
                            <h3 className="text-xl font-black text-[#111827] flex items-center gap-3">
                                <FaPlus className="text-healsync-indigo" /> New Product
                            </h3>
                            <form onSubmit={handleAddProduct} className="space-y-4">
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
                                <button type="submit" className="w-full py-4 bg-healsync-indigo text-white rounded-xl font-black shadow-lg hover:shadow-xl hover:bg-healsync-violet transition-all">
                                    Add to Inventory
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
                                            <FaBoxOpen />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-[#111827]">{product.name}</h4>
                                            <p className="text-[10px] font-bold text-healsync-grey uppercase tracking-wider">{product.category} • Rs. {product.price} • {product.countInStock} Left</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 text-gray-400 hover:text-healsync-indigo transition-colors hover:bg-healsync-indigo/5 rounded-xl">
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
