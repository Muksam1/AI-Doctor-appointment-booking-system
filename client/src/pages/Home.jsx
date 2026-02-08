import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaSearch, FaArrowRight, FaStethoscope, FaFlask, FaVials, FaHospitalUser } from 'react-icons/fa';

// Import generated assets 
// (Using actual generated paths from my brain storage)
const HERO_IMAGE = "/assets/hero.png";
const CONSULT_3D = "/assets/consult.png";
const LAB_3D = "/assets/lab.png";

const services = [
    {
        title: 'Video Consult',
        desc: 'Instant 24/7 care',
        icon: CONSULT_3D,
        color: 'from-indigo-500/10 to-violet-500/10',
        textColor: 'text-indigo-600'
    },
    {
        title: 'Book Clinic',
        desc: 'Confirmed visits',
        icon: <FaHospitalUser className="text-4xl text-teal-600" />,
        color: 'from-healsync-mint/10 to-teal-500/10',
        textColor: 'text-teal-600'
    },
    {
        title: 'Lab Tests',
        desc: 'Sample from home',
        icon: LAB_3D,
        color: 'from-pink-500/10 to-rose-500/10',
        textColor: 'text-rose-600'
    },
    {
        title: 'Surgeries',
        desc: 'Expert care centers',
        icon: <FaStethoscope className="text-4xl text-orange-600" />,
        color: 'from-amber-500/10 to-orange-500/10',
        textColor: 'text-orange-600'
    }
];

const specializations = [
    { name: 'Dentist', icon: <FaStethoscope /> },
    { name: 'Gynecologist', icon: <FaHospitalUser /> },
    { name: 'Nutritionist', icon: <FaFlask /> },
    { name: 'Physio', icon: <FaVials /> },
    { name: 'Physician', icon: <FaStethoscope /> },
    { name: 'Orthopedist', icon: <FaHospitalUser /> },
];

