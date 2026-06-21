'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Edit2, 
  Trash2, 
  Key, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recovery queue state
  const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryActionLoading, setRecoveryActionLoading] = useState<string | null>(null);
  const [recoveryMsg, setRecoveryMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [pin, setPin] = useState('');
  const [branchId, setBranchId] = useState('downtown');
  const [status, setStatus] = useState('ACTIVE');

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok && data.success) {
        setStaff(data.staff);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecoveryRequests() {
    setRecoveryLoading(true);
    try {
      const res = await fetch('/api/admin/staff/recovery');
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleRecoveryAction(notificationId: string, action: 'APPROVE' | 'REJECT') {
    setRecoveryActionLoading(notificationId);
    setRecoveryMsg('');
    try {
      const res = await fetch('/api/admin/staff/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryMsg(data.message);
        fetchRecoveryRequests();
      } else {
        setRecoveryMsg(data.message || 'Action failed.');
      }
    } catch {
      setRecoveryMsg('Network error processing recovery action.');
    } finally {
      setRecoveryActionLoading(null);
    }
  }

  useEffect(() => {
    fetchStaff();
    fetchRecoveryRequests();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, pin, branchId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddForm(false);
        resetForm();
        fetchStaff();
      } else {
        alert(data.message || 'Failed to add staff');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { id: editingStaff.id, name, email, role, branchId, status };
      if (pin) payload.pin = pin;

      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingStaff(null);
        resetForm();
        fetchStaff();
      } else {
        alert(data.message || 'Failed to update staff');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff profile permanently?')) return;
    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchStaff();
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch {
      alert('Error deleting profile');
    }
  };

  const toggleStatus = async (item: any) => {
    const nextStatus = item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchStaff();
      }
    } catch {
      alert('Error updating status');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('STAFF');
    setPin('');
    setBranchId('downtown');
    setStatus('ACTIVE');
  };

  const startEdit = (item: any) => {
    setEditingStaff(item);
    setName(item.name);
    setEmail(item.email);
    setRole(item.role);
    setBranchId(item.branchId || '');
    setStatus(item.status);
    setPin('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading staff accounts...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ===== RECOVERY QUEUE SECTION ===== */}
      {(recoveryRequests.length > 0 || recoveryLoading) && (
        <div className="card" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239,68,68,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} color="#ef4444" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>PIN Recovery Queue</h2>
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                {recoveryRequests.length}
              </span>
            </div>
            <button onClick={fetchRecoveryRequests} style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {recoveryMsg && (
            <p style={{ fontSize: '13px', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
              {recoveryMsg}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recoveryRequests.map(req => (
              <div key={req.notificationId} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '14px 18px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{req.staffName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{req.staffEmail} · {req.role} · {req.branchName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Requested: {new Date(req.requestedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleRecoveryAction(req.notificationId, 'APPROVE')}
                    disabled={recoveryActionLoading === req.notificationId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      opacity: recoveryActionLoading === req.notificationId ? 0.6 : 1
                    }}
                  >
                    <Check size={14} /> Approve & Send PIN
                  </button>
                  <button
                    onClick={() => handleRecoveryAction(req.notificationId, 'REJECT')}
                    disabled={recoveryActionLoading === req.notificationId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                      background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      opacity: recoveryActionLoading === req.notificationId ? 0.6 : 1
                    }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== STAFF MANAGEMENT HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)' }}>Staff Management</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Authorized owner tool for administration credentials and status toggles</p>
        </div>

        <button
          onClick={() => { setShowAddForm(true); setEditingStaff(null); resetForm(); }}
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
          <Plus size={16} /> Add Staff Profile
        </button>
      </div>

      {/* Staff Grid/Table */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: '100%' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Email</th>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Role</th>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Branch</th>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{item.email}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: item.role === 'OWNER' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.05)',
                      color: item.role === 'OWNER' ? 'var(--color-primary)' : 'var(--color-text)',
                      border: item.role === 'OWNER' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
                    }}>
                      {item.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)' }}>
                    {item.branch ? item.branch.name.split(' - ')[1] : 'Global Admin'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: item.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {item.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => toggleStatus(item)}
                        disabled={item.role === 'OWNER'}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          color: item.status === 'ACTIVE' ? 'var(--color-error)' : 'var(--color-success)',
                          cursor: item.role === 'OWNER' ? 'not-allowed' : 'pointer',
                          opacity: item.role === 'OWNER' ? 0.3 : 1
                        }}
                        title={item.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                      >
                        {item.status === 'ACTIVE' ? <UserMinus size={14} /> : <CheckCircle size={14} />}
                      </button>
  
                      <button
                        onClick={() => startEdit(item)}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          color: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                        title="Edit Staff Info"
                      >
                        <Edit2 size={14} />
                      </button>
  
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={item.role === 'OWNER'}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          color: 'var(--color-error)',
                          cursor: item.role === 'OWNER' ? 'not-allowed' : 'pointer',
                          opacity: item.role === 'OWNER' ? 0.3 : 1
                        }}
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {(showAddForm || editingStaff) && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '32px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-title)', marginBottom: '4px' }}>
              {editingStaff ? 'Edit Staff Profile' : 'Add New Staff Profile'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Credentials must contain unique emails and a secure PIN / Password
            </p>

            <form onSubmit={editingStaff ? handleUpdate : handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Liam Harrison"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. liam@bohocafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Branch Assignment</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="downtown">Downtown Sanctuary</option>
                    <option value="uptown">Uptown Lounge</option>
                    <option value="">Global / None</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {editingStaff ? 'Reset PIN / Password (Leave blank to keep current)' : 'Login PIN / Password'}
                </label>
                <input
                  required={!editingStaff}
                  type="password"
                  maxLength={32}
                  placeholder={editingStaff ? '••••••••' : 'e.g. 1234 or securepass'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}
                />
              </div>

              {editingStaff && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingStaff(null); }}
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
                  {editingStaff ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
