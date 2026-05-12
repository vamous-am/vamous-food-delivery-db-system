import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const STATUS_COLORS = {
  PENDING: 'orange', CONFIRMED: 'blue', PREPARING: 'purple',
  READY: 'teal', OUT_FOR_DELIVERY: 'goldenrod', COMPLETED: 'green', CANCELLED: 'red',
};


// 👉 FIX 1: Frontend knows the legal moves now!
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED:[],
};

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false); 

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
        setError('Network error. Retrying in 10 seconds…');
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
  if (loading) return <div style={styles.center}><p style={{ color: '#666' }}>Loading order data…</p></div>;
  if (error && !order) return (
    <div style={styles.center}>
      <p style={{ color: 'red', marginBottom: '16px', fontWeight: '600' }}>{error}</p>
      <button onClick={() => navigate('/orders')} style={styles.btn}>← Back to My Orders</button>
    </div>
  );
  const statusColor = STATUS_COLORS[order.status] || 'gray';
  // 👉 FIX 1: Find only the legal next moves for the dropdown
  const availableNextStates = VALID_TRANSITIONS[order.status] ||[];
  // 👉 FIX 2: Timeline mapping using OrderStatusHistories!
  const historyStatuses = order.OrderStatusHistories?.map(h => h.status) ||[];
// Calculate how far along the main timeline we are (Ignore CANCELLED for the visual tracker)
  const TIMELINE_STAGES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
  const currentStageIndex = TIMELINE_STAGES.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div style={styles.page}>
      {/* Back navigation */}
      <button onClick={() => navigate('/orders')} style={styles.back}>
        ← My Orders
      </button>
      {/* ── Status header ── */}
      <div style={{ ...styles.card, borderTop: `4px solid ${statusColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Order #{order.id}</h2>
            <p style={styles.meta}>{order.Restaurant?.name || 'Restaurant'}</p>
          </div>
          <span style={{ ...styles.badge, background: statusColor }}>
            {order.status}
          </span>
        </div>
        <p style={{ ...styles.meta, marginTop: '10px' }}>
          Auto-refreshing every 10 seconds
          {error && <span style={{ color: 'orange', marginLeft: '8px' }}>({error})</span>}
        </p>
      </div>
      {/* 👉 FIX 2: THE TIMELINE UI */}
      <div style={{ ...styles.card, marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 16px' }}>Live Tracking</h3>
        {isCancelled ? (
          <div style={{ padding: '15px', background: '#ffe6e6', color: '#c62828', borderRadius: '8px', fontWeight: 'bold' }}>
            🚫 This order was cancelled.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {TIMELINE_STAGES.map((stage, index) => {
              // It is completed if it's in history OR it's before the current index
              const isCompleted = historyStatuses.includes(stage) || index < currentStageIndex;
              const isActive = stage === order.status;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: isCompleted || isActive ? 1 : 0.4 }}>
                  <div style={{ 
                    width: '20px', height: '20px', borderRadius: '50%', 
                    background: isActive ? 'orange' : (isCompleted ? 'green' : 'gray'),
                    boxShadow: isActive ? '0 0 8px orange' : 'none'
                  }}></div>
                  <h4 style={{ margin: 0 }}>
                    {stage.replace(/_/g, ' ')} {isCompleted && !isActive && '✅'} {isActive && '⏳'}
                  </h4>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── Receipt breakdown ── */}
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
        <div style={{ ...styles.lineItem, fontWeight: '700', fontSize: '16px', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          <span>Total (incl. delivery)</span>
          <span>${parseFloat(order.total_price).toFixed(2)}</span>
        </div>
        <p style={{ ...styles.meta, marginTop: '10px' }}>
          Delivering to: {order.delivery_address}
        </p>
      </div>

      {/* ── Admin / driver simulator ── */}
      {isPrivileged && (
        <div style={{ ...styles.card, marginTop: '16px', background: '#fff8f0', border: '1px solid #f0d0a0' }}>
          <h4 style={{ margin: '0 0 8px' }}>Admin — advance status</h4>
          
          {availableNextStates.length === 0 ? (
            <p style={{ color: 'gray', fontSize: '14px', margin: 0 }}>No further actions available for this order.</p>
          ) : (
            <>
              <p style={styles.meta}>Backend will reject illegal transitions.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                {/* 👉 FIX 1: SMART DROPDOWN (Only shows legal moves!) */}
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={styles.select}>
                  <option value="">Select next status…</option>
                  {availableNextStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || updating}
                  style={{
                    ...styles.btnPrimary,
                    opacity: (!newStatus || updating) ? 0.5 : 1,
                    cursor:  (!newStatus || updating) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {updating ? 'Updating…' : 'Update'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { padding: '24px 20px', fontFamily: 'Arial, sans-serif', maxWidth: '640px', margin: '0 auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', fontFamily: 'Arial, sans-serif', padding: '40px 20px' },
  card: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '20px 24px' },
  back: { background: 'none', border: '1px solid #ccc', padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  badge: { padding: '6px 16px', borderRadius: '20px', color: '#fff', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' },
  meta: { margin: 0, color: '#888', fontSize: '13px' },
  lineItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '15px' },
  select: { flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
  btn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', fontSize: '14px' },
  btnPrimary: { padding: '8px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px' },
};
export default OrderConfirmation;
