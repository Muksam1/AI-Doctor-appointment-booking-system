import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaRegStar, FaRegClock, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const DoctorDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [bookedSlots, setBookedSlots] = useState([]);
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        const fetchDoctor = async () => {
            const { data } = await axios.get(`/api/doctors/${id}`);
            setDoctor(data);
        };
        fetchDoctor();
    }, [id]);

    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (selectedDate && id) {
                try {
                    const { data } = await axios.get(`/api/appointments/booked-slots/${id}/${selectedDate}`);
                    setBookedSlots(data);
                    // Clear selected slot if it becomes booked
                    if (data.includes(selectedSlot)) {
                        setSelectedSlot('');
                    }
                } catch (error) {
                    console.error('Error fetching booked slots:', error);
                }
            } else {
                setBookedSlots([]);
            }
        };
        fetchBookedSlots();
    }, [selectedDate, id]);

    const handleBooking = async () => {
        if (!user) return navigate('/login');
        try {
            await axios.post('/api/appointments', {
                doctorId: id,
                date: selectedDate,
                timeSlot: selectedSlot
            });
            navigate('/dashboard');
        } catch (err) {
            alert(err.response?.data?.message || 'Booking failed');
        }
    };

    if (!doctor) return null;

    return (
        <div className="bg-healsync-bg min-h-screen py-8">
            <div className="container mx-auto px-4 max-w-6xl space-y-6">
                {/* Profile Header */}
                <div className="healsync-card p-8 flex flex-col md:flex-row gap-8">
                    <div className="w-48 h-48 shrink-0 rounded-2xl overflow-hidden border border-healsync-border">
                        <img src={doctor.user.image} alt={doctor.user.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-grow space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <h1 className="text-3xl font-black text-[#111827] uppercase">{doctor.user.name}</h1>
                            <FaCheckCircle className="text-healsync-indigo text-xl" />
                        </div>
                        <p className="text-lg font-medium text-healsync-grey">{doctor.specialization}</p>
                        <p className="text-sm text-healsync-grey leading-relaxed max-w-2xl">{doctor.bio}</p>

                        <div className="flex items-center gap-8 pt-4">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111827]">98%</span>
                                <span className="text-[11px] text-healsync-grey uppercase font-bold">Satisfaction</span>
                            </div>
                            <div className="h-10 w-px bg-healsync-border"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111827]">{doctor.experience}Yrs</span>
                                <span className="text-[11px] text-healsync-grey uppercase font-bold">Experience</span>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-72 shrink-0 bg-healsync-bg/50 p-6 rounded-2xl border border-healsync-border space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold text-[#111827]">
                            <span>Consultation Fee</span>
                            <span>Rs. {doctor.fee}</span>
                        </div>
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="btn-primary w-full uppercase tracking-tighter py-4 text-center block"
                        >
                            Confirm Booking
                        </button>
                        <p className="text-[11px] text-center text-healsync-grey font-bold">FREE FOLLOW UP FOR 7 DAYS</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-8 space-y-6">
                            <h2 className="text-xl font-bold border-b border-healsync-border pb-4 uppercase tracking-tighter">Info & Feedback</h2>
                            <div className="space-y-4">
                                <p className="text-healsync-grey italic">"Exception care and attention to detail. The doctor explained everything clearly."</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="flex text-yellow-500"><FaRegStar /><FaRegStar /><FaRegStar /><FaRegStar /></div>
                                    <span className="font-bold">Verified Patient</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-panel p-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                <FaRegClock className="text-healsync-indigo" />
                                <span>Availability</span>
                            </h2>
                            <ul className="space-y-4">
                                <li className="flex justify-between text-sm">
                                    <span className="font-medium text-healsync-grey">Mon - Fri</span>
                                    <span className="font-bold">09:00 AM - 05:00 PM</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="font-medium text-healsync-grey">Sat</span>
                                    <span className="font-bold">10:00 AM - 02:00 PM</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal (Practo Style) */}
            {showBookingModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="p-6 border-b border-practo-border flex justify-between items-center">
                            <h2 className="text-xl font-bold">Select Appointment Slot</h2>
                            <button onClick={() => setShowBookingModal(false)} className="text-2xl">&times;</button>
                        </header>

                        <div className="p-8 space-y-8">
                            <div>
                                <label htmlFor="appt-date" className="block text-sm font-bold text-[#111827] mb-3 uppercase tracking-wider">Choose Date</label>
                                <input
                                    id="appt-date"
                                    name="date"
                                    type="date"
                                    className="w-full p-4 bg-healsync-bg border border-healsync-border rounded-xl font-bold outline-none focus:border-healsync-indigo transition-all"
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-[#111827] mb-3 uppercase tracking-wider">Choose Time</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"].map(slot => {
                                        const isBooked = bookedSlots.includes(slot);
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => !isBooked && setSelectedSlot(slot)}
                                                disabled={isBooked}
                                                className={`py-3 border-2 rounded-xl text-[13px] font-black transition-all ${isBooked
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                                    : selectedSlot === slot
                                                        ? 'bg-healsync-indigo text-white border-healsync-indigo shadow-healsync'
                                                        : 'border-healsync-border hover:border-healsync-indigo text-[#111827]'
                                                    }`}
                                            >
                                                {slot}
                                                {isBooked && <span className="block text-[9px] uppercase mt-1">Booked</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <footer className="p-6 bg-practo-bg border-t border-practo-border flex justify-end gap-4">
                            <button onClick={() => setShowBookingModal(false)} className="text-sm font-bold text-practo-grey">Cancel</button>
                            <button
                                onClick={handleBooking}
                                disabled={!selectedDate || !selectedSlot}
                                className="btn-primary"
                            >
                                Confirm Booking
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDetail;
