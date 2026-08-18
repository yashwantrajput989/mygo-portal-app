import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, ArrowRight, Check } from 'lucide-react';
import RotatingEarth from '../components/RotatingEarth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { email: email.trim(), password });
            if (res.data.success) {
                login(res.data.user, res.data.token);
                navigate('/dashboard');
            } else {
                setError(res.data.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please verify your email and password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-login-wrapper">
            {/* 3D Rotating Earth & Starfield Canvas */}
            <RotatingEarth />

            {/* Static High-Res Space Background Fallback */}
            <div className="space-bg-layer" />

            {/* Main Content Layout */}
            <div className="space-login-container">
                {/* Left Side: Brand Logo & Think MYGO Hero Typography */}
                <div className="space-hero-side">
                    {/* Top Brand Header */}
                    <div className="brand-header">
                        <div className="brand-logo-icon">
                            <img src="/final3.png" alt="MyGo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        </div>
                        <span className="brand-logo-text">MYGO</span>
                    </div>

                    {/* Bottom Think MYGO Typography */}
                    <div className="hero-text-block">
                        <h1 className="hero-title">
                            <span className="title-white">Think </span>
                            <span className="title-orange">MYGO</span>
                        </h1>
                        <p className="hero-desc">
                            A Global SAP Professional Solution Services Company.
                        </p>
                    </div>
                </div>

                {/* Right Side: Floating Dark Glassmorphic Login Card */}
                <div className="space-form-side">
                    <div className="space-login-card">
                        {/* Close button icon */}
                        <button type="button" className="card-close-btn" title="Close">
                            <X size={16} />
                        </button>

                        <div className="card-header-block">
                            <h2 className="card-title">Welcome back</h2>
                            <p className="card-subtitle">Enter your credentials to access your account</p>
                        </div>

                        {error && (
                            <div className="login-error-banner">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-form">
                            <div className="space-input-group">
                                <label className="space-label">Email</label>
                                <input 
                                    type="email" 
                                    className="space-input" 
                                    placeholder="name@mygoconsulting.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="space-input-group">
                                <label className="space-label">Password</label>
                                <input 
                                    type="password" 
                                    className="space-input" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="space-form-actions">
                                <label className="remember-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="remember-checkbox"
                                    />
                                    <span>Remember Me</span>
                                </label>

                                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact your Workspace Admin to reset your credentials.'); }} className="forgot-password-link">
                                    Forgot password?
                                </a>
                            </div>

                            <button type="submit" className="space-signin-btn" disabled={loading}>
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
