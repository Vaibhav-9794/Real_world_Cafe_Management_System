'use client';

import { useState, useEffect } from 'react';
import { 
  Tag, 
  Mail, 
  Download, 
  Loader2, 
  Trash2, 
  CheckCircle, 
  Send,
  Calendar,
  Percent,
  Plus
} from 'lucide-react';

import { formatCurrency } from '@/config/branding';

export default function PromotionsMarketing() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  // Coupon Form Fields
  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');

  // Newsletter Form Fields
  const [campaignTitle, setCampaignTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetTier, setTargetTier] = useState('All');

  async function loadData() {
    setLoading(true);
    try {
      const [promoRes, newsRes] = await Promise.all([
        fetch('/api/admin/promotions'),
        fetch('/api/admin/newsletter')
      ]);

      const promoJ = await promoRes.json();
      const newsJ = await newsRes.json();

      if (promoJ.success) setCoupons(promoJ.coupons);
      if (newsJ.success) setCampaigns(newsJ.campaigns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, type, value, minSpend, startDate, endDate, usageLimit
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        resetCouponForm();
        loadData();
        alert('Coupon created successfully!');
      } else {
        alert(data.message || 'Failed to create coupon');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (couponCode: string) => {
    if (!confirm(`Are you sure you want to delete coupon code ${couponCode}?`)) return;
    try {
      const res = await fetch(`/api/admin/promotions?code=${couponCode}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      }
    } catch {
      alert('Error deleting coupon');
    }
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle,
          subject,
          content,
          targetTier
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Newsletter sent successfully!');
        resetNewsletterForm();
        loadData();
      } else {
        alert(data.message || 'Failed to send campaign');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCSVExport = async (type: string) => {
    setExporting(type);
    try {
      window.open(`/api/admin/export?type=${type}`, '_blank');
    } catch {
      alert('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const resetCouponForm = () => {
    setCode('');
    setType('PERCENTAGE');
    setValue('');
    setMinSpend('');
    setStartDate('');
    setEndDate('');
    setUsageLimit('100');
  };

  const resetNewsletterForm = () => {
    setCampaignTitle('');
    setSubject('');
    setContent('');
    setTargetTier('All');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading campaign manager...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)' }}>Promotions & Campaigns</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Discounts builder, custom newsletter blast templates and administrative data exports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '32px', alignItems: 'flex-start' }}>
        {/* Left column - Promotions & Coupons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Coupon Form */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Tag size={18} color="var(--color-primary)" /> Create Promotion Coupon
            </h3>
            <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Coupon Code</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. BOHOSPRING"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED AMOUNT (₹)</option>
                    <option value="BOGO">BUY ONE GET ONE (BOGO)</option>
                    <option value="WEEKEND">WEEKEND SPECIAL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Discount Value</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 15"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Minimum Spend (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Start Date</label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>End Date</label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Usage Count Limit</label>
                <input
                  type="number"
                  placeholder="100"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  marginTop: '6px'
                }}
              >
                {submitting && <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />}
                Publish Coupon Code
              </button>
            </form>
          </div>

          {/* Active Coupons List */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Active Promo Codes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {coupons.map((coupon) => (
                <div key={coupon.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <strong style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--color-primary)' }}>{coupon.code}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {coupon.type === 'PERCENTAGE' ? `${coupon.value}% Off` : `${formatCurrency(coupon.value)} Off`} | Min Spend: {formatCurrency(coupon.minSpend)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Valid: {coupon.startDate} to {coupon.endDate}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                      {coupon.usageCount} / {coupon.usageLimit}
                    </span>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.code)}
                      style={{ padding: '6px', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-error)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Campaigns, Newsletters & CSV Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Newsletter Form */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Mail size={18} color="var(--color-primary)" /> Dispatch Newsletter Campaign
            </h3>
            <form onSubmit={handleSendNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Campaign Title (Internal)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Winter Wine Tasting RSVP"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email Subject Line</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. You are invited to an exclusive tasting event..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Target Audience (Loyalty Tiers)</label>
                <select
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                >
                  <option value="All">All Customers (Complete Database)</option>
                  <option value="Gold">Gold Tier Only</option>
                  <option value="Platinum">Platinum Tier Only</option>
                  <option value="VIP Elite">VIP Elite Tier Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Body Content (Markdown/HTML Supported)</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your marketing copy here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', resize: 'vertical', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  marginTop: '6px'
                }}
              >
                {submitting ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} /> : <Send size={14} />}
                Send Marketing Blast
              </button>
            </form>
          </div>

          {/* Export Center (Module 10) */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Download size={18} color="var(--color-primary)" /> BI Reporting & Export Center
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Compile and download clean CSV sheets of operational table records for spreadsheets
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Reservations CSV', type: 'reservations' },
                { label: 'Customers CRM CSV', type: 'customers' },
                { label: 'Revenue Payments CSV', type: 'payments' },
                { label: 'Audit Security Log CSV', type: 'audit' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleCSVExport(item.type)}
                  disabled={exporting === item.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-bg)';
                  }}
                >
                  {exporting === item.type ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={14} /> : <Download size={14} />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
