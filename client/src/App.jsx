import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import Consult from './pages/Consult';
import LabTests from './pages/LabTests';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentVerification from './pages/PaymentVerification';
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './components/Chatbot';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ApplyDoctor from './pages/ApplyDoctor';
import axios from 'axios';

// Base API configuration
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
if (!apiBaseUrl && import.meta.env.PROD) {
  console.error('Missing VITE_API_URL in production environment.');
}
axios.defaults.baseURL = apiBaseUrl;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
              <Navbar />
              <main className="flex-grow pt-32 pb-12">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/doctors"
                    element={
                      <ProtectedRoute>
                        <Doctors />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctors/:id"
                    element={
                      <ProtectedRoute>
                        <DoctorDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/consult"
                    element={
                      <ProtectedRoute>
                        <Consult />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lab-tests"
                    element={
                      <ProtectedRoute>
                        <LabTests />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-verification" element={<PaymentVerification />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route 
                    path="/apply-doctor" 
                    element={
                      <ProtectedRoute>
                        <ApplyDoctor />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Unified Dashboard Route (Internal logic will handle role-based view) */}
                  <Route
                    path="/dashboard/*"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            <Chatbot />
            <Toaster position="top-right" reverseOrder={false} />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
