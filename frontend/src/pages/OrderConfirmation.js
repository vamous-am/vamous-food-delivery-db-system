// frontend/src/pages/OrderConfirmation.js
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const STATUS_COLORS = {
  PENDING: 'orange', CONFIRMED: 'blue', PREPARING: 'purple',
  READY: 'teal', OUT_FOR_DELIVERY: 'goldenrod', COMPLETED: 'green', CANCELLED: 'red',
};

const ALL_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // --- Review State ---
  const [rating,     setRating]     = useState(5);
  const [comment,    setComment]    = useState('');
  const [reviewStatus, setReviewStatus] = useState(''); // 'success' | 'error' message
  const [submitting, setSubmitting] = useState(false);  // prevents double-submit

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; }
    catch { return {}; }
  })();
  const isPrivileged = ['admin', 'restaurant_owner', 'driver'].includes(currentUser.role);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/orders/${id}`);
      setOrder(response.data.data);
      setError(''); 
    } catch (err) {
      const status = err.response?.status;
      if (status === 404 || status === 403) {
        clearInterval(intervalRef.current);
        setError(status === 404 ? 'Order not found.' : 'You are not authorized to view this order.');
      } else {
        setError('Network error. Retrying...');
      }
    } finally {
      setLoading(false);
    }
  };

  const intervalRef = useRef(null);

  useEffect(() => {
    fetchOrder(); 
    intervalRef.current = setInterval(fetchOrder, 10000);
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!newStatus || updating) return;
    setUpdating(true);
    try {
      await axios.put(`/orders/${id}/status`, { status: newStatus });
      setNewStatus('');
      await fetchOrder(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  // --- Submit Review Function ---
  const submitReview = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`/orders/${id}/reviews`, { rating, comment });
      setReviewStatus('success');
      await fetchOrder();
    } catch (err) {
      setReviewStatus(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.center}><p>Loading order data…</p></div>;
  if (error && !order) return (
    <div style={styles.center}>
      <p style={{ color: 'red', marginBottom: '16px', fontWeight: 'bold' }}>{error}</p>
      <button onClick={() => navigate('/orders')} style={styles.btn}>← Back to My Orders</button>
    </div>
  );

  const statusColor = STATUS_COLORS[order.status] || 'gray';

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/orders')} style={styles.back}>← My Orders</button>

      <div style={{ ...styles.card, borderTop: `4px solid ${statusColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Order #{order.id}</h2>
            <p style={styles.meta}>{order.Restaurant?.name || 'Restaurant'}</p>
          </div>
          <span style={{ ...styles.badge, background: statusColor }}>{order.status}</span>
        </div>
        <p style={{ ...styles.meta, marginTop: '10px' }}>Auto-refreshing every 10 seconds</p>
      </div>

      <div style={{ ...styles.card, marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 16px' }}>Receipt breakdown</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {order.OrderItems?.map(item => (
            <li key={item.id} style={styles.lineItem}>
              <span>{item.quantity}× {item.MenuItem?.name || 'Unknown item'}</span>
              <span>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div style={{ ...styles.lineItem, fontWeight: 'bold', fontSize: '16px', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          <span>Total (incl. delivery)</span>
          <span>${parseFloat(order.total_price).toFixed(2)}</span>
        </div>
      </div>

      {/* ─── REVIEW SECTION (Only for Customers when order is COMPLETED) ─── */}
      {!isPrivileged && order.status === 'COMPLETED' && (
        <div style={{ ...styles.card, marginTop: '16px', background: '#f8fdf8', border: '1px solid #b7eb8f' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#237804' }}>How was your food?</h3>
          {reviewStatus ? (
            <p style={{
              color:      reviewStatus === 'success' ? 'green' : 'red',
              fontWeight: 'bold',
              margin:     '0',
            }}>
              {reviewStatus === 'success' ? 'Review submitted! Thank you.' : reviewStatus}
            </p>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setRating(star)} 
                    style={{ fontSize: '28px', cursor: 'pointer', color: star <= rating ? '#FFD700' : '#ddd' }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <textarea 
                placeholder="Leave a comment (optional)..." 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                style={styles.textarea}
              />
              <button
                onClick={submitReview}
                disabled={submitting}
                style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── ADMIN SIMULATOR ─── */}
      {isPrivileged && (
        <div style={{ ...styles.card, marginTop: '16px', background: '#fff8f0', border: '1px solid #f0d0a0' }}>
          <h4 style={{ margin: '0 0 8px' }}>Admin — advance status</h4>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={styles.select}>
              <option value="">Select next status…</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleUpdateStatus} disabled={!newStatus || updating} style={{ ...styles.btnPrimary, opacity: (!newStatus || updating) ? 0.5 : 1 }}>
              {updating ? 'Updating…' : 'Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { padding: '24px 20px', fontFamily: 'Arial, sans-serif', maxWidth: '640px', margin: '0 auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', padding: '40px 20px' },
  card: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  back: { background: '#f5f5f5', border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', marginBottom: '16px', fontWeight: 'bold' },
  badge: { padding: '6px 16px', borderRadius: '20px', color: '#fff', fontWeight: 'bold', fontSize: '13px' },
  meta: { margin: 0, color: '#888', fontSize: '13px' },
  lineItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '15px' },
  select: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
  textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '80px', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'Arial' },
  btn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', background: '#fff' },
  btnPrimary: { padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
};

export default OrderConfirmation;
