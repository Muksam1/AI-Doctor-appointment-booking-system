import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('userInfo');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;

            // Always sync latest role from server (fixes stale role after admin approval)
            axios.get('/api/auth/profile')
                .then(({ data }) => {
                    if (data.role !== parsedUser.role) {
                        // Role changed (e.g., patient promoted to doctor by admin)
                        const refreshedUser = { ...parsedUser, role: data.role, name: data.name, image: data.image };
                        setUser(refreshedUser);
                        sessionStorage.setItem('userInfo', JSON.stringify(refreshedUser));
                    }
                })
                .catch(() => {
                    // Token may be expired — silently ignore, user can re-login
                });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await axios.post('/api/auth/login', { email, password });
        setUser(data);
        sessionStorage.setItem('userInfo', JSON.stringify(data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    };

    const logout = () => {
        sessionStorage.removeItem('userInfo');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
