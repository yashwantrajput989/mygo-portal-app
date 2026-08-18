import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Clock, Check, CheckSquare, Briefcase, FolderOpen, 
    ChevronLeft, ChevronRight, Maximize2, Calendar, 
    Users, Bell, AlertCircle, FileText, DollarSign, Activity
} from 'lucide-react';
import WeatherCard from '../components/WeatherCard';

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedClient, setSelectedClient] = useState('All');
    const [selectedProject, setSelectedProject] = useState('All');

    // Calendar Month & Year State
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1); // 1-indexed

    const loadDashboardData = (year, month) => {
        setLoading(true);
        Promise.all([
            api.get(`/dashboard/stats?year=${year}&month=${month}`),
            api.get('/clients'),
            api.get('/projects')
        ])
        .then(([dashRes, clientRes, projRes]) => {
            if (dashRes.data.success) setData(dashRes.data);
            if (clientRes.data.success) setClients(clientRes.data.clients || []);
            if (projRes.data.success) setProjects(projRes.data.projects || []);
        })
        .catch(err => console.error('Dashboard load error:', err))
        .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadDashboardData(calYear, calMonth);
    }, [calYear, calMonth]);

    const handlePrevMonth = () => {
        if (calMonth === 1) {
            setCalYear(calYear - 1);
            setCalMonth(12);
        } else {
            setCalMonth(calMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (calMonth === 12) {
            setCalYear(calYear + 1);
            setCalMonth(1);
        } else {
            setCalMonth(calMonth + 1);
        }
    };

    const firstName = user?.fullName?.split(' ')[0] || 'Yash';
    const currentHour = new Date().getHours();
    let greeting = 'Good Evening';
    if (currentHour < 12) greeting = 'Good Morning';
    else if (currentHour < 17) greeting = 'Good Afternoon';

    const stats = data?.stats || {};
    const calendarDays = data?.calendarDays || [];
    const holidays = data?.holidays || [];
    const pendingApprovalsList = data?.pendingApprovals || [];
    const teamMembersList = data?.teamMembers || [];
    const feedList = data?.feed || [];

    const monthDisplay = data?.monthName || new Date(calYear, calMonth - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const leaveTypes = [
        { name: 'Sick Leave', used: 2, total: 10 },
        { name: 'Casual Leave', used: 1, total: 8 },
        { name: 'Personal Leave', used: 0, total: 4 },
        { name: 'Compensatory Leave', used: 0, total: 2 },
        { name: 'Paternity Leave', used: 0, total: 5 },
        { name: 'Bereavement Leave', used: 0, total: 3 }
    ];

    return (
        <div className="opsai-dashboard-container">
            {/* Top Hero Card with Greeting, 5 Overlapping Diamonds, and Weather Widget */}
            <div className="opsai-hero-card">
                <div className="hero-greeting-box">
                    <h1 className="hero-greeting-title">{greeting},</h1>
                    <h2 className="hero-greeting-name">{firstName}</h2>
                </div>

                {/* Center 5 Overlapping Diamonds */}
                <div className="hero-diamonds-container">
                    {/* Diamond 1: Hours */}
                    <div className="diamond-card diamond-green">
                        <div className="diamond-inner">
                            <Clock size={16} className="diamond-icon" />
                            <div className="diamond-label">HOURS</div>
                            <div className="diamond-val">{stats.totalHoursLogged || '0.0'}h</div>
                            <div className="diamond-sub">✓ This Week</div>
                        </div>
                    </div>

                    {/* Diamond 2: Attendance */}
                    <div className="diamond-card diamond-gold">
                        <div className="diamond-inner">
                            <Check size={16} className="diamond-icon" />
                            <div className="diamond-label">ATTENDANCE</div>
                            <div className="diamond-val">{stats.attendanceRate || '0'}%</div>
                            <div className="diamond-sub">✓ of This Month</div>
                        </div>
                    </div>

                    {/* Diamond 3: Approvals */}
                    <div className="diamond-card diamond-orange">
                        <div className="diamond-inner">
                            <CheckSquare size={16} className="diamond-icon" />
                            <div className="diamond-label">APPROVALS</div>
                            <div className="diamond-val">{stats.pendingApprovalsCount || '0'}</div>
                            <div className="diamond-sub">✓ Pending/Rejected</div>
                        </div>
                    </div>

                    {/* Diamond 4: Leave */}
                    <div className="diamond-card diamond-blue">
                        <div className="diamond-inner">
                            <Briefcase size={16} className="diamond-icon" />
                            <div className="diamond-label">LEAVE</div>
                            <div className="diamond-val">{stats.availableLeavesCount || '18'}d</div>
                            <div className="diamond-sub">✓ Available</div>
                        </div>
                    </div>

                    {/* Diamond 5: Projects */}
                    <div className="diamond-card diamond-slate">
                        <div className="diamond-inner">
                            <FolderOpen size={16} className="diamond-icon" />
                            <div className="diamond-label">PROJECTS</div>
                            <div className="diamond-val">{stats.activeProjectsCount || '0'}</div>
                            <div className="diamond-sub">✓ Active</div>
                        </div>
                    </div>
                </div>

                {/* Right: Weather Widget */}
                <div className="hero-weather-box">
                    <WeatherCard />
                </div>
            </div>

            {/* 6 Equal-Sized Grid Cards Layout (2 Rows of 3 Cards) */}
            <div className="opsai-cards-grid">
                {/* 1. Timesheet Attendance Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <h3 className="opsai-card-title">Timesheet Attendance</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="opsai-pill-badge pill-green">{stats.attendanceRate || 0}% PRESENT</span>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="calendar-month-nav">
                        <button type="button" className="cal-arrow-btn" onClick={handlePrevMonth} title="Previous Month">
                            <ChevronLeft size={14} />
                        </button>
                        <span className="cal-month-title">{monthDisplay}</span>
                        <button type="button" className="cal-arrow-btn" onClick={handleNextMonth} title="Next Month">
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="opsai-calendar-wrapper">
                        <div className="opsai-cal-grid-header">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(h => (
                                <div key={h} className="cal-th">{h}</div>
                            ))}
                        </div>
                        <div className="opsai-cal-grid-body">
                            {calendarDays.map((c, i) => {
                                if (c.isPadding) {
                                    return <div key={i} className="cal-td cal-td-empty" />;
                                }

                                // Color coding rules:
                                // 1. Saturday and Sunday are ALWAYS YELLOW
                                // 2. If user submitted/logged time for that day -> GREEN
                                // 3. Else -> WHITE
                                let cellClass = 'cal-td-white';
                                if (c.isWeekend) {
                                    cellClass = 'cal-td-yellow';
                                } else if (c.hasSubmitted || c.hours > 0) {
                                    cellClass = 'cal-td-green';
                                }

                                return (
                                    <div 
                                        key={i} 
                                        className={`cal-td ${cellClass} ${c.isToday ? 'current-day' : ''}`}
                                        title={c.date ? `${c.date}: ${c.hours}h logged` : ''}
                                    >
                                        {c.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. Upcoming Holidays Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <div>
                            <h3 className="opsai-card-title">Upcoming Holidays</h3>
                            <span className="opsai-card-subtitle">{calYear} Holiday Schedule</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button type="button" className="opsai-action-btn">Full calendar</button>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="holidays-list custom-scroll">
                        {holidays.map((h, idx) => (
                            <div key={idx} className="holiday-row-item">
                                <div className="holiday-date-badge">
                                    <span className="h-day">{h.date.split(' ')[0]}</span>
                                    <span className="h-month">{h.date.split(' ')[1] || 'Sep'}</span>
                                </div>
                                <div className="holiday-details">
                                    <div className="holiday-name">{h.name}</div>
                                    <div className="holiday-type">{h.type || 'Public Holiday'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Leave Balances Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <div>
                            <h3 className="opsai-card-title">Leave Balances</h3>
                            <span className="opsai-card-subtitle">18 Days Available</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button type="button" className="opsai-action-btn">History</button>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="leave-balance-list custom-scroll">
                        {leaveTypes.map((l, i) => (
                            <div key={i} className="leave-row-item">
                                <span className="leave-name">{l.name}</span>
                                <span className="leave-count" style={{ color: '#0f172a', fontWeight: 800 }}>{l.total - l.used} days</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Team & Availability Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <div>
                            <h3 className="opsai-card-title">Team & availability</h3>
                            <span className="opsai-card-subtitle">{teamMembersList.length} Active Members</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <NavLink to="/employees" className="opsai-action-btn" style={{ textDecoration: 'none' }}>View all</NavLink>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="team-filter-row" style={{ marginBottom: '8px' }}>
                        <div className="team-filter-group" style={{ flex: 1 }}>
                            <select 
                                value={selectedProject} 
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="team-filter-select"
                                style={{ width: '100%', fontSize: '11px', padding: '4px 8px' }}
                            >
                                <option value="All">All Assigned Projects ({projects.length})</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {teamMembersList.length === 0 ? (
                            <div className="opsai-empty-state"><p>No team members found.</p></div>
                        ) : (
                            teamMembersList.slice(0, 5).map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                                            {m.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{m.title}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '99px' }}>Active</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 5. Pending / Rejected Approvals Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <div>
                            <h3 className="opsai-card-title">Pending / Rejected Approvals</h3>
                            <span className="opsai-card-subtitle">{pendingApprovalsList.length} Items for My ID</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <NavLink to="/approvals" className="opsai-action-btn" style={{ textDecoration: 'none' }}>All</NavLink>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {pendingApprovalsList.length === 0 ? (
                            <div className="opsai-empty-state"><p>No pending approvals found.</p></div>
                        ) : (
                            pendingApprovalsList.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {item.type === 'Timesheet' ? <Clock size={13} style={{ color: '#ff682c' }} /> : <DollarSign size={13} style={{ color: '#16a34a' }} />}
                                        <div>
                                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{item.subtitle}</div>
                                        </div>
                                    </div>
                                    <span className={`opsai-status-pill ${item.status === 'Approved' ? 'approved' : (item.status === 'Rejected' ? 'rejected' : 'pending')}`} style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                                        {item.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 6. Feed Card */}
                <div className="opsai-card equal-card">
                    <div className="opsai-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 className="opsai-card-title">Live Activity Feed</h3>
                            <span className="opsai-pill-badge pill-green">{feedList.length} updates</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button type="button" className="opsai-action-btn">Audit</button>
                            <button type="button" className="opsai-icon-btn"><Maximize2 size={13} /></button>
                        </div>
                    </div>

                    <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {feedList.length === 0 ? (
                            <div className="opsai-empty-state"><p>No activity logs found.</p></div>
                        ) : (
                            feedList.map((f) => (
                                <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <Activity size={12} style={{ color: '#ff682c', marginTop: '2px', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#0f172a' }}>
                                            <strong>{f.user}</strong> {f.action.toLowerCase()}
                                        </div>
                                        <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                                            {f.project} • {f.date ? new Date(f.date).toLocaleDateString() : 'Recent'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
