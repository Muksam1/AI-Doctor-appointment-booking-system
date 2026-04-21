import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { FaUserCircle, FaBars, FaTimes, FaBell, FaRegBell, FaSun, FaMoon, FaCalendarAlt, FaComments, FaStar, FaInfoCircle, FaFileAlt, FaCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const { notifications: socketNotifications } = useSocket();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Load notifications when user logs in
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await axios.get('/api/notifications?limit=5');
                setNotifications(data.notifications || []);
            } catch (err) {
                console.warn('Could not load notifications', err);
            }
        };

        if (user) {
            fetchNotifications();
        } else {
            setNotifications([]);
        }
    }, [user]);

    // Merge socket notifications into the list
    useEffect(() => {
        if (socketNotifications?.length) {
            setNotifications(prev => [...socketNotifications, ...prev]);
        }
    }, [socketNotifications]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Toggle notifications dropdown open/closed
    const toggleNotif = () => {
        setNotifOpen(prev => !prev);
    };

    const markNotificationRead = async (id) => {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
        } catch (err) {
            console.warn('Failed to mark as read', err);
        }
    };

    const markAllNotificationsRead = async () => {
        try {
            await axios.put('/api/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.warn('Failed to mark all as read', err);
        }
    };

    const clearAllNotifications = async () => {
        try {
            await axios.delete('/api/notifications');
            setNotifications([]);
        } catch (err) {
            console.warn('Failed to clear notifications', err);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark as read
        await markNotificationRead(notif._id || notif.id);

        const role = user?.role;

        // Navigate based on notification type and user role
        if (notif.type === 'appointment') {
            if (role === 'doctor') navigate('/dashboard?tab=appointments');
            else if (role === 'admin') navigate('/dashboard?tab=appointments');
            else navigate('/dashboard?tab=care');
        } else if (notif.type === 'payment') {
            if (role === 'doctor') navigate('/dashboard?tab=appointments'); // Doctors see payments in appt list
            else if (role === 'admin') navigate('/dashboard?tab=stats');
            else navigate('/dashboard?tab=care');
        } else if (notif.type === 'chat' || notif.type === 'consultation') {
            navigate('/consult');
        } else if (notif.type === 'review') {
            if (role === 'doctor') navigate('/dashboard?tab=feedback');
            else navigate('/dashboard?tab=care');
        } else if (notif.type === 'system' || notif.type === 'admin') {
            navigate('/dashboard');
        } else {
            navigate('/dashboard');
        }

        // Close dropdown
        setNotifOpen(false);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'appointment': return <FaCalendarAlt className="text-healsync-violet" />;
            case 'payment': return <FaFileAlt className="text-healsync-mint" />;
            case 'chat':
            case 'consultation': return <FaComments className="text-healsync-indigo" />;
            case 'review': return <FaStar className="text-amber-400" />;
            case 'system':
            case 'admin': return <FaInfoCircle className="text-healsync-grey" />;
            default: return <FaBell className="text-healsync-violet/70" />;
        }
    };

    const formatNotifDate = (date) => {
        const d = new Date(date);
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart} • ${timePart}`;
    };



    const isActive = (path) => location.pathname === path;
    const isActiveTab = (tab) => {
        const params = new URLSearchParams(location.search);
        return location.pathname === '/dashboard' && params.get('tab') === tab;
    };

    // Admin nav links
    const adminLinks = [
        { label: 'Verify Doctors', tab: 'doctors' },
        { label: 'Manage Users', tab: 'users' },
        { label: 'Appointments', tab: 'appointments' },
        { label: 'Platform Stats', tab: 'stats' },
        { label: 'Lab/Meds Admin', tab: 'inventory' },
    ];

    // Doctor nav links
    const doctorLinks = [
        { label: 'My Profile', to: '/dashboard?tab=profile' },
        { label: 'Chats', to: '/consult' },
        { label: 'Appointments', to: '/dashboard?tab=appointments' },
        { label: 'Reviews', to: '/dashboard?tab=feedback' },
    ];

    // Patient nav links
    const patientLinks = [
        { label: 'Find Doctors', to: '/doctors' },
        { label: 'Appointments', to: '/dashboard?tab=care' },
        { label: 'Chats', to: '/consult' },
        { label: 'Medicines', to: '/lab-tests' },
        { label: 'Be A Doctor', to: '/apply-doctor' },
    ];

    const linkClass = (active) =>
        `px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active
            ? 'bg-white text-healsync-indigo shadow-sm'
            : 'text-healsync-grey hover:text-healsync-indigo hover:bg-white/50'
        }`;

    return (
        <div className="fixed top-0 left-0 right-0 z-100 px-4 py-3 md:px-6 transition-all duration-500">
            <nav className={`w-full transition-all duration-500 rounded-4xl ${isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-healsync border border-white/40 py-2.5 px-5'
            : 'bg-white/50 backdrop-blur-md border border-white/20 py-3.5 px-6'
                }`}>
                <div className="flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-4 group shrink-0">
                        <div className="w-10 h-10 bg-linear-to-br from-healsync-indigo to-healsync-violet rounded-2xl flex items-center justify-center shadow-healsync group-hover:scale-110 transition-transform duration-500 rotate-6 group-hover:rotate-0">
                            <span className="text-white text-xl font-black">H</span>
                        </div>
                        <span className="text-[2rem] font-black text-[#111827] tracking-tighter">
                            Heal<span className="text-healsync-indigo">Sync</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden xl:flex items-center gap-2 bg-healsync-bg/50 p-1.5 rounded-2xl border border-healsync-border flex-1 justify-center">
                        {user?.role === 'admin' ? (
                            // ── Admin Links ──
                            adminLinks.map(({ label, tab }) => (
                                <Link
                                    key={tab}
                                    to={`/dashboard?tab=${tab}`}
                                    className={linkClass(isActiveTab(tab))}
                                >
                                    {label}
                                </Link>
                            ))
                        ) : user?.role === 'doctor' ? (
                            // ── Doctor Links ──
                            doctorLinks.map(({ label, to }) => (
                                <Link
                                    key={label}
                                    to={to}
                                    className={linkClass(isActive(to) && label !== 'Chats'
                                        ? true
                                        : isActive(to) && label === 'Chats')}
                                >
                                    {label}
                                </Link>
                            ))
                        ) : (
                            // ── Patient Links ──
                            patientLinks.map(({ label, to }) => (
                                <Link
                                    key={label}
                                    to={to}
                                    className={linkClass(isActive(to))}
                                >
                                    {label}
                                </Link>
                            ))
                        )}
                    </div>

                    {/* Auth Actions */}
                    <div className="hidden xl:flex items-center gap-4 shrink-0">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ne' : 'en')}
                                    className="px-4 py-2 bg-healsync-bg rounded-2xl border border-healsync-border hover:bg-white transition-all font-black text-xs text-healsync-indigo uppercase tracking-wider"
                                    title="Toggle Language"
                                >
                                    {i18n.language === 'en' ? 'नेपाली' : 'English'}
                                </button>
                                    {user.role === 'patient' && (
                                        <Link
                                            to="/apply-doctor"
                                            className="px-4 py-2 bg-healsync-violet/10 text-healsync-violet rounded-2xl border border-healsync-violet/20 hover:bg-healsync-violet hover:text-white transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2"
                                        >
                                            <span className="text-sm">🩺</span> Be A Doctor
                                        </Link>
                                    )}
                                    <button
                                        onClick={toggleTheme}
                                        className="p-4 bg-healsync-bg rounded-2xl border border-healsync-border hover:bg-white transition-all"
                                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                    >
                                        {isDarkMode ? <FaSun className="text-yellow-500 text-lg" /> : <FaMoon className="text-healsync-indigo text-lg" />}
                                    </button>
                                    <div className="relative" ref={notifRef}>
                                    <button
                                        onClick={toggleNotif}
                                        className="relative p-4 bg-healsync-bg rounded-2xl border border-healsync-border hover:bg-white transition-all"
                                        title="Notifications"
                                    >
                                        {unreadCount > 0 ? (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                                                {unreadCount}
                                            </span>
                                        ) : null}
                                        {notifOpen ? <FaBell className="text-healsync-indigo text-lg" /> : <FaRegBell className="text-healsync-grey text-lg" />}
                                    </button>
                                    {notifOpen && (
                                        <div className="absolute right-0 mt-2 w-96 bg-white border border-healsync-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                            {/* Header */}
                                            <div className="flex items-center justify-between px-5 py-4 border-b border-healsync-border bg-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-black text-[#111827]">Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <span className="px-2 py-0.5 bg-healsync-indigo/10 text-healsync-indigo text-[10px] font-black rounded-full border border-healsync-indigo/20">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={markAllNotificationsRead} 
                                                        className="text-[12px] font-bold text-healsync-indigo hover:text-healsync-violet transition-colors"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                    {notifications.length > 0 && (
                                                        <button 
                                                            onClick={clearAllNotifications} 
                                                            className="text-[12px] font-bold text-red-500 hover:text-red-600 transition-colors"
                                                        >
                                                            Clear All
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* List */}
                                            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div className="p-10 flex flex-col items-center justify-center text-center">
                                                        <div className="w-16 h-16 bg-healsync-bg rounded-2xl flex items-center justify-center mb-4">
                                                            <FaRegBell className="text-healsync-grey text-2xl opacity-30" />
                                                        </div>
                                                        <p className="text-sm text-[#111827] font-black">All caught up!</p>
                                                        <p className="text-xs text-healsync-grey mt-1">No new notifications at the moment.</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((notif, idx) => (
                                                        <button
                                                            key={notif._id || notif.id}
                                                            onClick={() => handleNotificationClick(notif)}
                                                            className={`w-full text-left px-5 py-4 flex gap-4 transition-all hover:bg-healsync-bg relative ${idx !== notifications.length - 1 ? 'border-b border-healsync-border/60' : ''} ${!notif.read ? 'bg-healsync-indigo/[0.02]' : ''}`}
                                                        >
                                                            <div className="shrink-0 mt-1">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${!notif.read ? 'bg-white shadow-sm border border-healsync-border' : 'opacity-60'}`}>
                                                                    {getNotificationIcon(notif.type)}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 pr-2">
                                                                <p className={`text-sm leading-snug ${notif.read ? 'text-[#374151] font-medium' : 'text-[#111827] font-bold'}`}>
                                                                    {notif.title}
                                                                </p>
                                                                {notif.message && notif.message !== notif.title && (
                                                                    <p className="text-[11px] text-healsync-grey mt-0.5 line-clamp-2 leading-relaxed italic">
                                                                        {notif.message}
                                                                    </p>
                                                                )}
                                                                <p className="text-[10px] text-healsync-grey/60 mt-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                                    {formatNotifDate(notif.createdAt || notif.timestamp)}
                                                                </p>
                                                            </div>
                                                            {!notif.read && (
                                                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                                    <FaCircle className="text-[8px] text-healsync-indigo" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            
                                            {/* Footer - Optional view all */}
                                            {notifications.length > 5 && (
                                                <div className="p-3 bg-healsync-bg/30 border-t border-healsync-border text-center">
                                                    <button 
                                                        onClick={() => { navigate('/dashboard'); setNotifOpen(false); }}
                                                        className="text-[11px] font-black text-healsync-grey hover:text-healsync-indigo transition-colors uppercase tracking-widest"
                                                    >
                                                        View All History
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Link to="/dashboard" className="flex items-center gap-4 p-1.5 pr-6 bg-healsync-bg rounded-full border border-healsync-border hover:bg-white transition-all group">
                                    <div className="w-12 h-12 rounded-full bg-healsync-indigo flex items-center justify-center text-white shadow-healsync group-hover:scale-105 transition-transform">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={user.name || 'Profile'}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <FaUserCircle className="text-3xl" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-[#111827] line-clamp-1">{user.name}</span>
                                        <span className="text-[11px] uppercase font-black text-healsync-indigo tracking-widest leading-none">{user.role}</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-4 text-healsync-grey hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                    title="Logout"
                                >
                                    <FaTimes className="text-lg" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/apply-doctor"
                                    className="hidden xl:flex px-6 py-2.5 bg-healsync-violet/10 text-healsync-violet rounded-xl font-black text-xs uppercase tracking-widest hover:bg-healsync-violet hover:text-white transition-all duration-300 border border-healsync-violet/20"
                                >
                                    Be A Doctor
                                </Link>
                                <Link
                                    to="/login"
                                    className="px-8 py-3.5 text-healsync-indigo font-black text-sm border-2 border-healsync-indigo/10 hover:border-healsync-indigo/30 rounded-2xl hover:bg-healsync-indigo/5 transition-all duration-300"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-8 py-3.5 bg-healsync-indigo text-white rounded-2xl font-black text-sm hover:shadow-healsync-hover hover:-translate-y-0.5 transition-all duration-300 border-2 border-healsync-indigo"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="xl:hidden p-3 bg-healsync-bg rounded-2xl text-healsync-indigo"
                    >
                        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="xl:hidden mt-4 p-4 bg-white rounded-3xl border border-healsync-border shadow-2xl animate-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-col gap-2">
                            {user?.role === 'admin' ? (
                                adminLinks.map(({ label, tab }) => (
                                    <Link
                                        key={tab}
                                        to={`/dashboard?tab=${tab}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo"
                                    >
                                        {label}
                                    </Link>
                                ))
                            ) : user?.role === 'doctor' ? (
                                doctorLinks.map(({ label, to }) => (
                                    <Link
                                        key={label}
                                        to={to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo"
                                    >
                                        {label}
                                    </Link>
                                ))
                            ) : (
                                patientLinks.map(({ label, to }) => (
                                    <Link
                                        key={label}
                                        to={to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo"
                                    >
                                        {label}
                                    </Link>
                                ))
                            )}
                            <div className="h-px bg-healsync-border my-2"></div>
                            {user ? (
                                <>
                                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-2xl font-black text-healsync-indigo bg-healsync-indigo/5">Dashboard</Link>
                                    <button 
                                        onClick={() => {
                                            i18n.changeLanguage(i18n.language === 'en' ? 'ne' : 'en');
                                            setIsMobileMenuOpen(false);
                                        }} 
                                        className="p-4 text-left rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg"
                                    >
                                        Language: {i18n.language === 'en' ? 'English (en)' : 'Nepali (ne)'}
                                    </button>
                                    <button onClick={handleLogout} className="p-4 text-left rounded-2xl font-black text-red-500 hover:bg-red-50">Logout</button>
                                </>
                            ) : (
                                <div className="space-y-3 mt-2">
                                    <Link 
                                        to="/apply-doctor" 
                                        onClick={() => setIsMobileMenuOpen(false)} 
                                        className="block p-4 rounded-2xl font-black bg-healsync-violet/10 text-healsync-violet text-center border border-healsync-violet/20"
                                    >
                                        Be A Doctor
                                    </Link>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link 
                                            to="/login" 
                                            onClick={() => setIsMobileMenuOpen(false)} 
                                            className="p-4 rounded-2xl font-black border-2 border-healsync-indigo/10 text-healsync-indigo text-center hover:bg-healsync-bg"
                                        >
                                            Login
                                        </Link>
                                        <Link 
                                            to="/register" 
                                            onClick={() => setIsMobileMenuOpen(false)} 
                                            className="p-4 rounded-2xl font-black bg-healsync-indigo text-white text-center shadow-lg"
                                        >
                                            Register
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
};

export default Navbar;
