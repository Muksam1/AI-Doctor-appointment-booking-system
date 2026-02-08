import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaRobot, FaTimes, FaPaperPlane, FaChevronDown } from 'react-icons/fa';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
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

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await axios.post('/api/chatbot', { message: input });
            const botMsg = { text: data.reply, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting. Please try again later.", sender: 'bot' }]);
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
                    <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-[#f9f9fb]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${msg.sender === 'user'
                                    ? 'bg-healsync-indigo text-white rounded-tr-none'
                                    : 'bg-white text-[#111827] border border-healsync-border rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-healsync-border shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-healsync-grey rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-healsync-grey rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-healsync-grey rounded-full animate-bounce [animation-delay:0.4s]"></div>
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
