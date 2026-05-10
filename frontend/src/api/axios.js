import axios from 'axios';

// 1. Environment Variable Support
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// 2. Request Interceptor: Automatically attach Token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: The Zombie State Killer
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only trigger forced logout if the 401 is NOT from the login page
    const isLoginRoute = error.config && error.config.url.includes('/auth/login');

    if (error.response && error.response.status === 401 && !isLoginRoute) {
      alert('Your session has expired or access is denied. Please log in again.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
