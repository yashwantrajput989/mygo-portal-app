import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Shield, CheckCircle, AlertCircle, Save, 
    Lock, Key, Check, X
} from 'lucide-react';

export default function Permissions() {
    const [roles, setRoles] = useState([]);
    const [modules, setModules] = useState([]);
    const [matrix, setMatrix] = useState([]);
    const [selectedRole, setSelectedRole] = useState(1);
    const [loading, setLoading] = useState(true);
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
                setMessage({ type: 'error', text: 'Failed to load permission matrix.' });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    const getPermission = (roleId, moduleId, field) => {
        const entry = matrix.find(m => m.roleId === roleId && m.moduleId === moduleId);
        return entry ? entry[field] : false;
    };

    const handleToggle = (roleId, moduleId, field) => {
        const currentVal = getPermission(roleId, moduleId, field);
        const newVal = !currentVal;

        // Optimistic UI update
        const updatedMatrix = [...matrix];
        const existingIdx = updatedMatrix.findIndex(m => m.roleId === roleId && m.moduleId === moduleId);
        if (existingIdx >= 0) {
            updatedMatrix[existingIdx][field] = newVal;
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

        // Convert field to PascalCase for backend
        const fieldNameMap = {
            canView: 'CanView',
            canAdd: 'CanAdd',
            canEdit: 'CanEdit',
            canDelete: 'CanDelete',
            canApprove: 'CanApprove',
            canExport: 'CanExport'
        };

        api.post('/permissions/update', {
            roleId,
            moduleId,
            field: fieldNameMap[field] || field,
            value: newVal
        })
        .then(res => {
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Permission updated!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 2500);
            }
        })
        .catch(err => {
            setMessage({ type: 'error', text: 'Failed to update permission flag.' });
        });
    };

    const activeRoleObj = roles.find(r => r.id === selectedRole) || roles[0];

    return (
        <div className="permissions-page">
            <div className="page-header">
                <div className="page-title-group">
                    <h1>Role-Based Access Control (RBAC) Matrix</h1>
                    <p className="page-subtitle">Configure granular security permissions (View, Add, Edit, Delete, Approve, Export) across all portal modules.</p>
                </div>
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

            {/* Role Selection Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {roles.map(r => (
                    <button
                        key={r.id}
                        type="button"
                        className={`nav-tab-link ${selectedRole === r.id ? 'active' : ''}`}
                        onClick={() => setSelectedRole(r.id)}
                        style={{ padding: '10px 18px', fontSize: '13.5px', borderRadius: 'var(--radius-sm)' }}
                    >
                        <Shield size={15} />
                        <span>{r.name}</span>
                    </button>
                ))}
            </div>

            {/* Matrix Table */}
            <div className="card">
                <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Configuring Permissions for: <span style={{ color: 'var(--primary)' }}>{activeRoleObj?.name}</span>
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activeRoleObj?.description || 'Standard system role'}</p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading permission matrix...</p>
                    </div>
                ) : (
                    <table className="timesheet-table">
                        <thead>
                            <tr>
                                <th style={{ width: '260px' }}>Portal Module</th>
                                <th style={{ textAlign: 'center' }}>Can View</th>
                                <th style={{ textAlign: 'center' }}>Can Add</th>
                                <th style={{ textAlign: 'center' }}>Can Edit</th>
                                <th style={{ textAlign: 'center' }}>Can Delete</th>
                                <th style={{ textAlign: 'center' }}>Can Approve</th>
                                <th style={{ textAlign: 'center' }}>Can Export</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map((m) => (
                                <tr key={m.id}>
                                    <td>
                                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{m.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.description}</div>
                                    </td>

                                    {['canView', 'canAdd', 'canEdit', 'canDelete', 'canApprove', 'canExport'].map((field) => {
                                        const isChecked = getPermission(selectedRole, m.id, field);
                                        return (
                                            <td key={field} style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggle(selectedRole, m.id, field)}
                                                    style={{ 
                                                        width: '18px', 
                                                        height: '18px', 
                                                        cursor: 'pointer', 
                                                        accentColor: 'var(--primary)' 
                                                    }}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
