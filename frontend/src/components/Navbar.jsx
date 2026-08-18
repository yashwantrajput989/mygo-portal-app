import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Home, Clock, DollarSign, Ticket, FolderOpen, 
    Users, User, CheckSquare, Shield, BarChart2, LogOut, ChevronDown
} from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

    return (
        <header className="opsai-navbar-header">
            <div className="opsai-navbar-container">
                {/* Brand Logo & Tagline */}
                <div className="opsai-brand-group">
                    <NavLink to="/dashboard" className="opsai-brand-link">
                        <img 
                            src="/logo.png" 
                            alt="MY OpsAI" 
                            className="opsai-brand-logo" 
                            onError={(e) => { e.target.src = '/final3.png'; }} 
                        />
                        <div className="opsai-brand-title-wrap">
                            <span className="opsai-brand-title">
                                <span style={{ color: '#0f172a' }}>MY</span> <span style={{ color: '#0284c7' }}>OpsAI</span>
                            </span>
                            <span className="opsai-brand-subtitle">Operations Simplified</span>
                        </div>
                    </NavLink>
                </div>

                {/* Primary Nav Tabs */}
                <nav className="opsai-nav-tabs">
                    <NavLink 
                        to="/dashboard" 
                        className={({ isActive }) => `opsai-nav-tab ${isActive ? 'active' : ''}`}
                    >
                        <Home size={16} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink 
                        to="/timesheet" 
                        className={({ isActive }) => `opsai-nav-tab ${isActive ? 'active' : ''}`}
                    >
                        <Clock size={16} />
                        <span>TimeSheet</span>
                    </NavLink>

                    <NavLink 
                        to="/expenses" 
                        className={({ isActive }) => `opsai-nav-tab ${isActive ? 'active' : ''}`}
                    >
                        <DollarSign size={16} />
                        <span>Expenses</span>
                    </NavLink>

                    <NavLink 
                        to="/tickets" 
                        className={({ isActive }) => `opsai-nav-tab ${isActive ? 'active' : ''}`}
                    >
                        <Ticket size={16} />
                        <span>Tickets</span>
                    </NavLink>

                    <NavLink 
                        to="/projects" 
                        className={({ isActive }) => `opsai-nav-tab secondary-tab ${isActive ? 'active' : ''}`}
                    >
                        <FolderOpen size={16} />
                        <span>Projects</span>
                    </NavLink>

                    <NavLink 
                        to="/approvals" 
                        className={({ isActive }) => `opsai-nav-tab secondary-tab ${isActive ? 'active' : ''}`}
                    >
                        <CheckSquare size={16} />
                        <span>Approvals</span>
                    </NavLink>
                </nav>

                {/* Right Profile & Active Dot */}
                <div className="opsai-profile-group">
                    <div style={{ position: 'relative' }}>
                        <button 
                            type="button" 
                            className="opsai-avatar-btn"
                            onClick={() => setProfileOpen(!profileOpen)}
                            title={user?.fullName || 'User Profile'}
                        >
                            <div className="opsai-avatar-circle">
                                {user?.profileImage ? (
                                    <img src={user.profileImage} alt={user.fullName} />
                                ) : (
                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#ff682c' }}>{userInitial}</span>
                                )}
                                <span className="opsai-online-dot" />
                            </div>
                        </button>

                        {profileOpen && (
                            <div className="profile-dropdown-menu" style={{ right: 0, top: '46px', width: '220px' }}>
                                <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>{user?.fullName}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                </div>
                                <NavLink to="/employees" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                                    <Users size={14} /> Employee Directory
                                </NavLink>
                                <NavLink to="/reports/timesheet" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                                    <BarChart2 size={14} /> Reports & Analytics
                                </NavLink>
                                <NavLink to="/permissions" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                                    <Shield size={14} /> Roles & Permissions
                                </NavLink>
                                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                                <NavLink to="/profile" className="dropdown-item" onClick={() => setProfileOpen(false)} style={{ color: '#ff682c', fontWeight: 700 }}>
                                    <User size={14} /> Edit Profile
                                </NavLink>
                                <button type="button" className="dropdown-item danger" onClick={handleSignOut}>
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
