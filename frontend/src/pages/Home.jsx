// frontend/src/pages/Home.jsx
//
// Phase 0 — Public landing page at route "/"
// Sections: Header (via component), Hero, How it works, Why us, CTA strip, Footer
// No API calls — fully static. Replaced with real data in Phase 5.

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

// ─── Unsplash hero image (food / city delivery aesthetic) ──────────────────
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';

// ─── "How it works" steps ─────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    icon: '🗺️',
    title: 'Pick your restaurant',
    body: 'Browse hundreds of local favorites and hidden gems, all in one place.',
  },
  {
    icon: '🛒',
    title: 'Build your order',
    body: 'Add exactly what you want. No judgment on double portions.',
  },
  {
    icon: '⚡',
    title: 'Track it live',
    body: 'Watch your order move from kitchen to door in real time.',
  },
];

// ─── "Why SaporiVivi" trust signals ────────────────────────────────────────
const WHY_US = [
  { stat: '30+', label: 'Local restaurants' },
  { stat: '~30m', label: 'Average delivery time' },
  { stat: '4.7★', label: 'Customer rating' },
  { stat: '0 fees', label: 'On your first order' },
];

// ─── Simple fade-up hook using IntersectionObserver ───────────────────────
function useFadeUp(threshold = 0.15) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-up');
          el.classList.remove('opacity-0-init');
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

