import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Menu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`/restaurants/${id}/menu`);
        setMenuItems(response.data.data);
      } catch (err) {
        setError('Failed to load menu');
      }
    };
    fetchMenu();
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
      <button onClick={() => navigate('/restaurants')} style={{ padding: '8px', cursor: 'pointer' }}>← Back to Restaurants</button>

      <h2 style={{ marginTop: '20px' }}>Menu</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {menuItems.length === 0 && !error && <p>No items available.</p>}
        {menuItems.map((item) => (
          <div key={item.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
              <p style={{ margin: 0, color: 'green', fontWeight: 'bold' }}>${item.price}</p>
            </div>
            <button onClick={() => addToCart(item.id)} style={{ padding: '10px 15px', background: '#000', color: '#fff', cursor: 'pointer', border: 'none' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button onClick={() => navigate('/cart')} style={{ padding: '15px 30px', background: 'green', color: 'white', fontSize: '18px', border: 'none', cursor: 'pointer' }}>
          Proceed to Cart →
        </button>
      </div>
    </div>
  );
};

export default Menu;
