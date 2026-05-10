import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`/orders/${id}`);
        setOrder(response.data.data);
      } catch (err) {
        setError('Failed to load order details. Are you sure this is your order?');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <h2 style={{ padding: '20px', textAlign: 'center' }}>Loading Order...</h2>;

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2 style={{ color: 'red' }}>{error}</h2>
      <button onClick={() => navigate('/restaurants')} style={{ padding: '10px 20px', cursor: 'pointer' }}>Go to Restaurants</button>
    </div>
  );

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ background: '#e6ffe6', padding: '30px', borderRadius: '10px', border: '2px solid green' }}>
        <h1 style={{ color: 'green', margin: '0 0 10px 0' }}>Order Placed Successfully! 🎉</h1>
        <p style={{ fontSize: '18px', margin: '0' }}>Thank you for your order.</p>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> #{order.id}</p>
        <p><strong>Current Status:</strong> <span style={{ background: 'orange', padding: '5px 10px', borderRadius: '15px', color: 'white', fontWeight: 'bold' }}>{order.status}</span></p>
        <p><strong>Total Paid:</strong> ${order.total_price}</p>
        <p><strong>Delivering to:</strong> {order.delivery_address}</p>
      </div>

      <button onClick={() => navigate('/restaurants')} style={{ marginTop: '30px', padding: '10px 20px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
        Return to Home
      </button>
    </div>
  );
};

export default OrderConfirmation;
