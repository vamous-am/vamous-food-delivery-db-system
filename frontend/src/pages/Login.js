import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios'; // Using our custom helper!

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Correct URL path (axios instance already handles /api)
      const response = await axios.post('/auth/login', { email, password });

      // 2. Unwrap the new Phase 0.5 standardized envelope
      const responseData = response.data?.data;

      // 3. Store the token and user
      localStorage.setItem('token', responseData?.token);
      localStorage.setItem('user', JSON.stringify({
        id: responseData?.user?.id || responseData?.id,
        name: responseData?.user?.name || responseData?.name,
        role: responseData?.user?.role || responseData?.role,
      }));

      // 4. Trigger the custom event to instantly update the header!
      window.dispatchEvent(new Event('auth-change'));

      navigate('/restaurants');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h2>Login to Order Food</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '10px', backgroundColor: isLoading ? '#ccc' : '#000', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <br />
      <Link to="/register">Don't have an account? Register</Link>
    </div>
  );
};

export default Login;
