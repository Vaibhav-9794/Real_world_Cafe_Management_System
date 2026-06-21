'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING, formatCurrency } from '@/config/branding';
import {
  TrendingUp,
  Award,
  IndianRupee,
  Calendar,
  Users,
  Settings,
  Plus,
  RefreshCw,
  LogOut,
  Sliders,
  Edit,
  Tag,
  Gift,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OwnerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'COUPONS' | 'CMS' | 'LOYALTY'>('ANALYTICS');

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Coupon Form State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState('PERCENTAGE');
  const [couponValue, setCouponValue] = useState(10);
  const [couponMinSpend, setCouponMinSpend] = useState(0);
  const [couponStart, setCouponStart] = useState('');
  const [couponEnd, setCouponEnd] = useState('');
  const [couponLimit, setCouponLimit] = useState(100);

  // CMS Form State
  const [cmsConfig, setCmsConfig] = useState({
    tagline: BRANDING.tagline,
    videoHeroUrl: BRANDING.videoHeroUrl,
    welcomeHeader: 'Welcome to Boho Chic Sanctuary',
    storyText: 'Crafting fine culinary memories in a luxurious aesthetic space.',
  });

  // Loyalty Program Config
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pointsPerDollar: 1,
    vipThresholdSpent: 500,
    goldThresholdSpent: 200,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (!authData) {
      router.push('/dashboard/login');
      return;
    }
    const owner = JSON.parse(authData) as OwnerUser;
    if (owner.role !== 'OWNER') {
      router.push('/dashboard/manager'); // downgrade to manager panel if manager
      return;
    }
    setUser(owner);
    fetchAnalytics(owner.branchId, analyticsPeriod);
    fetchCMSConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsPeriod]);

  const fetchAnalytics = async (bId: string, period: string) => {
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?branchId=${bId || ''}&period=${period}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
        setCoupons(data.analytics.couponAnalytics || []);
      } else {
        setError('Failed to gather metrics: ' + data.message);
      }
    } catch {
      setError('Error communicating with analytics endpoint.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCMSConfig = async () => {
    try {
      const res = await fetch('/api/cms?key=homepage');
      const data = await res.json();
      if (res.ok && data.success) {
        setCmsConfig(data.data);
      }
    } catch {
      // Keep defaults from branding config
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/dashboard/login');
  };

  // Create Coupon handler
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setRefreshing(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          type: couponType,
          value: couponValue,
          minSpend: couponMinSpend,
          startDate: couponStart || new Date().toISOString().split('T')[0],
          endDate: couponEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          usageLimit: couponLimit,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Promo code ${couponCode.toUpperCase()} created successfully!`);
        setCouponCode('');
        if (user) fetchAnalytics(user.branchId, analyticsPeriod);
      } else {
        setError(data.message || 'Could not create coupon.');
      }
    } catch {
      setError('Network error creating promo code.');
    } finally {
      setRefreshing(false);
    }
  };

  // Save CMS Config
  const handleSaveCMS = async () => {
    setRefreshing(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'homepage', value: cmsConfig }),
      });
      if (res.ok) {
        setSuccessMsg('Homepage CMS parameters updated successfully!');
      } else {
        setError('CMS save failed.');
      }
    } catch {
      setError('Network error saving CMS configuration.');
    } finally {
      setRefreshing(false);
    }
  };

  // Save Loyalty Rules
  const handleSaveLoyalty = () => {
    setSuccessMsg('Loyalty program thresholds updated in local cache!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw className="spin" size={32} color="var(--color-primary)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header bar */}
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '2px' }}>
              {BRANDING.logo}
            </span>
            <div style={{ height: '24px', width: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-text-secondary)' }}>
              Executive Hub • OWNER
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Welcome, <strong style={{ color: 'var(--color-text)' }}>{user.name}</strong>
            </span>
            <button
              onClick={() => fetchAnalytics(user.branchId, analyticsPeriod)}
              className="btn btn-outline"
              disabled={refreshing}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>Sync</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab System */}
      <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <div className="container" style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ANALYTICS', label: 'Financials & Reports', icon: <TrendingUp size={16} /> },
            { id: 'COUPONS', label: 'Offer & Coupon Engine', icon: <Tag size={16} /> },
            { id: 'CMS', label: 'No-Code CMS Editor', icon: <Sliders size={16} /> },
            { id: 'LOYALTY', label: 'Loyalty & VIP Settings', icon: <Award size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 20px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="container" style={{ marginTop: '20px' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: 'var(--color-error)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            color: 'var(--color-success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Panels */}
      <main className="section" style={{ paddingTop: '24px' }}>
        <div className="container">

          {/* TAB 1: FINANCIAL REPORTS */}
          {activeTab === 'ANALYTICS' && analytics && (
            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px' }}>Business Metrics Overview</h2>
                <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnalyticsPeriod(p)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: analyticsPeriod === p ? 'var(--color-primary)' : 'transparent',
                        color: analyticsPeriod === p ? 'var(--color-bg)' : 'var(--color-text)',
                        border: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {[
                  { label: 'Total Revenue', value: formatCurrency(analytics.totalRevenue), desc: 'Secure deposits collected', icon: <IndianRupee size={20} color="var(--color-success)" /> },
                  { label: 'Reservations', value: analytics.totalReservations, desc: 'Total requests logged', icon: <Calendar size={20} color="var(--color-primary)" /> },
                  { label: 'Waitlisted', value: analytics.waitlistCount, desc: 'Priority waitlist guests', icon: <Users size={20} color="var(--color-warning)" /> },
                  { label: 'Conversion Rate', value: `${analytics.conversionRate}%`, desc: 'Ratio of approved seats', icon: <TrendingUp size={20} color="var(--color-primary)" /> },
                ].map((stat, i) => (
                  <div key={i} className="card" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {stat.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</span>
                      <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{stat.value}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{stat.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lower Section Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                {/* Daily Revenue indicator */}
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', marginBottom: '20px' }}>Daily Bookings Trend</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {analytics.dailyRevenue.map((d: any, idx: number) => {
                      const maxVal = Math.max(...analytics.dailyRevenue.map((x: any) => x.revenue)) || 1;
                      const percentage = (d.revenue / maxVal) * 100;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', width: '90px' }}>{d.date}</span>
                          <div style={{ flex: 1, height: '14px', background: 'var(--color-bg)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '10px', transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, width: 'auto', textAlign: 'right' }}>{formatCurrency(d.revenue)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', width: '30px' }}>({d.count}b)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Time Slots / Event Revenue */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', marginBottom: '16px' }}>Cuisine & Event Revenue</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      {Object.entries(analytics.eventRevenue).map(([type, data]: any) => (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                          <span>Booking Type: <strong>{type}</strong></span>
                          <span>{data.count} orders • <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(data.revenue)}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', marginBottom: '16px' }}>Peak Seating Times</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {analytics.popularTimes.map((timeObj: any, i: number) => (
                        <span key={i} className="badge badge-primary" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} />
                          <span>{timeObj.time} ({timeObj.count} visits)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COUPON ENGINE */}
          {activeTab === 'COUPONS' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px', animation: 'fadeInUp 0.3s ease-out' }}>
              {/* Form builder */}
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={20} color="var(--color-primary)" /> Create Promo Code
                </h3>
                <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>Coupon Code (Alphanumeric)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="E.g. SUMMER50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Discount Type</label>
                      <select
                        className="form-input"
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value)}
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Cash (₹)</option>
                        <option value="BOGO">Buy One Get One (50%)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Discount Value</label>
                      <input
                        type="number"
                        className="form-input"
                        value={couponValue}
                        onChange={(e) => setCouponValue(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Min Spent Threshold</label>
                      <input
                        type="number"
                        className="form-input"
                        value={couponMinSpend}
                        onChange={(e) => setCouponMinSpend(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Usage Count Limit</label>
                      <input
                        type="number"
                        className="form-input"
                        value={couponLimit}
                        onChange={(e) => setCouponLimit(parseInt(e.target.value) || 100)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Starts Active</label>
                      <input
                        type="date"
                        className="form-input"
                        value={couponStart}
                        onChange={(e) => setCouponStart(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Expires Active</label>
                      <input
                        type="date"
                        className="form-input"
                        value={couponEnd}
                        onChange={(e) => setCouponEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                    Create Offer Code
                  </button>
                </form>
              </div>

              {/* Coupon list */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '20px' }}>Active Promo Offers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {coupons.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>No promo campaigns created yet.</p>
                  ) : (
                    coupons.map((coupon) => (
                      <div key={coupon.code} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>{coupon.code}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px' }}>
                            Type: {coupon.type} • Value: {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{coupon.usageCount} / {coupon.usageLimit} scans</span>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            Utilization: {coupon.utilizationRate}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NO-CODE CMS EDITOR */}
          {activeTab === 'CMS' && (
            <div className="card" style={{ padding: '32px', maxWidth: '640px', margin: '0 auto', animation: 'fadeInUp 0.3s ease-out' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} color="var(--color-primary)" /> Visual Web CMS Configurator
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                Update key texts, tagline statements, and hero banners instantly without modifying HTML/TypeScript.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Cafe Branding Tagline</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cmsConfig.tagline}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, tagline: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Background Hero Loop Video URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cmsConfig.videoHeroUrl}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, videoHeroUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Welcome Greeting Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cmsConfig.welcomeHeader}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, welcomeHeader: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Our Story Snippet</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={cmsConfig.storyText}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, storyText: e.target.value })}
                  />
                </div>

                <div style={{
                  padding: '16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <AlertCircle size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <span>
                    Saving changes writes records to the `CMSConfig` table in SQLite database and will populate layout structures instantly.
                  </span>
                </div>

                <button onClick={handleSaveCMS} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  Save CMS Configuration
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOYALTY PROGRAM */}
          {activeTab === 'LOYALTY' && (
            <div style={{ maxWidth: '640px', margin: '0 auto', animation: 'fadeInUp 0.3s ease-out' }}>
              <div className="card" style={{ padding: '32px', marginBottom: '32px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--color-primary)" /> Loyalty Point Multipliers
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Configure point multipliers and VIP threshold spends for automatic customer class upgrades.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label>Points Earned per ₹1 Spent</label>
                    <input
                      type="number"
                      className="form-input"
                      value={loyaltyConfig.pointsPerDollar}
                      onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, pointsPerDollar: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label>Gold Level Min Spent (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={loyaltyConfig.goldThresholdSpent}
                        onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, goldThresholdSpent: parseInt(e.target.value) || 200 })}
                      />
                    </div>

                    <div className="form-group">
                      <label>VIP Elite Min Spent (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={loyaltyConfig.vipThresholdSpent}
                        onChange={(e) => setLoyaltyConfig({ ...loyaltyConfig, vipThresholdSpent: parseInt(e.target.value) || 500 })}
                      />
                    </div>
                  </div>

                  <button onClick={handleSaveLoyalty} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    Update Threshold Settings
                  </button>
                </div>
              </div>

              {/* Loyalty overview text */}
              <div className="card" style={{ padding: '24px', background: 'rgba(197, 168, 128, 0.03)', border: '1px dashed var(--color-primary)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Gift size={16} /> Guest Loyalty Logic Details
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                  Upon successful payment of reservation deposits at checkout, points are automatically credited to the customer CRM record. Point rewards allow loyal guests to request special upgrades or wave cancellation fees.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