const Home = () => {
  const howRef = useFadeUp();
  const whyRef = useFadeUp();
  const ctaRef = useFadeUp();

  return (
    <div className="min-h-screen bg-white font-body">
      <Header />

      {/* ════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">

        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_IMAGE}
            srcSet="
              https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80 800w,
              https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80 1600w
            "
            sizes="100vw"
            fetchpriority="high"
            alt="Delicious food spread"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay — left side darker for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-900/60 to-gray-900/20" />
          {/* Subtle brand-color tint at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-300/20 to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">

            {/* Eyebrow label */}
            <div className="
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-brand-300/20 border border-brand-300/40 backdrop-blur-sm
              mb-6 animate-fade-in
            ">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-pulse" />
              <span className="text-brand-200 text-xs font-medium tracking-wide uppercase">
                Now delivering across campus
              </span>
            </div>

            {/* Main headline */}
            <h1 className="
              font-display text-5xl sm:text-6xl lg:text-7xl font-bold
              text-white leading-[1.05] tracking-tight
              animate-fade-up
            ">
              Taste the city,
              <br />
              <span className="text-brand-300">without leaving</span>
              <br />
              your couch.
            </h1>

            <p className="
              mt-6 text-lg text-gray-300 leading-relaxed max-w-lg
              animate-fade-up delay-200 opacity-0-init
            ">
              SaporiVivi connects you with the best local restaurants — fast delivery,
              real-time tracking, zero hassle.
            </p>

            {/* CTA buttons */}
            <div className="
              mt-8 flex flex-col sm:flex-row gap-3
              animate-fade-up delay-300 opacity-0-init
            ">
              <Link
                to="/restaurants"
                className="
                  inline-flex items-center justify-center gap-2
                  px-7 py-3.5 rounded-full
                  bg-brand-300 hover:bg-brand-400 active:bg-brand-500
                  text-white font-medium text-base
                  transition-all duration-200 shadow-lg shadow-brand-300/30
                  hover:shadow-xl hover:shadow-brand-300/40 hover:-translate-y-0.5
                "
              >
                Order now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                to="/add-restaurant"
                className="
                  inline-flex items-center justify-center gap-2
                  px-7 py-3.5 rounded-full
                  bg-white/10 hover:bg-white/20 backdrop-blur-sm
                  text-white font-medium text-base border border-white/20
                  hover:border-white/40
                  transition-all duration-200
                "
              >
                Add your restaurant
              </Link>
            </div>

            {/* Social proof strip */}
            <div className="
              mt-10 flex items-center gap-4
              animate-fade-up delay-400 opacity-0-init
            ">
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {['#87BEEB', '#5aa3de', '#3787cc', '#2669ab'].map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-white text-xs font-medium"
                    style={{ background: color, zIndex: 4 - i }}
                  >
                    {['A', 'M', 'R', 'J'][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-300">
                <span className="text-white font-semibold">200+</span> happy peoples ordering every week
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════════════════ */}
      <section
        ref={whyRef}
        className="bg-brand-300 opacity-0-init"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {WHY_US.map((item, i) => (
              <div key={i} className="text-white">
                <p className="font-display text-3xl font-bold">{item.stat}</p>
                <p className="mt-1 text-sm text-white/75 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
          {/* FIX 5: Honest Disclaimer */}
          <p className="text-center text-white/50 text-xs mt-6 italic">*Metrics shown are for demonstration purposes only</p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════ */}
      <section
        ref={howRef}
        className="py-24 bg-white opacity-0-init"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Simple as that
            </p>
            <h2 className="font-display text-4xl font-bold text-gray-900">
              How SaporiVivi works
            </h2>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line on desktop */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center text-center group"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Step number */}
                <div className="
                  w-10 h-10 rounded-full border-2 border-brand-200
                  bg-brand-50 flex items-center justify-center
                  text-brand-500 text-sm font-bold font-display mb-4 z-10
                  group-hover:bg-brand-300 group-hover:text-white group-hover:border-brand-300
                  transition-all duration-300
                ">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-4">{step.icon}</div>

                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURED CATEGORIES (static placeholder — real data in Phase 5)
      ════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-2">
                What's nearby
              </p>
              <h2 className="font-display text-3xl font-bold text-gray-900">
                Explore by cuisine
              </h2>
            </div>
            <Link
              to="/restaurants"
              className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors hidden sm:block"
            >
              See all →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { emoji: '🍕', label: 'Pizza' },
              { emoji: '🍣', label: 'Sushi' },
              { emoji: '🌮', label: 'Mexican' },
              { emoji: '🍔', label: 'Burgers' },
              { emoji: '🥗', label: 'Healthy' },
              { emoji: '🍜', label: 'Noodles' },
            ].map((cat, i) => (
              <Link
                key={i}
                to="/restaurants"
                className="
                  flex flex-col items-center gap-3 p-5 rounded-2xl
                  bg-white border border-gray-100
                  hover:border-brand-200 hover:shadow-md hover:shadow-brand-100/50
                  hover:-translate-y-1
                  transition-all duration-200 group
                "
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                  {cat.emoji}
                </span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-brand-600 transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        className="py-20 bg-white opacity-0-init"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="
            relative overflow-hidden rounded-3xl
            bg-gradient-to-br from-brand-300 via-brand-400 to-brand-500
            px-8 py-16 text-center
          ">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready for your first order?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                Join thousands of people eating well without the walk.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/register"
                  className="
                    inline-flex items-center justify-center
                    px-8 py-3.5 rounded-full
                    bg-white text-brand-600 font-semibold text-base
                    hover:bg-brand-50 active:bg-brand-100
                    transition-all duration-200 shadow-lg
                    hover:shadow-xl hover:-translate-y-0.5
                  "
                >
                  Create free account
                </Link>
                <Link
                  to="/deliver"
                  className="
                    inline-flex items-center justify-center
                    px-8 py-3.5 rounded-full
                    bg-white/15 text-white font-semibold text-base border border-white/30
                    hover:bg-white/25 hover:border-white/50
                    transition-all duration-200
                  "
                >
                  Deliver with us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-300 flex items-center justify-center">
                  <span className="text-white font-display font-bold text-xs">S</span>
                </div>
                <span className="font-display font-semibold text-white">
                  Sapori<span className="text-brand-300">Vivi</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Connecting students with the best local food. Fast, reliable, real.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-white text-sm font-semibold mb-3">Platform</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/restaurants" className="hover:text-brand-300 transition-colors">Browse restaurants</Link></li>
                <li><Link to="/orders" className="hover:text-brand-300 transition-colors">My orders</Link></li>
                <li><Link to="/cart" className="hover:text-brand-300 transition-colors">Cart</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-3">Join us</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/add-restaurant" className="hover:text-brand-300 transition-colors">Add your restaurant</Link></li>
                <li><Link to="/deliver" className="hover:text-brand-300 transition-colors">Become a driver</Link></li>
                <li><Link to="/register" className="hover:text-brand-300 transition-colors">Create account</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs">© {new Date().getFullYear()} SaporiVivi. All rights reserved.</p>
            <p className="text-xs">Built with ❤️ for hungry people everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Home;
