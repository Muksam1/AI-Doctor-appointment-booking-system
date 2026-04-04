import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socketInstance, setSocketInstance] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (user) {
            const socketUrl =
                import.meta.env.VITE_SOCKET_URL ||
                import.meta.env.VITE_API_URL ||
                'http://localhost:5000';
            const newSocket = io(socketUrl);
            setSocketInstance(newSocket);
            newSocket.emit('join', user._id);
            if (user.role === 'admin') {
                newSocket.emit('join', 'admins');
            }

            // ── Doctor: new booking request ─────────────────────────────────────
            newSocket.on('newAppointment', (data) => {
                toast.success(
                    `📅 New appointment request from ${data.patient} for ${data.date} at ${data.time}`,
                    { duration: 6000, id: `appt-${data.appointment}` }
                );
            });

            // ── Patient: appointment accepted / rejected ─────────────────────────
            newSocket.on('appointmentStatusUpdate', (data) => {
                const isAccepted = data.status === 'Confirmed';
                const msg = isAccepted
                    ? `✅ Your appointment has been accepted!`
                    : `❌ Your appointment has been rejected.`;
                isAccepted
                    ? toast.success(msg, { duration: 6000 })
                    : toast.error(msg, { duration: 6000 });
            });

            // ── Chat: new message ────────────────────────────────────────────────
            newSocket.on('receiveMessage', (data) => {
                // Only show toast if the message is from someone else (not a system echo)
                if (data.senderId && data.senderId !== user._id) {
                    const senderName = data.senderName || 'Someone';
                    toast(`💬 New message from ${senderName}`, {
                        duration: 5000,
                        style: {
                            background: '#4F46E5',
                            color: '#fff',
                            fontWeight: '600'
                        },
                        id: `msg-${data.senderId}`
                    });
                }

                // Keep legacy system messages in the dropdown bell too
                if (data.senderId === 'system') {
                    setNotifications(prev => [...prev, {
                        id: Date.now(),
                        message: data.text,
                        timestamp: data.timestamp
                    }]);
                }
            });

            // ── Admin: new doctor registration alert ─────────────────────────────
            newSocket.on('adminNotification', (data) => {
                toast(`🔔 ${data.text}`, {
                    duration: 7000,
                    style: {
                        background: '#0F172A',
                        color: '#fff',
                        fontWeight: '600'
                    }
                });
                setNotifications(prev => [...prev, {
                    id: Date.now(),
                    message: data.text,
                    timestamp: data.timestamp,
                    type: data.type
                }]);
            });

            // ── Generic notification (DB-pushed via socket) ──────────────────────
            newSocket.on('notification', (notification) => {
                const icons = {
                    appointment: '📅',
                    payment: '💳',
                    system: '🔔',
                    reminder: '⏰',
                    promotion: '🎉',
                };
                const icon = icons[notification.type] || '🔔';
                toast(`${icon} ${notification.title}: ${notification.message}`, {
                    duration: 5000,
                });
                setNotifications(prev => [notification, ...prev]);
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
        </SocketContext.Provider>
    );
};
