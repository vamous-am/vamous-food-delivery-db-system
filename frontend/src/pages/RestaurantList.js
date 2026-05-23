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

        const payload = response.data?.data;

        // Normalize to an array no matter the backend shape
        // Backend returns: { status, message, data: { results, total, page, totalPages, data: [...] } }
        // So the array lives at response.data.data.data (payload.data)
        let restaurantsArray = [];
        if (Array.isArray(payload)) restaurantsArray = payload;
        else if (Array.isArray(payload?.data)) restaurantsArray = payload.data;
        else if (Array.isArray(payload?.restaurants)) restaurantsArray = payload.restaurants;
        else if (Array.isArray(payload?.items)) restaurantsArray = payload.items;
        else restaurantsArray = [];

        setRestaurants(restaurantsArray);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load restaurants');
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
