import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Shield, CheckCircle, AlertCircle, Save, 
    Lock, Key, Check, X, ShieldAlert, Sparkles, 
    Layers, Users, CheckSquare, Eye, RefreshCw
} from 'lucide-react';

export default function Permissions() {
    const { isAdmin } = useAuth();
    const [roles, setRoles] = useState([]);
    const [modules, setModules] = useState([]);
    const [matrix, setMatrix] = useState([]);
    const [selectedRole, setSelectedRole] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadPermissions = () => {
        setLoading(true);
        api.get('/permissions')
            .then(res => {
                if (res.data.success) {
                    setRoles(res.data.roles || []);
                    setModules(res.data.modules || []);
                    setMatrix(res.data.matrix || []);
                    if (res.data.roles?.length > 0 && !selectedRole) {
                        setSelectedRole(res.data.roles[0].id);
                    }
                }
            })
            .catch(err => {
                console.error('Permissions load error:', err);
                setMessage({ type: 'error', text: 'Failed to load RBAC permissions matrix.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    const getPermission = (roleId, moduleId, field) => {
        const entry = matrix.find(m => m.roleId === roleId && m.moduleId === moduleId);
        return entry ? Boolean(entry[field]) : false;
    };

    const handleToggle = (roleId, moduleId, field) => {
        const currentVal = getPermission(roleId, moduleId, field);
        const newVal = !currentVal;

        const updatedMatrix = [...matrix];
        const existingIdx = updatedMatrix.findIndex(m => m.roleId === roleId && m.moduleId === moduleId);
        if (existingIdx >= 0) {
            updatedMatrix[existingIdx] = {
                ...updatedMatrix[existingIdx],
                [field]: newVal
            };
        } else {
            updatedMatrix.push({
                roleId,
                moduleId,
                canView: field === 'canView' ? newVal : false,
                canAdd: field === 'canAdd' ? newVal : false,
                canEdit: field === 'canEdit' ? newVal : false,
                canDelete: field === 'canDelete' ? newVal : false,
                canApprove: field === 'canApprove' ? newVal : false,
                canExport: field === 'canExport' ? newVal : false
            });
        }
        setMatrix(updatedMatrix);
        setHasUnsavedChanges(true);
    };

    const handleApplyPreset = (roleId, moduleId, preset) => {
        const updatedMatrix = [...matrix];
        const existingIdx = updatedMatrix.findIndex(m => m.roleId === roleId && m.moduleId === moduleId);

        const newVals = {
            canView: preset === 'full' || preset === 'readonly',
            canAdd: preset === 'full',
            canEdit: preset === 'full',
            canDelete: preset === 'full',
            canApprove: preset === 'full',
            canExport: preset === 'full' || preset === 'readonly'
        };

        if (existingIdx >= 0) {
            updatedMatrix[existingIdx] = {
                ...updatedMatrix[existingIdx],
                ...newVals
            };
        } else {
            updatedMatrix.push({
                roleId,
                moduleId,
                ...newVals
            });
        }
        setMatrix(updatedMatrix);
        setHasUnsavedChanges(true);
    };

    const handleSaveAll = () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        api.post('/permissions/save-all', { matrix })
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: res.data.message });
                    setHasUnsavedChanges(false);
                    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save permissions.' });
            })
            .finally(() => setSaving(false));
    };

    const activeRoleObj = roles.find(r => r.id === selectedRole) || roles[0];
    const totalPrivilegesCount = matrix.filter(m => m.canView || m.canAdd || m.canEdit || m.canDelete || m.canApprove || m.canExport).length;

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h1 className="opsai-page-title">RBAC Roles & Matrix Security Control</h1>
                        <span className="opsai-status-pill approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={12} /> Admin Exclusive Access
                        </span>
                    </div>
                    <p className="opsai-page-desc">Configure granular module capabilities (View, Create, Edit, Delete, Approve, Export) per security role.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {hasUnsavedChanges && (
                        <span style={{ fontSize: '12px', color: '#ea580c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14} /> Unsaved Changes
                        </span>
                    )}
                    <button 
                        type="button" 
                        className="ts-action-solid-btn"
                        onClick={handleSaveAll}
                        disabled={saving}
                        style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                        <Save size={15} /> {saving ? 'Saving Security Policy...' : 'Save Permission Matrix'}
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
                <div className="ts-kpi-card ts-kpi-orange-top">
                    <div className="ts-kpi-icon-box orange">
                        <Users size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">CONFIGURED ROLES</div>
                        <div className="ts-kpi-val">{roles.length}</div>
                        <div className="ts-kpi-sub">security archetypes</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box teal">
                        <Layers size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">SYSTEM MODULES</div>
                        <div className="ts-kpi-val">{modules.length}</div>
                        <div className="ts-kpi-sub">controlled capabilities</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box slate">
                        <Key size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">GRANTED PRIVILEGES</div>
                        <div className="ts-kpi-val">{totalPrivilegesCount}</div>
                        <div className="ts-kpi-sub">active rule mappings</div>
                    </div>
                </div>

                <div className="ts-kpi-card">
                    <div className="ts-kpi-icon-box dark">
                        <Shield size={20} />
                    </div>
                    <div className="ts-kpi-content">
                        <div className="ts-kpi-label">SECURITY POLICY</div>
                        <div className="ts-kpi-val">Strict RBAC</div>
                        <div className="ts-kpi-sub">instant runtime sync</div>
                    </div>
                </div>
            </div>

            {/* Main Permission Matrix Card */}
            <div className="opsai-table-card">
                {/* Role Tabs */}
                <div className="opsai-card-tabs-row" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                    <div className="opsai-tab-pill-group" style={{ flexWrap: 'wrap' }}>
                        {roles.map(r => (
                            <button 
                                key={r.id}
                                type="button" 
                                className={`opsai-tab-pill ${selectedRole === r.id ? 'active' : ''}`}
                                onClick={() => setSelectedRole(r.id)}
                            >
                                <Shield size={14} /> {r.name}
                            </button>
                        ))}
                    </div>

                    {activeRoleObj && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Configuring: <strong style={{ color: '#0f172a' }}>{activeRoleObj.name}</strong> ({activeRoleObj.description || 'Restricted'})
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading access matrix rules...</p>
                    </div>
                ) : (
                    <div className="ts-table-responsive" style={{ marginTop: '16px' }}>
                        <table className="opsai-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '28%' }}>MODULE / SYSTEM CAPABILITY</th>
                                    <th style={{ textAlign: 'center' }}>CAN VIEW</th>
                                    <th style={{ textAlign: 'center' }}>CAN CREATE</th>
                                    <th style={{ textAlign: 'center' }}>CAN EDIT</th>
                                    <th style={{ textAlign: 'center' }}>CAN DELETE</th>
                                    <th style={{ textAlign: 'center' }}>CAN APPROVE</th>
                                    <th style={{ textAlign: 'center' }}>CAN EXPORT</th>
                                    <th style={{ textAlign: 'right' }}>QUICK PRESETS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map((m) => {
                                    const canView = getPermission(selectedRole, m.id, 'canView');
                                    const canAdd = getPermission(selectedRole, m.id, 'canAdd');
                                    const canEdit = getPermission(selectedRole, m.id, 'canEdit');
                                    const canDelete = getPermission(selectedRole, m.id, 'canDelete');
                                    const canApprove = getPermission(selectedRole, m.id, 'canApprove');
                                    const canExport = getPermission(selectedRole, m.id, 'canExport');

                                    return (
                                        <tr key={m.id}>
                                            <td>
                                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{m.name}</div>
                                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>{m.description || 'Core feature module'}</div>
                                            </td>

                                            {/* Can View */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canView}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canView')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Can Create */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canAdd}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canAdd')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Can Edit */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canEdit}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canEdit')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Can Delete */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canDelete}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canDelete')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Can Approve */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canApprove}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canApprove')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Can Export */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={canExport}
                                                    onChange={() => handleToggle(selectedRole, m.id, 'canExport')}
                                                    style={{ width: '18px', height: '18px', accentColor: '#ff682c', cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* Quick Presets */}
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm success"
                                                        onClick={() => handleApplyPreset(selectedRole, m.id, 'full')}
                                                        title="Grant All Privileges"
                                                        style={{ padding: '3px 8px', fontSize: '11px' }}
                                                    >
                                                        Full
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm"
                                                        style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', fontSize: '11px' }}
                                                        onClick={() => handleApplyPreset(selectedRole, m.id, 'readonly')}
                                                        title="Read-Only Access"
                                                    >
                                                        Read
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="opsai-btn-sm danger"
                                                        onClick={() => handleApplyPreset(selectedRole, m.id, 'none')}
                                                        title="Revoke Access"
                                                        style={{ padding: '3px 8px', fontSize: '11px' }}
                                                    >
                                                        None
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
