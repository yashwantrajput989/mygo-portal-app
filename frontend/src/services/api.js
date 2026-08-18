import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('mygo_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // If unauthorized on protected route, redirect to login
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('mygo_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
