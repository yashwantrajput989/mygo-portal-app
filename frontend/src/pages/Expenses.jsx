import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    DollarSign, Plus, Paperclip, CheckCircle, AlertCircle, 
    Calendar, Tag, FileText, Download, Eye, X, CheckSquare, 
    XCircle, Clock, Filter, Search, ChevronRight, MessageSquare
} from 'lucide-react';

export default function Expenses() {
    const [activeTab, setActiveTab] = useState('my-claims');
    const [expenses, setExpenses] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [types, setTypes] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [receiptModal, setReceiptModal] = useState({ open: false, url: '', name: '' });
    const [approvalModal, setApprovalModal] = useState({ open: false, id: null, action: '', remarks: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [form, setForm] = useState({
        title: '',
        projectId: '',
        expenseTypeId: '',
        amount: '',
        currency: 'INR',
        vendor: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        description: '',
        reimburseToMe: true,
        billToClient: false,
        receipt: null
    });

    const loadExpensesData = () => {
        setLoading(true);
        Promise.all([
            api.get('/expenses'),
            api.get('/approvals/expenses').catch(() => ({ data: { expenses: [] } }))
        ])
        .then(([expRes, appRes]) => {
            if (expRes.data.success) {
                setExpenses(expRes.data.expenses || []);
                setTypes(expRes.data.types || []);
                setCurrencies(expRes.data.currencies || []);
                setProjects(expRes.data.projects || []);
                if (expRes.data.projects?.length > 0 && !form.projectId) {
                    setForm(f => ({ ...f, projectId: expRes.data.projects[0].id }));
                }
                if (expRes.data.types?.length > 0 && !form.expenseTypeId) {
                    setForm(f => ({ ...f, expenseTypeId: expRes.data.types[0].id }));
                }
            }
            if (appRes.data.success) {
                setPendingApprovals(appRes.data.expenses || []);
            }
        })
        .catch(err => {
            console.error('Expenses load error:', err);
            setMessage({ type: 'error', text: 'Failed to load expense records.' });
        })
        .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadExpensesData();
    }, []);

    const handleCreateExpense = (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('projectId', form.projectId);
        formData.append('expenseTypeId', form.expenseTypeId);
        formData.append('amount', form.amount);
        formData.append('currency', form.currency);
        formData.append('vendor', form.vendor);
        formData.append('expenseDate', form.expenseDate);
        formData.append('description', form.description);
        formData.append('reimburseToMe', form.reimburseToMe);
        formData.append('billToClient', form.billToClient);
        if (form.receipt) {
            formData.append('receipt', form.receipt);
        }

        api.post('/expenses/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then(res => {
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Expense claim submitted for manager approval!' });
                setCreateModal(false);
                setForm({
                    title: '',
                    projectId: projects[0]?.id || '',
                    expenseTypeId: types[0]?.id || '',
                    amount: '',
                    currency: 'INR',
                    vendor: '',
                    expenseDate: new Date().toISOString().slice(0, 10),
                    description: '',
                    reimburseToMe: true,
                    billToClient: false,
                    receipt: null
                });
                loadExpensesData();
            }
        })
        .catch(err => {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit expense.' });
        })
        .finally(() => setSubmitting(false));
    };

    const handleApprovalAction = () => {
        const { id, action, remarks } = approvalModal;
        api.post(`/approvals/expenses/${id}/action`, { action, remarks })
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: res.data.message });
                    setApprovalModal({ open: false, id: null, action: '', remarks: '' });
                    loadExpensesData();
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
            });
    };

    const totalClaimedAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const approvedAmount = expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const pendingCount = expenses.filter(e => e.status === 'Submitted' || e.status === 'Pending').length;

    const filteredExpenses = expenses.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.expenseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.vendor.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Expense Management & Reimbursements</h1>
                    <p className="opsai-page-desc">Track project expenditures, claim client-billable reimbursements, and review multi-tier approval requests.</p>
                </div>
                <button type="button" className="ts-action-solid-btn" onClick={() => setCreateModal(true)}>
                    <Plus size={16} /> New Expense Claim
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
                        <DollarSign size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">TOTAL CLAIMED</div>
                        <div className="ts-kpi-val">${totalClaimedAmount.toLocaleString()}</div>
                        <div className="ts-kpi-sub">{expenses.length} claims submitted</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <CheckCircle size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">APPROVED & REIMBURSED</div>
                        <div className="ts-kpi-val">${approvedAmount.toLocaleString()}</div>
                        <div className="ts-kpi-sub">{expenses.filter(e => e.status === 'Approved').length} claims approved</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box orange">
                        <Clock size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">PENDING APPROVAL</div>
                        <div className="ts-kpi-val">{pendingCount}</div>
                        <div className="ts-kpi-sub">awaiting review</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <CheckSquare size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">APPROVAL QUEUE</div>
                        <div className="ts-kpi-val">{pendingApprovals.length}</div>
                        <div className="ts-kpi-sub">team claims to audit</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation & Search Bar */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row">
                    <div className="opsai-tab-pill-group">
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'my-claims' ? 'active' : ''}`}
                            onClick={() => setActiveTab('my-claims')}
                        >
                            <FileText size={14} /> My Claims ({expenses.length})
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'approval-queue' ? 'active' : ''}`}
                            onClick={() => setActiveTab('approval-queue')}
                        >
                            <CheckSquare size={14} /> Approval Queue ({pendingApprovals.length})
                        </button>
                    </div>

                    {activeTab === 'my-claims' && (
                        <div className="opsai-filter-group">
                            <div className="opsai-search-box">
                                <Search size={14} className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search by title, project, vendor, ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="opsai-search-input"
                                />
                            </div>

                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="opsai-status-select"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Approved">Approved</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Draft">Draft</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Tab 1: My Claims */}
                {activeTab === 'my-claims' && (
                    <div className="ts-table-responsive">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading expense records...</p>
                            </div>
                        ) : filteredExpenses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px' }}>
                                <DollarSign size={36} style={{ color: '#ff682c', margin: '0 auto 12px' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>No Expense Claims Found</h3>
                                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Click "New Expense Claim" to submit your reimbursement request.</p>
                            </div>
                        ) : (
                            <table className="opsai-table">
                                <thead>
                                    <tr>
                                        <th>CLAIM ID & TITLE</th>
                                        <th>PROJECT ALLOCATION</th>
                                        <th>DATE & VENDOR</th>
                                        <th style={{ textAlign: 'right' }}>AMOUNT</th>
                                        <th style={{ textAlign: 'center' }}>STATUS</th>
                                        <th style={{ textAlign: 'center' }}>RECEIPT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((exp) => {
                                        const isApproved = exp.status === 'Approved';
                                        const isPending = exp.status === 'Submitted' || exp.status === 'Pending';
                                        const isRejected = exp.status === 'Rejected';

                                        return (
                                            <tr key={exp.id}>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{exp.title}</div>
                                                    <span className="opsai-id-badge">{exp.expenseNo}</span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: '#334155' }}>{exp.projectName}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.projectCode || 'General'}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: '#334155' }}>{new Date(exp.expenseDate).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{exp.vendor || 'Merchant'}</div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '14.5px' }}>
                                                    {exp.currencySymbol} {exp.amount.toLocaleString()}
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>{exp.currency}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`opsai-status-pill ${isApproved ? 'approved' : (isPending ? 'pending' : (isRejected ? 'rejected' : 'draft'))}`}>
                                                        {exp.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {exp.attachments && exp.attachments.length > 0 ? (
                                                        <a 
                                                            href={`http://localhost:5000/api/expenses/attachments/${exp.attachments[0].AttachmentId || exp.attachments[0].id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="ts-cell-icon-btn orange"
                                                            title="View Receipt Attachment"
                                                        >
                                                            <Paperclip size={14} />
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab 2: Approval Queue */}
                {activeTab === 'approval-queue' && (
                    <div className="ts-table-responsive">
                        {pendingApprovals.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px' }}>
                                <CheckCircle size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Approval Queue Clean</h3>
                                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>No pending team expense claims require your authorization.</p>
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
                                    {pendingApprovals.map((app) => (
                                        <tr key={app.id}>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{app.title}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>By <strong style={{ color: '#0f172a' }}>{app.employeeName}</strong> • {app.expenseNo}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#334155' }}>{app.projectName}</td>
                                            <td>
                                                <div>{new Date(app.expenseDate).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{app.vendor || 'Merchant'}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '15px' }}>
                                                {app.currencySymbol} {app.amount.toLocaleString()}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {app.attachments && app.attachments.length > 0 ? (
                                                    <a 
                                                        href={`http://localhost:5000/api/expenses/attachments/${app.attachments[0].AttachmentId || app.attachments[0].id}`}
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
                                                        onClick={() => setApprovalModal({ open: true, id: app.id, action: 'Reject', remarks: '' })}
                                                    >
                                                        <XCircle size={13} /> Reject
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm success"
                                                        onClick={() => setApprovalModal({ open: true, id: app.id, action: 'Approve', remarks: '' })}
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

            {/* Modal 1: Create Expense Claim */}
            {createModal && (
                <div className="modal-backdrop" onClick={() => setCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Submit Expense Reimbursement Claim</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateExpense}>
                            <div className="form-group">
                                <label className="form-label">Expense Title / Reason *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="E.g., Client onsite travel, project team meal, SAP software..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Project Allocation *</label>
                                    <select 
                                        className="form-select"
                                        value={form.projectId}
                                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                                    >
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Expense Category *</label>
                                    <select 
                                        className="form-select"
                                        value={form.expenseTypeId}
                                        onChange={(e) => setForm({ ...form, expenseTypeId: e.target.value })}
                                    >
                                        {types.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="1" 
                                        className="form-input" 
                                        required 
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Currency</label>
                                    <select 
                                        className="form-select"
                                        value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                    >
                                        {currencies.map(c => (
                                            <option key={c.id} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Expense Date *</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        required
                                        value={form.expenseDate}
                                        onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Vendor / Merchant Name</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={form.vendor}
                                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                                    placeholder="E.g., Marriott, Uber, Indigo Airlines, AWS..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Upload Receipt Attachment (Image or PDF)</label>
                                <input 
                                    type="file" 
                                    className="form-input" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => setForm({ ...form, receipt: e.target.files[0] })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '20px', margin: '14px 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={form.reimburseToMe}
                                        onChange={(e) => setForm({ ...form, reimburseToMe: e.target.checked })}
                                        style={{ accentColor: '#ff682c' }}
                                    />
                                    <span>Reimburse to Employee</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={form.billToClient}
                                        onChange={(e) => setForm({ ...form, billToClient: e.target.checked })}
                                        style={{ accentColor: '#ff682c' }}
                                    />
                                    <span>Billable to Client</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="secondary-btn" onClick={() => setCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="ts-action-solid-btn" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Claim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Approval Confirmation */}
            {approvalModal.open && (
                <div className="modal-backdrop" onClick={() => setApprovalModal({ open: false, id: null, action: '', remarks: '' })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm {approvalModal.action}</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setApprovalModal({ open: false, id: null, action: '', remarks: '' })}>✕</button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                            Are you sure you want to <strong>{approvalModal.action.toLowerCase()}</strong> this expense claim?
                        </p>
                        <div className="form-group">
                            <label className="form-label">Reviewer Comments / Remarks:</label>
                            <textarea 
                                className="form-textarea"
                                rows={3}
                                value={approvalModal.remarks}
                                onChange={(e) => setApprovalModal({ ...approvalModal, remarks: e.target.value })}
                                placeholder="E.g., Approved under Q3 project travel allowance..."
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="secondary-btn" onClick={() => setApprovalModal({ open: false, id: null, action: '', remarks: '' })}>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className={`opsai-btn-sm ${approvalModal.action === 'Approve' ? 'success' : 'danger'}`}
                                style={{ padding: '8px 18px', fontSize: '13px' }}
                                onClick={handleApprovalAction}
                            >
                                Confirm {approvalModal.action}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
