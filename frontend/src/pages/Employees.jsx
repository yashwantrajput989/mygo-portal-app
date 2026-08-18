import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    UserCheck, Search, Filter, Mail, Phone, MapPin, 
    Briefcase, Shield, User, Award, CheckCircle, AlertCircle
} from 'lucide-react';

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');

    useEffect(() => {
        setLoading(true);
        api.get('/employees')
            .then(res => {
                if (res.data.success) {
                    setEmployees(res.data.employees || []);
                    setDepartments(res.data.departments || []);
                }
            })
            .catch(err => console.error('Employees load error:', err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = employees.filter(emp => {
        const matchesSearch = 
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.designation.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="employees-page">
            <div className="page-header">
                <div className="page-title-group">
                    <h1>Employee Directory & Team Profiles</h1>
                    <p className="page-subtitle">Browse organizational roster, reporting structures, SAP practice COEs, and skill allocations.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '38px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search employees by name, email, code, or designation..."
                    />
                </div>

                <select 
                    className="form-select" 
                    style={{ width: '220px' }}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                >
                    <option value="All">All Departments ({employees.length})</option>
                    {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading employee roster ({employees.length} records)...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <UserCheck size={36} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 800 }}>No Employees Found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Try clearing your search or selecting a different department filter.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {filtered.slice(0, 60).map((emp) => (
                        <div key={emp.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                    <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '18px', flexShrink: 0 }}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>{emp.name}</div>
                                        <div style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: 700 }}>{emp.designation}</div>
                                        <span className="badge badge-neutral" style={{ fontSize: '10.5px', marginTop: '4px' }}>{emp.employeeCode}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)', margin: '12px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Briefcase size={13} style={{ color: 'var(--text-muted)' }} />
                                        <span>Dept: <strong>{emp.department}</strong> ({emp.coe})</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                                        <span>Location: <strong>{emp.workLocation}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                <span className={`badge ${emp.billability === 'Billable' ? 'badge-success' : 'badge-neutral'}`}>
                                    {emp.billability}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Manager: {emp.reportingManager}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
