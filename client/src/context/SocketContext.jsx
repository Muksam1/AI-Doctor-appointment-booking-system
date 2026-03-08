import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socketInstance, setSocketInstance] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (user) {
            const newSocket = io('http://localhost:5000');
            setSocketInstance(newSocket);
            newSocket.emit('join', user._id);
            if (user.role === 'admin') {
                newSocket.emit('join', 'admins');
            }

            newSocket.on('receiveMessage', (data) => {
                if (data.senderId === 'system') {
                    setNotifications(prev => [...prev, {
                        id: Date.now(),
                        message: data.text,
                        timestamp: data.timestamp
                    }]);
                }
            });

            newSocket.on('adminNotification', (data) => {
                setNotifications(prev => [...prev, {
                    id: Date.now(),
                    message: data.text,
                    timestamp: data.timestamp,
                    type: data.type
                }]);
            });

            return () => {
                newSocket.disconnect();
            };
        } else {
            setSocketInstance(null);
        }
    }, [user]);

    const clearNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <SocketContext.Provider value={{ socket: socketInstance, notifications, clearNotification }}>
            {children}
            {/* Simple Notification UI */}
            <div className="fixed top-24 right-6 z-[300] space-y-3">
                {notifications.map(notif => (
                    <div key={notif.id} className="bg-white border-l-4 border-healsync-indigo p-4 rounded-xl shadow-2xl w-80 animate-in slide-in-from-right-10 duration-300">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-sm text-[#111827]">{notif.message}</p>
                            <button onClick={() => clearNotification(notif.id)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-black">{notif.timestamp}</p>
                    </div>
                ))}
            </div>
        </SocketContext.Provider>
    );
};
