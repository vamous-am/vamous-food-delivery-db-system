// frontend/src/pages/MyOrders.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const STATUS_COLORS = {
  PENDING: 'orange', CONFIRMED: 'blue', PREPARING: 'purple',
  READY: 'teal', OUT_FOR_DELIVERY: 'goldenrod', COMPLETED: 'green', CANCELLED: 'red',
};
const PAGE_LIMIT = 10;

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 👉 FIX 3: A real retry trigger that forces useEffect to run
  const [retryTrigger, setRetryTrigger] = useState(0); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`/orders?limit=${PAGE_LIMIT}&offset=${offset}`);
        setOrders(response.data.data);
        setTotal(response.data.total); 
      } catch (err) {
        setError('Could not load your orders. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [offset, retryTrigger]); // 👉 Depend on retryTrigger!
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_LIMIT < total;

  if (loading) return <div style={styles.center}><p style={{ color: '#666' }}>Loading your orders…</p></div>;

  if (error) return (
    <div style={styles.center}>
      <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>
      {/* 👉 FIX 3: Actually triggers a re-fetch now! */}
      <button onClick={() => setRetryTrigger(prev => prev + 1)} style={styles.btn}>Retry</button>
    </div>
  );

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/restaurants')} style={styles.back}>← Back to Restaurants</button>
      <h2 style={{ marginBottom: '20px' }}>My Order History</h2>

      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>You haven't placed any orders yet.</p>
          <button onClick={() => navigate('/restaurants')} style={{ ...styles.btn, ...styles.btnPrimary }}>Go Order Food</button>
        </div>
      ) : (
        <>
          <div style={styles.list}>
            {orders.map(order => (
              <div key={order.id} onClick={() => navigate(`/orders/${order.id}`)} style={styles.orderCard}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0' }}>Order #{order.id}</h4>
                  <p style={styles.meta}>{new Date(order.createdAt).toLocaleString()}</p>
                  <p style={{ margin: '6px 0 0', fontWeight: '600' }}>${parseFloat(order.total_price).toFixed(2)}</p>
                </div>
                <span style={{ ...styles.badge, background: STATUS_COLORS[order.status] || 'gray' }}>{order.status}</span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button disabled={!hasPrev} onClick={() => setOffset(o => o - PAGE_LIMIT)} style={{ ...styles.btn, opacity: hasPrev ? 1 : 0.4 }}>← Previous</button>
              <span style={{ color: '#666', fontSize: '14px' }}>Page {currentPage} of {totalPages}</span>
              <button disabled={!hasNext} onClick={() => setOffset(o => o + PAGE_LIMIT)} style={{ ...styles.btn, opacity: hasNext ? 1 : 0.4 }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  page: { padding: '24px 20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', fontFamily: 'Arial, sans-serif' },
  back: { background: 'none', border: '1px solid #ccc', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  orderCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  meta: { margin: 0, color: '#888', fontSize: '13px' },
  badge: { padding: '6px 14px', borderRadius: '20px', color: '#fff', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' },
  emptyState: { textAlign: 'center', marginTop: '60px', padding: '40px', background: '#f9f9f9', borderRadius: '12px' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '24px' },
  btn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', fontSize: '14px' },
  btnPrimary: { background: '#111', color: '#fff', border: 'none', padding: '10px 24px', fontSize: '15px' },
};
export default MyOrders;