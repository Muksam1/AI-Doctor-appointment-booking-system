import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PatientDashboard from '../components/Dashboard/PatientDashboard';
import DoctorDashboard from '../components/Dashboard/DoctorDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';

const Dashboard = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-fade-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tighter">Welcome back, {user.name}</h1>
                    <p className="text-healsync-grey font-medium uppercase text-[10px] tracking-[0.2em]">
                        {user.role} Dashboard
                    </p>
                </div>
            </header>

            <div className="w-full">
                {user.role === 'patient' && mode !== 'doctor' && <PatientDashboard />}
                {(user.role === 'doctor' || (user.role === 'patient' && mode === 'doctor')) && <DoctorDashboard />}
                {user.role === 'admin' && <AdminDashboard />}
            </div>
        </div>
    );
};

export default Dashboard;
