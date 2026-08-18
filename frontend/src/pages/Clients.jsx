import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Users, Plus, Mail, Phone, Globe, FolderOpen, 
    CheckCircle, AlertCircle, Building2, Star
} from 'lucide-react';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [form, setForm] = useState({
        clientName: '',
        clientCode: '',
        contactPerson: '',
        contactEmail: '',
        phone: '',
        country: 'India',
        industry: 'Enterprise IT',
        billingType: 'Monthly'
    });

    const loadClients = () => {
        setLoading(true);
        api.get('/clients')
            .then(res => {
                if (res.data.success) {
                    setClients(res.data.clients || []);
                }
            })
            .catch(err => {
                console.error('Clients load error:', err);
                setMessage({ type: 'error', text: 'Failed to load client directory.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleCreateClient = (e) => {
        e.preventDefault();
        api.post('/clients/create', form)
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: 'Client company registered successfully!' });
                    setCreateModal(false);
                    setForm({
                        clientName: '',
                        clientCode: '',
                        contactPerson: '',
                        contactEmail: '',
                        phone: '',
                        country: 'India',
                        industry: 'Enterprise IT',
                        billingType: 'Monthly'
                    });
                    loadClients();
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to register client.' });
            });
    };

    return (
        <div className="clients-page">
            <div className="page-header">
                <div className="page-title-group">
                    <h1>Enterprise Clients & Accounts</h1>
                    <p className="page-subtitle">Manage client profiles, account managers, contract terms, billing schedules, and active project engagements.</p>
                </div>
                <button type="button" className="primary-btn" onClick={() => setCreateModal(true)}>
                    <Plus size={15} /> Add New Client
                </button>
            </div>

            {message.text && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '18px',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading client registry...</p>
                </div>
            ) : clients.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <Building2 size={36} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 800 }}>No Clients Registered</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Click "Add New Client" to set up your first customer account.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {clients.map((c) => (
                        <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <span className="badge badge-info" style={{ fontSize: '11px', marginBottom: '6px' }}>{c.clientCode}</span>
                                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>{c.clientName}</h3>
                                    </div>
                                    <span className="badge badge-purple">{c.industry}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', margin: '14px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={14} style={{ color: 'var(--primary)' }} />
                                        <span>Contact: <strong>{c.contactPerson}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Mail size={14} style={{ color: 'var(--info)' }} />
                                        <span>{c.contactEmail}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={14} style={{ color: 'var(--success)' }} />
                                        <span>{c.phone}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span>{c.country}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Billing: <strong>{c.billingType}</strong>
                                </span>
                                <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                                    <FolderOpen size={12} style={{ marginRight: '4px' }} /> {c.activeProjectsCount} Projects
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Client Modal */}
            {createModal && (
                <div className="modal-backdrop" onClick={() => setCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Register New Client Account</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateClient}>
                            <div className="form-group">
                                <label className="form-label">Client Company Name *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={form.clientName}
                                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                    placeholder="E.g., Global SAP Enterprise Solutions"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label">Client Code</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.clientCode}
                                        onChange={(e) => setForm({ ...form, clientCode: e.target.value })}
                                        placeholder="E.g., CL-009"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Industry / Sector</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.industry}
                                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                        placeholder="E.g., Manufacturing, Banking, IT"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label">Key Contact Person</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.contactPerson}
                                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                                        placeholder="Primary contact name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Email</label>
                                    <input 
                                        type="email" 
                                        className="form-input" 
                                        value={form.contactEmail}
                                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                                        placeholder="client.contact@company.com"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+1 555-0199"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Country / Region</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.country}
                                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                                        placeholder="E.g., USA, Germany, India"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="secondary-btn" onClick={() => setCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary-btn">
                                    Register Client
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
