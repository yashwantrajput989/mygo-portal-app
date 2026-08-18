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

function RoleGuard({ children, allowAdmin, allowManager, allowHR }) {
    const { isAdmin, isManager, isHR, loading } = useAuth();

    if (loading) return null;

    const hasAccess = 
        (allowAdmin && isAdmin) ||
        (allowManager && (isManager || isAdmin)) ||
        (allowHR && (isHR || isAdmin));

    if (!hasAccess) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* All Users Accessible Routes */}
                    <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
                    <Route path="/timesheet" element={<ProtectedLayout><Timesheet /></ProtectedLayout>} />
                    <Route path="/expenses" element={<ProtectedLayout><Expenses /></ProtectedLayout>} />
                    <Route path="/tickets" element={<ProtectedLayout><Tickets /></ProtectedLayout>} />
                    <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />

                    {/* Manager & Admin Routes */}
                    <Route path="/projects" element={
                        <ProtectedLayout>
                            <RoleGuard allowManager={true}>
                                <Projects />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />
                    <Route path="/approvals" element={
                        <ProtectedLayout>
                            <RoleGuard allowManager={true}>
                                <Approvals />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />

                    {/* Manager, HR & Admin Routes */}
                    <Route path="/employees" element={
                        <ProtectedLayout>
                            <RoleGuard allowManager={true} allowHR={true}>
                                <Employees />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />
                    <Route path="/reports/timesheet" element={
                        <ProtectedLayout>
                            <RoleGuard allowManager={true} allowHR={true}>
                                <Reports />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />
                    <Route path="/reports/expenses" element={
                        <ProtectedLayout>
                            <RoleGuard allowManager={true} allowHR={true}>
                                <Reports />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />

                    {/* Admin Only Routes */}
                    <Route path="/clients" element={
                        <ProtectedLayout>
                            <RoleGuard allowAdmin={true}>
                                <Clients />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />
                    <Route path="/permissions" element={
                        <ProtectedLayout>
                            <RoleGuard allowAdmin={true}>
                                <Permissions />
                            </RoleGuard>
                        </ProtectedLayout>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
