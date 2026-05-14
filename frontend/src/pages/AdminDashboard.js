// frontend/src/pages/AdminDashboard.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const STATUS_COLORS = {
  PENDING: 'orange', CONFIRMED: 'blue', PREPARING: 'purple',
  READY: 'teal', OUT_FOR_DELIVERY: 'goldenrod', COMPLETED: 'green', CANCELLED: 'red',
};

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ activeOrders: 0, todaysRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFetching = useRef(false); // Prevents interval stacking
  const navigate = useNavigate();

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; }
    catch { return {}; }
  })();
  const isAdmin = ['admin', 'restaurant_owner'].includes(currentUser.role);

  const fetchData = async () => {
    if (isFetching.current) return; 
    isFetching.current = true;
    
    try {
      // Parallel fetching for blazing speed
      const [ordersRes, statsRes] = await Promise.all([
        axios.get('/orders?limit=50&offset=0'),
        axios.get('/orders/admin/stats')
      ]);
      
      setOrders(ordersRes.data.data);
      setStats(statsRes.data.data);
      setError('');
    } catch (err) {
      setError('Connection lost. Could not sync with server.');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) return (
    <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Arial' }}>
      <h2 style={{ color: 'red' }}>Access Denied: Admins Only</h2>
      <button onClick={() => navigate('/restaurants')} style={styles.btn}>Go Back</button>
    </div>
  );

  if (loading) return <h2 style={{ textAlign: 'center', padding: '40px', fontFamily: 'Arial' }}>Loading Dashboard...</h2>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>System Dashboard</h2>
        <div>
          <button onClick={() => navigate('/restaurants')} style={{ ...styles.btn, marginRight: '10px' }}>Home</button>
          <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} style={styles.btnDanger}>Logout</button>
        </div>
      </div>

      {/* Error Recovery UI */}
      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: '#cf1322', fontWeight: 'bold', margin: '0 0 10px 0' }}>{error}</p>
          <button onClick={fetchData} style={styles.btn}>Retry Now</button>
        </div>
      )}

      {/* Real Database Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statBoxActive}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0050b3' }}>Active Orders</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#000' }}>{stats.activeOrders}</p>
        </div>
        <div style={styles.statBoxRevenue}>
          <h3 style={{ margin: '0 0 10px 0', color: '#237804' }}>Today's Revenue</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'green' }}>${Number(stats.todaysRevenue).toFixed(2)}</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Live Order Feed</h3>
      
      <div style={styles.list}>
        {orders.length === 0 && !error ? <p style={{ textAlign: 'center', color: 'gray' }}>No orders in the system.</p> : null}
        
        {orders.map(order => (
          <div key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={styles.orderCard}>
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>Order #{order.id}</h4>
              <p style={styles.meta}>{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ ...styles.badge, background: STATUS_COLORS[order.status] || 'gray' }}>{order.status}</span>
              <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', fontSize: '15px' }}>${parseFloat(order.total_price).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { padding: '24px 20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  statsContainer: { display: 'flex', gap: '20px', marginBottom: '30px' },
  statBoxActive: { flex: 1, padding: '24px', background: '#e6f7ff', borderRadius: '10px', border: '1px solid #91d5ff', textAlign: 'center' },
  statBoxRevenue: { flex: 1, padding: '24px', background: '#f6ffed', borderRadius: '10px', border: '1px solid #b7eb8f', textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' },
  orderCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '16px 20px', cursor: 'pointer', background: '#fff', transition: 'box-shadow 0.15s' },
  meta: { margin: 0, color: '#888', fontSize: '13px' },
  badge: { padding: '6px 14px', borderRadius: '20px', color: '#fff', fontWeight: '600', fontSize: '12px', display: 'inline-block' },
  btn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', fontSize: '14px', fontWeight: 'bold' },
  btnDanger: { padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '6px', background: '#ff4d4f', color: '#fff', fontSize: '14px', fontWeight: 'bold' },
};
export default AdminDashboard;