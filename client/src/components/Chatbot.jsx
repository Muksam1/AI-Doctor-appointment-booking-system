import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaRobot, FaTimes, FaPaperPlane, FaChevronDown, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        { text: "Hello! I'm your HealSync Assistant. How can I help you today?", sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (customMessage) => {
        const msgText = customMessage || input;
        if (!msgText.trim()) return;

        const userMsg = { text: msgText, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        if (!customMessage) setInput('');
        setLoading(true);

        try {
            const { data } = await axios.post('/api/chatbot', { 
                message: msgText,
                userId: user?._id 
            });
            
            // Fix: The backend returns 'message', not 'reply'
            const botMsg = { 
                text: data.message || "I'm not sure how to help with that. Could you try rephrasing?", 
                sender: 'bot',
                suggestions: data.suggestions || []
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, { 
                text: "Sorry, I'm having trouble connecting. Please try again later.", 
                sender: 'bot' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 ${isOpen ? 'bg-healsync-mint text-[#064e3b] rotate-90 scale-90' : 'bg-healsync-indigo text-white hover:scale-110'
                    }`}
            >
                {isOpen ? <FaChevronDown /> : <FaRobot />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl border border-healsync-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    {/* Header */}
                    <header className="bg-healsync-indigo p-6 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <FaRobot className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm tracking-tight">HealSync AI</h3>
                                <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Online | Instant Reply</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="opacity-70 hover:opacity-100 p-2"><FaTimes /></button>
                    </header>

                    {/* Messages */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                                <div className={`flex items-start gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs shadow-sm ${
                                        msg.sender === 'user' ? 'bg-healsync-violet text-white' : 'bg-healsync-indigo text-white'
                                    }`}>
                                        {msg.sender === 'user' ? (user?.image ? <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" /> : <FaUser />) : <FaRobot />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-md border transition-all ${
                                        msg.sender === 'user'
                                            ? 'bg-gradient-to-br from-healsync-indigo to-healsync-violet text-white rounded-tr-none border-transparent'
                                            : 'bg-white text-slate-800 border-slate-100 rounded-tl-none font-medium'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>

                                {/* Suggestions */}
                                {msg.sender === 'bot' && msg.suggestions?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2 ml-10">
                                        {msg.suggestions.map((suggestion, sIdx) => (
                                            <button
                                                key={sIdx}
                                                onClick={() => handleSend(suggestion)}
                                                className="px-3 py-1.5 bg-white border border-healsync-indigo/30 text-healsync-indigo text-[11px] font-bold rounded-full hover:bg-healsync-indigo hover:text-white transition-all shadow-sm"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-start gap-2 animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-healsync-indigo text-white flex items-center justify-center text-xs shadow-sm">
                                    <FaRobot />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-md flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-healsync-indigo rounded-full animate-bounce [animation-duration:800ms]"></div>
                                    <div className="w-1.5 h-1.5 bg-healsync-indigo rounded-full animate-bounce [animation-delay:200ms] [animation-duration:800ms]"></div>
                                    <div className="w-1.5 h-1.5 bg-healsync-indigo rounded-full animate-bounce [animation-delay:400ms] [animation-duration:800ms]"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Disclaimer */}
                    <div className="px-6 py-2 bg-amber-50 text-[10px] text-amber-700 font-bold text-center border-t border-amber-100">
                        * AI advice is for information only. Consult a doctor for medical emergencies.
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-healsync-border flex gap-2">
                        <label htmlFor="bot-input" className="sr-only">Ask AI</label>
                        <input
                            id="bot-input"
                            name="message"
                            type="text"
                            className="flex-grow bg-healsync-bg border border-healsync-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-healsync-indigo transition-all"
                            placeholder="Type your health query..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            className="w-12 h-12 bg-healsync-indigo text-white rounded-xl flex items-center justify-center hover:bg-opacity-90 transition-all font-bold shadow-healsync"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
