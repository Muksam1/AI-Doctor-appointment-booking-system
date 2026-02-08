import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
    FaVideo, FaPhone, FaMicrophone, FaCamera, FaPaperclip, FaPaperPlane,
    FaSearch, FaImage, FaFileVideo, FaTimes, FaCheck
} from 'react-icons/fa';

const Consult = () => {
    // --- State ---
    const { user } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [activeDoctor, setActiveDoctor] = useState(null);
    const [messages, setMessages] = useState({}); // { docId: [questions/answers] }
    const [inputValue, setInputValue] = useState('');
    const [isCalling, setIsCalling] = useState(false);

    // File Upload State
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Socket Ref
    const socket = useRef(null);
    const doctorsRef = useRef([]);

    // --- Effects ---

    // 1. Fetch Contacts (Doctors for Patient, Patients for Doctor)
    useEffect(() => {
        if (!user) return;

        const fetchContacts = async () => {
            try {
                let contacts = [];

                if (user.role === 'doctor') {
                    // Fetch Appointments to get Patients
                    const { data } = await axios.get('/api/appointments/doctor');

                    // Extract unique patients
                    const uniquePatients = {};
                    data.forEach(appt => {
                        if (appt.patient && !uniquePatients[appt.patient._id]) {
                            uniquePatients[appt.patient._id] = {
                                _id: appt.patient._id, // Use User ID as main ID for consistency in simplified view
                                user: appt.patient,
                                specialization: 'Patient',
                                isOnline: Math.random() > 0.3,
                                lastSeen: '10 mins ago'
                            };
                        }
                    });
                    contacts = Object.values(uniquePatients);

                } else {
                    // Fetch Doctors (for Patients)
                    const { data } = await axios.get('/api/doctors');
                    contacts = data.map(doc => ({
                        ...doc,
                        isOnline: Math.random() > 0.3,
                        lastSeen: '10 mins ago'
                    }));
                }

                setDoctors(contacts); // reusing 'doctors' state for 'contacts'
                doctorsRef.current = contacts;

                if (contacts.length > 0) setActiveDoctor(contacts[0]);

            } catch (err) {
                console.error("Failed to load contacts", err);
            }
        };

        fetchContacts();
    }, [user]);

    // 2. Socket Connection
    useEffect(() => {
        if (!user) return;

        socket.current = io('http://localhost:5000');
        socket.current.emit('join', user._id);

        socket.current.on('receiveMessage', (data) => {
            // Find which doctor sent this (match senderId with doctor.user._id)
            const senderDoc = doctorsRef.current.find(doc => doc.user._id === data.senderId);

            if (senderDoc) {
                const newMessage = {
                    id: Date.now(),
                    sender: 'them',
                    text: data.text,
                    type: data.type || 'text',
                    mediaUrl: data.mediaUrl,
                    timestamp: data.timestamp
                };

                setMessages(prev => ({
                    ...prev,
                    [senderDoc._id]: [...(prev[senderDoc._id] || []), newMessage]
                }));
            }
        });

        return () => {
            socket.current.disconnect();
        };
    }, [user]);

    // --- Handlers ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if ((!inputValue.trim() && !selectedFile) || !activeDoctor || !user) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMessage = {
            id: Date.now(),
            sender: 'me',
            text: inputValue,
            type: selectedFile ? (selectedFile.type.startsWith('image') ? 'image' : 'video') : 'text',
            mediaUrl: previewUrl,
            timestamp: timestamp
        };

        const docId = activeDoctor._id;
        const currentMsgs = messages[docId] || [];

        // 1. Update UI Immediately (Optimistic)
        setMessages({
            ...messages,
            [docId]: [...currentMsgs, newMessage]
        });

        // 2. Emit to Server
        if (socket.current) {
            socket.current.emit('sendMessage', {
                senderId: user._id,
                receiverId: activeDoctor.user._id, // Send to the doctor's User ID
                text: inputValue,
                type: newMessage.type,
                mediaUrl: previewUrl,
                timestamp: timestamp
            });
        }

        // Reset inputs
        setInputValue('');
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const startCall = () => setIsCalling(true);
    const endCall = () => setIsCalling(false);

    // --- Render Helpers ---
    const getCurrentMessages = () => activeDoctor ? (messages[activeDoctor._id] || []) : [];

    return (
        <div className="h-[calc(100vh-100px)] max-w-[1600px] mx-auto p-4 flex gap-6 animate-fade-up">

            {/* --- LEFT SIDEBAR: Doctor List --- */}
            <aside className="w-full md:w-[400px] bg-white rounded-[2rem] shadow-healsync border border-healsync-border flex flex-col overflow-hidden shrink-0">
                <div className="p-6 border-b border-healsync-border bg-healsync-bg/50">
                    <h2 className="text-2xl font-black text-[#111827] mb-4">
                        {user?.role === 'doctor' ? 'Patients' : 'Doctors'}
                    </h2>
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-healsync-grey" />
                        <input
                            type="text"
                            placeholder={user?.role === 'doctor' ? 'Search patients...' : 'Search doctors...'}
                            className="input-field w-full pl-10 py-3 rounded-xl text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {doctors.map(doc => (
                        <div
                            key={doc._id}
                            onClick={() => setActiveDoctor(doc)}
                            className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${activeDoctor?._id === doc._id
                                ? 'bg-healsync-indigo text-white shadow-md transform scale-[1.02]'
                                : 'hover:bg-healsync-bg text-[#111827]'
                                }`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-200">
                                    <img src={doc.user?.image || 'https://via.placeholder.com/150'} alt="" className="w-full h-full object-cover" />
                                </div>
                                {doc.isOnline && (
                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${activeDoctor?._id === doc._id ? 'bg-healsync-mint' : 'bg-green-500'}`}></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-lg truncate">{doc.user?.name}</h4>
                                <p className={`text-sm truncate ${activeDoctor?._id === doc._id ? 'text-white/80' : 'text-healsync-grey'}`}>
                                    {doc.specialization}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* --- RIGHT MAIN: Chat Interface --- */}
            <main className="flex-1 bg-white rounded-[2rem] shadow-healsync border border-healsync-border flex flex-col overflow-hidden relative">
                {activeDoctor ? (
                    <>
                        {/* Chat Header */}
                        <header className="p-6 border-b border-healsync-border flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-healsync-border">
                                        <img src={activeDoctor.user?.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    {activeDoctor.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-healsync-mint rounded-full border border-white"></div>}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#111827]">{activeDoctor.user?.name}</h3>
                                    <p className="text-xs font-bold text-healsync-indigo uppercase tracking-wider">
                                        {activeDoctor.isOnline ? 'Active Now' : activeDoctor.lastSeen}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={startCall}
                                    className="px-6 py-2.5 bg-healsync-indigo text-white rounded-xl font-bold flex items-center gap-2 hover:bg-healsync-indigo/90 transition-all shadow-lg active:scale-95"
                                >
                                    <FaVideo /> Video Call
                                </button>
                                <button className="p-3 text-healsync-indigo bg-healsync-indigo/10 rounded-xl hover:bg-healsync-indigo/20 transition-colors">
                                    <FaPhone className="rotate-90" />
                                </button>
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-healsync-bg/30">
                            {getCurrentMessages().length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-healsync-grey opacity-60">
                                    <div className="w-20 h-20 rounded-full bg-healsync-indigo/10 flex items-center justify-center mb-4">
                                        <FaPaperPlane className="text-3xl text-healsync-indigo" />
                                    </div>
                                    <p className="text-lg font-bold">Start your consultation with {activeDoctor.user?.name}</p>
                                    <p className="text-sm">Messages are private & encrypted.</p>
                                </div>
                            )}

                            {getCurrentMessages().map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] space-y-2 ${msg.sender === 'me' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                                        <div className={`
                                            p-4 rounded-2xl shadow-sm text-base leading-relaxed break-words
                                            ${msg.sender === 'me'
                                                ? 'bg-healsync-indigo text-white rounded-br-none'
                                                : 'bg-white border border-healsync-border text-[#111827] rounded-bl-none'}
                                        `}>
                                            {/* Media Rendering */}
                                            {msg.type === 'image' && (
                                                <div className="mb-3 rounded-lg overflow-hidden border-2 border-white/20">
                                                    <img src={msg.mediaUrl} alt="Attachment" className="max-w-xs max-h-64 object-cover" />
                                                </div>
                                            )}
                                            {msg.type === 'video' && (
                                                <div className="mb-3 rounded-lg overflow-hidden border-2 border-white/20">
                                                    <video src={msg.mediaUrl} controls className="max-w-xs max-h-64" />
                                                </div>
                                            )}

                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] font-bold text-healsync-grey uppercase tracking-widest px-1">
                                            {msg.sender === 'me' && <FaCheck className="inline mr-1" />}
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-healsync-border">
                            {/* File Preview */}
                            {selectedFile && (
                                <div className="mb-4 p-3 bg-healsync-bg rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-healsync-border text-healsync-indigo text-xl">
                                            {selectedFile.type.startsWith('image') ? <FaImage /> : <FaFileVideo />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#111827] truncate max-w-[200px]">{selectedFile.name}</p>
                                            <p className="text-xs text-healsync-grey">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,video/*"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-4 rounded-2xl bg-healsync-bg text-healsync-grey hover:bg-healsync-indigo/10 hover:text-healsync-indigo transition-all"
                                    >
                                        <FaPaperclip className="text-xl" />
                                    </button>
                                </div>

                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Type your message..."
                                        className="input-field w-full py-4 pl-6 pr-12 rounded-2xl bg-healsync-bg/50 border-transparent focus:bg-white transition-all shadow-inner"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={`p-4 rounded-2xl transition-all shadow-lg ${(!inputValue.trim() && !selectedFile)
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-healsync-indigo text-white hover:bg-[#111827] hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    <FaPaperPlane className="text-xl" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6">
                        <div className="w-64 h-64 bg-healsync-bg rounded-full flex items-center justify-center animate-pulse">
                            <FaSearch className="text-6xl text-healsync-border" />
                        </div>
                        <h2 className="text-3xl font-black text-[#111827]">
                            Select a {user?.role === 'doctor' ? 'Patient' : 'Doctor'}
                        </h2>
                        <p className="text-healsync-grey max-w-md text-lg">
                            Choose a {user?.role === 'doctor' ? 'patient' : 'specialist'} from the sidebar to start chatting.
                        </p>
                    </div>
                )}

                {/* --- VIDEO CALL OVERLAY (Reused from previous step) --- */}
                {isCalling && (
                    <div className="absolute inset-0 z-[100] bg-[#111827] flex flex-col animate-in fade-in zoom-in duration-300">
                        {/* Doctor's Camera (Main View) */}
                        <div className="flex-grow relative overflow-hidden">
                            <img src={activeDoctor?.user.image} alt="" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-8">
                                <div className="w-40 h-40 rounded-full border-4 border-healsync-indigo overflow-hidden shadow-2xl animate-float">
                                    <img src={activeDoctor?.user.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter">{activeDoctor?.user.name}</h2>
                                <div className="flex items-center gap-3 px-6 py-2 bg-white/10 rounded-full backdrop-blur-md">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                    <span className="font-mono text-lg">00:15</span>
                                </div>
                            </div>

                            {/* Self View (PIP) */}
                            <div className="absolute top-8 right-8 w-48 h-64 bg-black/50 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-md shadow-2xl">
                                <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
                                    <FaCamera className="text-4xl mb-2" />
                                    <p className="text-xs font-black uppercase">You</p>
                                </div>
                            </div>
                        </div>

                        {/* Controls Bottom Bar */}
                        <div className="h-32 bg-black/40 backdrop-blur-lg flex items-center justify-center gap-8 pb-4">
                            <button className="w-16 h-16 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all flex items-center justify-center text-xl">
                                <FaMicrophone />
                            </button>
                            <button
                                onClick={endCall}
                                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all flex items-center justify-center text-3xl shadow-red-glow hover:scale-110"
                            >
                                <FaPhone className="rotate-[135deg]" />
                            </button>
                            <button className="w-16 h-16 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all flex items-center justify-center text-xl">
                                <FaVideo />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Consult;
