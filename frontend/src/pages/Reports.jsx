import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
    BarChart2, Download, Clock, DollarSign, 
    CheckCircle, AlertCircle, Filter, Calendar, Users
} from 'lucide-react';

export default function Reports() {
    const location = useLocation();
    const isExpenses = location.pathname.includes('expenses');
    const [reportData, setReportData] = useState({ records: [], summary: {} });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadReport = () => {
        setLoading(true);
        const endpoint = isExpenses ? '/reports/expenses' : '/reports/timesheet';
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
        loadReport();
    }, [isExpenses]);

    const handleExportCSV = () => {
        if (!reportData.records || reportData.records.length === 0) return;
        
        let csvContent = 'data:text/csv;charset=utf-8,';
        if (isExpenses) {
            csvContent += 'Claim ID,Title,Employee,Project,Amount,Currency,Date,Status\n';
            reportData.records.forEach(r => {
                csvContent += `"${r.expenseNo}","${r.title}","${r.employeeName}","${r.projectName}","${r.amount}","${r.currency}","${new Date(r.expenseDate).toLocaleDateString()}","${r.status}"\n`;
            });
        } else {
            csvContent += 'Employee,Department,Designation,Period Start,Period End,Planned Hours,Actual Hours,Status\n';
            reportData.records.forEach(r => {
                csvContent += `"${r.employeeName}","${r.department}","${r.designation}","${new Date(r.periodStart).toLocaleDateString()}","${new Date(r.periodEnd).toLocaleDateString()}","${r.plannedHours}","${r.actualHours}","${r.status}"\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${isExpenses ? 'Expenses_Report' : 'Timesheets_Report'}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const summary = reportData.summary || {};
    const records = reportData.records || [];

    return (
        <div className="reports-page">
            <div className="page-header">
                <div className="page-title-group">
                    <h1>{isExpenses ? 'Expense Claims & Financial Audit Report' : 'Timesheet Utilization & Hours Analytics'}</h1>
                    <p className="page-subtitle">Consolidated operational metrics, billable vs non-billable capacity, and exportable audit logs.</p>
                </div>
                <button type="button" className="primary-btn" onClick={handleExportCSV}>
                    <Download size={15} /> Export Report (.CSV)
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="kpi-row" style={{ gridTemplateColumns: isExpenses ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', marginBottom: '24px' }}>
                {isExpenses ? (
                    <>
                        <div className="kpi-card">
                            <div className="kpi-icon-box orange">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">${summary.totalAmount || '0.00'}</div>
                                <div className="kpi-label">Total Expense Volume</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon-box purple">
                                <BarChart2 size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.count || 0}</div>
                                <div className="kpi-label">Total Claims Count</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon-box green">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.approvedCount || 0}</div>
                                <div className="kpi-label">Approved & Reimbursed</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="kpi-card">
                            <div className="kpi-icon-box orange">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.totalActualHours || 0} hrs</div>
                                <div className="kpi-label">Total Logged Hours</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon-box blue">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.totalPlannedHours || 0} hrs</div>
                                <div className="kpi-label">Planned Capacity</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon-box green">
                                <BarChart2 size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.utilizationRate || 100}%</div>
                                <div className="kpi-label">Resource Utilization</div>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon-box purple">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="kpi-val">{summary.approvedCount || 0}</div>
                                <div className="kpi-label">Approved Timesheets</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Reports Table */}
            <div className="card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Aggregating analytics data...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <BarChart2 size={36} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 800 }}>No Report Records Available</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Data will automatically populate as employees log time and submit expenses.</p>
                    </div>
                ) : (
                    <table className="timesheet-table">
                        <thead>
                            {isExpenses ? (
                                <tr>
                                    <th>Expense No / Title</th>
                                    <th>Employee</th>
                                    <th>Project Engagement</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>Employee & Designation</th>
                                    <th>Department</th>
                                    <th>Week Period</th>
                                    <th>Planned</th>
                                    <th>Actual Hours</th>
                                    <th>Status</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={i}>
                                    {isExpenses ? (
                                        <>
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{r.title}</div>
                                                <span className="badge badge-info" style={{ fontSize: '11px', marginTop: '4px' }}>{r.expenseNo}</span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                                            <td>{r.projectName}</td>
                                            <td>{new Date(r.expenseDate).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                {r.currencySymbol} {r.amount.toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${r.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{r.employeeName}</div>
                                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{r.designation}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-neutral">{r.department}</span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {new Date(r.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(r.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{r.plannedHours} hrs</td>
                                            <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{r.actualHours} hrs</td>
                                            <td>
                                                <span className={`badge ${r.status === 'Approved' ? 'badge-success' : (r.status === 'Submitted' ? 'badge-warning' : 'badge-neutral')}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
