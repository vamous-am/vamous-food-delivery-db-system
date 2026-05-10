import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get('/restaurants');
        setRestaurants(response.data.data);
      } catch (err) {
        setError('Failed to load restaurants');
      }
    };
    fetchRestaurants();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Available Restaurants</h2>
        <button onClick={handleLogout} style={{ padding: '8px', cursor: 'pointer', background: 'red', color: 'white', border: 'none' }}>Logout</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        {restaurants.map((rest) => (
          <div key={rest.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
            <h3>{rest.name}</h3>
            <p>{rest.address}</p>
            <Link to={`/restaurants/${rest.id}/menu`} style={{ textDecoration: 'none' }}>
              <button style={{ padding: '10px', background: '#000', color: '#fff', cursor: 'pointer', border: 'none' }}>
                View Menu
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantList;
