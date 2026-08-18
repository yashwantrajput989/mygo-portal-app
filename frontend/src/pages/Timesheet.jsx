import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Clock, Check, Zap, Percent, Calendar, FolderOpen,
    ChevronLeft, ChevronRight, Download, Plus, Edit3, 
    Info, Paperclip, MessageSquare, Save, Send, CheckCircle, AlertCircle
} from 'lucide-react';

export default function Timesheet() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState('');
    const [weekEnd, setWeekEnd] = useState('');
    const [days, setDays] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState('Draft');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [noteModal, setNoteModal] = useState({ open: false, rIdx: 0, cIdx: 0, text: '' });
    const [message, setMessage] = useState({ type: '', text: '' });

    const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    // Calculate Week Number
    const getWeekNumber = (d) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return { weekNo, year: date.getUTCFullYear() };
    };

    const weekInfo = getWeekNumber(currentDate);

    const loadTimesheet = (date) => {
        setLoading(true);
        const dateStr = date.toISOString().slice(0, 10);
        api.get(`/timesheets/weekly?startDate=${dateStr}`)
            .then(res => {
                if (res.data.success) {
                    setWeekStart(res.data.startOfWeek);
                    setWeekEnd(res.data.endOfWeek);
                    setDays(res.data.days || []);
                    setAvailableProjects(res.data.availableProjects || []);
                    setStatus(res.data.status || 'Draft');

                    if (res.data.rows && res.data.rows.length > 0) {
                        setRows(res.data.rows);
                    } else {
                        const defaultProjectId = res.data.availableProjects?.[0]?.id || 1;
                        const emptyRow = {
                            projectId: defaultProjectId,
                            projectName: res.data.availableProjects?.[0]?.name || 'Bench',
                            activityType: 'Development / Consulting',
                            cells: (res.data.days || []).map(dStr => ({
                                entryDate: dStr,
                                hours: 0,
                                noteText: ''
                            }))
                        };
                        setRows([emptyRow]);
                    }
                }
            })
            .catch(err => {
                console.error('Error loading timesheet:', err);
                setMessage({ type: 'error', text: 'Failed to load weekly timesheet.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTimesheet(currentDate);
    }, [currentDate]);

    const handlePrevWeek = () => {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 7);
        setCurrentDate(prev);
    };

    const handleNextWeek = () => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 7);
        setCurrentDate(next);
    };

    const handleHourChange = (rIdx, cIdx, val) => {
        if (status === 'Submitted' || status === 'Approved') return;
        const num = parseFloat(val);
        const hours = isNaN(num) ? 0 : Math.max(0, Math.min(24, num));
        
        const newRows = [...rows];
        newRows[rIdx].cells[cIdx].hours = hours;
        setRows(newRows);
    };

    const handleAddRow = (projId) => {
        if (status === 'Submitted' || status === 'Approved') return;
        const selectedProj = availableProjects.find(p => p.id === parseInt(projId)) || availableProjects[0];
        const newRow = {
            projectId: selectedProj?.id || 1,
            projectName: selectedProj?.name || 'Project Allocation',
            activityType: 'Consulting',
            cells: days.map(dStr => ({
                entryDate: dStr,
                hours: 0,
                noteText: ''
            }))
        };
        setRows([...rows, newRow]);
    };

    const handleSaveOrSubmit = (actionStatus) => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        const payload = {
            startDate: weekStart,
            endDate: weekEnd,
            rows,
            status: actionStatus
        };

        api.post('/timesheets/save', payload)
            .then(res => {
                if (res.data.success) {
                    setStatus(res.data.status);
                    setMessage({ 
                        type: 'success', 
                        text: actionStatus === 'Submitted' ? 'Timesheet submitted successfully!' : 'Timesheet draft saved.' 
                    });
                    loadTimesheet(currentDate);
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save timesheet.' });
            })
            .finally(() => setSaving(false));
    };

    const calculateDayTotal = (cIdx) => {
        return rows.reduce((sum, r) => sum + (Number(r.cells?.[cIdx]?.hours) || 0), 0);
    };

    const calculateRowTotal = (row) => {
        return row.cells?.reduce((sum, c) => sum + (Number(c.hours) || 0), 0) || 0;
    };

    const grandTotal = rows.reduce((sum, r) => sum + calculateRowTotal(r), 0);
    const plannedHours = 40;
    const overtime = Math.max(0, grandTotal - plannedHours);
    const utilizationRate = plannedHours > 0 ? Math.round((grandTotal / plannedHours) * 100) : 0;

    const isReadOnly = status === 'Submitted' || status === 'Approved';

    return (
        <div className="opsai-timesheet-container">
            {/* Top View Selector Bar */}
            <div className="timesheet-top-bar">
                <div className="view-dropdown-wrap">
                    <label>View:</label>
                    <select className="view-dropdown-select">
                        <option value="Week">Week</option>
                        <option value="Month">Month</option>
                    </select>
                </div>
            </div>

            {/* Notification alert */}
            {message.text && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
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

            {/* 6 Metric KPI Cards Row */}
            <div className="opsai-kpi-row-6">
                {/* 1. Planned Hours */}
                <div className="ts-kpi-card ts-kpi-orange-top">
                    <div className="ts-kpi-icon-box orange">
                        <Clock size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">PLANNED HOURS</div>
                        <div className="ts-kpi-val">{plannedHours}</div>
                        <div className="ts-kpi-sub">across 5 working days</div>
                    </div>
                </div>

                {/* 2. Actual Hours */}
                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <Check size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">ACTUAL HOURS</div>
                        <div className="ts-kpi-val">{grandTotal.toFixed(0)}</div>
                        <div className="ts-kpi-sub">{grandTotal.toFixed(0)}h logged</div>
                    </div>
                </div>

                {/* 3. Overtime */}
                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box orange">
                        <Zap size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">OVERTIME</div>
                        <div className="ts-kpi-val">{overtime.toFixed(0)}</div>
                        <div className="ts-kpi-sub">beyond planned</div>
                    </div>
                </div>

                {/* 4. Utilization */}
                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <Percent size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">UTILIZATION</div>
                        <div className="ts-kpi-val">{utilizationRate}%</div>
                        <div className="ts-kpi-sub">of planned hours</div>
                    </div>
                </div>

                {/* 5. Working Days */}
                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box dark">
                        <Calendar size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">WORKING DAYS</div>
                        <div className="ts-kpi-val">5</div>
                        <div className="ts-kpi-sub">Mon - Fri</div>
                    </div>
                </div>

                {/* 6. Projects */}
                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box brown">
                        <FolderOpen size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">PROJECTS</div>
                        <div className="ts-kpi-val">{rows.length}</div>
                        <div className="ts-kpi-sub">active this week</div>
                    </div>
                </div>
            </div>

            {/* Main Timesheet Table Card */}
            <div className="opsai-timesheet-card">
                {/* Header Toolbar */}
                <div className="ts-card-toolbar">
                    <div className="ts-week-nav-box">
                        <button type="button" className="ts-nav-arrow" onClick={handlePrevWeek} title="Previous Week">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="ts-week-range-pill">
                            Week {weekInfo.weekNo} ({weekInfo.year}) - {weekStart} - {weekEnd}
                        </div>
                        <button type="button" className="ts-nav-arrow" onClick={handleNextWeek} title="Next Week">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="ts-toolbar-actions">
                        {!isReadOnly && (
                            <select 
                                className="ts-add-row-select"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAddRow(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                            >
                                <option value="">Add Row ▾</option>
                                {availableProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}

                        <button type="button" className="ts-download-btn" onClick={() => window.print()}>
                            <Download size={14} /> Download
                        </button>

                        <button type="button" className="ts-apply-leave-btn">
                            <Calendar size={14} /> Apply leave
                        </button>
                    </div>
                </div>

                {/* Timesheet Data Matrix */}
                <div className="ts-table-responsive">
                    <table className="opsai-table">
                        <thead>
                            <tr>
                                <th style={{ width: '200px' }}>PROJECT</th>
                                <th style={{ textAlign: 'center', width: '90px' }}>PLANNED / DAY</th>
                                <th style={{ textAlign: 'center', width: '85px' }}>STATUS</th>
                                {days.map((dStr, idx) => {
                                    const dObj = new Date(dStr + 'T00:00:00.000Z');
                                    const monthShort = dObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                                    const dayNum = dObj.getUTCDate();
                                    return (
                                        <th key={dStr} style={{ textAlign: 'center', width: '85px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 800 }}>{dayNames[idx]}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{monthShort} {dayNum}</div>
                                        </th>
                                    );
                                })}
                                <th style={{ textAlign: 'center', width: '75px' }}>TOTAL</th>
                                <th style={{ textAlign: 'center', width: '60px' }}>INFO</th>
                                <th style={{ textAlign: 'center', width: '50px' }}>FILE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rIdx) => {
                                const rowTotal = calculateRowTotal(row);
                                return (
                                    <tr key={rIdx}>
                                        <td>
                                            <div className="ts-project-name">{row.projectName || `Project #${row.projectId}`}</div>
                                            <div className="ts-project-sub">Country: India</div>
                                        </td>

                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            8
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                {status}
                                            </span>
                                        </td>

                                        {row.cells?.map((cell, cIdx) => (
                                            <td key={cIdx} style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    max="24"
                                                    className="ts-capsule-input"
                                                    value={cell.hours || 0}
                                                    onChange={(e) => handleHourChange(rIdx, cIdx, e.target.value)}
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                        ))}

                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {rowTotal.toFixed(1)}
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <button 
                                                    type="button" 
                                                    className="ts-cell-icon-btn"
                                                    onClick={() => setNoteModal({ open: true, rIdx, cIdx: 0, text: row.cells[0]?.noteText || '' })}
                                                    title="Edit Note"
                                                >
                                                    <Edit3 size={13} />
                                                </button>
                                                <span className="ts-info-badge">i</span>
                                            </div>
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            <button type="button" className="ts-cell-icon-btn orange" title="Attachments">
                                                <Paperclip size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* Dark Navy Daily Totals Summary Footer */}
                        <tfoot>
                            <tr className="ts-navy-footer">
                                <td style={{ padding: '14px 16px', fontWeight: 800, color: '#ffffff' }}>DAILY TOTAL</td>
                                <td style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>8.0h</td>
                                <td></td>
                                {days.map((_, cIdx) => (
                                    <td key={cIdx} style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
                                        {calculateDayTotal(cIdx).toFixed(1)}h
                                    </td>
                                ))}
                                <td style={{ textAlign: 'center', color: '#ff682c', fontWeight: 900, fontSize: '15px' }}>
                                    {grandTotal.toFixed(1)}h
                                </td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer Action Buttons */}
                <div className="ts-footer-buttons">
                    <button type="button" className="ts-action-outline-btn">
                        Copy Last Week
                    </button>
                    {!isReadOnly && (
                        <>
                            <button 
                                type="button" 
                                className="ts-action-outline-btn"
                                onClick={() => handleSaveOrSubmit('Draft')}
                                disabled={saving}
                            >
                                Draft Week
                            </button>
                            <button 
                                type="button" 
                                className="ts-action-solid-btn"
                                onClick={() => handleSaveOrSubmit('Submitted')}
                                disabled={saving}
                            >
                                Submit Week
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Task Note Modal */}
            {noteModal.open && (
                <div className="modal-backdrop" onClick={() => setNoteModal({ open: false, rIdx: 0, cIdx: 0, text: '' })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Task Description & Notes</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setNoteModal({ open: false, rIdx: 0, cIdx: 0, text: '' })}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Activity Description:</label>
                            <textarea 
                                className="form-textarea" 
                                rows={4}
                                value={noteModal.text}
                                onChange={(e) => setNoteModal({ ...noteModal, text: e.target.value })}
                                placeholder="Details of work delivered..."
                                disabled={isReadOnly}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="secondary-btn" onClick={() => setNoteModal({ open: false, rIdx: 0, cIdx: 0, text: '' })}>
                                Cancel
                            </button>
                            {!isReadOnly && (
                                <button 
                                    type="button" 
                                    className="primary-btn" 
                                    onClick={() => {
                                        const newRows = [...rows];
                                        newRows[noteModal.rIdx].cells[noteModal.cIdx].noteText = noteModal.text;
                                        setRows(newRows);
                                        setNoteModal({ open: false, rIdx: 0, cIdx: 0, text: '' });
                                    }}
                                >
                                    Save Note
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
