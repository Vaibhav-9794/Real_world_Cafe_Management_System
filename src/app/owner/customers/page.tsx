'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Star, 
  Award, 
  MessageSquare, 
  UserPlus, 
  Loader2, 
  ArrowUpDown,
  Utensils,
  Plus
} from 'lucide-react';

import { formatCurrency } from '@/config/branding';

export default function CustomerCRM() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [vipFilter, setVipFilter] = useState('');
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vipStatus, setVipStatus] = useState(false);
  const [membershipTier, setMembershipTier] = useState('Bronze');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredTable, setPreferredTable] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');

  // Editing Fields for Details pane
  const [editPoints, setEditPoints] = useState(0);
  const [editVip, setEditVip] = useState(false);
  const [editTier, setEditTier] = useState('Bronze');
  const [editNotes, setEditNotes] = useState('');
  const [editDietary, setEditDietary] = useState('');
  const [editTable, setEditTable] = useState('');

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tierFilter) params.append('tier', tierFilter);
      if (vipFilter) params.append('vip', vipFilter);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, [search, tierFilter, vipFilter]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, vipStatus, membershipTier, birthday, notes,
          preferredTable: preferredTable ? parseInt(preferredTable) : null,
          dietaryRestrictions
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddForm(false);
        resetForm();
        fetchCustomers();
      } else {
        alert(data.message || 'Failed to add customer');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedCust) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCust.id,
          points: editPoints,
          vipStatus: editVip,
          membershipTier: editTier,
          notes: editNotes,
          dietaryRestrictions: editDietary,
          preferredTable: editTable ? parseInt(editTable) : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedCust(data.customer);
        fetchCustomers();
        alert('Customer details updated.');
      } else {
        alert(data.message || 'Failed to save');
      }
    } catch {
      alert('Error updating details');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setVipStatus(false);
    setMembershipTier('Bronze');
    setBirthday('');
    setNotes('');
    setPreferredTable('');
    setDietaryRestrictions('');
  };

  const selectCustomer = (cust: any) => {
    setSelectedCust(cust);
    setEditPoints(cust.points);
    setEditVip(cust.vipStatus);
    setEditTier(cust.membershipTier);
    setEditNotes(cust.notes || '');
    setEditDietary(cust.dietaryRestrictions || '');
    setEditTable(cust.preferredTable ? cust.preferredTable.toString() : '');
  };

  if (loading && customers.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)' }}>Customer CRM</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loyalty rewards registry, VIP tiers, preferred seating and dietary tracking</p>
          </div>
          <div style={{ width: '180px', height: '40px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        </div>

        {/* Filter bar skeleton */}
        <div style={{ height: '74px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '16px', padding: '16px' }}>
          <div style={{ flex: 1, height: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
          <div style={{ width: '120px', height: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
          <div style={{ width: '120px', height: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        </div>

        {/* Split grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Table skeleton */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ width: '30%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
              <div style={{ width: '15%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
              <div style={{ width: '10%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
              <div style={{ width: '15%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
              <div style={{ width: '15%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ width: '25%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '12%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '8%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '12%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '12%', height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
              </div>
            ))}
          </div>

          {/* Details pane skeleton */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} className="skeleton" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '60%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '40%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
              </div>
            </div>
            <div style={{ width: '100%', height: '1px', background: 'var(--color-border)' }} />
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '30%', height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .skeleton {
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%);
            background-size: 200% 100%;
            animation: loading-shimmer 1.5s infinite;
          }
          @keyframes loading-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)' }}>Customer CRM</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loyalty rewards registry, VIP tiers, preferred seating and dietary tracking</p>
        </div>

        <button
          onClick={() => { setShowAddForm(true); resetForm(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-primary)',
            color: 'var(--color-bg)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <UserPlus size={16} /> Create Customer Profile
        </button>
      </div>

      {/* CRM Search & Filters bar */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
          <Search size={16} color="var(--color-text-secondary)" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: 'transparent' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
          <Award size={16} color="var(--color-primary)" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{ background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="" style={{ background: 'var(--color-card)' }}>All Tiers</option>
            <option value="Bronze" style={{ background: 'var(--color-card)' }}>Bronze</option>
            <option value="Silver" style={{ background: 'var(--color-card)' }}>Silver</option>
            <option value="Gold" style={{ background: 'var(--color-card)' }}>Gold</option>
            <option value="Platinum" style={{ background: 'var(--color-card)' }}>Platinum</option>
            <option value="VIP Elite" style={{ background: 'var(--color-card)' }}>VIP Elite</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
          <Star size={16} color="var(--color-warning)" />
          <select
            value={vipFilter}
            onChange={(e) => setVipFilter(e.target.value)}
            style={{ background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="" style={{ background: 'var(--color-card)' }}>All Statuses</option>
            <option value="true" style={{ background: 'var(--color-card)' }}>VIP Only</option>
            <option value="false" style={{ background: 'var(--color-card)' }}>Regular Only</option>
          </select>
        </div>
      </div>

      {/* Main CRM Workspace (Split Pane) */}
      <div className="crm-split-pane" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Customer List Pane */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: '100%' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Customer Name</th>
                  <th style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Loyalty Tier</th>
                  <th style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Visits</th>
                  <th style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Spent</th>
                  <th style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Loyalty Points</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const isSelected = selectedCust?.id === cust.id;
                  return (
                    <tr 
                      key={cust.id} 
                      onClick={() => selectCustomer(cust)}
                      style={{ 
                        borderBottom: '1px solid var(--color-border)', 
                        cursor: 'pointer', 
                        background: isSelected ? 'var(--color-primary-glow)' : 'transparent',
                        transition: 'background 0.2s' 
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cust.name}
                          {cust.vipStatus && <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" />}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: cust.membershipTier === 'VIP Elite' || cust.membershipTier === 'Platinum' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                        }}>
                          {cust.membershipTier}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace' }}>{cust.visitCount}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 500, fontFamily: 'monospace' }}>{formatCurrency(cust.totalSpent)}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace' }}>{cust.points} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Customer Details Editor Pane */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          {selectedCust ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedCust.name}
                  {selectedCust.vipStatus && <Star size={16} fill="var(--color-warning)" color="var(--color-warning)" />}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', marginTop: '4px' }}>{selectedCust.email}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{selectedCust.phone}</p>
              </div>

              {/* Referral code section */}
              {selectedCust.referralCode && (
                <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Loyalty Referral Code</div>
                  <strong style={{ fontSize: '16px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>{selectedCust.referralCode}</strong>
                </div>
              )}

              {/* Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Loyalty Points</label>
                  <input
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Membership Tier</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="VIP Elite">VIP Elite</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
                  <input
                    type="checkbox"
                    id="editVip"
                    checked={editVip}
                    onChange={(e) => setEditVip(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="editVip" style={{ fontSize: '13px', cursor: 'pointer' }}>Mark as VIP Customer</label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Preferred Table</label>
                    <input
                      type="number"
                      placeholder="e.g. 3"
                      value={editTable}
                      onChange={(e) => setEditTable(e.target.value)}
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Dietary Profile</label>
                    <input
                      type="text"
                      placeholder="e.g. Gluten Free"
                      value={editDietary}
                      onChange={(e) => setEditDietary(e.target.value)}
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>CRM Notes & Behavior Preferences</label>
                  <textarea
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', resize: 'vertical' }}
                    placeholder="Enter preferences e.g. likes corner tables, allergic to nuts"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveDetails}
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
                  marginTop: '10px'
                }}
              >
                {submitting && <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />}
                Save CRM Adjustments
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
              <Users size={40} strokeWidth={1} style={{ margin: '0 auto 16px auto', color: 'var(--color-border-hover)' }} />
              <p style={{ fontSize: '14px' }}>Select a customer from the registry to inspect loyalty metadata or edit profiles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal Overlay */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-title)', marginBottom: '4px' }}>Create Customer CRM Profile</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Register new diner credentials for loyalty and behavioral logs</p>

            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sophia Loren"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. sophia@loren.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Phone Number</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. +91 84006 78200"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Loyalty Tier</label>
                  <select
                    value={membershipTier}
                    onChange={(e) => setMembershipTier(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Birthday (MM-DD)</label>
                  <input
                    type="text"
                    placeholder="e.g. 12-04"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Dietary Restrictions</label>
                  <input
                    type="text"
                    placeholder="e.g. Nut allergy, Vegan"
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Preferred Table Number</label>
                  <input
                    type="number"
                    placeholder="e.g. 3"
                    value={preferredTable}
                    onChange={(e) => setPreferredTable(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  id="addVip"
                  checked={vipStatus}
                  onChange={(e) => setVipStatus(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="addVip" style={{ fontSize: '13px', cursor: 'pointer' }}>Mark as VIP Customer</label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>CRM Bio Notes</label>
                <textarea
                  rows={3}
                  placeholder="Preferences, allergy cautions, favorite foods..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary)',
                    color: 'var(--color-bg)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting && <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />}
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .crm-split-pane {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