const Home = () => {
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        navigate(`/doctors?search=${search}`);
    };

    return (
        <div className="bg-healsync-bg min-h-screen">
            {/* Hero Section - Creative Overlapping Layout */}
            <section className="relative px-6 py-20 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-healsync-indigo/5 to-transparent rounded-l-[10rem] -z-10"></div>

                <div className="container mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-10">
                        <div className="inline-flex items-center gap-2 bg-healsync-indigo/10 px-4 py-2 rounded-full border border-healsync-indigo/20 text-healsync-indigo text-xs font-black uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-healsync-indigo opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-healsync-indigo"></span>
                            </span>
                            Your Health, Reimagined
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black text-[#111827] leading-[1.1] tracking-tighter">
                            Book your <span className="text-healsync-indigo">trusted</span> doctor <br /> in seconds.
                        </h1>

                        <p className="text-lg text-healsync-grey font-medium max-w-xl leading-relaxed">
                            HealSync brings the city's top-rated specialists directly to you. Real-time booking, instant consultations, and secure records.
                        </p>

                        <div className="flex flex-col md:flex-row items-center bg-white p-2 rounded-3xl shadow-healsync border border-healsync-border max-w-2xl group focus-within:ring-4 ring-healsync-indigo/10 transition-all">
                            <div className="flex items-center px-6 py-4 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-healsync-border">
                                <label htmlFor="home-location" className="sr-only">Location</label>
                                <FaMapMarkerAlt className="text-healsync-indigo mr-3" />
                                <input id="home-location" name="location" type="text" className="w-full focus:outline-none text-[15px] font-bold bg-transparent" placeholder="Kathmandu" defaultValue="Kathmandu" />
                            </div>
                            <div className="flex items-center px-6 py-4 w-full md:w-2/3">
                                <label htmlFor="home-search" className="sr-only">Search</label>
                                <FaSearch className="text-healsync-grey mr-3" />
                                <form onSubmit={handleSearch} className="w-full">
                                    <input
                                        id="home-search"
                                        name="search"
                                        type="text"
                                        className="w-full focus:outline-none text-[15px] font-medium bg-transparent"
                                        placeholder="Specialty, Doctor, or Clinic..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </form>
                            </div>
                            <button onClick={handleSearch} className="btn-primary py-4 px-10 rounded-2xl md:ml-2">
                                Search
                            </button>
                        </div>

                        <div className="flex items-center gap-6 pt-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-10 h-10 rounded-full border-2 border-white" alt="user" />
                                ))}
                            </div>
                            <p className="text-sm font-bold text-healsync-grey">
                                <span className="text-healsync-indigo">5k+</span> Patients booked today
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-healsync-indigo to-healsync-mint opacity-20 blur-3xl rounded-full"></div>
                        <img
                            src={HERO_IMAGE}
                            alt="HealSync Doctor"
                            className="relative w-full max-w-[550px] mx-auto drop-shadow-2xl animate-float"
                        />
                    </div>
                </div>
            </section>

            {/* Services Grid - Creative Hex/Rounded Layout */}
            <section className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, idx) => (
                        <div key={idx} className="healsync-card p-10 h-full group bg-gradient-to-b from-white to-healsync-bg hover:to-white">
                            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform duration-500`}>
                                {typeof service.icon === 'string' ? (
                                    <img src={service.icon} alt={service.title} className="w-14 h-14 object-contain" />
                                ) : (
                                    service.icon
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-[#111827] mb-3">{service.title}</h3>
                            <p className="text-sm text-healsync-grey font-bold leading-relaxed mb-6">{service.desc}</p>
                            <Link to="/doctors" className={`flex items-center gap-2 text-sm font-black ${service.textColor} hover:gap-4 transition-all`}>
                                Explore <FaArrowRight />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Specializations Section - Modern List */}
            <section className="bg-white py-32 rounded-[5rem] shadow-2xl">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                        <div className="space-y-4">
                            <h2 className="section-title text-5xl">Our Expertise</h2>
                            <p className="text-lg text-healsync-grey font-medium">World-class specialists at your fingertips.</p>
                        </div>
                        <button className="btn-primary bg-healsync-bg text-healsync-indigo border-none hover:bg-healsync-indigo/5">
                            View All Specialities
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12">
                        {specializations.map((spec, idx) => (
                            <Link key={idx} to={`/doctors?specialization=${spec.name}`} className="flex flex-col items-center group cursor-pointer">
                                <div className="w-28 h-28 rounded-[2.5rem] bg-healsync-bg p-6 mb-6 group-hover:bg-healsync-indigo group-hover:shadow-healsync transition-all duration-500 group-hover:-translate-y-2 flex items-center justify-center">
                                    {typeof spec.icon === 'string' ? (
                                        <img src={spec.icon} alt={spec.name} className="w-full h-full object-contain group-hover:invert transition-all" />
                                    ) : (
                                        <div className="text-4xl text-healsync-indigo group-hover:text-white transition-colors">{spec.icon}</div>
                                    )}
                                </div>
                                <span className="text-[15px] font-black text-[#111827] text-center group-hover:text-healsync-indigo">{spec.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Creative Banner Section */}
            <section className="container mx-auto px-6 py-40">
                <div className="bg-[#111827] rounded-[4rem] p-12 lg:p-24 overflow-hidden relative flex flex-col lg:flex-row items-center gap-20 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-healsync-indigo/20 blur-[10rem] rounded-full"></div>

                    <div className="flex-1 space-y-10 relative">
                        <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                            Ready to take <br /> <span className="text-healsync-mint">control</span> of <br /> your health?
                        </h2>
                        <div className="flex gap-4">
                            <button className="bg-white text-[#111827] px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 hover:scale-105 transition-all">
                                Get Started
                            </button>
                            <button className="border-2 border-white/20 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/5 transition-all">
                                Learn More
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-healsync-indigo to-healsync-mint blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-[#1f2937] rounded-3xl p-8 border border-white/10">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 rounded-full bg-healsync-indigo flex items-center justify-center">
                                    <FaHospitalUser className="text-3xl text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black">HealSync Mobile</h4>
                                    <p className="text-white/50 text-xs font-bold uppercase">v2.0 Now Available</p>
                                </div>
                            </div>
                            <p className="text-white/70 text-sm leading-relaxed mb-8 font-medium">
                                "This is the most intuitive health app I've ever used. Managing appointments for my parents has never been easier."
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex text-healsync-mint text-xs">★★★★★</div>
                                <span className="text-white/30 text-xs">— Sarah Johnson</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
