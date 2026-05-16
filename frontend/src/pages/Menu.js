// frontend/src/pages/Menu.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Menu = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Menu and Reviews at the same time!
        const [menuRes, reviewsRes] = await Promise.all([
          axios.get(`/restaurants/${id}/menu`),
          axios.get(`/restaurants/${id}/reviews`)
        ]);
        
        setMenuItems(menuRes.data.data);
        setReviews(reviewsRes.data.data);
        setStats(reviewsRes.data.stats);
      } catch (err) {
        setError('Failed to load restaurant data.');
      }
    };
    fetchData();
  }, [id]);

  const addToCart = async (menuItemId) => {
    try {
      await axios.post('/cart', { menu_item_id: menuItemId, quantity: 1 });
      alert('Added to cart!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to cart');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/restaurants')} style={{ padding: '8px 16px', cursor: 'pointer', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
        ← Back to Restaurants
      </button>
      
      {/* ─── RESTAURANT HEADER & RATING ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '28px' }}>Restaurant Menu</h2>
        {stats.totalReviews > 0 ? (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '8px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#faad14', fontSize: '18px' }}>★</span>
            <strong style={{ fontSize: '18px' }}>{stats.averageRating}</strong>
            <span style={{ color: '#888', fontSize: '14px' }}>({stats.totalReviews} reviews)</span>
          </div>
        ) : (
          <span style={{ color: '#888', fontStyle: 'italic' }}>No reviews yet</span>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* ─── MENU ITEMS ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        {menuItems.length === 0 && !error && <p>No items available right now.</p>}
        {menuItems.map(item => (
          <div key={item.id} style={{ border: '1px solid #e8e8e8', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>{item.name}</h3>
              <p style={{ margin: 0, color: '#237804', fontWeight: 'bold', fontSize: '18px' }}>${item.price}</p>
            </div>
            <button onClick={() => addToCart(item.id)} style={{ padding: '10px 20px', background: '#000', color: '#fff', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button onClick={() => navigate('/cart')} style={{ padding: '15px 40px', background: 'green', color: 'white', fontSize: '18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,128,0,0.2)' }}>
          Proceed to Cart →
        </button>
      </div>

      {/* ─── REVIEWS SECTION ─── */}
      <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px solid #eee' }}>
        <h3>What customers are saying</h3>
        {reviews.length === 0 ? (
          <p style={{ color: '#888' }}>Be the first to leave a review after your order!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {reviews.map((review, index) => (
              <div key={`${review.createdAt}-${review.userId ?? index}`} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} style={{ color: star <= review.rating ? '#faad14' : '#ddd', fontSize: '16px' }}>★</span>
                  ))}
                  <span style={{ color: '#aaa', fontSize: '12px', marginLeft: '10px', marginTop: '2px' }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: '#333', fontStyle: review.comment ? 'normal' : 'italic' }}>
                  {review.comment || 'No comment provided.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Menu;
