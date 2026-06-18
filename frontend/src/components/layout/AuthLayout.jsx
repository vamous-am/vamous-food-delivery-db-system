// frontend/src/components/layout/AuthLayout.jsx
//
// Minimal layout for login/register pages.
// Redirects already-authenticated users to /restaurants.

import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AuthLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'restaurant_owner') {
      return <Navigate to="/owner/dashboard" replace />;
    }
    return <Navigate to="/restaurants" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 font-body">
      {/* Brand mark */}
      <Link to="/" className="flex items-center gap-2 mb-10 group">
        <div className="w-8 h-8 rounded-lg bg-brand-300 flex items-center justify-center
          group-hover:bg-brand-400 transition-colors duration-200">
          <span className="text-white font-display font-bold text-sm leading-none">S</span>
        </div>
        <span className="font-display font-semibold text-lg text-gray-900 tracking-tight">
          Sapori<span className="text-brand-400">Vivi</span>
        </span>
      </Link>

      <Outlet />
    </div>
  );
};

export default AuthLayout;
