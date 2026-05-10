import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

// FIX 3: Isolate constants. In a real app, this comes from a /checkout-preview API.
const DELIVERY_FEE = 50.00;

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null); // FIX 5: Per-item locking!

  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const response = await axios.get('/cart');
      setCartItems(response.data.data);
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Update Quantity (Optimistic UI Update for speed)
  const handleUpdateQuantity = async (id, newQuantity) => {
    if (newQuantity <= 0 || newQuantity > 100) return;
    setProcessingId(id); // Lock ONLY the item being updated

    try {
      await axios.patch(`/cart/${id}`, { quantity: newQuantity });
      // Instantly update React state so the UI feels lightning fast
      setCartItems((prev) => prev.map((item) => item.id === id ? { ...item, quantity: newQuantity } : item));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update quantity');
      await fetchCart(); // Revert state if backend fails
    } finally {
      setProcessingId(null); // Unlock item
    }
  };

  // Remove Item
  const handleRemove = async (id) => {
    setProcessingId(id);
    try {
      await axios.delete(`/cart/${id}`);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove item');
      await fetchCart();
    } finally {
      setProcessingId(null);
    }
  };

  // Phase 5: Place Order
  const handleCheckout = async () => {
    if (!address.trim()) return alert('Please enter a delivery address!');

    setCheckoutLoading(true); // Lock the checkout button
    try {
      const response = await axios.post('/orders', { delivery_address: address });
      navigate(`/orders/${response.data.data.id}`); // Redirect to Confirmation
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed. Please try again.');

      // FIX 8: Phantom Cart Sync. If the network dropped but backend succeeded, we sync.
      await fetchCart();
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <h2 style={{ padding: '20px' }}>Loading cart...</h2>;

  // FIX 6: Safe chaining (item?.MenuItem?.price) prevents crashes if backend shape changes
  const subtotal = cartItems.reduce((sum, item) => sum + ((item?.MenuItem?.price || 0) * item.quantity), 0);
  const total = subtotal + DELIVERY_FEE;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/restaurants')} style={{ padding: '8px', cursor: 'pointer' }}>← Browse Restaurants</button>

      <h2 style={{ marginTop: '20px' }}>Your Cart</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '18px' }}>Your cart is completely empty.</p>
          {/* FIX 4: Empty State Recovery CTA */}
          <button onClick={() => navigate('/restaurants')} style={{ padding: '10px 20px', background: '#000', color: '#fff', cursor: 'pointer', border: 'none', fontSize: '16px' }}>
            Go Find Some Food
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: processingId === item.id ? 0.5 : 1 }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{item?.MenuItem?.name || 'Unknown Item'}</h4>
                  <p style={{ margin: 0, color: 'gray' }}>${item?.MenuItem?.price || 0} each</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleRemove(item.id)} style={{ background: 'red', color: 'white', border: 'none', cursor: 'pointer', padding: '5px 10px' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Order Summary</h3>
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
            <p>Delivery Fee: ${DELIVERY_FEE.toFixed(2)}</p>
            <h3>Total: ${total.toFixed(2)}</h3>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter Delivery Address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                style={{ padding: '10px', fontSize: '16px' }}
              />
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || cartItems.length === 0 || !address.trim()}
                style={{ padding: '15px', background: checkoutLoading || !address.trim() ? '#ccc' : 'green', color: 'white', fontSize: '18px', border: 'none', cursor: 'pointer' }}
              >
                {checkoutLoading ? 'Processing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Cart;
