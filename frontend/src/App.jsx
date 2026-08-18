import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Approvals from './pages/Approvals';
import Expenses from './pages/Expenses';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import Employees from './pages/Employees';
import Tickets from './pages/Tickets';
import Permissions from './pages/Permissions';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

function ProtectedLayout({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-fullscreen">
                <div className="spinner"></div>
                <p>Loading MYGO Enterprise Portal...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="app-shell">
            <Navbar />
            <main className="main-content-container">
                {children}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
                    <Route path="/timesheet" element={<ProtectedLayout><Timesheet /></ProtectedLayout>} />
                    <Route path="/approvals" element={<ProtectedLayout><Approvals /></ProtectedLayout>} />
                    <Route path="/expenses" element={<ProtectedLayout><Expenses /></ProtectedLayout>} />
                    <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
                    <Route path="/clients" element={<ProtectedLayout><Clients /></ProtectedLayout>} />
                    <Route path="/employees" element={<ProtectedLayout><Employees /></ProtectedLayout>} />
                    <Route path="/tickets" element={<ProtectedLayout><Tickets /></ProtectedLayout>} />
                    <Route path="/permissions" element={<ProtectedLayout><Permissions /></ProtectedLayout>} />
                    <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
                    <Route path="/reports/timesheet" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
                    <Route path="/reports/expenses" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
