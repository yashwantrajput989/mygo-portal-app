import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    BarChart2, Download, Clock, DollarSign, 
    CheckCircle, AlertCircle, Filter, Calendar, Users, 
    FileText, CheckSquare, Search, FileSpreadsheet
} from 'lucide-react';

export default function Reports() {
    const location = useLocation();
    const navigate = useNavigate();
    const isExpensesPath = location.pathname.includes('expenses');
    const [reportType, setReportType] = useState(isExpensesPath ? 'expenses' : 'timesheets');
    const [reportData, setReportData] = useState({ records: [], summary: {} });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadReport = (type) => {
        setLoading(true);
        const endpoint = type === 'expenses' ? '/reports/expenses' : '/reports/timesheet';
        api.get(endpoint)
            .then(res => {
                if (res.data.success) {
                    setReportData({
                        records: res.data.records || [],
                        summary: res.data.summary || {}
                    });
                }
            })
            .catch(err => {
                console.error('Report load error:', err);
                setMessage({ type: 'error', text: 'Failed to generate operational report.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const type = isExpensesPath ? 'expenses' : 'timesheets';
        setReportType(type);
        loadReport(type);
    }, [isExpensesPath]);

    const handleSwitchTab = (type) => {
        setReportType(type);
        if (type === 'expenses') {
            navigate('/reports/expenses');
        } else {
            navigate('/reports/timesheet');
        }
    };

    const handleExport = (format) => {
        if (!reportData.records || reportData.records.length === 0) return;
        
        const isExp = reportType === 'expenses';
        let content = '';
        const filename = `${isExp ? 'Expenses_Report' : 'Timesheets_Report'}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xls' : 'csv'}`;

        if (isExp) {
            content += 'Claim ID,Title,Employee,Project,Amount,Currency,Date,Status\n';
            reportData.records.forEach(r => {
                content += `"${r.expenseNo}","${r.title}","${r.employeeName}","${r.projectName}","${r.amount}","${r.currency}","${new Date(r.expenseDate).toLocaleDateString()}","${r.status}"\n`;
            });
        } else {
            content += 'Employee,Department,Designation,Period Start,Period End,Planned Hours,Actual Hours,Status\n';
            reportData.records.forEach(r => {
                content += `"${r.employeeName}","${r.department || 'SAP Practice'}","${r.designation || 'Consultant'}","${new Date(r.periodStart).toLocaleDateString()}","${new Date(r.periodEnd).toLocaleDateString()}","${r.plannedHours}","${r.actualHours}","${r.status}"\n`;
            });
        }

        const mimeType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const summary = reportData.summary || {};
    const records = reportData.records || [];

    const filteredRecords = records.filter(r => {
        const matchSearch = reportType === 'expenses'
            ? (r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.expenseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.projectName?.toLowerCase().includes(searchTerm.toLowerCase()))
            : (r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.designation?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const isExp = reportType === 'expenses';

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Operational Reports & Analytics</h1>
                    <p className="opsai-page-desc">Consolidated enterprise metrics, billable utilization rates, financial audits, and multi-format exports.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="opsai-action-btn" style={{ background: '#ffffff', padding: '7px 14px' }} onClick={() => handleExport('csv')}>
                        <Download size={14} style={{ marginRight: '4px' }} /> Export CSV
                    </button>
                    <button type="button" className="ts-action-solid-btn" onClick={() => handleExport('excel')}>
                        <FileSpreadsheet size={15} /> Export Excel
                    </button>
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
                {isExp ? (
                    <>
                        <div className="ts-kpi-card ts-kpi-orange-top">
                            <div className="ts-kpi-icon-box orange">
                                <DollarSign size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">TOTAL CLAIM VOLUME</div>
                                <div className="ts-kpi-val">${Number(summary.totalAmount || 0).toLocaleString()}</div>
                                <div className="ts-kpi-sub">{records.length} claims filed</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box teal">
                                <CheckCircle size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">APPROVED VOLUME</div>
                                <div className="ts-kpi-val">${Number(summary.approvedAmount || 0).toLocaleString()}</div>
                                <div className="ts-kpi-sub">authorized for payout</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box slate">
                                <Clock size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">PENDING AUDIT</div>
                                <div className="ts-kpi-val">{summary.pendingCount || 0}</div>
                                <div className="ts-kpi-sub">awaiting approval</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box dark">
                                <BarChart2 size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">AVERAGE CLAIM</div>
                                <div className="ts-kpi-val">${records.length > 0 ? (Number(summary.totalAmount || 0) / records.length).toFixed(0) : '0'}</div>
                                <div className="ts-kpi-sub">per submission</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="ts-kpi-card ts-kpi-orange-top">
                            <div className="ts-kpi-icon-box orange">
                                <Clock size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">TOTAL LOGGED HOURS</div>
                                <div className="ts-kpi-val">{summary.totalActualHours || 0} hrs</div>
                                <div className="ts-kpi-sub">across organization</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box slate">
                                <Calendar size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">TOTAL PLANNED HOURS</div>
                                <div className="ts-kpi-val">{summary.totalPlannedHours || 0} hrs</div>
                                <div className="ts-kpi-sub">scheduled capacity</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box teal">
                                <CheckSquare size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">UTILIZATION RATE</div>
                                <div className="ts-kpi-val">{summary.utilizationRate || '0%'}</div>
                                <div className="ts-kpi-sub">actual vs planned</div>
                            </div>
                        </div>

                        <div className="ts-kpi-card">
                            <div className="ts-kpi-icon-box dark">
                                <Users size={20} />
                            </div>
                            <div className="ts-kpi-content">
                                <div className="ts-kpi-label">TIMESHEET RECORDS</div>
                                <div className="ts-kpi-val">{records.length}</div>
                                <div className="ts-kpi-sub">weekly periods</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Reports Table Card */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row">
                    <div className="opsai-tab-pill-group">
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${!isExp ? 'active' : ''}`}
                            onClick={() => handleSwitchTab('timesheets')}
                        >
                            <Clock size={14} /> Timesheet Utilization Analytics
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${isExp ? 'active' : ''}`}
                            onClick={() => handleSwitchTab('expenses')}
                        >
                            <DollarSign size={14} /> Expense Audit Reports
                        </button>
                    </div>

                    <div className="opsai-filter-group">
                        <div className="opsai-search-box">
                            <Search size={14} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder={isExp ? "Search by claim, employee, project..." : "Search by employee, department..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="opsai-search-input"
                                style={{ width: '260px' }}
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
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#64748b', fontWeight: 600 }}>Generating analytical report...</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <BarChart2 size={36} style={{ color: '#ff682c', margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '15px', fontWeight: 800 }}>No Analytics Records Found</h3>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Try adjusting your search criteria or changing the report type.</p>
                    </div>
                ) : isExp ? (
                    /* Expense Reports Table */
                    <div className="ts-table-responsive">
                        <table className="opsai-table">
                            <thead>
                                <tr>
                                    <th>CLAIM ID & TITLE</th>
                                    <th>EMPLOYEE</th>
                                    <th>PROJECT ALLOCATION</th>
                                    <th>DATE</th>
                                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((r, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.title}</div>
                                            <span className="opsai-id-badge">{r.expenseNo}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#334155' }}>{r.employeeName}</div>
                                        </td>
                                        <td>
                                            <div style={{ color: '#475569' }}>{r.projectName}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(r.expenseDate).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '14.5px' }}>
                                            ${Number(r.amount).toLocaleString()}
                                            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>{r.currency}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`opsai-status-pill ${r.status === 'Approved' ? 'approved' : (r.status === 'Submitted' ? 'pending' : (r.status === 'Rejected' ? 'rejected' : 'draft'))}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Timesheet Reports Table */
                    <div className="ts-table-responsive">
                        <table className="opsai-table">
                            <thead>
                                <tr>
                                    <th>EMPLOYEE & ROLE</th>
                                    <th>DEPARTMENT</th>
                                    <th>PERIOD DATES</th>
                                    <th style={{ textAlign: 'right' }}>PLANNED</th>
                                    <th style={{ textAlign: 'right' }}>ACTUAL</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((r, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.employeeName}</div>
                                            <div style={{ fontSize: '11px', color: '#ff682c', fontWeight: 700 }}>{r.designation || 'Consultant'}</div>
                                        </td>
                                        <td>
                                            <div style={{ color: '#475569' }}>{r.department || 'SAP Practice'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '12px', color: '#334155' }}>
                                                {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                                            {r.plannedHours} hrs
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ff682c', fontSize: '14.5px' }}>
                                            {r.actualHours} hrs
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`opsai-status-pill ${r.status === 'Approved' ? 'approved' : (r.status === 'Submitted' ? 'pending' : (r.status === 'Rejected' ? 'rejected' : 'draft'))}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
