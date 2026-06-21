'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BRANDING, formatCurrency } from '@/config/branding';
import { getQRCodeImageUrl, downloadQRCodeAsset, getQRTargetUrl } from '@/utils/qrGenerator';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Copy,
  Download,
  Award,
  DollarSign,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Inbox,
  UserCheck,
  RefreshCw,
  LogOut,
  FolderOpen,
  Mail,
  Phone,
  Bookmark,
  Check,
} from 'lucide-react';

interface ManagerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ManagerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'RESERVATIONS' | 'TABLES' | 'CRM' | 'LEADS'>('RESERVATIONS');

  // Lists state
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  // Filtering/Loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  // Search/Filter states
  const [resFilterStatus, setResFilterStatus] = useState<string>('');
  const [resFilterBranch, setResFilterBranch] = useState<string>('');

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (!authData) {
      router.push('/dashboard/login');
      return;
    }
    const mgr = JSON.parse(authData) as ManagerUser;
    if (mgr.role !== 'MANAGER' && mgr.role !== 'OWNER') {
      router.push('/dashboard/login');
      return;
    }
    setUser(mgr);
    setResFilterBranch(mgr.branchId || '');
    loadAllData(mgr.branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async (bId: string) => {
    setRefreshing(true);
    setError('');
    try {
      // 1. Reservations
      const resUrl = `/api/reservations?branchId=${resFilterBranch || bId || ''}&status=${resFilterStatus}`;
      const resResponse = await fetch(resUrl);
      const resData = await resResponse.json();

      // 2. Tables
      const tablesResponse = await fetch(`/api/tables?branchId=${bId || ''}`);
      const tablesData = await tablesResponse.json();

      // 3. CRM Customers
      const custResponse = await fetch('/api/customers');
      const custData = await custResponse.json();

      // 4. Leads
      const leadsResponse = await fetch('/api/leads');
      const leadsData = await leadsResponse.json();

      if (resData.success) setReservations(resData.reservations);
      if (tablesData.success) setTables(tablesData.tables);
      if (custData.success) setCustomers(custData.customers);
      if (leadsData.success) setLeads(leadsData.leads);
    } catch {
      setError('An error occurred while loading records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/dashboard/login');
  };

  // Trigger Reservations updates
  const handleUpdateResStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item))
        );
      }
    } catch {
      setError('Failed to update reservation.');
    }
  };

  // Trigger CRM updates
  const handleToggleVip = async (id: string, currentVip: boolean) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, vipStatus: !currentVip }),
      });
      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, vipStatus: !currentVip } : c))
        );
      }
    } catch {
      setError('Failed to toggle VIP status.');
    }
  };

  const handleUpdateTier = async (id: string, tier: string) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, membershipTier: tier }),
      });
      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, membershipTier: tier } : c))
        );
      }
    } catch {
      setError('Failed to update customer tier.');
    }
  };

  // Trigger Leads status change
  const handleUpdateLeadStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l))
        );
      }
    } catch {
      setError('Failed to update lead status.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTableId(id);
    setTimeout(() => setCopiedTableId(null), 2000);
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
              Manager console • {user.branchName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Logged in: <strong style={{ color: 'var(--color-text)' }}>{user.name}</strong>
            </span>
            <button
              onClick={() => loadAllData(user.branchId)}
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
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab System */}
      <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <div className="container" style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'RESERVATIONS', label: 'Reservations Queue', icon: <Calendar size={16} /> },
            { id: 'TABLES', label: 'Table QRs & Assets', icon: <Users size={16} /> },
            { id: 'CRM', label: 'Customer Database', icon: <UserCheck size={16} /> },
            { id: 'LEADS', label: 'Lead Pipeline', icon: <Briefcase size={16} /> },
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

      {/* Error alert */}
      {error && (
        <div className="container" style={{ marginTop: '20px' }}>
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
        </div>
      )}

      {/* Panels */}
      <main className="section" style={{ paddingTop: '32px' }}>
        <div className="container">

          {/* TAB 1: RESERVATIONS */}
          {activeTab === 'RESERVATIONS' && (
            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px' }}>Reservation Records</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    className="form-input"
                    value={resFilterBranch}
                    onChange={(e) => {
                      setResFilterBranch(e.target.value);
                      setTimeout(() => loadAllData(user.branchId), 50);
                    }}
                    style={{ padding: '8px 16px', width: '200px' }}
                  >
                    <option value="">All Branches</option>
                    {BRANDING.branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <select
                    className="form-input"
                    value={resFilterStatus}
                    onChange={(e) => {
                      setResFilterStatus(e.target.value);
                      setTimeout(() => loadAllData(user.branchId), 50);
                    }}
                    style={{ padding: '8px 16px', width: '180px' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ARRIVED">Arrived</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div style={{ overflowX: 'auto', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '16px' }}>Customer</th>
                      <th style={{ padding: '16px' }}>Branch</th>
                      <th style={{ padding: '16px' }}>Date & Time</th>
                      <th style={{ padding: '16px' }}>Guests</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      <th style={{ padding: '16px' }}>Tables</th>
                      <th style={{ padding: '16px' }}>Deposit Paid</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No reservations found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      reservations.map((res) => (
                        <tr key={res.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px' }}>
                            <strong style={{ display: 'block' }}>{res.name}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{res.email} • {res.phone}</span>
                          </td>
                          <td style={{ padding: '16px' }}>{res.branch?.name || 'All'}</td>
                          <td style={{ padding: '16px' }}>{res.date} at {res.time}</td>
                          <td style={{ padding: '16px' }}>{res.guests} ({res.type})</td>
                          <td style={{ padding: '16px' }}>
                            <span className={`badge ${
                              res.status === 'APPROVED' || res.status === 'ARRIVED'
                                ? 'badge-success'
                                : res.status === 'PENDING_APPROVAL'
                                ? 'badge-primary'
                                : res.status === 'REJECTED' || res.status === 'CANCELLED'
                                ? 'badge-error'
                                : ''
                            }`} style={{ fontSize: '11px' }}>
                              {res.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontFamily: 'monospace' }}>
                            {res.tables?.map((t: any) => t.number).join(', ') || '-'}
                          </td>
                          <td style={{ padding: '16px', fontWeight: 600 }}>
                            {formatCurrency(res.paymentAmount)} ({res.paymentStatus})
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {res.status === 'PENDING_APPROVAL' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateResStatus(res.id, 'APPROVED')}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateResStatus(res.id, 'REJECTED')}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-error)' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {res.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleUpdateResStatus(res.id, 'ARRIVED')}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Mark Arrived
                                </button>
                              )}
                              {res.status === 'ARRIVED' && (
                                <button
                                  onClick={() => handleUpdateResStatus(res.id, 'COMPLETED')}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Complete Seat
                                </button>
                              )}
                              {res.status !== 'CANCELLED' && res.status !== 'COMPLETED' && res.status !== 'REJECTED' && (
                                <button
                                  onClick={() => handleUpdateResStatus(res.id, 'CANCELLED')}
                                  style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px' }}
                                  title="Cancel Booking"
                                >
                                  <XCircle size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TABLES & QR CODE ASSETS */}
          {activeTab === 'TABLES' && (
            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '8px' }}>Table QR Assets & Digital Menu Links</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  Download specific table QR codes or copy links to associate table numbers dynamically during scans.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {tables.map((table) => {
                  const targetLink = getQRTargetUrl(table.branchId, table.number);
                  const qrCodeUrl = getQRCodeImageUrl(table.branchId, table.number, 200);

                  return (
                    <div key={table.id} className="card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <h3 style={{ fontFamily: 'monospace', fontSize: '20px', marginBottom: '16px' }}>Table {table.number}</h3>

                      {/* QR Preview Frame */}
                      <div style={{
                        padding: '12px',
                        background: '#f5f2eb',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                        marginBottom: '16px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      }}>
                        <Image
                          src={qrCodeUrl}
                          alt={`Table ${table.number} QR`}
                          width={130}
                          height={130}
                          style={{ display: 'block' }}
                        />
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '20px', width: '100%', wordBreak: 'break-all' }}>
                        Capacity: <strong>{table.capacity} guests</strong>
                        <br />
                        Status: <strong style={{ color: 'var(--color-primary)' }}>{table.status}</strong>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                        <button
                          onClick={() => copyToClipboard(targetLink, table.id)}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          {copiedTableId === table.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                          <span>{copiedTableId === table.id ? 'Copied' : 'Copy link'}</span>
                        </button>
                        <button
                          onClick={() => downloadQRCodeAsset(table.branchId, table.number, 500)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Download size={12} />
                          <span>Download QR</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CRM CUSTOMERS */}
          {activeTab === 'CRM' && (
            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '8px' }}>CRM guest Registry & Loyalty</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  Track visits, spent values, membership tiers, and toggle VIP highlights for premium guest management.
                </p>
              </div>

              <div style={{ overflowX: 'auto', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '16px' }}>Guest</th>
                      <th style={{ padding: '16px' }}>VIP Status</th>
                      <th style={{ padding: '16px' }}>Tier</th>
                      <th style={{ padding: '16px' }}>Visits</th>
                      <th style={{ padding: '16px' }}>Total Spent</th>
                      <th style={{ padding: '16px' }}>Points</th>
                      <th style={{ padding: '16px' }}>Registration Date</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No customer profiles loaded yet.
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px' }}>
                            <strong style={{ display: 'block' }}>{c.name}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{c.email} • {c.phone}</span>
                            {c.notes && (
                              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                {c.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <button
                              onClick={() => handleToggleVip(c.id, c.vipStatus)}
                              className={`btn ${c.vipStatus ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              {c.vipStatus ? '★ VIP Elite' : 'Standard'}
                            </button>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <select
                              value={c.membershipTier}
                              onChange={(e) => handleUpdateTier(c.id, e.target.value)}
                              style={{
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                              }}
                            >
                              <option value="Silver">Silver</option>
                              <option value="Gold">Gold</option>
                              <option value="VIP Elite">VIP Elite</option>
                            </select>
                          </td>
                          <td style={{ padding: '16px' }}>{c.visitCount} visits</td>
                          <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {formatCurrency(c.totalSpent)}
                          </td>
                          <td style={{ padding: '16px' }}>{c.points} pts</td>
                          <td style={{ padding: '16px' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button
                              onClick={async () => {
                                const newNotes = prompt('Enter manager CRM notes for this customer:', c.notes || '');
                                if (newNotes !== null) {
                                  await fetch('/api/customers', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: c.id, notes: newNotes }),
                                  });
                                  loadAllData(user.branchId);
                                }
                              }}
                              className="btn btn-outline"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Edit Notes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEADS KANBAN BOARD */}
          {activeTab === 'LEADS' && (
            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '8px' }}>CRM Lead Pipeline Board</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  Manage incoming waitlist slots, events inquiries, and dining leads. Move them through the pipeline.
                </p>
              </div>

              {/* Kanban Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', minHeight: '60vh' }}>
                {['NEW', 'CONTACTED', 'RESERVED', 'LOST'].map((columnStatus) => {
                  const columnLeads = leads.filter((l) => l.status === columnStatus);
                  const colors: Record<string, string> = {
                    NEW: 'var(--color-primary)',
                    CONTACTED: 'var(--color-warning)',
                    RESERVED: 'var(--color-success)',
                    LOST: 'var(--color-error)'
                  };

                  return (
                    <div
                      key={columnStatus}
                      style={{
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {/* Column Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: `2px solid ${colors[columnStatus]}`,
                        paddingBottom: '8px',
                        marginBottom: '8px',
                      }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px' }}>{columnStatus}</h3>
                        <span style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          borderRadius: '10px',
                          background: `${colors[columnStatus]}20`,
                          color: colors[columnStatus],
                          fontWeight: 700,
                        }}>
                          {columnLeads.length}
                        </span>
                      </div>

                      {/* Card lists */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                        {columnLeads.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                            Empty column
                          </div>
                        ) : (
                          columnLeads.map((lead) => (
                            <div
                              key={lead.id}
                              className="card"
                              style={{
                                padding: '16px',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: '14px', display: 'block' }}>{lead.name}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px' }}>
                                  {lead.email}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                                  {lead.phone}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                <span>Src: <strong>{lead.source}</strong></span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{lead.type}</span>
                              </div>

                              {lead.notes && (
                                <p style={{
                                  fontSize: '11px',
                                  color: 'var(--color-text-secondary)',
                                  background: 'var(--color-bg)',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-border)',
                                  lineHeight: '1.4',
                                  wordBreak: 'break-word',
                                }}>
                                  {lead.notes}
                                </p>
                              )}

                              {/* Pipeline controls */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '4px' }}>
                                {columnStatus !== 'NEW' && (
                                  <button
                                    onClick={() => {
                                      const prevs: Record<string, string> = { CONTACTED: 'NEW', RESERVED: 'CONTACTED', LOST: 'CONTACTED' };
                                      handleUpdateLeadStatus(lead.id, prevs[columnStatus]);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '10px', cursor: 'pointer' }}
                                  >
                                    ← Back
                                  </button>
                                )}
                                <div style={{ flex: 1 }} />
                                {columnStatus !== 'RESERVED' && columnStatus !== 'LOST' && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleUpdateLeadStatus(lead.id, 'CONTACTED')}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-warning)', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                      Contact
                                    </button>
                                    <button
                                      onClick={() => handleUpdateLeadStatus(lead.id, 'RESERVED')}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-success)', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                      Book
                                    </button>
                                  </div>
                                )}
                                {columnStatus === 'CONTACTED' && (
                                  <button
                                    onClick={() => handleUpdateLeadStatus(lead.id, 'LOST')}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: '10px', cursor: 'pointer' }}
                                  >
                                    Lost
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
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
