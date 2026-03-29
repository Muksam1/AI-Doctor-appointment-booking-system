import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { FaRegThumbsUp, FaCheckCircle, FaMapMarkerAlt, FaFilter, FaStethoscope } from 'react-icons/fa';

const Doctors = () => {
    const [doctors, setDoctors] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('search') || '';
    const specialization = searchParams.get('specialization') || '';

    const handleFilterChange = (spec) => {
        const newParams = new URLSearchParams(searchParams);
        if (specialization === spec) {
            newParams.set('specialization', ''); // Toggle off
        } else {
            newParams.set('specialization', spec);
        }
        setSearchParams(newParams);
    };

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const { data } = await axios.get(`/api/doctors?search=${search}&specialization=${specialization}`);
                // API returns { doctors: [...], totalPages, ... }
                setDoctors(Array.isArray(data) ? data : (data.doctors || []));
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
                setDoctors([]);
            }
        };
        fetchDoctors();
    }, [search, specialization]);

    return (
        <div className="w-full px-4 md:px-8 py-12 space-y-12 animate-fade-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-healsync-border pb-10">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-healsync-indigo font-black text-xs uppercase tracking-widest">
                        <FaMapMarkerAlt /> Available Specialists
                    </div>
                    <h1 className="text-4xl font-black text-[#111827] tracking-tighter">
                        {doctors.length} Verified {specialization ? `${specialization}s` : 'Doctors'}
                    </h1>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-healsync-border">
                    <button 
                        onClick={() => handleFilterChange('')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${!specialization ? 'bg-healsync-indigo text-white shadow-lg' : 'bg-healsync-bg text-healsync-indigo opacity-70 hover:opacity-100'}`}
                    >
                        All Doctors
                    </button>
                    <p className="text-xs font-black text-healsync-grey uppercase tracking-widest px-4">Sort: Relevance</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Filters Sidebar */}
                <div className="hidden lg:block space-y-8">
                    <div className="glass-panel p-8 space-y-8 sticky top-32">
                        <div>
                            <h3 className="font-black text-xs uppercase mb-6 tracking-widest text-healsync-grey">Specialization</h3>
                            <div className="space-y-4">
                                {['Dentist', 'Gynecologist', 'Physician', 'Orthopedist', 'Cardiologist', 'Neurologist'].map(s => (
                                    <label key={s} className="flex items-center gap-3 text-sm font-bold text-[#111827] cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 accent-healsync-indigo rounded-lg border-healsync-border" 
                                            checked={specialization === s}
                                            onChange={() => handleFilterChange(s)}
                                        />
                                        <span className={`${specialization === s ? 'text-healsync-indigo font-black' : 'group-hover:text-healsync-indigo'} transition-colors`}>{s}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="h-px bg-healsync-border"></div>
                        <div className="space-y-6">
                            <h3 className="font-black text-xs uppercase tracking-widest text-healsync-grey">Experience</h3>
                            <input type="range" className="w-full accent-healsync-indigo" />
                            <div className="flex justify-between text-[10px] font-black text-healsync-grey uppercase">
                                <span>1 Year</span>
                                <span>25+ Years</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doctor Listings */}
                <div className="lg:col-span-3 space-y-8">
                    {doctors.map((doc, idx) => (
                        <div
                            key={doc._id}
                            className="healsync-card p-10 flex flex-col md:flex-row gap-10 group"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="w-40 h-40 shrink-0 rounded-3xl overflow-hidden bg-healsync-bg border border-healsync-border shadow-inner group-hover:scale-105 transition-transform duration-500 relative">
                                {doc.user.image ? (
                                    <img src={doc.user.image} alt={doc.user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-healsync-indigo/10 text-4xl text-healsync-indigo italic font-black">
                                        {doc.user.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-healsync-border">
                                    <FaCheckCircle className="text-healsync-mint text-lg" />
                                </div>
                            </div>

                            <div className="flex-grow space-y-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-2xl font-black text-[#111827] group-hover:text-healsync-indigo transition-colors">
                                            {doc.user.name}
                                        </h3>
                                        <div className="px-2 py-0.5 bg-healsync-mint/10 text-teal-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-healsync-mint/20">
                                            Verified
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-healsync-grey flex items-center gap-2">
                                        <FaStethoscope className="text-healsync-indigo text-sm" />
                                        {doc.specialization}
                                    </p>
                                    <p className="text-sm text-healsync-grey font-medium tracking-tight mt-1">{doc.experience} years of clinical excellence</p>
                                </div>

                                <div className="pt-6 flex flex-wrap gap-6 text-sm font-black border-t border-healsync-border border-dashed">
                                    <div className="flex items-center gap-2 text-teal-600 bg-healsync-mint/5 px-3 py-1 rounded-lg">
                                        <FaRegThumbsUp />
                                        <span>98% <span className="text-[10px] opacity-70 uppercase ml-1">Satisfaction</span></span>
                                    </div>
                                    <span className="text-[#111827] flex items-center gap-1">
                                        <span className="text-healsync-indigo underline decoration-healsync-indigo/30 underline-offset-4">{doc.numReviews || 0}</span>
                                        <span className="text-[10px] uppercase text-healsync-grey ml-1">Patient Stories</span>
                                    </span>
                                </div>
                            </div>

                            <div className="md:w-64 shrink-0 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-healsync-border pt-6 md:pt-0 md:pl-10 text-right">
                                <div className="space-y-2">
                                    <p className="text-teal-600 text-[11px] font-black uppercase tracking-widest animate-pulse">● Available Today</p>
                                    <div>
                                        <p className="text-3xl font-black text-[#111827] tracking-tighter">Rs. {doc.fee}</p>
                                        <p className="text-[11px] text-healsync-grey font-bold uppercase tracking-widest mt-1 opacity-60">Professional Consultation</p>
                                    </div>
                                </div>
                                <Link
                                    to={`/doctors/${doc._id}`}
                                    className="btn-primary w-full bg-[#111827] hover:bg-healsync-indigo group-hover:shadow-healsync-hover transition-all mt-6 uppercase tracking-widest text-[#F9FAFB]"
                                >
                                    Book Visit
                                </Link>
                            </div>
                        </div>
                    ))}

                    {doctors.length === 0 && (
                        <div className="glass-panel py-32 text-center space-y-8 animate-fade-up">
                            <img src="/assets/no-results.png" alt="No docs" className="h-56 mx-auto animate-float" />
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-[#111827] tracking-tighter">Quiet on the medical front</h3>
                                <p className="text-healsync-grey font-medium text-lg max-w-md mx-auto">We couldn't find any specialists matching your criteria. Try adjusting your filters or search terms.</p>
                            </div>
                            <button onClick={() => window.location.reload()} className="btn-primary inline-flex mt-6">
                                Reset Selection
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Doctors;
