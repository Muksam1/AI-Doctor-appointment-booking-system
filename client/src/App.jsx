import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
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
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/doctors" element={<Doctors />} />
                  <Route path="/doctors/:id" element={<DoctorDetail />} />
                  <Route path="/consult" element={<Consult />} />
                  <Route path="/lab-tests" element={<LabTests />} />
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
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
