import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Ticket, Plus, MessageSquare, CheckCircle, AlertCircle, 
    Clock, User, Send, Filter, Search, Tag, LayoutList, 
    Kanban, ChevronRight, Check
} from 'lucide-react';

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
    const [createModal, setCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        categoryId: ''
    });

    const loadTicketsData = () => {
        setLoading(true);
        api.get('/tickets')
            .then(res => {
                if (res.data.success) {
                    setTickets(res.data.tickets || []);
                    setCategories(res.data.categories || []);
                    setStats(res.data.stats || { open: 0, inProgress: 0, resolved: 0, total: 0 });
                    if (res.data.categories?.length > 0 && !form.categoryId) {
                        setForm(f => ({ ...f, categoryId: res.data.categories[0].id }));
                    }
                }
            })
            .catch(err => {
                console.error('Tickets load error:', err);
                setMessage({ type: 'error', text: 'Failed to load support tickets.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTicketsData();
    }, []);

    const handleCreateTicket = (e) => {
        e.preventDefault();
        api.post('/tickets/create', form)
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: 'Support ticket logged successfully!' });
                    setCreateModal(false);
                    setForm({
                        title: '',
                        description: '',
                        priority: 'Medium',
                        categoryId: categories[0]?.id || ''
                    });
                    loadTicketsData();
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit ticket.' });
            });
    };

    const openTicketDetails = (ticket) => {
        setSelectedTicket(ticket);
        api.get(`/tickets/${ticket.id}/comments`)
            .then(res => {
                if (res.data.success) setComments(res.data.comments || []);
            })
            .catch(() => setComments([]));
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!commentText.trim() || !selectedTicket) return;

        api.post(`/tickets/${selectedTicket.id}/comments`, { comment: commentText })
            .then(res => {
                if (res.data.success) {
                    setComments([...comments, res.data.comment]);
                    setCommentText('');
                }
            })
            .catch(err => console.error(err));
    };

    const filteredTickets = tickets.filter(t => {
        const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = categoryFilter === 'All' || t.category === categoryFilter;
        const matchPri = priorityFilter === 'All' || t.priority === priorityFilter;
        return matchSearch && matchCat && matchPri;
    });

    const kanbanColumns = [
        { title: 'Open', status: 'Open', color: '#f59e0b' },
        { title: 'In Progress', status: 'In Progress', color: '#3b82f6' },
        { title: 'Resolved', status: 'Resolved', color: '#10b981' }
    ];

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">IT Support & Operational Helpdesk</h1>
                    <p className="opsai-page-desc">Raise technical tickets, SAP authorization requests, hardware requests, and communicate with support engineers.</p>
                </div>
                <button type="button" className="ts-action-solid-btn" onClick={() => setCreateModal(true)}>
                    <Plus size={16} /> Raise Support Ticket
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
                        <Ticket size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">TOTAL TICKETS</div>
                        <div className="ts-kpi-val">{stats.total}</div>
                        <div className="ts-kpi-sub">raised across portal</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box orange">
                        <Clock size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">OPEN QUEUE</div>
                        <div className="ts-kpi-val">{stats.open}</div>
                        <div className="ts-kpi-sub">awaiting assignment</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <MessageSquare size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">IN PROGRESS</div>
                        <div className="ts-kpi-val">{stats.inProgress}</div>
                        <div className="ts-kpi-sub">being investigated</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <CheckCircle size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">RESOLVED</div>
                        <div className="ts-kpi-val">{stats.resolved}</div>
                        <div className="ts-kpi-sub">closed successfully</div>
                    </div>
                </div>
            </div>

            {/* Table / Kanban Card */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row">
                    <div className="opsai-tab-pill-group">
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <LayoutList size={14} /> List View ({filteredTickets.length})
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${viewMode === 'kanban' ? 'active' : ''}`}
                            onClick={() => setViewMode('kanban')}
                        >
                            <Kanban size={14} /> Kanban Board
                        </button>
                    </div>

                    <div className="opsai-filter-group">
                        <div className="opsai-search-box">
                            <Search size={14} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search tickets by title, code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="opsai-search-input"
                            />
                        </div>

                        <select 
                            value={categoryFilter} 
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="opsai-status-select"
                        >
                            <option value="All">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>

                        <select 
                            value={priorityFilter} 
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="opsai-status-select"
                        >
                            <option value="All">All Priorities</option>
                            <option value="Urgent">Urgent</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="ts-table-responsive">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading support tickets...</p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px' }}>
                                <Ticket size={36} style={{ color: '#ff682c', margin: '0 auto 12px' }} />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>No Support Tickets Found</h3>
                                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Click "Raise Support Ticket" if you need IT or technical assistance.</p>
                            </div>
                        ) : (
                            <table className="opsai-table">
                                <thead>
                                    <tr>
                                        <th>TICKET ID & SUBJECT</th>
                                        <th>CATEGORY</th>
                                        <th style={{ textAlign: 'center' }}>PRIORITY</th>
                                        <th>RAISED BY & DATE</th>
                                        <th style={{ textAlign: 'center' }}>STATUS</th>
                                        <th style={{ textAlign: 'right' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTickets.map((t) => {
                                        const isUrgent = t.priority === 'Urgent' || t.priority === 'High';
                                        const isOpen = t.status === 'Open';

                                        return (
                                            <tr key={t.id}>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{t.title}</div>
                                                    <span className="opsai-id-badge">{t.ticketCode}</span>
                                                </td>
                                                <td>
                                                    <span className="opsai-cat-pill">{t.category}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`opsai-priority-pill ${t.priority?.toLowerCase() || 'medium'}`}>
                                                        {t.priority}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: '#334155' }}>{t.createdByName}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                        {t.createdDate ? new Date(t.createdDate).toLocaleDateString() : 'Recent'}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`opsai-status-pill ${isOpen ? 'pending' : (t.status === 'Resolved' ? 'approved' : 'draft')}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-action-btn"
                                                        onClick={() => openTicketDetails(t)}
                                                    >
                                                        <MessageSquare size={13} style={{ marginRight: '4px' }} /> Discussion
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Kanban View */}
                {viewMode === 'kanban' && (
                    <div className="opsai-kanban-board">
                        {kanbanColumns.map(col => {
                            const colTickets = filteredTickets.filter(t => t.status === col.status);
                            return (
                                <div key={col.status} className="opsai-kanban-col">
                                    <div className="kanban-col-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                                            <span className="kanban-col-title">{col.title}</span>
                                        </div>
                                        <span className="kanban-count-pill">{colTickets.length}</span>
                                    </div>

                                    <div className="kanban-cards-list custom-scroll">
                                        {colTickets.length === 0 ? (
                                            <div className="kanban-empty-slot">No tickets in this column</div>
                                        ) : (
                                            colTickets.map(ticket => (
                                                <div 
                                                    key={ticket.id} 
                                                    className="opsai-kanban-card"
                                                    onClick={() => openTicketDetails(ticket)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span className="opsai-id-badge">{ticket.ticketCode}</span>
                                                        <span className={`opsai-priority-pill ${ticket.priority?.toLowerCase() || 'medium'}`}>{ticket.priority}</span>
                                                    </div>
                                                    <h4 className="kanban-ticket-title">{ticket.title}</h4>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                                                        <span>{ticket.category}</span>
                                                        <span>{ticket.createdByName.split(' ')[0]}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal 1: Raise Ticket */}
            {createModal && (
                <div className="modal-backdrop" onClick={() => setCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Raise New Support Ticket</h3>
                            <button type="button" className="modal-close-btn" onClick={() => setCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateTicket}>
                            <div className="form-group">
                                <label className="form-label">Subject / Issue Summary *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    required 
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="E.g., VPN login failure, SAP S/4 sandbox authorization..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Ticket Category *</label>
                                    <select 
                                        className="form-select"
                                        value={form.categoryId}
                                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Priority Level *</label>
                                    <select 
                                        className="form-select"
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent / Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Detailed Description *</label>
                                <textarea 
                                    className="form-textarea" 
                                    rows={4}
                                    required
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Provide detailed reproduction steps or system error message..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="secondary-btn" onClick={() => setCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="ts-action-solid-btn">
                                    Submit Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Threaded Discussion */}
            {selectedTicket && (
                <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                        <div className="modal-header">
                            <div>
                                <span className="opsai-id-badge">{selectedTicket.ticketCode}</span>
                                <h3 className="modal-title" style={{ marginTop: '4px' }}>{selectedTicket.title}</h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
                        </div>

                        {selectedTicket.description && (
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', color: '#475569', lineHeight: 1.5, border: '1px solid #e2e8f0' }}>
                                {selectedTicket.description}
                            </div>
                        )}

                        <div className="custom-scroll" style={{ maxHeight: '200px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {comments.length === 0 ? (
                                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '14px' }}>No replies on this thread yet.</p>
                            ) : (
                                comments.map(c => (
                                    <div key={c.Id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                            <strong style={{ color: '#0f172a' }}>{c.CommentedBy}</strong>
                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>{c.CreatedDate ? new Date(c.CreatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#334155' }}>{c.Comment}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={commentText} 
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Type a message or resolution update..."
                            />
                            <button type="submit" className="ts-action-solid-btn" style={{ padding: '8px 16px', flexShrink: 0 }}>
                                <Send size={14} /> Send
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
