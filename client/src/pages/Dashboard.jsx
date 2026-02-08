import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PatientDashboard from '../components/Dashboard/PatientDashboard';
import DoctorDashboard from '../components/Dashboard/DoctorDashboard';
import AdminDashboard from '../components/Dashboard/AdminDashboard';

const Dashboard = () => {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.name}</h1>
                    <p className="text-slate-500 uppercase text-xs tracking-widest font-bold mt-1">
                        {user.role} Dashboard
                    </p>
                </div>
            </header>

            {user.role === 'patient' && <PatientDashboard />}
            {user.role === 'doctor' && <DoctorDashboard />}
            {user.role === 'admin' && <AdminDashboard />}
        </div>
    );
};

export default Dashboard;
