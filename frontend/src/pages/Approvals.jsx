import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    CheckCircle, XCircle, Clock, DollarSign, FileText, 
    ChevronRight, AlertCircle, Eye, User, Calendar, 
    Paperclip, CheckSquare, MessageSquare, Filter, Search
} from 'lucide-react';

export default function Approvals() {
    const [activeTab, setActiveTab] = useState('timesheets');
    const [timesheets, setTimesheets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState({ open: false, type: '', id: null, action: '', remarks: '' });
    const [inspectTsModal, setInspectTsModal] = useState({ open: false, item: null });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const loadApprovalsData = () => {
        setLoading(true);
        Promise.all([
            api.get('/approvals/timesheets'),
            api.get('/approvals/expenses')
        ])
        .then(([tsRes, expRes]) => {
            if (tsRes.data.success) setTimesheets(tsRes.data.timesheets || []);
            if (expRes.data.success) setExpenses(expRes.data.expenses || []);
        })
        .catch(err => {
            console.error('Approvals load error:', err);
            setMessage({ type: 'error', text: 'Failed to load pending approval items.' });
        })
        .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadApprovalsData();
    }, []);

    const handleActionSubmit = () => {
        const { type, id, action, remarks } = actionModal;
        const endpoint = type === 'timesheets' 
            ? `/approvals/timesheets/${id}/action`
            : `/approvals/expenses/${id}/action`;

        api.post(endpoint, { action, remarks })
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: res.data.message });
                    setActionModal({ open: false, type: '', id: null, action: '', remarks: '' });
                    loadApprovalsData();
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
            });
    };

    const totalHoursPending = timesheets.reduce((s, t) => s + (Number(t.actualHoursTotal) || 0), 0);
    const totalExpPending = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const filteredTimesheets = timesheets.filter(t => {
        return t.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               t.employeeEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               t.projectNames?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const filteredExpenses = expenses.filter(e => {
        return e.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               e.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               e.expenseNo?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Executive Authorization & Approval Hub</h1>
                    <p className="opsai-page-desc">Review, audit, and approve weekly team timesheets and employee reimbursement claims.</p>
                </div>
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
                        <Clock size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">TIMESHEET SUBMISSIONS</div>
                        <div className="ts-kpi-val">{timesheets.length}</div>
                        <div className="ts-kpi-sub">awaiting sign-off</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <DollarSign size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">EXPENSE CLAIMS</div>
                        <div className="ts-kpi-val">{expenses.length}</div>
                        <div className="ts-kpi-sub">awaiting audit</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <Calendar size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">HOURS PENDING AUDIT</div>
                        <div className="ts-kpi-val">{totalHoursPending.toFixed(1)} hrs</div>
                        <div className="ts-kpi-sub">across team members</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box dark">
                        <CheckSquare size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">CLAIM VALUE PENDING</div>
                        <div className="ts-kpi-val">${totalExpPending.toLocaleString()}</div>
                        <div className="ts-kpi-sub">reimbursements</div>
                    </div>
                </div>
            </div>

            {/* Approvals Table Card */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row">
                    <div className="opsai-tab-pill-group">
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'timesheets' ? 'active' : ''}`}
                            onClick={() => setActiveTab('timesheets')}
                        >
                            <Clock size={14} /> Timesheets ({timesheets.length})
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'expenses' ? 'active' : ''}`}
                            onClick={() => setActiveTab('expenses')}
                        >
                            <DollarSign size={14} /> Expenses ({expenses.length})
                        </button>
                    </div>

                    <div className="opsai-filter-group">
                        <div className="opsai-search-box">
                            <Search size={14} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search by employee, project, claim..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="opsai-search-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Tab 1: Timesheets Approvals */}
                {activeTab === 'timesheets' && (
                    <div className="ts-table-responsive">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading timesheet approval queue...</p>
                            </div>
                        ) : filteredTimesheets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px' }}>
                                <CheckCircle size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>All Timesheets Approved</h3>
                                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>There are no pending timesheets in your approval queue.</p>
                            </div>
                        ) : (
                            <table className="opsai-table">
                                <thead>
                                    <tr>
                                        <th>EMPLOYEE</th>
                                        <th>PERIOD DATES</th>
                                        <th>PROJECT ALLOCATIONS</th>
                                        <th style={{ textAlign: 'right' }}>TOTAL LOGGED</th>
                                        <th style={{ textAlign: 'center' }}>BREAKDOWN</th>
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTimesheets.map((ts) => {
                                        const pStart = new Date(ts.periodStart).toLocaleDateString();
                                        const pEnd = new Date(ts.periodEnd).toLocaleDateString();

                                        return (
                                            <tr key={ts.id}>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{ts.employeeName}</div>
                                                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{ts.employeeEmail}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: '#334155' }}>{pStart} – {pEnd}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submitted {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : 'Recently'}</div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {ts.projectNames && ts.projectNames.length > 0 ? (
                                                            ts.projectNames.map((pName, i) => (
                                                                <span key={i} className="opsai-cat-pill" style={{ background: '#f1f5f9', color: '#334155' }}>{pName}</span>
                                                            ))
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>General Work</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '15px' }}>
                                                    {ts.actualHoursTotal} hrs
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-icon-btn"
                                                        style={{ width: '28px', height: '28px', margin: '0 auto' }}
                                                        onClick={() => setInspectTsModal({ open: true, item: ts })}
                                                        title="Inspect Timesheet Details"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button 
                                                            type="button" 
                                                            className="opsai-btn-sm danger"
                                                            onClick={() => setActionModal({ open: true, type: 'timesheets', id: ts.id, action: 'Reject', remarks: '' })}
                                                        >
                                                            <XCircle size={13} /> Reject
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="opsai-btn-sm success"
                                                            onClick={() => setActionModal({ open: true, type: 'timesheets', id: ts.id, action: 'Approve', remarks: '' })}
                                                        >
                                                            <CheckCircle size={13} /> Approve
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab 2: Expenses Approvals */}
                {activeTab === 'expenses' && (
                    <div className="ts-table-responsive">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading expense claims queue...</p>
                            </div>
                        ) : filteredExpenses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px' }}>
                                <CheckCircle size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>All Expenses Cleared</h3>
                                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>There are no pending employee expense claims to audit.</p>
                            </div>
                        ) : (
                            <table className="opsai-table">
                                <thead>
                                    <tr>
                                        <th>CLAIM & EMPLOYEE</th>
                                        <th>PROJECT ALLOCATION</th>
                                        <th>DATE & VENDOR</th>
                                        <th style={{ textAlign: 'right' }}>AMOUNT</th>
                                        <th style={{ textAlign: 'center' }}>RECEIPT</th>
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((exp) => (
                                        <tr key={exp.id}>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{exp.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>By <strong style={{ color: '#0f172a' }}>{exp.employeeName}</strong> • {exp.expenseNo}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#334155' }}>{exp.projectName}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.projectCode || 'General'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#334155' }}>{new Date(exp.expenseDate).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.vendor || 'Merchant'}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '15px' }}>
                                                {exp.currencySymbol} {Number(exp.amount).toLocaleString()}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {exp.attachments && exp.attachments.length > 0 ? (
                                                    <a 
                                                        href={`http://localhost:5000/api/expenses/attachments/${exp.attachments[0].AttachmentId || exp.attachments[0].id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="ts-cell-icon-btn orange"
                                                    >
                                                        <Paperclip size={14} />
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm danger"
                                                        onClick={() => setActionModal({ open: true, type: 'expenses', id: exp.id, action: 'Reject', remarks: '' })}
                                                    >
                                                        <XCircle size={13} /> Reject
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm success"
                                                        onClick={() => setActionModal({ open: true, type: 'expenses', id: exp.id, action: 'Approve', remarks: '' })}
                                                    >
                                                        <CheckCircle size={13} /> Approve
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Modal 1: Confirmation & Remarks */}
            {actionModal.open && (
                <div className="modal-backdrop" onClick={() => setActionModal({ open: false, type: '', id: null, action: '', remarks: '' })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm {actionModal.action}</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setActionModal({ open: false, type: '', id: null, action: '', remarks: '' })}>✕</button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                            Are you sure you want to <strong>{actionModal.action.toLowerCase()}</strong> this {actionModal.type === 'timesheets' ? 'timesheet' : 'expense claim'}?
                        </p>
                        <div className="form-group">
                            <label className="form-label">Review Remarks / Justification</label>
                            <textarea 
                                className="form-textarea"
                                rows={3}
                                value={actionModal.remarks}
                                onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                                placeholder="E.g., Approved based on Q3 deliverable milestones..."
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                            <button type="button" className="secondary-btn" onClick={() => setActionModal({ open: false, type: '', id: null, action: '', remarks: '' })}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className={`opsai-btn-sm ${actionModal.action === 'Approve' ? 'success' : 'danger'}`}
                                style={{ padding: '8px 18px', fontSize: '13px' }}
                                onClick={handleActionSubmit}
                            >
                                Confirm {actionModal.action}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Inspect Timesheet Breakdown */}
            {inspectTsModal.open && inspectTsModal.item && (
                <div className="modal-backdrop" onClick={() => setInspectTsModal({ open: false, item: null })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Timesheet Breakdown</h3>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    {inspectTsModal.item.employeeName} • {new Date(inspectTsModal.item.periodStart).toLocaleDateString()} to {new Date(inspectTsModal.item.periodEnd).toLocaleDateString()}
                                </span>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setInspectTsModal({ open: false, item: null })}>✕</button>
                        </div>

                        <div className="custom-scroll" style={{ maxHeight: '320px', margin: '14px 0' }}>
                            <table className="opsai-table" style={{ fontSize: '12.5px' }}>
                                <thead>
                                    <tr>
                                        <th>PROJECT</th>
                                        <th>ACTIVITY TYPE</th>
                                        <th style={{ textAlign: 'right' }}>HOURS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inspectTsModal.item.rows?.map((r) => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.projectName}</td>
                                            <td style={{ color: '#64748b' }}>{r.activityType || 'Consulting'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c' }}>{r.totalHours} hrs</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                        <td colSpan={2} style={{ color: '#0f172a' }}>Total Working Hours</td>
                                        <td style={{ textAlign: 'right', color: '#ff682c', fontSize: '14px' }}>{inspectTsModal.item.actualHoursTotal} hrs</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="secondary-btn" onClick={() => setInspectTsModal({ open: false, item: null })}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
