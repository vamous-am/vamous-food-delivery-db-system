// frontend/src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ── Layouts ──────────────────────────────────────────────────────────────────
import AppLayout  from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

// ── Route Guards ─────────────────────────────────────────────────────────────
import ProtectedRoute  from './components/routes/ProtectedRoute';
import RestrictedRoute from './components/routes/RestrictedRoute';

// ── Pages ────────────────────────────────────────────────────────────────────
import Home             from './pages/Home';
import AddRestaurant    from './pages/AddRestaurant';
import SignUpToDeliver  from './pages/SignUpToDeliver';
import AddressBook      from './pages/AddressBook';
import NotFound         from './pages/NotFound';

// ── Auth Pages ──
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// ── Order Pages ──
import Cart              from './pages/orders/Cart';
import MyOrders          from './pages/orders/MyOrders';
import OrderConfirmation from './pages/orders/OrderConfirmation';
import OrderTimeline     from './pages/orders/OrderTimeline';

// ── Restaurant Pages ──
import RestaurantList from './pages/restaurants/RestaurantList';
import Menu           from './pages/restaurants/Menu';

// ── Dashboard Pages ──
import AdminDashboard    from './pages/admin/AdminDashboard';
import OwnerDashboard    from './pages/owner/OwnerDashboard';
import DriverDashboard   from './pages/driver/DriverDashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/"               element={<Home />} />
        <Route path="/add-restaurant" element={<AddRestaurant />} />
        <Route path="/deliver"        element={<SignUpToDeliver />} />

        {/* ── Auth routes (login/register) wrapped in AuthLayout ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ── Protected routes wrapped in AppLayout and ProtectedRoute ── */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/restaurants"          element={<RestaurantList />} />
          <Route path="/restaurants/:id/menu" element={<Menu />} />
          <Route path="/cart"                 element={<Cart />} />
          <Route path="/addresses"            element={<AddressBook />} />
          <Route path="/orders"               element={<MyOrders />} />
          <Route path="/orders/:id"           element={<OrderConfirmation />} />
          <Route path="/orders/:id/timeline" element={<OrderTimeline />} />
          <Route path="/driver/dashboard"    element={<DriverDashboard />} />
        </Route>

        {/* ── Admin only ── */}
        <Route
          path="/admin"
          element={
            <RestrictedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RestrictedRoute>
          }
        />

        {/* ── Owner only ── */}
        <Route
          path="/owner/dashboard"
          element={
            <RestrictedRoute allowedRoles={['restaurant_owner']}>
              <OwnerDashboard />
            </RestrictedRoute>
          }
        />

        {/* ── Analytics (owner only) ── */}
        <Route
          path="/analytics"
          element={
            <RestrictedRoute allowedRoles={['restaurant_owner']}>
              <AnalyticsDashboard />
            </RestrictedRoute>
          }
        />

        {/* ── 404 catch-all ── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;