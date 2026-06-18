// frontend/src/pages/owner/OwnerDashboard.jsx
//
// Sections:
//   1. Restaurant info editor  (PUT /api/restaurants/:id)
//   2. Menu item editor        (PUT /api/menu-items/:id + ImageUpload)
//   3. Active orders           (GET /api/orders + PUT /api/orders/:id/status)
//
// On load: fetches the owner's restaurant using GET /api/restaurants
// filtered to the logged-in owner's data, then fetches the menu and orders.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import axios            from '../../api/axios';
import ImageUpload      from '../../components/common/ImageUpload';
import LoadingSpinner   from '../../components/common/LoadingSpinner';
import { useAuth }      from '../../hooks/useAuth';

// ─── constants ────────────────────────────────────────────────────────────────
const KITCHEN_TRANSITIONS = {
  PAID:      'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
};

const STATUS_LABEL = {
  PAID:             { label: 'New Order',       color: '#15803d', bg: '#dcfce7' },
  CONFIRMED:        { label: 'Confirmed',        color: '#1d4ed8', bg: '#dbeafe' },
  PREPARING:        { label: 'Preparing',        color: '#7e22ce', bg: '#f3e8ff' },
  READY:            { label: 'Ready',            color: '#0f766e', bg: '#ccfbf1' },
  OUT_FOR_DELIVERY: { label: 'On the way',       color: '#b45309', bg: '#fef3c7' },
  COMPLETED:        { label: 'Completed',        color: '#6b7280', bg: '#f3f4f6' },
  PENDING_PAYMENT:  { label: 'Awaiting payment', color: '#b45309', bg: '#fef9c3' },
};

const TABS = { ORDERS: 'orders', MENU: 'menu', RESTAURANT: 'restaurant' };

