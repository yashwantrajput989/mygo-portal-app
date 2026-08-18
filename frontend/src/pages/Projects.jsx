import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    FolderOpen, Plus, Users, Calendar, Clock, 
    CheckCircle, AlertCircle, Search, Filter, Briefcase, 
    BarChart2, ArrowUpRight
} from 'lucide-react';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [createModal, setCreateModal] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [form, setForm] = useState({
        name: '',
        code: '',
        clientId: '',
        description: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        plannedHours: 160,
        status: 'In Progress'
    });

    const loadProjectsData = () => {
        setLoading(true);
        api.get('/projects')
            .then(res => {
                if (res.data.success) {
                    setProjects(res.data.projects || []);
                    setClients(res.data.clients || []);
                    if (res.data.clients?.length > 0 && !form.clientId) {
                        setForm(f => ({ ...f, clientId: res.data.clients[0].Id }));
                    }
                }
            })
            .catch(err => {
                console.error('Projects load error:', err);
                setMessage({ type: 'error', text: 'Failed to load project database.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadProjectsData();
    }, []);

    const handleCreateProject = (e) => {
        e.preventDefault();
        api.post('/projects/create', form)
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: 'Project created successfully!' });
                    setCreateModal(false);
                    setForm({
                        name: '',
                        code: '',
                        clientId: clients[0]?.Id || '',
                        description: '',
                        startDate: new Date().toISOString().slice(0, 10),
                        endDate: '',
                        plannedHours: 160,
                        status: 'In Progress'
                    });
                    loadProjectsData();
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create project.' });
            });
    };

    const totalPlanned = projects.reduce((s, p) => s + (Number(p.plannedHours) || 0), 0);
    const totalActual = projects.reduce((s, p) => s + (Number(p.actualHours) || 0), 0);
    const activeCount = projects.filter(p => p.status === 'In Progress' || p.status === 'Active').length;

    const filteredProjects = projects.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchClient = clientFilter === 'All' || p.clientName === clientFilter;
        const matchStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchSearch && matchClient && matchStatus;
    });

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Enterprise Project Portfolio</h1>
                    <p className="opsai-page-desc">Track active client engagements, resource allocation matrices, delivery timelines, and budget utilization.</p>
                </div>
                <button type="button" className="ts-action-solid-btn" onClick={() => setCreateModal(true)}>
                    <Plus size={16} /> Create Project
                </button>
            </div>

            {/* Notification alert */}
            {message.text && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: message.type === 'success' ? '#15803d' : '#b91c1c',
                    border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
                }}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* 4 Metric KPI Cards Row */}
            <div className="opsai-kpi-row-4">
                <div className="ts-kpi-card ts-kpi-orange-top">
                    <div className="ts-kpi-icon-box orange">
                        <FolderOpen size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">ACTIVE ENGAGEMENTS</div>
                        <div className="ts-kpi-val">{activeCount}</div>
                        <div className="ts-kpi-sub">of {projects.length} total projects</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <Clock size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">TOTAL PLANNED HOURS</div>
                        <div className="ts-kpi-val">{totalPlanned.toLocaleString()} hrs</div>
                        <div className="ts-kpi-sub">contract capacity</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <BarChart2 size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">LOGGED ACTUAL HOURS</div>
                        <div className="ts-kpi-val">{totalActual.toLocaleString()} hrs</div>
                        <div className="ts-kpi-sub">from team timesheets</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box dark">
                        <Users size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">CLIENT ACCOUNTS</div>
                        <div className="ts-kpi-val">{clients.length}</div>
                        <div className="ts-kpi-sub">active enterprise clients</div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="opsai-table-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="opsai-search-box" style={{ flex: 1, minWidth: '240px' }}>
                        <Search size={14} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search projects by name, code, client company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="opsai-search-input"
                        />
                    </div>

                    <select 
                        value={clientFilter} 
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="opsai-status-select"
                    >
                        <option value="All">All Clients ({clients.length})</option>
                        {clients.map(c => (
                            <option key={c.Id} value={c.ClientName}>{c.ClientName}</option>
                        ))}
                    </select>

                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="opsai-status-select"
                    >
                        <option value="All">All Statuses</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Active">Active</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="opsai-table-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: '#64748b', fontWeight: 600 }}>Loading project portfolio...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="opsai-table-card" style={{ textAlign: 'center', padding: '48px' }}>
                    <FolderOpen size={36} style={{ color: '#ff682c', margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 800 }}>No Matching Projects Found</h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria or create a new project.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
                    {filteredProjects.map((p) => {
                        const sDate = p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A';
                        const eDate = p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing';
                        const progressPct = p.plannedHours > 0 ? Math.min(100, Math.round((p.actualHours / p.plannedHours) * 100)) : 0;

                        return (
                            <div key={p.id} className="opsai-project-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div>
                                        <span className="opsai-id-badge" style={{ marginBottom: '4px', display: 'inline-block' }}>{p.code || `PRJ-${p.id}`}</span>
                                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{p.name}</h3>
                                    </div>
                                    <span className="opsai-status-pill approved">{p.status || 'Active'}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', margin: '8px 0 12px' }}>
                                    <Briefcase size={13} style={{ color: '#ff682c' }} />
                                    <span>Client: <strong style={{ color: '#0f172a' }}>{p.clientName}</strong></span>
                                </div>

                                {p.description && (
                                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, marginBottom: '14px' }}>
                                        {p.description}
                                    </p>
                                )}

                                {/* Progress Bar */}
                                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px' }}>
                                        <span style={{ color: '#0f172a' }}>Logged: {p.actualHours} hrs</span>
                                        <span style={{ color: '#64748b' }}>Planned: {p.plannedHours} hrs</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #ff682c 0%, #ff8957 100%)', borderRadius: '99px' }} />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94a3b8' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={12} /> {sDate} – {eDate}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#334155' }}>
                                        <Users size={12} /> {p.team?.length || 0} Members
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Project Modal */}
            {createModal && (
                <div className="modal-backdrop" onClick={() => setCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create New Project Engagement</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateProject}>
                            <div className="form-group">
                                <label className="form-label">Project Name *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="E.g., S/4HANA Finance Cloud Migration"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Project Code</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        placeholder="E.g., MYG-SAP-01"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Client Company *</label>
                                    <select 
                                        className="form-select"
                                        value={form.clientId}
                                        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    >
                                        {clients.map(c => (
                                            <option key={c.Id} value={c.Id}>{c.ClientName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Start Date *</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        required 
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Planned Hours</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.plannedHours}
                                        onChange={(e) => setForm({ ...form, plannedHours: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Scope Description</label>
                                <textarea 
                                    className="form-textarea" 
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Key deliverables, SAP COEs involved..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="secondary-btn" onClick={() => setCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="ts-action-solid-btn">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
