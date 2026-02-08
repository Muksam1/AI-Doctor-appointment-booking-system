import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaChevronDown, FaBars, FaTimes, FaSearch } from 'react-icons/fa';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-4 md:px-8 transition-all duration-500">
            <nav className={`mx-auto max-w-7xl transition-all duration-500 rounded-[2rem] ${isScrolled
                ? 'bg-white/90 backdrop-blur-xl shadow-healsync border border-white/40 py-3 px-6'
                : 'bg-white/50 backdrop-blur-md border border-white/20 py-5 px-8'
                }`}>
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-4 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-healsync-indigo to-healsync-violet rounded-2xl flex items-center justify-center shadow-healsync group-hover:scale-110 transition-transform duration-500 rotate-6 group-hover:rotate-0">
                            <span className="text-white text-2xl font-black">H</span>
                        </div>
                        <span className="text-3xl font-black text-[#111827] tracking-tighter">
                            Heal<span className="text-healsync-indigo">Sync</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-4 bg-healsync-bg/50 p-1.5 rounded-2xl border border-healsync-border">
                        <Link
                            to="/doctors"
                            className={`px-8 py-3 rounded-xl text-base font-black transition-all ${isActive('/doctors')
                                ? 'bg-white text-healsync-indigo shadow-sm'
                                : 'text-healsync-grey hover:text-healsync-indigo hover:bg-white/50'
                                }`}
                        >
                            Find Doctors
                        </Link>
                        <Link
                            to="/consult"
                            className={`px-8 py-3 rounded-xl text-base font-black transition-all ${isActive('/consult')
                                ? 'bg-white text-healsync-indigo shadow-sm'
                                : 'text-healsync-grey hover:text-healsync-indigo hover:bg-white/50'
                                }`}
                        >
                            Video Consult
                        </Link>
                        <Link
                            to="/lab-tests"
                            className={`px-8 py-3 rounded-xl text-base font-black transition-all ${isActive('/lab-tests')
                                ? 'bg-white text-healsync-indigo shadow-sm'
                                : 'text-healsync-grey hover:text-healsync-indigo hover:bg-white/50'
                                }`}
                        >
                            Medicines
                        </Link>
                    </div>

                    {/* Auth Actions */}
                    <div className="hidden lg:flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Link to="/dashboard" className="flex items-center gap-4 p-1.5 pr-6 bg-healsync-bg rounded-full border border-healsync-border hover:bg-white transition-all group">
                                    <div className="w-12 h-12 rounded-full bg-healsync-indigo flex items-center justify-center text-white shadow-healsync group-hover:scale-105 transition-transform">
                                        <FaUserCircle className="text-3xl" />
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
                            <Link
                                to="/login"
                                className="px-10 py-4 bg-healsync-indigo text-white rounded-2xl font-black text-base hover:shadow-healsync-hover hover:-translate-y-0.5 transition-all duration-300"
                            >
                                Login / Signup
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-3 bg-healsync-bg rounded-2xl text-healsync-indigo"
                    >
                        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden mt-4 p-4 bg-white rounded-3xl border border-healsync-border shadow-2xl animate-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-col gap-2">
                            <Link to="/doctors" className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo">Find Doctors</Link>
                            <Link to="/consult" className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo">Video Consult</Link>
                            <Link to="/lab-tests" className="p-4 rounded-2xl font-black text-healsync-grey hover:bg-healsync-bg hover:text-healsync-indigo">Medicines</Link>
                            <div className="h-px bg-healsync-border my-2"></div>
                            {user ? (
                                <>
                                    <Link to="/dashboard" className="p-4 rounded-2xl font-black text-healsync-indigo bg-healsync-indigo/5">Go to Dashboard</Link>
                                    <button onClick={handleLogout} className="p-4 text-left rounded-2xl font-black text-red-500 hover:bg-red-50">Logout</button>
                                </>
                            ) : (
                                <Link to="/login" className="p-4 rounded-2xl font-black bg-healsync-indigo text-white text-center">Login / Signup</Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
};

export default Navbar;
