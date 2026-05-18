import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const BENEFITS = [
  {
    icon: '📈',
    title: 'Grow your reach',
    body: 'Get discovered by thousands of hungry students who order every day.',
  },
  {
    icon: '💸',
    title: 'Low commission',
    body: 'Keep more of what you earn. Our rates are built for small businesses.',
  },
  {
    icon: '📊',
    title: 'Real-time dashboard',
    body: 'Manage orders, update your menu, and track revenue from one place.',
  },
];

const AddRestaurant = () => {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    restaurant: '',
    address: '',
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Phase 0: no real submission — just shows a thank-you state
  // Phase 5: POST /api/restaurants with owner registration flow
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.restaurant) {
      setError('Please fill in all required fields (*)');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Partner with us
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Grow your restaurant<br />with SaporiVivi
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Join our network of local restaurants and reach thousands of customers who are hungry right now.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* ── Benefits ── */}
            <div>
              <div className="space-y-8 mb-10">
                {BENEFITS.map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="
                      w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100
                      flex items-center justify-center text-2xl flex-shrink-0
                    ">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{benefit.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6">
                <p className="text-gray-700 text-sm leading-relaxed italic mb-4">
                  "Joining SaporiVivi doubled our weekday lunch orders in the first month. The dashboard is dead simple to use."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-300 flex items-center justify-center text-white text-xs font-bold">
                    MC
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Maria C.</p>
                    <p className="text-xs text-gray-500">Owner, Trattoria del Centro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Form ── */}
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
              {submitted ? (
                <div className="text-center py-8 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-3xl mx-auto mb-4">
                    ✅
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    We got your details!
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Our team will reach out within 24 hours to get your restaurant listed.
                  </p>
                  <Link
                    to="/"
                    className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    ← Back to home
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
                    Get started today
                  </h2>
                  <div className="space-y-4">
                    {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                    {[
                      { name: 'name', label: 'Your full name', type: 'text', placeholder: 'Maria Conti', required: true },
                      { name: 'email', label: 'Email address', type: 'email', placeholder: 'maria@restaurant.com', required: true },
                      { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+1 (555) 000-0000', required: false },
                      { name: 'restaurant', label: 'Restaurant name', type: 'text', placeholder: 'Trattoria del Centro', required: true },
                      { name: 'address', label: 'Restaurant address', type: 'text', placeholder: '123 Main St, City', required: false },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {field.label}
                          {field.required && <span className="text-brand-400 ml-0.5">*</span>}
                        </label>
                        <input
                          type={field.type}
                          name={field.name}
                          value={form[field.name]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="
                            w-full px-4 py-2.5 rounded-xl border border-gray-200
                            text-sm text-gray-900 placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-brand-300/50 focus:border-brand-300
                            transition-all duration-200
                          "
                        />
                      </div>
                    ))}

                    <button
                      onClick={handleSubmit}
                      className="
                        w-full mt-2 py-3 rounded-xl
                        bg-brand-300 hover:bg-brand-400 active:bg-brand-500
                        text-white font-semibold text-sm
                        transition-all duration-200 shadow-sm
                        hover:shadow-md hover:shadow-brand-300/30
                      "
                    >
                      Submit application
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      No commitment required. Our team reviews every application personally.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddRestaurant;
