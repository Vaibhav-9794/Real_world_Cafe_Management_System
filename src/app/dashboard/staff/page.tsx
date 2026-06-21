'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Map,
  Grid,
  RefreshCw,
  Phone,
  AlertCircle,
  Coffee,
  Loader2,
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName: string;
}

interface DBTable {
  id: string;
  number: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | string;
  x: number;
  y: number;
  reservations?: any[];
}

interface DBReservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  date: string;
  time: string;
  guests: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | string;
  tables: { number: string }[];
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [tables, setTables] = useState<DBTable[]>([]);
  const [reservations, setReservations] = useState<DBReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Local active tab for layout view
  const [layoutMode, setLayoutMode] = useState<'MAP' | 'GRID'>('MAP');

  const todayStr = new Date().toISOString().split('T')[0];

  // Auth check
  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (!authData) {
      router.push('/dashboard/login');
      return;
    }
    const staff = JSON.parse(authData) as StaffUser;
    setUser(staff);
    fetchData(staff.branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (bId: string) => {
    setRefreshing(true);
    try {
      // Fetch Tables
      const tablesRes = await fetch(`/api/tables?branchId=${bId || ''}`);
      const tablesData = await tablesRes.json();

      // Fetch Today's Reservations
      const reservationsRes = await fetch(`/api/reservations?branchId=${bId || ''}&date=${todayStr}`);
      const reservationsData = await reservationsRes.json();

      if (tablesData.success) {
        // Provide mock positioning if x,y are both 0.0 to make map view look premium
        const mockPositions: Record<string, { x: number; y: number }> = {
          '1': { x: 15, y: 20 },
          '2': { x: 40, y: 20 },
          '3': { x: 65, y: 20 },
          '4': { x: 15, y: 50 },
          '5': { x: 40, y: 50 },
          '6': { x: 65, y: 50 },
          '7': { x: 15, y: 80 },
          '8': { x: 40, y: 80 },
          '9': { x: 65, y: 80 },
          '10': { x: 85, y: 50 },
        };

        const parsedTables = tablesData.tables.map((t: DBTable) => {
          if (t.x === 0 && t.y === 0 && mockPositions[t.number]) {
            return { ...t, x: mockPositions[t.number].x, y: mockPositions[t.number].y };
          }
          return t;
        });

        setTables(parsedTables);
      }
      if (reservationsData.success) {
        setReservations(reservationsData.reservations);
      }
    } catch {
      setError('Failed to refresh data from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/dashboard/login');
  };

  // Update table status directly
  const handleToggleTableStatus = async (tableId: string, currentStatus: string) => {
    const nextStatuses: Record<string, string> = {
      AVAILABLE: 'RESERVED',
      RESERVED: 'OCCUPIED',
      OCCUPIED: 'AVAILABLE',
    };
    const newStatus = nextStatuses[currentStatus] || 'AVAILABLE';

    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, status: newStatus }),
      });
      if (res.ok) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      setError('Could not update table status.');
    }
  };

  // Update reservation status (check in / cancel)
  const handleUpdateReservationStatus = async (resId: string, status: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resId, status }),
      });
      if (res.ok) {
        // Update local list
        setReservations((prev) =>
          prev.map((r) => (r.id === resId ? { ...r, status } : r))
        );
        // Refresh tables since status changes free or lock tables
        if (user) fetchData(user.branchId);
      }
    } catch {
      setError('Could not update reservation.');
    }
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spin" size={32} color="var(--color-primary)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header bar */}
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontFamily: 'var(--font-title)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              letterSpacing: '2px',
            }}>
              {BRANDING.logo}
            </span>
            <div style={{ height: '24px', width: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-text-secondary)' }}>
              Staff Portal • {user.branchName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Welcome, <strong style={{ color: 'var(--color-text)' }}>{user.name}</strong> ({user.role})
            </span>
            <button
              onClick={() => fetchData(user.branchId)}
              className="btn btn-outline"
              disabled={refreshing}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Staff Container */}
      <main className="section" style={{ paddingTop: '24px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' }}>

          {/* LEFT COLUMN: Today's Bookings */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="var(--color-primary)" /> Today&apos;s Reservations
              </h2>
              <span className="badge badge-primary">Date: {todayStr}</span>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: 'var(--color-error)',
                fontSize: '13px',
                marginBottom: '20px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '8px' }}>
              {reservations.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: 'var(--color-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}>
                  <Coffee size={36} color="var(--color-text-secondary)" style={{ marginBottom: '12px' }} />
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    No bookings scheduled for today.
                  </p>
                </div>
              ) : (
                reservations.map((res) => {
                  const isArrived = res.status === 'ARRIVED';
                  const isCompleted = res.status === 'COMPLETED';
                  const isCancelled = res.status === 'CANCELLED' || res.status === 'REJECTED';
                  const isPending = res.status === 'PENDING_APPROVAL' || res.status === 'APPROVED';

                  return (
                    <div
                      key={res.id}
                      className="card"
                      style={{
                        padding: '20px',
                        borderLeft: `4px solid ${
                          isArrived
                            ? 'var(--color-success)'
                            : isCompleted
                            ? 'var(--color-text-secondary)'
                            : isCancelled
                            ? 'var(--color-error)'
                            : 'var(--color-primary)'
                        }`,
                        opacity: isCompleted || isCancelled ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{res.name}</h3>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={12} /> {res.phone}
                          </p>
                        </div>
                        <span className={`badge ${
                          isArrived
                            ? 'badge-success'
                            : isCompleted
                            ? ''
                            : isCancelled
                            ? 'badge-error'
                            : 'badge-primary'
                        }`} style={{ fontSize: '10px' }}>
                          {res.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', margin: '12px 0', color: 'var(--color-text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--color-primary)" /> {res.time}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} color="var(--color-primary)" /> {res.guests} Guests
                        </span>
                        <span>
                          Type: <strong>{res.type}</strong>
                        </span>
                        <span>
                          Tables: <strong>{res.tables.map((t) => t.number).join(', ') || 'N/A'}</strong>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {isPending && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'ARRIVED')}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <CheckCircle size={14} /> Mark Arrived
                          </button>
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'CANCELLED')}
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-error)' }}
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        </div>
                      )}

                      {isArrived && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'COMPLETED')}
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <CheckCircle size={14} /> Complete Seat
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Floor Plan */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Map size={20} color="var(--color-primary)" /> Live Floor Plan Map
              </h2>
              <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <button
                  onClick={() => setLayoutMode('MAP')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: layoutMode === 'MAP' ? 'var(--color-primary)' : 'transparent',
                    color: layoutMode === 'MAP' ? 'var(--color-bg)' : 'var(--color-text)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Map View
                </button>
                <button
                  onClick={() => setLayoutMode('GRID')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: layoutMode === 'GRID' ? 'var(--color-primary)' : 'transparent',
                    color: layoutMode === 'GRID' ? 'var(--color-bg)' : 'var(--color-text)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Grid View
                </button>
              </div>
            </div>

            {/* Floor Map Legend */}
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '12px',
              padding: '12px 16px',
              background: 'var(--color-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              marginBottom: '20px',
              justifyContent: 'center',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-success)' }} />
                Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-warning)' }} />
                Reserved (Today)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-error)' }} />
                Occupied
              </span>
            </div>

            {/* Layout Panels */}
            {layoutMode === 'MAP' ? (
              // MAP VIEW: coordinate positioning
              <div style={{
                position: 'relative',
                width: '100%',
                height: '520px',
                background: 'rgba(0,0,0,0.25)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}>
                {/* Visual Walls representation */}
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '4px', background: 'var(--color-border)' }} />
                <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ✦ Main Entrance ✦
                </div>

                {tables.map((table) => {
                  const isAvailable = table.status === 'AVAILABLE';
                  const isReserved = table.status === 'RESERVED';
                  const isOccupied = table.status === 'OCCUPIED';

                  const color = isAvailable
                    ? 'var(--color-success)'
                    : isReserved
                    ? 'var(--color-warning)'
                    : 'var(--color-error)';

                  return (
                    <button
                      key={table.id}
                      onClick={() => handleToggleTableStatus(table.id, table.status)}
                      style={{
                        position: 'absolute',
                        left: `${table.x}%`,
                        top: `${table.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: 'var(--color-card)',
                        border: `2px solid ${color}`,
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s',
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
                    >
                      <strong style={{ fontSize: '14px', fontFamily: 'monospace' }}>T-{table.number}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{table.capacity}p</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // GRID VIEW: standard table cards
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '16px',
              }}>
                {tables.map((table) => {
                  const isAvailable = table.status === 'AVAILABLE';
                  const isReserved = table.status === 'RESERVED';
                  const isOccupied = table.status === 'OCCUPIED';

                  const color = isAvailable
                    ? 'var(--color-success)'
                    : isReserved
                    ? 'var(--color-warning)'
                    : 'var(--color-error)';

                  return (
                    <div
                      key={table.id}
                      className="card"
                      onClick={() => handleToggleTableStatus(table.id, table.status)}
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        border: `1px solid ${color}`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                    >
                      <h3 style={{ fontSize: '18px', fontFamily: 'monospace', color: 'var(--color-text)' }}>
                        Table {table.number}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                        Capacity: {table.capacity} guests
                      </p>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '20px',
                        background: `${color}15`,
                        color: color,
                        marginTop: '8px',
                        textTransform: 'uppercase',
                      }}>
                        {table.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Instruction tooltip */}
            <p style={{
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <AlertCircle size={14} color="var(--color-primary)" />
              <span>Click on any table block to cycle status (Available $\rightarrow$ Reserved $\rightarrow$ Occupied)</span>
            </p>
          </div>

        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
