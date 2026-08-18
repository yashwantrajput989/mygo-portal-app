import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Users, UserCheck, Search, Filter, Mail, Phone, MapPin, 
    Briefcase, Shield, User, Award, CheckCircle, AlertCircle, 
    Building2, LayoutGrid, LayoutList, Eye, Globe, Sparkles
} from 'lucide-react';

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [selectedEmp, setSelectedEmp] = useState(null);

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
            (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.coe || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    const activeCount = employees.filter(e => e.isActive !== false).length;
    const coeSet = new Set(employees.map(e => e.coe).filter(Boolean));

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Enterprise Employee Directory</h1>
                    <p className="opsai-page-desc">Browse organizational rosters, SAP practice COEs, technical skills, and reporting hierarchies.</p>
                </div>
            </div>

            {/* 4 Metric KPI Cards Row */}
            <div className="opsai-kpi-row-4">
                <div className="ts-kpi-card ts-kpi-orange-top">
                    <div className="ts-kpi-icon-box orange">
                        <Users size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">TOTAL EMPLOYEES</div>
                        <div className="ts-kpi-val">{employees.length}</div>
                        <div className="ts-kpi-sub">registered in portal</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <UserCheck size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">ACTIVE CONSULTANTS</div>
                        <div className="ts-kpi-val">{activeCount}</div>
                        <div className="ts-kpi-sub">currently engaged</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <Award size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">PRACTICE COES</div>
                        <div className="ts-kpi-val">{coeSet.size || 8}</div>
                        <div className="ts-kpi-sub">Centers of Excellence</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box dark">
                        <Building2 size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">DEPARTMENTS</div>
                        <div className="ts-kpi-val">{departments.length}</div>
                        <div className="ts-kpi-sub">business units</div>
                    </div>
                </div>
            </div>

            {/* Table / Grid Controls Card */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row">
                    <div className="opsai-tab-pill-group">
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={14} /> Grid Cards ({filtered.length})
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            <LayoutList size={14} /> Directory Table
                        </button>
                    </div>

                    <div className="opsai-filter-group">
                        <div className="opsai-search-box">
                            <Search size={14} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search by name, email, role, COE, location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="opsai-search-input"
                                style={{ width: '280px' }}
                            />
                        </div>

                        <select 
                            value={selectedDept} 
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="opsai-status-select"
                        >
                            <option value="All">All Departments ({departments.length})</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading employee roster...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <Users size={36} style={{ color: '#ff682c', margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '15px', fontWeight: 800 }}>No Employees Found</h3>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria or clearing department filters.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid Cards View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {filtered.map((emp) => {
                            const initial = emp.name ? emp.name.charAt(0).toUpperCase() : 'E';

                            return (
                                <div key={emp.id} className="opsai-project-card" style={{ padding: '18px', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #ff682c 0%, #ea580c 100%)',
                                            color: '#ffffff',
                                            fontSize: '18px',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 2px 8px rgba(255, 104, 44, 0.3)'
                                        }}>
                                            {initial}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {emp.name}
                                                </h3>
                                                <span className="opsai-id-badge">{emp.employeeCode}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#ff682c', fontWeight: 700, marginTop: '2px' }}>
                                                {emp.designation || 'Consultant'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', color: '#475569' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Building2 size={12} style={{ color: '#64748b' }} />
                                            <span>Dept: <strong>{emp.department || 'SAP Practice'}</strong></span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Award size={12} style={{ color: '#ff682c' }} />
                                            <span>COE: <strong>{emp.coe || 'Technical Delivery'}</strong></span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={12} style={{ color: '#0284c7' }} />
                                            <span>{emp.location || 'Hyderabad, India'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                        <div style={{ fontSize: '11.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                            <Mail size={11} style={{ display: 'inline', marginRight: '4px' }} />
                                            {emp.email}
                                        </div>
                                        <button 
                                            type="button" 
                                            className="opsai-action-btn"
                                            onClick={() => setSelectedEmp(emp)}
                                        >
                                            <Eye size={12} style={{ marginRight: '4px' }} /> View
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Directory Table View */
                    <div className="ts-table-responsive">
                        <table className="opsai-table">
                            <thead>
                                <tr>
                                    <th>EMPLOYEE & ID</th>
                                    <th>DESIGNATION & ROLE</th>
                                    <th>DEPARTMENT & COE</th>
                                    <th>LOCATION</th>
                                    <th>CONTACT EMAIL</th>
                                    <th style={{ textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((emp) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                                            <span className="opsai-id-badge">{emp.employeeCode}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#ff682c' }}>{emp.designation || 'Consultant'}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.employmentType || 'Full Time'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#334155' }}>{emp.department || 'SAP Practice'}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>COE: {emp.coe || 'Technical'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: '#475569' }}>{emp.location || 'Hyderabad'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: '#0284c7' }}>{emp.email}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.mobile || '—'}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                type="button" 
                                                className="opsai-action-btn"
                                                onClick={() => setSelectedEmp(emp)}
                                            >
                                                <Eye size={12} style={{ marginRight: '4px' }} /> Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Employee Quick View Modal */}
            {selectedEmp && (
                <div className="modal-backdrop" onClick={() => setSelectedEmp(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                        <div className="modal-header">
                            <div>
                                <span className="opsai-id-badge">{selectedEmp.employeeCode}</span>
                                <h3 className="modal-title" style={{ marginTop: '4px' }}>{selectedEmp.name}</h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setSelectedEmp(null)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0' }}>
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>DESIGNATION</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedEmp.designation || 'Consultant'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>DEPARTMENT</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedEmp.department || 'SAP Practice'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>PRACTICE COE</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ff682c', marginTop: '2px' }}>{selectedEmp.coe || 'Technical'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>LOCATION</div>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedEmp.location || 'Hyderabad, India'}</div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>CONTACT INFORMATION</div>
                            <div style={{ fontSize: '12.5px', color: '#334155' }}>
                                <Mail size={13} style={{ display: 'inline', marginRight: '6px' }} /> {selectedEmp.email}
                            </div>
                            {selectedEmp.mobile && (
                                <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px' }}>
                                    <Phone size={13} style={{ display: 'inline', marginRight: '6px' }} /> {selectedEmp.mobile}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="secondary-btn" onClick={() => setSelectedEmp(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
