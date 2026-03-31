import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaRegStar, FaRegClock, FaCalendarAlt, FaStar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DoctorDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                const { data } = await axios.get(`/api/doctors/${id}`);
                setDoctor(data);
            } catch (err) {
                console.error('Error fetching doctor:', err);
            } finally {
                setLoading(false);
            }
        };
        const fetchReviews = async () => {
            try {
                const { data } = await axios.get(`/api/reviews/doctor/${id}`);
                setReviews(data.reviews || []);
            } catch (err) {
                console.error('Error fetching reviews:', err);
            }
        };
        fetchDoctor();
        fetchReviews();
    }, [id]);

    useEffect(() => {
        const fetchSlots = async () => {
            if (selectedDate && id) {
                try {
                    const { data } = await axios.get(`/api/appointments/slots/${id}/${selectedDate}`);
                    setAvailableSlots(data.slots || []);
                    // Reset selected slot if it's no longer available
                    if (!data.slots.find(s => s.startTime === selectedSlot)) {
                        setSelectedSlot('');
                    }
                } catch (error) {
                    console.error('Error fetching slots:', error);
                    setAvailableSlots([]);
                }
            } else {
                setAvailableSlots([]);
            }
        };
        fetchSlots();
    }, [selectedDate, id, selectedSlot]);

    const handleBooking = async () => {
        if (!user) return navigate('/login');
        if (!selectedDate || !selectedSlot) return;

        setBookingLoading(true);
        try {
            // 1. Create the Pending Appointment
            const { data: appointmentData } = await axios.post('/api/appointments', {
                doctorId: id,
                date: selectedDate,
                timeSlot: selectedSlot
            });

            if (appointmentData.success) {
                const appointmentId = appointmentData.appointment._id;
                const fee = appointmentData.appointment.fee;

                // 2. Initiate eSewa Payment
                const { data: paymentRes } = await axios.post('/api/payments/esewa/initiate', {
                    appointmentId,
                    amount: fee
                });

                if (paymentRes.success && paymentRes.formData) {
                    // 3. Create a dynamic form and submit to eSewa
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = paymentRes.payment_url;

                    Object.entries(paymentRes.formData).forEach(([key, value]) => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = value;
                        form.appendChild(input);
                    });

                    document.body.appendChild(form);
                    form.submit();
                } else {
                    throw new Error('Failed to initiate payment gateway');
                }
            }
        } catch (err) {
            console.error("Booking/Payment Error:", err);
            toast.error(err.response?.data?.message || err.message || 'Booking failed. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-healsync-bg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-healsync-indigo"></div>
        </div>
    );
    
    if (!doctor) return (
        <div className="min-h-screen flex items-center justify-center bg-healsync-bg">
            <h2 className="text-2xl font-bold text-healsync-grey">Doctor not found</h2>
        </div>
    );

    return (
        <div className="bg-healsync-bg min-h-screen py-8">
            <div className="container mx-auto px-4 max-w-6xl space-y-6">
                {/* Profile Header */}
                <div className="healsync-card p-8 flex flex-col md:flex-row gap-8">
                    <div className="w-48 h-48 shrink-0 rounded-2xl overflow-hidden border border-healsync-border bg-gray-50">
                        {doctor.user.image ? (
                            <img src={doctor.user.image} alt={doctor.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-healsync-indigo opacity-20 capitalize">
                                {doctor.user.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="flex-grow space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <h1 className="text-3xl font-black text-[#111827] uppercase">{doctor.user.name}</h1>
                            {doctor.isVerified && <FaCheckCircle className="text-healsync-indigo text-xl" />}
                        </div>
                        <p className="text-lg font-medium text-healsync-grey">{doctor.specialization}</p>
                        <p className="text-sm text-healsync-grey leading-relaxed max-w-2xl">{doctor.bio || 'Comprehensive medical care specialist dedicated to patient well-being.'}</p>

                        <div className="flex items-center gap-8 pt-4">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111827]">{doctor.ratings || 'New'}</span>
                                <span className="text-[11px] text-healsync-grey uppercase font-bold tracking-widest">Rating</span>
                            </div>
                            <div className="h-10 w-px bg-healsync-border"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-[#111827]">{doctor.experience}+ Yrs</span>
                                <span className="text-[11px] text-healsync-grey uppercase font-bold tracking-widest">Experience</span>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-72 shrink-0 bg-white p-6 rounded-2xl border border-healsync-border shadow-sm space-y-4 flex flex-col justify-center">
                        <div className="flex justify-between items-center text-sm font-bold text-[#111827]">
                            <span className="text-healsync-grey font-black uppercase text-[10px] tracking-widest">Session Fee</span>
                            <span className="text-xl">Rs. {doctor.fee}</span>
                        </div>
                        <button
                            onClick={() => setShowBookingModal(true)}
                            className="btn-primary w-full py-4 text-center block text-sm tracking-widest uppercase font-black"
                        >
                            Book Appointment
                        </button>
                        <p className="text-[10px] text-center text-healsync-grey font-bold uppercase tracking-widest opacity-60">Verified by HealSync AI</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-8 space-y-6">
                            <h2 className="text-xl font-black border-b border-healsync-border pb-4 uppercase tracking-tighter text-[#111827]">Professional Background</h2>
                            <div className="prose prose-sm text-healsync-grey max-w-none">
                                <p>Dr. {doctor.user.name.split(' ').pop()} has significant expertise in {doctor.specialization}. Offering clinical excellence with a patient-first approach, they provide evidence-based medical consultations in KTM.</p>
                                <ul className="list-disc pl-5 space-y-2 mt-4">
                                    <li>State-of-the-art diagnostic protocols</li>
                                    <li>Compassionate and personalized care</li>
                                    <li>Modern clinic environment</li>
                                </ul>
                            </div>
                        </div>

                        {/* Patient Reviews Section */}
                        <div className="glass-panel p-8 space-y-6">
                            <div className="flex items-center justify-between border-b border-healsync-border pb-4">
                                <h2 className="text-xl font-black uppercase tracking-tighter text-[#111827]">Patient Reviews</h2>
                                <span className="text-xs font-bold text-healsync-indigo bg-healsync-indigo/5 px-3 py-1 rounded-lg">
                                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                                </span>
                            </div>
                            
                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.map(review => (
                                    <div key={review._id} className="border-b border-healsync-border pb-6 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex text-amber-400 text-sm">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <FaStar key={star} className={star <= review.rating ? '' : 'text-gray-200'} />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-[#111827] text-sm">{review.title}</span>
                                            </div>
                                            <span className="text-xs text-healsync-grey font-bold">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-healsync-grey italic mb-3">"{review.comment}"</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-healsync-indigo/10 flex flex-shrink-0 items-center justify-center overflow-hidden">
                                                {review.patient?.image ? (
                                                    <img src={review.patient.image} alt={review.patient.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] text-healsync-indigo font-black">
                                                        {review.patient?.name ? review.patient.name.charAt(0) : 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-healsync-grey font-bold">
                                                {review.patient?.name || 'Anonymous Patient'}
                                            </span>
                                        </div>
                                        
                                        {/* Doctor Response Section (if exists) */}
                                        {review.response?.doctorResponse && (
                                            <div className="mt-4 ml-6 p-4 bg-gray-50 rounded-xl border-l-4 border-healsync-indigo">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-healsync-indigo uppercase tracking-widest">Doctor's Response</span>
                                                </div>
                                                <p className="text-sm text-healsync-grey leading-relaxed">{review.response.doctorResponse}</p>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-healsync-grey font-medium">No reviews have been posted for this doctor yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-panel p-8">
                            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter text-[#111827]">
                                <FaRegClock className="text-healsync-indigo" />
                                <span>Clinic Hours</span>
                            </h2>
                            <ul className="space-y-4">
                                {doctor.availability && doctor.availability.map((avail, idx) => (
                                    <li key={idx} className={`flex justify-between text-sm items-center pb-3 ${idx !== doctor.availability.length - 1 ? 'border-b border-healsync-border' : ''}`}>
                                        <span className={`font-black uppercase text-[11px] tracking-widest ${avail.isAvailable ? 'text-[#111827]' : 'text-gray-300'}`}>
                                            {avail.day}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {avail.isAvailable ? (
                                                <span className="font-bold text-healsync-indigo bg-healsync-indigo/5 px-2 py-1 rounded-md text-[12px]">
                                                    {avail.slots[0]?.startTime} - {avail.slots[avail.slots.length - 1]?.endTime}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Closed</span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="fixed inset-0 z-[100] bg-[#111827]/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-fade-up">
                        <header className="p-8 border-b border-healsync-border flex justify-between items-center bg-gray-50/50">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tighter">Schedule Visit</h2>
                                <p className="text-xs text-healsync-grey font-bold uppercase tracking-widest">Select your preferred window</p>
                            </div>
                            <button 
                                onClick={() => setShowBookingModal(false)} 
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-2xl font-light"
                            >
                                &times;
                            </button>
                        </header>

                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <label htmlFor="appt-date" className="flex items-center gap-2 text-sm font-black text-[#111827] uppercase tracking-widest">
                                    <FaCalendarAlt className="text-healsync-indigo" /> 1. Select Date
                                </label>
                                <input
                                    id="appt-date"
                                    name="date"
                                    type="date"
                                    min={new Date().toLocaleDateString('en-CA')} // Block past dates using local time ISO format (YYYY-MM-DD)
                                    className="w-full p-5 bg-healsync-bg border border-healsync-border rounded-2xl font-black text-lg outline-none focus:border-healsync-indigo focus:ring-4 focus:ring-healsync-indigo/10 transition-all cursor-pointer"
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-black text-[#111827] uppercase tracking-widest">
                                    <FaRegClock className="text-healsync-indigo" /> 2. Available Slots
                                </h4>
                                {!selectedDate ? (
                                    <div className="py-12 text-center border-2 border-dashed border-healsync-border rounded-2xl bg-gray-50">
                                        <p className="text-healsync-grey italic font-bold">Please select a date first</p>
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 h-[200px] overflow-y-auto pr-2 no-scrollbar">
                                        {availableSlots.map(slot => (
                                            <button
                                                key={slot.startTime}
                                                type="button"
                                                onClick={() => setSelectedSlot(slot.startTime)}
                                                className={`py-4 border-2 rounded-2xl text-[14px] font-black transition-all ${selectedSlot === slot.startTime
                                                        ? 'bg-healsync-indigo text-white border-healsync-indigo shadow-lg scale-[0.98]'
                                                        : 'bg-white border-healsync-border hover:border-healsync-indigo hover:text-healsync-indigo text-[#111827]'
                                                    }`}
                                            >
                                                {slot.startTime}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center border-2 border-dashed border-healsync-border rounded-2xl bg-red-50">
                                        <p className="text-red-500 font-black uppercase text-xs tracking-widest">No availability on this date</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <footer className="p-8 bg-gray-50 border-t border-healsync-border flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="text-left">
                                <p className="text-[10px] font-black text-healsync-grey uppercase tracking-widest">Confirmed Visit</p>
                                <p className="text-xl font-black text-[#111827]">Rs. {doctor.fee}</p>
                            </div>
                            <div className="flex gap-4 w-full sm:w-auto">
                                <button 
                                    onClick={() => setShowBookingModal(false)} 
                                    className="px-8 py-4 font-black text-xs uppercase tracking-widest text-healsync-grey hover:text-[#111827] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={!selectedDate || !selectedSlot || bookingLoading}
                                    className={`btn-primary flex-grow sm:flex-grow-0 min-w-[180px] ${bookingLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {bookingLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Processing</span>
                                        </div>
                                    ) : 'Confirm Booking'}
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDetail;
