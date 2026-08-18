import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('mygo_token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.get('/auth/me')
                .then(res => {
                    if (res.data.success) {
                        setUser(res.data.user);
                    } else {
                        logout();
                    }
                })
                .catch(() => logout())
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('mygo_token', userToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('mygo_token');
    };

    const roleIds = user?.roles || [];
    const isAdmin = roleIds.includes(5);
    const isManager = roleIds.includes(2) || isAdmin;
    const isHR = roleIds.includes(4) || isAdmin;
    const isAccountManager = roleIds.includes(3) || isAdmin;
    const isEmployeeOnly = !isAdmin && !isManager && !isHR && !isAccountManager;

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            loading,
            roleIds,
            isAdmin,
            isManager,
            isHR,
            isAccountManager,
            isEmployeeOnly
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
