import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    User, Mail, Phone, MapPin, Briefcase, Shield, 
    Lock, CheckCircle, AlertCircle, Save, Key, Award, 
    Building2, Globe, HeartHandshake, Laptop, Sparkles
} from 'lucide-react';

export default function Profile() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Profile State
    const [personal, setPersonal] = useState({
        fullName: '',
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'Male',
        nationality: 'Indian',
        country: 'India',
        state: 'Telangana',
        city: 'Hyderabad',
        visaStatus: 'Citizen'
    });

    const [employee, setEmployee] = useState({
        employeeId: '',
        department: 'SAP Practice',
        designation: 'Senior Consultant',
        reportingManager: 'Satish Sharma',
        coe: 'Technical & Architecture',
        level: 'L3 - Senior',
        employmentType: 'Full Time',
        memberBillability: 'Billable',
        workLocation: 'Hyderabad, India',
        regionalTimeZone: 'IST (UTC+05:30)',
        primarySkillset: 'SAP ABAP on HANA, S/4HANA, Node.js, React',
        secondarySkillset: 'Fiori, OData, PostgreSQL, Cloud Integration'
    });

    const [contact, setContact] = useState({
        corporateEmail: '',
        personalEmail: '',
        mobileNumber: '',
        addressLine1: '',
        addressLine2: ''
    });

    const [emergency, setEmergency] = useState({
        contactName: '',
        relationship: 'Spouse',
        phoneNumber: ''
    });

    const [system, setSystem] = useState({
        username: '',
        systemRole: 'Consultant',
        assetId: 'MYGO-LT-2026',
        operatingSystem: 'Windows 11 Enterprise',
        vpnAccess: true
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdSaving, setPwdSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get('/profile')
            .then(res => {
                if (res.data.success) {
                    const u = res.data.user || {};
                    const emp = res.data.employee || {};
                    const c = res.data.contact || {};
                    const emg = res.data.emergency || {};
                    const sys = res.data.system || {};

                    setPersonal({
                        fullName: u.fullName || '',
                        firstName: emp.FirstName || u.fullName?.split(' ')[0] || '',
                        middleName: emp.MiddleName || '',
                        lastName: emp.LastName || u.fullName?.split(' ')[1] || '',
                        dateOfBirth: emp.DateOfBirth ? emp.DateOfBirth.slice(0, 10) : '',
                        gender: emp.Gender || 'Male',
                        nationality: emp.Nationality || 'Indian',
                        country: emp.Country || 'India',
                        state: emp.State || 'Telangana',
                        city: emp.City || 'Hyderabad',
                        visaStatus: emp.Visastatus || 'Citizen'
                    });

                    setEmployee({
                        employeeId: emp.EmployeeId || `MYG-${u.id}`,
                        department: emp.Department || 'SAP Practice',
                        designation: emp.Designation || 'Senior Consultant',
                        reportingManager: emp.ReportingManager || 'Satish Sharma',
                        coe: emp.COE || 'Technical & Architecture',
                        level: emp.Level || 'L3 - Senior',
                        employmentType: emp.EmploymentType || 'Full Time',
                        memberBillability: emp.MemberBillability || 'Billable',
                        workLocation: emp.Mem_Location || 'Hyderabad, India',
                        regionalTimeZone: emp.RegionalTimeZone || 'IST (UTC+05:30)',
                        primarySkillset: emp.PrimarySkillset || 'SAP ABAP, S/4HANA, Fullstack',
                        secondarySkillset: emp.SecondarySkillset || 'PostgreSQL, React, Cloud Integration'
                    });

                    setContact({
                        corporateEmail: u.email || '',
                        personalEmail: c.PersonalEmail || '',
                        mobileNumber: c.MobileNumber || '+91 98765 43210',
                        addressLine1: c.AddressLine1 || 'Hi-Tech City, Madhapur',
                        addressLine2: c.AddressLine2 || 'Hyderabad, Telangana'
                    });

                    setEmergency({
                        contactName: emg.ContactName || 'Family Member',
                        relationship: emg.Relationship || 'Spouse',
                        phoneNumber: emg.PhoneNumber || '+91 98765 00000'
                    });

                    setSystem({
                        username: sys.Username || u.email?.split('@')[0] || '',
                        systemRole: sys.SystemRole || 'Consultant',
                        assetId: sys.AssetId || 'MYGO-LT-2026',
                        operatingSystem: sys.OperatingSystem || 'Windows 11 Enterprise',
                        vpnAccess: sys.VPNAccess ?? true
                    });
                }
            })
            .catch(err => {
                console.error('Profile load error:', err);
                setMessage({ type: 'error', text: 'Failed to load employee profile.' });
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSaveProfile = (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        api.put('/profile', { personal, employee, contact, emergency, system })
            .then(res => {
                if (res.data.success) {
                    setMessage({ type: 'success', text: 'Employee profile updated successfully!' });
                }
            })
            .catch(err => {
                setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
            })
            .finally(() => setSaving(false));
    };

    const handleChangePassword = (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match!' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setPwdSaving(true);
        api.put('/profile/password', {
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
        })
        .then(res => {
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        })
        .catch(err => {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
        })
        .finally(() => setPwdSaving(false));
    };

    const initials = personal.fullName
        ? personal.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'YR';

    return (
        <div className="opsai-page-container">
            {/* Top Page Header */}
            <div className="opsai-page-header">
                <div>
                    <h1 className="opsai-page-title">Employee Profile & System Credentials</h1>
                    <p className="opsai-page-desc">Manage your personal demographics, practice allocations, skills, contact addresses, and portal security.</p>
                </div>
                <button type="button" className="ts-action-solid-btn" onClick={handleSaveProfile} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
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

            {/* Hero Profile Overview Card */}
            <div className="opsai-table-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)', border: '1px solid #fed7aa', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
                    {/* Big Avatar */}
                    <div style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ff682c 0%, #ea580c 100%)',
                        color: '#ffffff',
                        fontSize: '28px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(255, 104, 44, 0.35)',
                        border: '3px solid #ffffff'
                    }}>
                        {initials}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{personal.fullName || 'Yashwant Rajput'}</h2>
                            <span className="opsai-status-pill approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Sparkles size={11} /> {employee.designation}
                            </span>
                            <span className="opsai-id-badge">{employee.employeeId}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                            <span><Building2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} /> {employee.department}</span>
                            <span>•</span>
                            <span><Award size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px', color: '#ff682c' }} /> COE: <strong style={{ color: '#0f172a' }}>{employee.coe}</strong></span>
                            <span>•</span>
                            <span><Mail size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} /> {contact.corporateEmail}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs & Editor */}
            <div className="opsai-table-card">
                <div className="opsai-card-tabs-row" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                    <div className="opsai-tab-pill-group" style={{ flexWrap: 'wrap' }}>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            <User size={14} /> Personal & Demographics
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'organization' ? 'active' : ''}`}
                            onClick={() => setActiveTab('organization')}
                        >
                            <Building2 size={14} /> Employment & Organization
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'contact' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contact')}
                        >
                            <Phone size={14} /> Contact & Addresses
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'emergency' ? 'active' : ''}`}
                            onClick={() => setActiveTab('emergency')}
                        >
                            <HeartHandshake size={14} /> Emergency Contacts
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'system' ? 'active' : ''}`}
                            onClick={() => setActiveTab('system')}
                        >
                            <Laptop size={14} /> System & IT Details
                        </button>
                        <button 
                            type="button" 
                            className={`opsai-tab-pill ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <Lock size={14} /> Security & Password
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading employee master data...</p>
                    </div>
                ) : (
                    <div>
                        {/* Tab 1: Personal & Demographics */}
                        {activeTab === 'personal' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">First Name *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.firstName}
                                            onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Middle Name</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.middleName}
                                            onChange={(e) => setPersonal({ ...personal, middleName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Last Name *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.lastName}
                                            onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth</label>
                                        <input 
                                            type="date" 
                                            className="form-input" 
                                            value={personal.dateOfBirth}
                                            onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Gender</label>
                                        <select 
                                            className="form-select"
                                            value={personal.gender}
                                            onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nationality</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.nationality}
                                            onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visa / Citizenship Status</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.visaStatus}
                                            onChange={(e) => setPersonal({ ...personal, visaStatus: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Country</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.country}
                                            onChange={(e) => setPersonal({ ...personal, country: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">State / Province</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.state}
                                            onChange={(e) => setPersonal({ ...personal, state: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={personal.city}
                                            onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Tab 2: Employment & Organization */}
                        {activeTab === 'organization' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Employee ID</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.employeeId}
                                            disabled
                                            style={{ background: '#f1f5f9', color: '#64748b' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Designation / Role</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.designation}
                                            onChange={(e) => setEmployee({ ...employee, designation: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Department / Practice</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.department}
                                            onChange={(e) => setEmployee({ ...employee, department: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Center of Excellence (COE)</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.coe}
                                            onChange={(e) => setEmployee({ ...employee, coe: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Reporting Manager</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.reportingManager}
                                            onChange={(e) => setEmployee({ ...employee, reportingManager: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Career Level</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.level}
                                            onChange={(e) => setEmployee({ ...employee, level: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Employment Type</label>
                                        <select 
                                            className="form-select"
                                            value={employee.employmentType}
                                            onChange={(e) => setEmployee({ ...employee, employmentType: e.target.value })}
                                        >
                                            <option value="Full Time">Full Time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Intern">Intern</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Member Billability</label>
                                        <select 
                                            className="form-select"
                                            value={employee.memberBillability}
                                            onChange={(e) => setEmployee({ ...employee, memberBillability: e.target.value })}
                                        >
                                            <option value="Billable">Billable</option>
                                            <option value="Non-Billable">Non-Billable</option>
                                            <option value="Bench">Bench</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Regional Time Zone</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={employee.regionalTimeZone}
                                            onChange={(e) => setEmployee({ ...employee, regionalTimeZone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Primary Technical Skillsets</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={employee.primarySkillset}
                                        onChange={(e) => setEmployee({ ...employee, primarySkillset: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Secondary Skillsets & Certifications</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={employee.secondarySkillset}
                                        onChange={(e) => setEmployee({ ...employee, secondarySkillset: e.target.value })}
                                    />
                                </div>
                            </form>
                        )}

                        {/* Tab 3: Contact & Addresses */}
                        {activeTab === 'contact' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Corporate Email</label>
                                        <input 
                                            type="email" 
                                            className="form-input" 
                                            value={contact.corporateEmail}
                                            disabled
                                            style={{ background: '#f1f5f9', color: '#64748b' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Personal Email</label>
                                        <input 
                                            type="email" 
                                            className="form-input" 
                                            value={contact.personalEmail}
                                            onChange={(e) => setContact({ ...contact, personalEmail: e.target.value })}
                                            placeholder="your.personal@gmail.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mobile Number *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={contact.mobileNumber}
                                            onChange={(e) => setContact({ ...contact, mobileNumber: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Residential Address Line 1</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={contact.addressLine1}
                                        onChange={(e) => setContact({ ...contact, addressLine1: e.target.value })}
                                        placeholder="Flat/House No., Street, Building..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Address Line 2 / Landmark</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={contact.addressLine2}
                                        onChange={(e) => setContact({ ...contact, addressLine2: e.target.value })}
                                        placeholder="Area, Postal Code, District..."
                                    />
                                </div>
                            </form>
                        )}

                        {/* Tab 4: Emergency Contacts */}
                        {activeTab === 'emergency' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Emergency Contact Name *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={emergency.contactName}
                                            onChange={(e) => setEmergency({ ...emergency, contactName: e.target.value })}
                                            placeholder="E.g., Contact Person"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Relationship</label>
                                        <select 
                                            className="form-select"
                                            value={emergency.relationship}
                                            onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })}
                                        >
                                            <option value="Spouse">Spouse</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Emergency Phone Number *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={emergency.phoneNumber}
                                            onChange={(e) => setEmergency({ ...emergency, phoneNumber: e.target.value })}
                                            placeholder="+91 98765 00000"
                                            required
                                        />
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Tab 5: System & IT Details */}
                        {activeTab === 'system' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Portal Username</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={system.username}
                                            disabled
                                            style={{ background: '#f1f5f9', color: '#64748b' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assigned Workstation / Asset Tag</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={system.assetId}
                                            disabled
                                            style={{ background: '#f1f5f9', color: '#64748b' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Operating System</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={system.operatingSystem}
                                            disabled
                                            style={{ background: '#f1f5f9', color: '#64748b' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>Enterprise VPN Gateway Access</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Authorized for remote client sandbox & SAP infrastructure access.</div>
                                    </div>
                                    <span className="opsai-status-pill approved">Enabled & Verified</span>
                                </div>
                            </div>
                        )}

                        {/* Tab 6: Security & Password */}
                        {activeTab === 'security' && (
                            <form onSubmit={handleChangePassword} style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Current Password</label>
                                    <input 
                                        type="password" 
                                        className="form-input" 
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password *</label>
                                    <input 
                                        type="password" 
                                        className="form-input" 
                                        required
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Minimum 6 characters"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password *</label>
                                    <input 
                                        type="password" 
                                        className="form-input" 
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Re-type new password"
                                    />
                                </div>
                                <button type="submit" className="ts-action-solid-btn" disabled={pwdSaving} style={{ width: 'fit-content' }}>
                                    <Key size={14} /> {pwdSaving ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
