import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const PERKS = [
  { icon: '🕐', title: 'Flexible hours', body: 'Deliver when you want. No fixed schedule, ever.' },
  { icon: '💰', title: 'Weekly pay', body: 'Get paid every week directly to your account.' },
  { icon: '🛵', title: 'Use any vehicle', body: 'Bike, scooter, or car — you choose what works for you.' },
  { icon: '📱', title: 'Simple driver app', body: 'Accept orders, track earnings, and navigate — all in one place.' },
];

const SignUpToDeliver = () => {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', vehicle: 'bicycle' });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email) {
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

          {/* Hero strip */}
          <div className="
            relative overflow-hidden rounded-3xl
            bg-gradient-to-br from-brand-300 to-brand-500
            px-8 py-16 mb-16 text-center
          ">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-8 left-8 text-8xl">🛵</div>
              <div className="absolute bottom-8 right-8 text-8xl rotate-12">⚡</div>
            </div>
            <div className="relative z-10">
              <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">
                Join the fleet
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
                Deliver on your schedule
              </h1>
              <p className="text-white/80 text-lg max-w-md mx-auto">
                Earn money between classes. No boss, no fixed hours, no nonsense.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* ── Perks ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {PERKS.map((perk, index) => (
                <div
                  key={index}
                  className="
                    p-6 rounded-2xl border border-gray-100
                    hover:border-brand-200 hover:shadow-sm
                    transition-all duration-200 group
                  "
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                    {perk.icon}
                  </div>
                  <h3 className="font-display font-semibold text-gray-900 mb-1">{perk.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{perk.body}</p>
                </div>
              ))}

              {/* Earnings preview card */}
              <div className="sm:col-span-2 bg-brand-50 border border-brand-100 rounded-2xl p-6">
                <p className="text-brand-600 text-sm font-semibold uppercase tracking-wide mb-4">
                  Typical earnings
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Per delivery', value: '$4–8' },
                    { label: 'Peak hours', value: '+30%' },
                    { label: 'Weekly avg', value: '$200+' },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <p className="font-display text-2xl font-bold text-brand-600">{item.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Sign up form ── */}
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
              {submitted ? (
                <div className="text-center py-8 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-3xl mx-auto mb-4">
                    🎉
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    You're on the list!
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    We'll be in touch soon with your onboarding details.
                  </p>
                  <Link to="/" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    ← Back to home
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
                    Start earning today
                  </h2>
                  <div className="space-y-4">
                    {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                    {[
                      { name: 'name', label: 'Full name', type: 'text', placeholder: 'Alex Rivera', required: true },
                      { name: 'email', label: 'Email', type: 'email', placeholder: 'alex@university.edu', required: true },
                      { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+1 (555) 000-0000', required: false },
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

                    {/* Vehicle type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Your vehicle
                      </label>
                      <select
                        name="vehicle"
                        value={form.vehicle}
                        onChange={handleChange}
                        className="
                          w-full px-4 py-2.5 rounded-xl border border-gray-200
                          text-sm text-gray-900 bg-white
                          focus:outline-none focus:ring-2 focus:ring-brand-300/50 focus:border-brand-300
                          transition-all duration-200
                        "
                      >
                        <option value="bicycle">🚲 Bicycle</option>
                        <option value="scooter">🛵 Scooter / Moped</option>
                        <option value="car">🚗 Car</option>
                        <option value="ebike">⚡ E-bike</option>
                      </select>
                    </div>

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
                      Apply to deliver
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      Must be 18+ and have a valid ID. Background check required.
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

export default SignUpToDeliver;
