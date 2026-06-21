'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Calendar, 
  Utensils, 
  Award, 
  Heart, 
  Settings, 
  LogOut, 
  Send, 
  KeyRound, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Search, 
  ChevronRight,
  Flame,
  Leaf,
  Wheat,
  Plus
} from 'lucide-react';
import { BRANDING, formatCurrency } from '@/config/branding';

type TabType = 'reservations' | 'orders' | 'loyalty' | 'favorites' | 'preferences';
type LoginMode = 'otp' | 'password' | 'forgot';

export default function CustomerPortal() {
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp' | 'dashboard'>('login');
  const [loginMode, setLoginMode] = useState<LoginMode>('otp');
  
  // Password login states
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<TabType>('reservations');
  const [profile, setProfile] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  
  // Input states
  const [dietary, setDietary] = useState('');
  const [preferredTable, setPreferredTable] = useState(2);
  const [birthday, setBirthday] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check existing session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/loyalty/search');
        const data = await res.json();
        if (res.ok && data.success) {
          setProfile(data.customer);
          setStep('dashboard');
          fetchPortalData();
        }
      } catch {
        // ignore unauthenticated
      }
    }
    checkSession();

    // Fetch recently viewed items from local storage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recently-viewed-dishes');
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          // Match with branding menu items
          const items: any[] = [];
          for (const id of ids) {
            for (const cuisine of BRANDING.menu) {
              for (const cat of cuisine.categories) {
                const found = cat.items.find(item => item.id === id);
                if (found && !items.some(x => x.id === id)) items.push(found);
              }
            }
          }
          setRecentlyViewed(items.slice(0, 5));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  async function fetchPortalData() {
    try {
      const res = await fetch('/api/customers/portal-data');
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setReservations(data.reservations);
        setOrders(data.orders);
        setFavorites(data.favorites);

        // Pre-fill preferences
        setDietary(data.profile.dietaryRestrictions || '');
        setPreferredTable(data.profile.preferredTable || 2);
        setBirthday(data.profile.birthday || '');
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loyalty/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('otp');
      } else {
        setError(data.message || 'Failed to send verification code.');
      }
    } catch {
      setError('Connection failure requesting verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loyalty/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.customer);
        setStep('dashboard');
        fetchPortalData();
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch {
      setError('Connection failure during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customers/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotSent(true);
      } else {
        setError(data.message || 'Failed to send reset link.');
      }
    } catch {
      setError('Connection failure sending reset link.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loyalty/search', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), code: otp.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.customer);
        setStep('dashboard');
        fetchPortalData();
      } else {
        setError(data.message || 'Incorrect or expired verification code.');
      }
    } catch {
      setError('Connection failure verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/loyalty/search', { method: 'DELETE' });
      setStep('login');
      setProfile(null);
      setContact('');
      setOtp('');
    } catch {
      setStep('login');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          dietaryRestrictions: dietary,
          preferredTable: parseInt(preferredTable as any),
          birthday
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Preferences updated successfully.');
        setProfile(data.customer);
      } else {
        setError(data.message || 'Failed to update preferences.');
      }
    } catch {
      setError('Network error saving preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemId: string) => {
    try {
      const res = await fetch('/api/customers/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'REMOVE' })
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(id => id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Find dish details for favorites list
  const getFavoriteDishes = () => {
    const list: any[] = [];
    for (const favId of favorites) {
      for (const cuisine of BRANDING.menu) {
        for (const cat of cuisine.categories) {
          const found = cat.items.find(item => item.id === favId);
          if (found && !list.some(x => x.id === favId)) list.push(found);
        }
      }
    }
    return list;
  };

  const getOrderStatusStep = (status: string) => {
    const states = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
    return states.indexOf(status);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Navbar Header */}
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <Calendar size={18} />
            <span>Home</span>
          </Link>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {BRANDING.logo}
          </div>
          <Link href="/menu" style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span>Browse Menu</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </header>

      <main className="section">
        <div className="container" style={{ maxWidth: '1000px' }}>
          
          {/* ========================================================
              LOGIN PORTAL SCREEN (OTP / PASSWORD / FORGOT)
              ======================================================== */}
          {step === 'login' && (
            <div style={{ maxWidth: '440px', margin: '60px auto 0 auto', animation: 'scaleIn 0.3s ease-out' }}>
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-glow)',
                  border: '1px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto'
                }}>
                  <KeyRound size={26} color="var(--color-primary)" />
                </div>
                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '26px', marginBottom: '8px' }}>Boho Guest Portal</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Securely access reservations, active orders, and loyalty rewards.
                </p>

                {/* Login Mode Tabs */}
                {loginMode !== 'forgot' && (
                  <div style={{ display: 'flex', gap: '0', marginBottom: '28px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
                    <button
                      onClick={() => { setLoginMode('otp'); setError(''); }}
                      style={{
                        flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px',
                        background: loginMode === 'otp' ? 'var(--color-primary)' : 'transparent',
                        color: loginMode === 'otp' ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      OTP Login
                    </button>
                    <button
                      onClick={() => { setLoginMode('password'); setError(''); }}
                      style={{
                        flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px',
                        background: loginMode === 'password' ? 'var(--color-primary)' : 'transparent',
                        color: loginMode === 'password' ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      Password Login
                    </button>
                  </div>
                )}

                {error && (
                  <p style={{ color: 'var(--color-error)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
                    {error}
                  </p>
                )}

                {/* ---- OTP Login Form ---- */}
                {loginMode === 'otp' && (
                  <form onSubmit={handleRequestOtp} style={{ textAlign: 'left' }}>
                    <div className="form-group">
                      <label>Email Address or Phone Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. guest@email.com or +91 9800000000"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}
                    >
                      {loading ? 'Sending Code...' : 'Send Verification Code'}
                      <Send size={14} />
                    </button>
                  </form>
                )}

                {/* ---- Password Login Form ---- */}
                {loginMode === 'password' && (
                  <form onSubmit={handlePasswordLogin} style={{ textAlign: 'left' }}>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="your@email.com"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingRight: '44px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', bottom: '12px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
                      >
                        {showPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '4px', display: 'flex', gap: '8px', justifyContent: 'center' }}
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px' }}>
                      <button
                        type="button"
                        onClick={() => { setLoginMode('forgot'); setForgotEmail(contact); setForgotSent(false); setError(''); }}
                        style={{ color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        Forgot password?
                      </button>
                    </p>
                  </form>
                )}

                {/* ---- Forgot Password Form ---- */}
                {loginMode === 'forgot' && (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <button
                        onClick={() => { setLoginMode('otp'); setForgotSent(false); setError(''); }}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        ← Back to Login
                      </button>
                      <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', margin: 0 }}>Reset Password</h2>
                    </div>
                    {forgotSent ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
                        <p style={{ color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>Reset link sent!</p>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                          If an account exists for <strong>{forgotEmail}</strong>, a secure password reset link has been dispatched. Please check your inbox.
                        </p>
                        <button
                          onClick={() => { setLoginMode('otp'); setForgotSent(false); }}
                          className="btn btn-outline"
                          style={{ marginTop: '20px', width: '100%' }}
                        >
                          Back to Login
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword}>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
                          Enter your registered email address and we will send a secure password reset link.
                        </p>
                        <div className="form-group">
                          <label>Registered Email Address</label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="your@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                        {error && (
                          <p style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
                        )}
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '8px' }}
                        >
                          {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              OTP VERIFICATION SCREEN
              ======================================================== */}
          {step === 'otp' && (
            <div style={{ maxWidth: '440px', margin: '60px auto 0 auto', animation: 'scaleIn 0.3s ease-out' }}>
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-glow)',
                  border: '1px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto'
                }}>
                  <ShieldCheck size={26} color="var(--color-primary)" />
                </div>
                <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '26px', marginBottom: '8px' }}>Security Verification</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  A 6-digit access code has been sent to <strong>{contact}</strong>. Please check your email.
                </p>

                {error && (
                  <p style={{ color: 'var(--color-error)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
                    {error}
                  </p>
                )}

                <form onSubmit={handleVerifyOtp} style={{ textAlign: 'left' }}>
                  <div className="form-group">
                    <label>6-Digit Verification Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter code from email"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 700 }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setStep('login')}
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================
              PORTAL USER DASHBOARD
              ======================================================== */}
          {step === 'dashboard' && profile && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              {/* Profile Greeting Section */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(197,168,128,0.06) 0%, rgba(18,15,13,0.95) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '24px',
                marginBottom: '32px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)'
                  }}>
                    <User size={30} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-title)', fontWeight: 600 }}>{profile.name}</h2>
                      <span className="badge badge-primary" style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', fontWeight: 700 }}>
                        {profile.membershipTier} Member
                      </span>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                      {profile.email} | {profile.phone}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <Link href="/reserve" className="btn btn-primary btn-sm">
                    Book New Table
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.2)', display: 'flex', gap: '6px', alignItems: 'center' }}
                  >
                    <LogOut size={12} /> Sign Out
                  </button>
                </div>
              </div>

              {/* Layout split grid */}
              <div className="account-split-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px', alignItems: 'start' }}>
                {/* Navigation Menu Sidebar */}
                <aside className="card account-sidebar" style={{ padding: '16px 0', border: '1px solid var(--color-border)' }}>
                  <ul className="account-sidebar-menu" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { id: 'reservations', label: 'My Reservations', icon: Calendar },
                      { id: 'orders', label: 'My Table Orders', icon: Utensils },
                      { id: 'loyalty', label: 'Boho Club Points', icon: Award },
                      { id: 'favorites', label: 'Saved Favorites', icon: Heart },
                      { id: 'preferences', label: 'Preferences', icon: Settings }
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <li key={tab.id}>
                          <button
                            onClick={() => setActiveTab(tab.id as TabType)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 20px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              background: activeTab === tab.id ? 'var(--color-primary-glow)' : 'transparent',
                              borderLeft: `3px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </aside>

                {/* Dashboard content viewport */}
                <div style={{ flex: 1 }}>
                  {/* TAB 1: RESERVATIONS */}
                  {activeTab === 'reservations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                        Your Bookings
                      </h3>

                      {reservations.length > 0 ? reservations.map((res) => {
                        const isUpcoming = res.booking_status === 'CONFIRMED' || res.booking_status === 'PENDING' || res.booking_status === 'HELD';
                        return (
                          <div key={res.id} className="card" style={{ border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <span className={`badge ${isUpcoming ? 'badge-primary' : 'badge-success'}`} style={{ marginBottom: '8px' }}>
                                  {res.booking_status}
                                </span>
                                <h4 style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-title)' }}>
                                  {res.branch.name}
                                </h4>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                  {formatCurrency(res.paymentAmount)}
                                </span>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                  {res.paymentStatus}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <Clock size={16} color="var(--color-primary)" />
                                <span>{res.reservation_date} at {res.start_time}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <User size={16} color="var(--color-primary)" />
                                <span>{res.guest_count} Guests</span>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <MapPin size={16} color="var(--color-primary)" />
                                <span>Tables: {res.tables.map((t: any) => t.number).join(', ') || 'Auto-allocated'}</span>
                              </div>
                            </div>

                            {res.special_requests && (
                              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px', background: 'var(--color-bg)', padding: '10px', borderRadius: '4px', borderLeft: '2px solid var(--color-primary)' }}>
                                <strong>Request Note:</strong> {res.special_requests}
                              </p>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No reservations found. Link your reservations by using your registered email.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: QR ORDERS & KDS TRACKING */}
                  {activeTab === 'orders' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                        Your Table Orders
                      </h3>

                      {orders.length > 0 ? orders.map((ord) => {
                        const stepIndex = getOrderStatusStep(ord.status);
                        const progressPercent = stepIndex < 0 ? 0 : (stepIndex / 4) * 100;
                        const validSteps = ['Pending', 'Preparing', 'Ready', 'Served', 'Completed'];

                        return (
                          <div key={ord.id} className="card" style={{ border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Table {ord.tableNumber} Order</h4>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                                  ID: {ord.id.substring(0, 8)} | {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                  {formatCurrency(ord.totalAmount)}
                                </span>
                              </div>
                            </div>

                            {/* Live Order Stepper Timeline */}
                            {ord.status !== 'CANCELLED' ? (
                              <div style={{ margin: '24px 0 16px 0' }}>
                                <div style={{ height: '4px', background: 'var(--color-bg)', width: '100%', borderRadius: '2px', position: 'relative', marginBottom: '8px' }}>
                                  <div style={{ height: '100%', background: 'var(--color-success)', width: `${progressPercent}%`, borderRadius: '2px', transition: 'width 0.5s ease-in-out' }} />
                                  
                                  {/* Milestone Nodes */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'absolute', top: '-6px' }}>
                                    {[0, 1, 2, 3, 4].map(idx => (
                                      <div 
                                        key={idx}
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '50%',
                                          background: stepIndex >= idx ? 'var(--color-success)' : 'var(--color-bg)',
                                          border: `2px solid ${stepIndex >= idx ? 'var(--color-success)' : 'var(--color-border)'}`,
                                          transition: 'background 0.3s'
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                  {validSteps.map((stepLabel, idx) => (
                                    <span 
                                      key={idx} 
                                      style={{ 
                                        fontWeight: stepIndex === idx ? 700 : 500,
                                        color: stepIndex === idx ? 'var(--color-success)' : 'var(--color-text-secondary)'
                                      }}
                                    >
                                      {stepLabel}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', fontSize: '13px', padding: '10px', borderRadius: 'var(--radius-sm)', margin: '12px 0', textAlign: 'center', fontWeight: 600 }}>
                                Order Cancelled
                              </div>
                            )}

                            {/* Order Items List */}
                            <ul style={{ listStyle: 'none', background: 'var(--color-bg)', padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {ord.items.map((item: any) => (
                                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{item.itemName} <strong style={{ color: 'var(--color-primary)' }}>x{item.quantity}</strong></span>
                                  <span>{formatCurrency(item.price * item.quantity)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }) : (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No QR Table Orders found. Place orders directly from the digital menu.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: BOHO CLUB LOYALTY */}
                  {activeTab === 'loyalty' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                        Loyalty & Rewards
                      </h3>

                      {/* Gold Membership Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #181412 0%, #30261f 50%, #181412 100%)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '30px',
                        boxShadow: 'var(--shadow-glow)',
                        color: '#f5f2eb',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '100px', opacity: 0.04, fontFamily: 'serif' }}>
                          ✦
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                              BOHO Club Card
                            </span>
                            <h4 style={{ fontSize: '24px', fontFamily: 'var(--font-title)', marginTop: '8px' }}>{profile.name}</h4>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 700, border: '1px solid var(--color-primary)', padding: '4px 12px', borderRadius: '4px', color: 'var(--color-primary)' }}>
                            {profile.membershipTier}
                          </span>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>
                              Current Points
                            </span>
                            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace', marginTop: '4px' }}>
                              {profile.points} <span style={{ fontSize: '16px' }}>PTS</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>
                              Status Benefits
                            </span>
                            <p style={{ fontSize: '13px', color: 'var(--color-text)', marginTop: '4px' }}>
                              {profile.membershipTier === 'Bronze' ? '1.0x Point Multiplier' :
                               profile.membershipTier === 'Silver' ? '1.1x Point Multiplier + Birthday Dessert' :
                               profile.membershipTier === 'Gold' ? '1.2x Point Multiplier + 10% Discount' : '1.5x Point Multiplier + VIP Priority Seating'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tier Progress */}
                      <div className="card">
                        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Next Tier Progress</h4>
                        
                        {/* Calculate progress */}
                        {(() => {
                          const tiers = [
                            { name: 'Bronze', pts: 0 },
                            { name: 'Silver', pts: 200 },
                            { name: 'Gold', pts: 500 },
                            { name: 'Platinum', pts: 1000 },
                            { name: 'VIP Elite', pts: 2500 }
                          ];
                          const currentIdx = tiers.findIndex(t => t.name.toLowerCase() === profile.membershipTier.toLowerCase());
                          const nextTier = currentIdx >= 0 && currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;
                          const currentTierMin = tiers[currentIdx]?.pts || 0;
                          
                          if (!nextTier) {
                            return <p style={{ fontSize: '13px', color: 'var(--color-success)' }}>✓ You have reached our highest Elite status tier!</p>;
                          }

                          const needed = nextTier.pts - profile.points;
                          const range = nextTier.pts - currentTierMin;
                          const progress = Math.min(100, Math.max(0, ((profile.points - currentTierMin) / range) * 100));

                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Next Level: <strong>{nextTier.name}</strong></span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{needed} more points needed</span>
                              </div>
                              <div style={{ height: '8px', background: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: 'var(--color-primary)', width: `${progress}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Unlocked Rewards List */}
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Unlocked rewards Catalog</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                          {[
                            { name: 'Free Chef Dessert', points: 100, desc: 'Receive an artisanal pastry or chocolate soufflé.' },
                            { name: '₹500 Dine-In Coupon', points: 300, desc: 'Deduct ₹500 from your total food and drinks bill.' },
                            { name: '15% Off Celebration Banquet', points: 600, desc: '15% discount applicable for private banquets.' },
                            { name: 'VIP Private Table Experience', points: 1200, desc: 'Bespoke candlelit layout with complimentary champagne.' }
                          ].map((reward, i) => {
                            const isClaimable = profile.points >= reward.points;
                            return (
                              <div key={i} className="card" style={{ border: '1px solid var(--color-border)', opacity: isClaimable ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <h5 style={{ fontWeight: 600, fontSize: '14px' }}>{reward.name}</h5>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{reward.points} PTS</span>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                                  {reward.desc}
                                </p>
                                <button 
                                  className={`btn btn-sm ${isClaimable ? 'btn-primary' : 'btn-outline'}`}
                                  disabled={!isClaimable}
                                  style={{ width: '100%' }}
                                  onClick={() => alert(`Reward "${reward.name}" code generated! Show this to your host during check-in.`)}
                                >
                                  {isClaimable ? 'Redeem Voucher' : 'Locked'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: SAVED FAVORITES & RECENTLY VIEWED */}
                  {activeTab === 'favorites' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '16px' }}>
                          Saved Favorites
                        </h3>

                        {getFavoriteDishes().length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {getFavoriteDishes().map((dish) => (
                              <div key={dish.id} className="card" style={{ display: 'flex', gap: '16px', padding: '16px', position: 'relative' }}>
                                <button 
                                  onClick={() => handleRemoveFavorite(dish.id)}
                                  style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--color-error)', cursor: 'pointer' }}
                                >
                                  <Heart size={16} fill="currentColor" />
                                </button>
                                <div style={{ width: '80px', height: '60px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                                  <img src={dish.image} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{dish.name}</h4>
                                  <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '2px' }}>
                                    {formatCurrency(dish.price)}
                                  </p>
                                  <Link href="/menu" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'inline-block' }}>
                                    Order Now →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>You haven't saved any dishes yet. Tap the heart icons on the digital menu page to save dishes.</p>
                        )}
                      </div>

                      {/* Recently Viewed */}
                      <div>
                        <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '16px', marginTop: '12px' }}>
                          Recently Viewed Dishes
                        </h3>

                        {recentlyViewed.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {recentlyViewed.map((dish) => (
                              <div key={dish.id} className="card" style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                                <div style={{ width: '80px', height: '60px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                                  <img src={dish.image} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{dish.name}</h4>
                                  <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '2px' }}>
                                    {formatCurrency(dish.price)}
                                  </p>
                                  <Link href="/menu" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'inline-block' }}>
                                    Explore Menu →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Browse the digital menu page to see your recently viewed dishes listed here.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PREFERENCES */}
                  {activeTab === 'preferences' && (
                    <div className="card" style={{ border: '1px solid var(--color-border)' }}>
                      <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '24px' }}>
                        Dining Preferences
                      </h3>

                      {error && (
                        <p style={{ color: 'var(--color-error)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
                          {error}
                        </p>
                      )}
                      {success && (
                        <p style={{ color: 'var(--color-success)', fontSize: '13px', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>
                          {success}
                        </p>
                      )}

                      <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                          <label>Dietary Restrictions / Allergies</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Gluten-free, Peanut allergy, Vegan"
                            value={dietary}
                            onChange={(e) => setDietary(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label>Preferred Seating Size</label>
                          <select
                            className="form-input"
                            value={preferredTable}
                            onChange={(e) => setPreferredTable(parseInt(e.target.value))}
                          >
                            <option value={2}>Couple Table (2 Seats)</option>
                            <option value={4}>Standard Table (4 Seats)</option>
                            <option value={6}>Family Table (6 Seats)</option>
                            <option value={8}>Large Group Table (8+ Seats)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Date of Birth (For Birthday Rewards!)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 05-24 (MM-DD)"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-primary"
                          style={{ alignSelf: 'flex-end', minWidth: '150px' }}
                        >
                          {loading ? 'Saving...' : 'Save Preferences'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <style jsx global>{`
        @media (max-width: 768px) {
          .account-split-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .account-sidebar {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .account-sidebar-menu {
            flex-direction: row !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            gap: 8px !important;
            padding: 4px 0 12px 0 !important;
            -webkit-overflow-scrolling: touch;
          }
          .account-sidebar-menu::-webkit-scrollbar {
            display: none;
          }
          .account-sidebar-menu li {
            flex: 0 0 auto;
          }
          .account-sidebar-menu button {
            border-left: none !important;
            border: 1px solid var(--color-border) !important;
            border-radius: 30px !important;
            padding: 8px 16px !important;
            font-size: 12px !important;
          }
          .account-sidebar-menu button span {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
