'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  AlertCircle,
  RefreshCw,
  Search,
  Grid,
  List,
  LogOut,
  Sparkles,
  IndianRupee,
  ShoppingBag,
  Check,
  ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/config/branding';

export default function ManagerConsole() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  // Tab/View Toggle state
  const [activeTab, setActiveTab] = useState<'bookings' | 'orders'>('bookings');

  // Operations states
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (res.ok && data.success && (data.user.role === 'MANAGER' || data.user.role === 'OWNER')) {
          setProfile(data.user);
          setBranchFilter(data.user.branchId || 'downtown');
        } else {
          router.replace('/staff-login?error=unauthenticated');
        }
      } catch {
        router.replace('/staff-login?error=unauthenticated');
      }
    }
    checkAuth();
  }, [router]);

  async function fetchOperationsData() {
    if (!branchFilter) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const resParam = `?branchId=${branchFilter}&date=${todayStr}`;
      
      const [resRes, tableRes, ordersRes] = await Promise.all([
        fetch(`/api/reservations${resParam}`),
        fetch(`/api/tables?branchId=${branchFilter}`),
        fetch(`/api/orders?branchId=${branchFilter}`)
      ]);

      const resJ = await resRes.json();
      const tableJ = await tableRes.json();
      const ordersJ = await ordersRes.json();

      if (resJ.success) setReservations(resJ.reservations);
      if (tableJ.success) setTables(tableJ.tables);
      if (ordersJ.success) setActiveOrders(ordersJ.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOperationsData();
  }, [branchFilter]);

  const handleStatusUpdate = async (resId: string, nextStatus: string) => {
    setActionLoading(resId);
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resId, status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchOperationsData();
      } else {
        alert(data.message || 'Failed to update reservation status');
      }
    } catch {
      alert('Network error updating status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchOperationsData();
      } else {
        alert(data.message || 'Failed to update order status');
      }
    } catch {
      alert('Network error updating order status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/staff-login');
    } catch {
      router.push('/staff-login');
    }
  };

  // Filter reservations
  const filteredReservations = reservations.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.phone.includes(searchQuery);

    const matchesStatus = 
      statusFilter === 'ALL' || 
      r.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter QR orders
  const filteredOrders = activeOrders.filter(o => {
    const matchesSearch = 
      (o.customerEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (o.customerPhone || '').includes(searchQuery) ||
      o.tableNumber?.toString() === searchQuery;

    const matchesStatus = 
      statusFilter === 'ALL' || 
      o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!profile || (loading && reservations.length === 0)) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0807', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite' }} size={32} color="#c5a880" />
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Operations Header */}
      {/* Top navbar header */}
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '20px 40px', borderBottom: '1px solid var(--color-border)', background: 'rgba(18,15,13,0.95)' }}>
        <div className="container manager-header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--color-primary-glow)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, fontFamily: 'var(--font-title)' }}>Manager Operations Console</h1>
            <p style={{ fontSize: '11px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
              Today's Floor Plan & Live Orders
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Branch Lock Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <MapPin size={15} color="var(--color-primary)" />
            {profile.role === 'OWNER' ? (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                style={{ background: 'transparent', color: 'var(--color-text)', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                <option value="downtown" style={{ background: 'var(--color-card)' }}>Downtown Sanctuary</option>
                <option value="uptown" style={{ background: 'var(--color-card)' }}>Uptown Lounge</option>
              </select>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                {profile.branchId === 'downtown' ? 'Downtown Sanctuary' : 'Uptown Lounge'}
              </span>
            )}
          </div>

          {/* Navigation/Logout */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {profile.role === 'OWNER' && (
              <a href="/owner" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '12px' }}>
                Owner Suite
              </a>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={13} /> Log Out
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Main Workspace split */}
      <main className="manager-split-grid" style={{ flex: 1, padding: '30px 40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Left Column - Reservation Arrivals Queue & KDS Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section Selector Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button 
                onClick={() => { setActiveTab('bookings'); setStatusFilter('ALL'); }}
                style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: '18px',
                  fontWeight: activeTab === 'bookings' ? 700 : 500,
                  color: activeTab === 'bookings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  background: 'none',
                  cursor: 'pointer',
                  border: 'none',
                  paddingBottom: '8px',
                  borderBottom: `2px solid ${activeTab === 'bookings' ? 'var(--color-primary)' : 'transparent'}`
                }}
              >
                Today's Bookings
              </button>
              <button 
                onClick={() => { setActiveTab('orders'); setStatusFilter('ALL'); }}
                style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: '18px',
                  fontWeight: activeTab === 'orders' ? 700 : 500,
                  color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  background: 'none',
                  cursor: 'pointer',
                  border: 'none',
                  paddingBottom: '8px',
                  borderBottom: `2px solid ${activeTab === 'orders' ? 'var(--color-primary)' : 'transparent'}`
                }}
              >
                KDS Table Orders
              </button>
            </div>
            
            <button onClick={fetchOperationsData} style={{ background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <RefreshCw size={13} /> Reload Feed
            </button>
          </div>

          {/* Search/Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', flex: 1 }}>
              <Search size={14} color="var(--color-text-secondary)" />
              <input
                type="text"
                placeholder={activeTab === 'bookings' ? 'Search guests...' : 'Search Table # or Email...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', fontSize: '13px', width: '100%' }}
              />
            </div>

            {activeTab === 'bookings' ? (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '12px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending approval</option>
                <option value="CONFIRMED">Confirmed / Held</option>
                <option value="ARRIVED">Arrived / Occupied</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '12px' }}
              >
                <option value="ALL">All States</option>
                <option value="PENDING">Pending Queue</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready to Serve</option>
                <option value="SERVED">Served</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}
          </div>

          {/* List Feed Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* BOOKINGS VIEW */}
            {activeTab === 'bookings' && (
              filteredReservations.length > 0 ? filteredReservations.map((res) => {
                const assignedTables = res.tables.map((t: any) => t.number).join(', ');
                return (
                  <div 
                    key={`${res.id}-${res.booking_status}`} 
                    className="booking-card-animate"
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{res.name}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                          {res.phone} | {res.email}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 
                          res.booking_status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' :
                          res.booking_status === 'ARRIVED' ? 'var(--color-primary-glow)' :
                          res.booking_status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                        color:
                          res.booking_status === 'COMPLETED' ? 'var(--color-success)' :
                          res.booking_status === 'ARRIVED' ? 'var(--color-primary)' :
                          res.booking_status === 'PENDING' ? 'var(--color-warning)' : 'var(--color-text-secondary)'
                      }}>
                        {res.booking_status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <Clock size={13} color="var(--color-primary)" /> {res.start_time} - {res.end_time}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <Users size={13} color="var(--color-primary)" /> {res.guest_count} Covers
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <Grid size={13} color="var(--color-primary)" /> Assigned: {assignedTables ? `Table ${assignedTables}` : 'None'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <IndianRupee size={13} color="var(--color-primary)" /> Deposit: {formatCurrency(res.paymentAmount)} ({res.paymentStatus})
                      </span>
                    </div>

                    {res.special_requests && (
                      <div style={{ background: 'var(--color-bg)', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', color: 'var(--color-text-secondary)', borderLeft: '2px solid var(--color-primary)' }}>
                        Notes: {res.special_requests}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {res.booking_status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {profile.role === 'OWNER' ? (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(res.id, 'APPROVED')}
                                disabled={actionLoading === res.id}
                                style={{ background: 'var(--color-success)', color: 'var(--color-bg)', fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(res.id, 'REJECTED')}
                                disabled={actionLoading === res.id}
                                style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={12} /> Awaiting Owner Approval
                            </span>
                          )}
                        </div>
                      )}

                      {res.booking_status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(res.id, 'ARRIVED')}
                            disabled={actionLoading === res.id}
                            style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Arrive Guest
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(res.id, 'CANCELLED')}
                            disabled={actionLoading === res.id}
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          >
                            No-Show
                          </button>
                        </>
                      )}

                      {res.booking_status === 'ARRIVED' && (
                        <button
                          onClick={() => handleStatusUpdate(res.id, 'COMPLETED')}
                          disabled={actionLoading === res.id}
                          style={{ background: 'var(--color-success)', color: 'var(--color-bg)', fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Complete Session
                        </button>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                  No reservations found for today.
                </p>
              )
            )}

            {/* LIVE KDS ORDERS VIEW */}
            {activeTab === 'orders' && (
              filteredOrders.length > 0 ? filteredOrders.map((ord) => {
                return (
                  <div
                    key={ord.id}
                    className="booking-card-animate"
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <ShoppingBag size={16} color="var(--color-primary)" />
                          Table {ord.tableNumber} Order
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                          ID: {ord.id.substring(0, 8)} | Guest: {ord.customerEmail || 'Walk-in'}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 
                          ord.status === 'COMPLETED' || ord.status === 'SERVED' ? 'rgba(16, 185, 129, 0.1)' :
                          ord.status === 'READY' ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-primary-glow)',
                        color:
                          ord.status === 'COMPLETED' || ord.status === 'SERVED' ? 'var(--color-success)' :
                          ord.status === 'READY' ? 'var(--color-warning)' : 'var(--color-primary)'
                      }}>
                        {ord.status}
                      </span>
                    </div>

                    {/* Order items lists */}
                    <div style={{ background: 'var(--color-bg)', padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {ord.items.map((item: any) => (
                          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.itemName} <strong style={{ color: 'var(--color-primary)' }}>x{item.quantity}</strong></span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', fontWeight: 700 }}>
                        <span>Total:</span>
                        <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(ord.totalAmount)}</span>
                      </div>
                    </div>

                    {/* KDS workflow actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {ord.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                          disabled={actionLoading === ord.id}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          Start Preparing <ChevronRight size={12} />
                        </button>
                      )}
                      {ord.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                          disabled={actionLoading === ord.id}
                          className="btn btn-primary btn-sm"
                          style={{ background: 'var(--color-warning)', color: 'var(--color-bg)', display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          Mark Ready <Check size={12} />
                        </button>
                      )}
                      {ord.status === 'READY' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'SERVED')}
                          disabled={actionLoading === ord.id}
                          className="btn btn-success btn-sm"
                          style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          Mark Served <CheckCircle size={12} />
                        </button>
                      )}
                      {ord.status === 'SERVED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                          disabled={actionLoading === ord.id}
                          className="btn btn-success btn-sm"
                          style={{ background: 'var(--color-success)', color: 'var(--color-bg)', display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          Complete Payment & Session <CheckCircle size={12} />
                        </button>
                      )}
                      {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'CANCELLED')}
                          disabled={actionLoading === ord.id}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--color-error)', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                  No active QR table orders found.
                </p>
              )
            )}

          </div>
        </div>

        {/* Right Column - Visual Floor Plan & Table Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-title)' }}>Lounge Seating Layout</h2>
          
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Visual Mini Map */}
            <div style={{
              width: '100%',
              height: '300px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {tables.map((table) => {
                let statusColor = "var(--color-success)";
                if (table.status === 'OCCUPIED') statusColor = "var(--color-error)";
                if (table.status === 'RESERVED') statusColor = "var(--color-warning)";

                return (
                  <div
                    key={table.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Table ${table.number}, capacity ${table.capacity} guests, status ${table.status}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        alert(`Table ${table.number} Status: ${table.status} (Capacity: ${table.capacity})`);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${table.x}%`,
                      top: `${table.y}%`,
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--color-card)',
                      border: `2px solid ${statusColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: statusColor,
                      cursor: 'pointer'
                    }}
                    title={`Table ${table.number} (Cap: ${table.capacity}) | Status: ${table.status}`}
                  >
                    T{table.number}
                  </div>
                );
              })}
            </div>

            {/* Table Details List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Table Status Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                {tables.map((table) => {
                  let badgeBg = "rgba(16, 185, 129, 0.1)";
                  let badgeText = "var(--color-success)";
                  if (table.status === 'OCCUPIED') {
                    badgeBg = "rgba(239, 68, 68, 0.1)";
                    badgeText = "var(--color-error)";
                  } else if (table.status === 'RESERVED') {
                    badgeBg = "rgba(245, 158, 11, 0.1)";
                    badgeText = "var(--color-warning)";
                  }

                  return (
                    <div key={table.id} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Table {table.number}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Capacity: {table.capacity}</div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        display: 'inline-block',
                        marginTop: '6px',
                        background: badgeBg,
                        color: badgeText
                      }}>
                        {table.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </main>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes highlight-fade {
          0% { background: var(--color-primary-glow); border-color: var(--color-primary); transform: scale(1.02); }
          100% { background: var(--color-card); border-color: var(--color-border); transform: scale(1); }
        }
        .booking-card-animate {
          animation: highlight-fade 0.8s ease-out;
        }

        @media (max-width: 1024px) {
          .manager-split-grid {
            grid-template-columns: 1fr !important;
            padding: 20px !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 768px) {
          .manager-header-container {
            flex-wrap: wrap !important;
            padding: 12px 20px !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
