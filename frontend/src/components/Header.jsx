// frontend/src/components/Header.jsx
//
// Phase 0 — Sticky navigation header
// Used on: Landing page, and all public pages
// Does NOT import axios or touch auth state — purely presentational.
// Auth pages (Login/Register) render without this header.

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const navigate = useNavigate();

  // Add subtle shadow + blur when user scrolls past hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(!!localStorage.getItem('token'));

    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-change', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-change', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const navLinks = [
    { label: 'Browse restaurants', to: '/restaurants' },
    { label: 'Add your restaurant', to: '/add-restaurant' },
    { label: 'Sign up to deliver', to: '/deliver' },
  ];

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-brand-100'
          : 'bg-white/80 backdrop-blur-sm'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            {/* Simple brand mark — replaced with real logo in Phase 2 */}
            <div className="
              w-8 h-8 rounded-lg bg-brand-300 flex items-center justify-center
              group-hover:bg-brand-400 transition-colors duration-200
            ">
              <span className="text-white font-display font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-display font-semibold text-lg text-gray-900 tracking-tight">
              Sapori<span className="text-brand-400">Vivi</span>
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="
                  text-sm font-body font-medium text-gray-600
                  hover:text-brand-500 transition-colors duration-200
                  relative after:absolute after:bottom-[-2px] after:left-0
                  after:w-0 after:h-[1.5px] after:bg-brand-300
                  after:transition-all after:duration-200
                  hover:after:w-full
                "
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Auth buttons ── */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  to="/orders"
                  className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors"
                >
                  My orders
                </Link>
                <Link
                  to="/restaurants"
                  className="
                    px-4 py-2 rounded-full text-sm font-medium
                    bg-brand-300 text-white
                    hover:bg-brand-400 active:bg-brand-500
                    transition-colors duration-200 shadow-sm
                  "
                >
                  Order now
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="
                    px-4 py-2 rounded-full text-sm font-medium
                    bg-brand-300 text-white
                    hover:bg-brand-400 active:bg-brand-500
                    transition-colors duration-200 shadow-sm
                  "
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {/* Animated hamburger → X */}
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-[1.5px] bg-current transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown menu ── */}
      <div className={`
        md:hidden overflow-hidden transition-all duration-300 bg-white border-t border-gray-100
        ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="px-4 py-3 flex flex-col gap-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-3 flex gap-3">
            {/* FIX 2: Mobile Menu Auth Mismatch Fixed */}
            {isLoggedIn ? (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-full text-sm font-medium border border-brand-300 text-brand-500 hover:bg-brand-50"
                >
                  My orders
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex-1 text-center py-2 rounded-full text-sm font-medium bg-gray-900 text-white hover:bg-gray-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-full text-sm font-medium border border-brand-300 text-brand-500 hover:bg-brand-50"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-full text-sm font-medium bg-brand-300 text-white hover:bg-brand-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