// ══════════════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════════════
const OwnerDashboard = () => {
  const navigate    = useNavigate();
  const { user: currentUser, logout } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState(TABS.ORDERS);
  const [restaurant, setRestaurant] = useState(null);
  const [menu,       setMenu]       = useState([]);
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  // Restaurant edit form
  const [restForm,   setRestForm]   = useState(null);
  const [restSaving, setRestSaving] = useState(false);

  // Menu item being edited
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm,    setItemForm]    = useState({});
  const [itemSaving,  setItemSaving]  = useState(false);

  // Add new item form
  const [categories,      setCategories]      = useState([]);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemForm,     setNewItemForm]     = useState({
    item_name: '', description: '', price: '', category_id: '', is_available: true, image_url: '',
  });
  const [newItemSaving, setNewItemSaving] = useState(false);

  // Add new category
  const [newCategoryName,   setNewCategoryName]   = useState('');
  const [categoryCreating,  setCategoryCreating]  = useState(false);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [restRes, ordersRes] = await Promise.all([
        axios.get('/restaurants?limit=50'),
        axios.get('/orders'),
      ]);

      // Find the restaurant owned by this user
      const owned = restRes.data.data.find((r) => r.owner_id === currentUser.id);
      if (!owned) {
        setError('No active restaurant found for your account. Contact an admin if you believe this is an error.');
        setLoading(false);
        return;
      }

      setRestaurant(owned);
      setRestForm({
        name:           owned.name,
        description:    owned.description   || '',
        address:        owned.address,
        phone:          owned.phone,
        delivery_fee:   owned.delivery_fee,
        estimated_time: owned.estimated_time || '',
        image_url:      owned.image_url      || '',
      });

      // Fetch menu for this restaurant
      const menuRes = await axios.get(`/restaurants/${owned.id}/menu`);
      setMenu(menuRes.data.data);

      // Orders are already filtered by restaurant for restaurant_owner role
      setOrders(ordersRes.data.data || []);
      setError('');
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchAll();
    // Poll orders every 20 seconds
    const interval = setInterval(() => {
      axios.get('/orders')
        .then((res) => setOrders(res.data.data || []))
        .catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Fetch categories when Menu tab is opened (needed for "Add New Item" selector)
  useEffect(() => {
    if (tab === TABS.MENU && categories.length === 0) {
      axios.get('/menu-items/categories/mine')
        .then((res) => setCategories(res.data.data || []))
        .catch(() => {});
    }
  }, [tab, categories.length]);

  // ── Restaurant update ──────────────────────────────────────────────────────
  const handleRestSave = async () => {
    setRestSaving(true);
    try {
      const res = await axios.put(`/restaurants/${restaurant.id}`, restForm);
      setRestaurant(res.data.data);
      showToast('Restaurant details saved.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save restaurant.');
    } finally {
      setRestSaving(false);
    }
  };

  // ── Menu item edit ─────────────────────────────────────────────────────────
  const startEditItem = (item) => {
    setEditingItem(item.id);
    setItemForm({
      item_name:    item.name,
      description:  item.description  || '',
      price:        item.price,
      is_available: item.is_available,
      image_url:    item.image_url    || '',
    });
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setItemForm({});
  };

  const handleItemSave = async (itemId) => {
    setItemSaving(true);
    try {
      const res = await axios.put(`/menu-items/${itemId}`, itemForm);
      setMenu((prev) =>
        prev.map((m) => (m.id === itemId ? { ...m, ...res.data.data } : m))
      );
      setEditingItem(null);
      showToast('Menu item saved.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save item.');
    } finally {
      setItemSaving(false);
    }
  };

  // ── Create new menu item ───────────────────────────────────────────────────
  const handleCreateItem = async () => {
    if (!newItemForm.item_name.trim()) { showToast('Item name is required.'); return; }
    if (!newItemForm.price || Number(newItemForm.price) <= 0) { showToast('Price must be a positive number.'); return; }
    if (!newItemForm.category_id) { showToast('Please select a category.'); return; }

    setNewItemSaving(true);
    try {
      const res = await axios.post('/menu-items', {
        item_name:    newItemForm.item_name.trim(),
        description:  newItemForm.description.trim() || undefined,
        price:        Number(newItemForm.price),
        category_id:  Number(newItemForm.category_id),
        is_available: newItemForm.is_available,
        image_url:    newItemForm.image_url || undefined,
      });
      // Prepend to menu list so it appears immediately
      setMenu((prev) => [res.data.data, ...prev]);
      setNewItemForm({ item_name: '', description: '', price: '', category_id: '', is_available: true, image_url: '' });
      setShowNewItemForm(false);
      showToast('Menu item added successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create item.');
    } finally {
      setNewItemSaving(false);
    }
  };

  // ── Order status advancement ───────────────────────────────────────────────
  const handleAdvanceStatus = async (orderId, nextStatus) => {
    try {
      await axios.put(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      showToast(`Order #${orderId} → ${nextStatus}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner message="Loading your dashboard…" />;

  if (error) return (
    <div style={s.centered}>
      <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
      <button onClick={() => navigate('/restaurants')} style={s.btnSecondary}>Go home</button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.headerSub}>Owner Portal</p>
          <h2 style={s.headerTitle}>{restaurant.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/restaurants')}
            style={{ ...s.btnSecondary, padding: '8px 16px' }}
          >
            Home
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            style={s.btnDanger}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={s.toast}>{toast}</div>}

      {/* Tabs */}
      <div style={s.tabBar}>
        {[
          { id: TABS.ORDERS,     label: `Orders (${orders.filter(o => ['PAID','CONFIRMED','PREPARING','READY'].includes(o.status)).length} active)` },
          { id: TABS.MENU,       label: `Menu (${menu.length} items)` },
          { id: TABS.RESTAURANT, label: 'Restaurant Info' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={tab === id ? { ...s.tabBtn, ...s.tabBtnActive } : s.tabBtn}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: ORDERS ══════════════════════════════════════════════════════ */}
      {tab === TABS.ORDERS && (
        <div style={s.section}>
          {orders.length === 0 && (
            <p style={s.empty}>No orders yet. They'll appear here automatically.</p>
          )}
          {orders.map((order) => {
            const st         = STATUS_LABEL[order.status] || { label: order.status, color: '#6b7280', bg: '#f3f4f6' };
            const nextStatus = KITCHEN_TRANSITIONS[order.status];
            return (
              <div key={order.id} style={s.card}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <strong>Order #{order.id}</strong>
                    <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                  </div>
                  <p style={s.meta}>{new Date(order.created_at).toLocaleString()}</p>
                  {order.OrderItems && order.OrderItems.length > 0 && (
                    <p style={s.meta}>
                      {order.OrderItems.map(i => `${i.quantity}× ${i.MenuItem?.item_name || 'item'}`).join(', ')}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <strong>${parseFloat(order.total_amount).toFixed(2)}</strong>
                  {nextStatus && (
                    <button
                      onClick={() => handleAdvanceStatus(order.id, nextStatus)}
                      style={s.btnAdvance}
                    >
                      Mark {nextStatus.charAt(0) + nextStatus.slice(1).toLowerCase().replace('_', ' ')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB: MENU ════════════════════════════════════════════════════════ */}
      {tab === TABS.MENU && (
        <div style={s.section}>

          {/* ── Add New Item button / form ── */}
          {!showNewItemForm ? (
            <button
              onClick={() => setShowNewItemForm(true)}
              style={{ ...s.btnPrimary, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              + Add New Item
            </button>
          ) : (
            <div style={{ ...s.card, flexDirection: 'column' }}>
              <strong style={{ fontSize: '15px', marginBottom: '12px' }}>New Menu Item</strong>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>Item name *</label>
                  <input
                    style={s.input}
                    placeholder="e.g. Injera with Tibs"
                    value={newItemForm.item_name}
                    onChange={(e) => setNewItemForm(f => ({ ...f, item_name: e.target.value }))}
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Price (ETB) *</label>
                  <input
                    style={s.input}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm(f => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                  <label style={s.label}>Description</label>
                  <textarea
                    style={{ ...s.input, minHeight: '72px', resize: 'vertical' }}
                    placeholder="Short description (optional)"
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Category *</label>
                  <select
                    style={s.input}
                    value={newItemForm.category_id}
                    onChange={(e) => setNewItemForm(f => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">Select category…</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Availability</label>
                  <select
                    style={s.input}
                    value={newItemForm.is_available ? 'true' : 'false'}
                    onChange={(e) => setNewItemForm(f => ({ ...f, is_available: e.target.value === 'true' }))}
                  >
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>

              {/* Image upload for new item — captures URL before POST */}
              <div style={{ marginTop: '16px' }}>
                <ImageUpload
                  endpoint="/upload/menu-item"
                  extraFields={{}}
                  currentUrl={newItemForm.image_url}
                  onSuccess={(url) => setNewItemForm(f => ({ ...f, image_url: url }))}
                  label="Item photo (optional)"
                  aspectHint="Square or 4:3 ratio works best"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleCreateItem}
                  disabled={newItemSaving || categories.length === 0}
                  style={{ ...s.btnPrimary, opacity: (newItemSaving || categories.length === 0) ? 0.5 : 1, cursor: (newItemSaving || categories.length === 0) ? 'not-allowed' : 'pointer' }}
                >
                  {newItemSaving ? 'Adding…' : 'Add item'}
                </button>
                <button
                  onClick={() => {
                    setShowNewItemForm(false);
                    setNewItemForm({ item_name: '', description: '', price: '', category_id: '', is_available: true, image_url: '' });
                  }}
                  style={s.btnSecondary}
                >
                  Cancel
                </button>
              </div>
              {categories.length === 0 && (
                <p style={{ marginTop: '12px', fontSize: '13px', color: '#b45309', background: '#fef9c3', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  ⚠️ No categories found. Please contact an admin to create categories for your restaurant first.
                </p>
              )}
            </div>
          )}
          {menu.length === 0 && !showNewItemForm && (
            <p style={s.empty}>No menu items found.</p>
          )}
          {menu.map((item) => (
            <div key={item.id} style={s.card}>
              {editingItem === item.id ? (
                /* ── Edit mode ── */
                <div style={{ width: '100%' }}>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Item name</label>
                      <input
                        style={s.input}
                        value={itemForm.item_name}
                        onChange={(e) => setItemForm(f => ({ ...f, item_name: e.target.value }))}
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Price (ETB)</label>
                      <input
                        style={s.input}
                        type="number"
                        step="0.01"
                        value={itemForm.price}
                        onChange={(e) => setItemForm(f => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                      <label style={s.label}>Description</label>
                      <textarea
                        style={{ ...s.input, minHeight: '72px', resize: 'vertical' }}
                        value={itemForm.description}
                        onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Availability</label>
                      <select
                        style={s.input}
                        value={itemForm.is_available ? 'true' : 'false'}
                        onChange={(e) => setItemForm(f => ({ ...f, is_available: e.target.value === 'true' }))}
                      >
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  </div>

                  {/* Image upload — wired with menu_item_id */}
                  <div style={{ marginTop: '16px' }}>
                    <ImageUpload
                      endpoint="/upload/menu-item"
                      extraFields={{ menu_item_id: item.id }}
                      currentUrl={itemForm.image_url}
                      onSuccess={(url) => setItemForm(f => ({ ...f, image_url: url }))}
                      label="Item photo"
                      aspectHint="Square or 4:3 ratio works best"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      onClick={() => handleItemSave(item.id)}
                      disabled={itemSaving}
                      style={s.btnPrimary}
                    >
                      {itemSaving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button onClick={cancelEditItem} style={s.btnSecondary}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <>
                  <div style={{ display: 'flex', gap: '14px', flex: 1, alignItems: 'flex-start' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={s.itemThumb} />
                    ) : (
                      <div style={s.itemThumbFallback}>🍽</div>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <p style={s.meta}>{item.description || '—'}</p>
                      <p style={{ ...s.meta, marginTop: '4px' }}>
                        <strong>${parseFloat(item.price).toFixed(2)}</strong>
                        {' · '}
                        <span style={{ color: item.is_available ? '#16a34a' : '#dc2626' }}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => startEditItem(item)} style={s.btnEdit}>Edit</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ TAB: RESTAURANT INFO ═════════════════════════════════════════════ */}
      {tab === TABS.RESTAURANT && restForm && (
        <div style={s.section}>
          <div style={s.card}>
            <div style={{ width: '100%' }}>
              <div style={s.formGrid}>
                {[
                  { key: 'name',           label: 'Restaurant name',          type: 'text'   },
                  { key: 'phone',          label: 'Phone',                    type: 'tel'    },
                  { key: 'address',        label: 'Address',                  type: 'text'   },
                  { key: 'delivery_fee',   label: 'Delivery fee',             type: 'number' },
                  { key: 'estimated_time', label: 'Est. delivery time (min)', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key} style={s.formGroup}>
                    <label style={s.label}>{label}</label>
                    <input
                      style={s.input}
                      type={type}
                      value={restForm[key]}
                      onChange={(e) => setRestForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                  <label style={s.label}>Description</label>
                  <textarea
                    style={{ ...s.input, minHeight: '80px', resize: 'vertical' }}
                    value={restForm.description}
                    onChange={(e) => setRestForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Restaurant cover image upload */}
              <div style={{ marginTop: '20px' }}>
                <ImageUpload
                  endpoint="/upload/restaurant"
                  extraFields={{ restaurant_id: restaurant.id }}
                  currentUrl={restForm.image_url}
                  onSuccess={(url) => setRestForm(f => ({ ...f, image_url: url }))}
                  label="Restaurant cover image"
                  aspectHint="Recommended: 16:9, minimum 800px wide"
                />
              </div>

              <button
                onClick={handleRestSave}
                disabled={restSaving}
                style={{ ...s.btnPrimary, marginTop: '20px' }}
              >
                {restSaving ? 'Saving…' : 'Save restaurant details'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:              { maxWidth: '900px', margin: '0 auto', padding: '24px 20px', fontFamily: 'Arial, sans-serif' },
  centered:          { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Arial, sans-serif' },
  header:            { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  headerSub:         { margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' },
  headerTitle:       { margin: 0, fontSize: '22px', fontWeight: '700' },
  toast:             { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 18px', marginBottom: '16px', color: '#166534', fontWeight: '600', fontSize: '14px' },
  tabBar:            { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' },
  tabBtn:            { padding: '10px 18px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '600', color: '#6b7280', borderBottom: '3px solid transparent', marginBottom: '-2px' },
  tabBtnActive:      { color: '#111827', borderBottom: '3px solid #111827' },
  section:           { display: 'flex', flexDirection: 'column', gap: '12px' },
  card:              { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px 20px', background: '#fff', gap: '16px' },
  meta:              { margin: '3px 0 0', fontSize: '13px', color: '#6b7280' },
  empty:             { textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '14px' },
  badge:             { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  itemThumb:         { width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
  itemThumbFallback: { width: '60px', height: '60px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 },
  formGrid:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  formGroup:         { display: 'flex', flexDirection: 'column', gap: '4px' },
  label:             { fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:             { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary:        { padding: '10px 22px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary:      { padding: '10px 22px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnEdit:           { padding: '7px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  btnAdvance:        { padding: '7px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnDanger:         { padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};

export default OwnerDashboard;
