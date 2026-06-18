// frontend/src/pages/restaurants/RestaurantList.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';

// Shown when image_url is null or the image fails to load
const RestaurantPlaceholder = ({ name }) => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #87BEEB 0%, #3787cc 100%)' }}
  >
    <span className="text-white text-5xl font-bold font-display opacity-50 select-none">
      {name?.charAt(0)?.toUpperCase() ?? '?'}
    </span>
  </div>
);

const RestaurantCard = ({ restaurant, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const hasImage = restaurant.image_url && !imgError;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        {hasImage ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <RestaurantPlaceholder name={restaurant.name} />
        )}
        {restaurant.estimated_time && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm
            px-2.5 py-1 rounded-full text-xs font-medium text-gray-700 shadow-sm">
            ~{restaurant.estimated_time} min
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-gray-900 text-lg leading-snug">
          {restaurant.name}
        </h3>
        {restaurant.description && (
          <p className="text-gray-400 text-sm mt-1 line-clamp-2 leading-relaxed">
            {restaurant.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          {/* Cuisine tags from M:N join */}
          <div className="flex gap-1.5 flex-wrap">
            {restaurant.Cuisines?.slice(0, 2).map(c => (
              <span
                key={c.id}
                className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs font-medium rounded-full"
              >
                {c.type_name}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {restaurant.delivery_fee > 0
              ? `ETB ${parseFloat(restaurant.delivery_fee).toFixed(0)} delivery`
              : 'Free delivery'}
          </span>
        </div>
      </div>
    </div>
  );
};

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const url = searchQuery
          ? `/restaurants?name=${encodeURIComponent(searchQuery)}`
          : '/restaurants';
        const response = await axios.get(url);
        setRestaurants(response.data.data || []);
        setError('');
      } catch {
        setError('Could not load restaurants. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [searchQuery]); // re-fetches whenever the search param changes

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body">
        <p className="text-gray-400">Loading restaurants…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : 'Restaurants near you'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm">
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} {searchQuery ? 'found' : 'available'}
            </p>
            {searchQuery && (
              <button
                onClick={() => navigate('/restaurants')}
                className="text-xs text-brand-500 hover:text-brand-600 hover:underline transition-colors"
              >
                Clear search ×
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!error && restaurants.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              {searchQuery
                ? `No restaurants found for "${searchQuery}".`
                : 'No restaurants available right now.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => navigate('/restaurants')}
                className="mt-4 text-sm text-brand-500 hover:text-brand-600 hover:underline"
              >
                Browse all restaurants
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map(restaurant => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => navigate(`/restaurants/${restaurant.id}/menu`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantList;
