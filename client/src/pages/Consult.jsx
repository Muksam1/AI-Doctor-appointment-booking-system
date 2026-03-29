import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    FaMicrophone, FaCamera, FaPaperclip, FaPaperPlane,
    FaSearch, FaImage, FaFileVideo, FaTimes, FaCheck
} from 'react-icons/fa';

const Consult = () => {
    // --- State ---
    const { user } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [activeDoctor, setActiveDoctor] = useState(null);
    const [messages, setMessages] = useState({}); // { partnerId: [message objects] }
    const [unreadCounts, setUnreadCounts] = useState({}); // { partnerId: count }
    const [inputValue, setInputValue] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // File Upload State
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Socket from Context
    const { socket } = useSocket();
    const doctorsRef = useRef([]);
    const scrollRef = useRef(null);

    // --- Effects ---

    // 1. Fetch Contacts (Doctors for Patient, Patients for Doctor)
    useEffect(() => {
        if (!user) return;

        const fetchContacts = async () => {
            try {
                let contacts = [];

                if (user.role === 'doctor') {
                    // Fetch ALL patients from the platform
                    const { data } = await axios.get('/api/patients/all');
                    contacts = data.map(patient => ({
                        _id: patient._id,
                        user: patient,
                        specialization: 'Patient',
                        isOnline: Math.random() > 0.3,
                        lastSeen: '10 mins ago'
                    }));
                } else {
                    // Fetch ALL approved doctors (for Patients & Admins)
                    const { data } = await axios.get('/api/doctors');
                    const doctorList = Array.isArray(data) ? data : (data.doctors || []);
                    contacts = doctorList.map(doc => ({
                        ...doc,
                        isOnline: Math.random() > 0.3,
                        lastSeen: '10 mins ago'
                    }));
                }

                setDoctors(contacts);
                doctorsRef.current = contacts;

                if (contacts.length > 0) setActiveDoctor(contacts[0]);

            } catch (err) {
                console.error("Failed to load contacts", err);
            }
        };

        fetchContacts();
    }, [user]);

    // 2. Fetch Unread Counts
    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            try {
                const { data } = await axios.get('/api/messages/unread-counts');
                const counts = {};
                data.forEach(item => {
                    counts[item._id] = item.count;
                });
                setUnreadCounts(counts);
            } catch (err) {
                console.error("Failed to load unread counts", err);
            }
        };
        fetchUnread();
    }, [user]);

    // 3. Fetch History when Active Contact changes
    useEffect(() => {
        if (!user || !activeDoctor) return;
        const partnerId = activeDoctor.user?._id || activeDoctor._id;

        const fetchHistory = async () => {
            try {
                const { data } = await axios.get(`/api/messages/history/${partnerId}`);
                const formattedMessages = data.map(m => ({
                    id: m._id,
                    sender: m.sender === user._id ? 'me' : 'them',
                    text: m.text,
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isRead: m.isRead
                }));

                setMessages(prev => ({
                    ...prev,
                    [partnerId]: formattedMessages
                }));

                // Mark as read
                if (unreadCounts[partnerId] > 0) {
                    await axios.put(`/api/messages/mark-read/${partnerId}`);
                    setUnreadCounts(prev => ({ ...prev, [partnerId]: 0 }));
                    if (socket) {
                        socket.emit('markRead', { senderId: partnerId, receiverId: user._id });
                    }
                }
            } catch (err) {
                console.error("Failed to load history", err);
            }
        };

        fetchHistory();
    }, [activeDoctor, user]);

    // 4. Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeDoctor]);

    // 5. Socket Message Handler
    useEffect(() => {
        console.log("Socket effect triggered. Socket connected:", socket?.connected);
        if (!socket || !user) return;

        const handleReceive = (data) => {
            console.log("Message received via socket:", data);
            const chatPartnerId = data.sender; // sender ID from server payload

            const newMessage = {
                id: data._id || Date.now(),
                sender: 'them',
                text: data.text,
                type: data.type || 'text',
                mediaUrl: data.mediaUrl,
                timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isRead: false
            };

            setMessages(prev => ({
                ...prev,
                [chatPartnerId]: [...(prev[chatPartnerId] || []), newMessage]
            }));

            // If this is the active chat, mark as read immediately
            const activePartnerId = activeDoctor?.user?._id || activeDoctor?._id;
            if (chatPartnerId === activePartnerId) {
                axios.put(`/api/messages/mark-read/${chatPartnerId}`);
                socket.emit('markRead', { messageId: data._id, senderId: chatPartnerId, receiverId: user._id });
            } else {
                // Update unread count for sidebar
                setUnreadCounts(prev => ({
                    ...prev,
                    [chatPartnerId]: (prev[chatPartnerId] || 0) + 1
                }));
            }
        };

        const handleReadUpdate = (data) => {
            // When the other person reads our messages
            const partnerId = data.receiverId;
            setMessages(prev => {
                if (!prev[partnerId]) return prev;
                return {
                    ...prev,
                    [partnerId]: prev[partnerId].map(msg =>
                        msg.sender === 'me' ? { ...msg, isRead: true } : msg
                    )
                };
            });
        };

        socket.on('receiveMessage', handleReceive);
        socket.on('messageRead', handleReadUpdate);
        return () => {
            socket.off('receiveMessage', handleReceive);
            socket.off('messageRead', handleReadUpdate);
        };
    }, [socket, user, activeDoctor]);

    // --- Handlers ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!inputValue.trim() && !selectedFile) || !activeDoctor || !user || isUploading) return;

        setIsUploading(true);
        let uploadedUrl = null;

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            try {
                const { data } = await axios.post('/api/messages/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrl = data.url;
            } catch (err) {
                console.error('File upload failed', err);
                setIsUploading(false);
                return; // Stop message send if upload fails
            }
        }

        const newMessage = {
            id: Date.now(),
            sender: 'me',
            text: inputValue,
            type: selectedFile ? (selectedFile.type.startsWith('image') ? 'image' : 'video') : 'text',
            mediaUrl: uploadedUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: false
        };

        const chatPartnerId = activeDoctor.user?._id || activeDoctor._id;
        const currentMsgs = messages[chatPartnerId] || [];

        // 1. Update UI Immediately (Optimistic)
        setMessages({
            ...messages,
            [chatPartnerId]: [...currentMsgs, newMessage]
        });

        // 2. Emit to Server
        if (socket) {
            console.log("Emitting sendMessage to:", chatPartnerId);
            socket.emit('sendMessage', {
                senderId: user._id,
                receiverId: chatPartnerId, // Send to the partner's User ID
                text: inputValue,
                type: newMessage.type,
                mediaUrl: uploadedUrl,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn("Socket not available to send message!");
        }

        // Reset inputs
        setInputValue('');
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsUploading(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };


    // --- Render Helpers ---
    const getCurrentMessages = () => {
        if (!activeDoctor) return [];
        const chatPartnerId = activeDoctor.user?._id || activeDoctor._id;
        return messages[chatPartnerId] || [];
    };

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
                            {unreadCounts[doc.user?._id || doc._id] > 0 && (
                                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">
                                    {unreadCounts[doc.user?._id || doc._id]}
                                </div>
                            )}
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
                        </header>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-healsync-bg/30">
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
                                            {msg.sender === 'me' && (
                                                msg.isRead ? <span className="text-healsync-mint mr-1">Read</span> : <FaCheck className="inline mr-1" />
                                            )}
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
                                    disabled={(!inputValue.trim() && !selectedFile) || isUploading}
                                    className={`p-4 rounded-2xl transition-all shadow-lg ${((!inputValue.trim() && !selectedFile) || isUploading)
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-healsync-indigo text-white hover:bg-[#111827] hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {isUploading ? (
                                        <div className="w-5 h-5 border-2 border-healsync-indigo border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaPaperPlane className="text-xl" />
                                    )}
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

            </main>
        </div>
    );
};

export default Consult;
