'use client';

import { useState, useEffect } from 'react';
import { 
  Mail, 
  Key, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Settings,
  ShieldCheck,
  MailCheck,
  RefreshCw,
  XCircle,
  Clock
} from 'lucide-react';

export default function OwnerSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Email log states
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/owner/profile');
        const data = await res.json();
        if (res.ok && data.success) {
          setProfile(data.profile);
          setEmail(data.profile.email);
          setLoginMethod(data.profile.loginMethod || 'PIN');
        } else {
          setMessage({ type: 'error', text: data.message || 'Failed to load profile settings.' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Error connecting to the API.' });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
    fetchEmailLogs();
  }, []);

  async function fetchEmailLogs() {
    setEmailLogsLoading(true);
    try {
      const res = await fetch('/api/admin/emails?limit=20');
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailLogs(data.logs);
        setEmailStats(data.stats);
      }
    } catch {
      // ignore
    } finally {
      setEmailLogsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate inputs
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Email address cannot be empty.' });
      return;
    }

    const payload: any = {
      email: email.trim(),
      loginMethod
    };

    if (pin) {
      if (pin !== confirmPin) {
        setMessage({ type: 'error', text: 'New PIN/Password values do not match.' });
        return;
      }

      if (loginMethod === 'PIN') {
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(pin)) {
          setMessage({ type: 'error', text: 'PIN must be numeric and between 4 and 6 digits.' });
          return;
        }
      } else {
        if (pin.length < 6) {
          setMessage({ type: 'error', text: 'Alphanumeric Password must be at least 6 characters long.' });
          return;
        }
      }
      payload.pin = pin;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/owner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.pendingEmailChange) {
          // Email change initiated — verification email sent
          setMessage({ type: 'info', text: data.message });
          setPin('');
          setConfirmPin('');
        } else {
          setMessage({ type: 'success', text: 'Profile settings updated successfully!' });
          setProfile(data.profile);
          setPin('');
          setConfirmPin('');
          setTimeout(() => { window.location.reload(); }, 1500);
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error updating profile settings.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading settings panel...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '640px' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} color="var(--color-primary)" /> Account Settings
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Configure your executive credentials, email address, and authentication method.
        </p>
      </div>

      <div className="card" style={{ padding: '32px', background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <ShieldCheck size={20} color="var(--color-primary)" />
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Security Context: {profile?.name} (Owner)</span>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : message.type === 'info' ? 'rgba(197, 168, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: message.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : message.type === 'info' ? '1px solid var(--color-border)' : '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            color: message.type === 'success' ? 'var(--color-success)' : message.type === 'info' ? 'var(--color-primary)' : 'var(--color-error)',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : message.type === 'info' ? <MailCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Email field */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Owner Email Address (Mail ID)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '40px', width: '100%' }}
                placeholder="owner@bohocafe.com"
              />
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              Updating this changes your login email. You will be logged out to refresh your active session.
            </p>
          </div>

          {/* Login Method selector */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Login Authentication Way</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setLoginMethod('PIN')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: loginMethod === 'PIN' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: loginMethod === 'PIN' ? 'var(--color-primary-glow)' : 'transparent',
                  color: loginMethod === 'PIN' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                Numeric PIN (4-6 Digits)
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('PASSWORD')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: loginMethod === 'PASSWORD' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: loginMethod === 'PASSWORD' ? 'var(--color-primary-glow)' : 'transparent',
                  color: loginMethod === 'PASSWORD' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                Alphanumeric Password
              </button>
            </div>
          </div>

          {/* PIN / Password fields */}
          <div style={{ padding: '20px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
              Update Security Credentials (Optional)
            </h3>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>
                New {loginMethod === 'PIN' ? 'Access PIN' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={loginMethod === 'PIN' ? 'Enter 4-6 digit PIN' : 'Enter alphanumeric password (min 6 chars)'}
                  style={{ paddingLeft: '40px', paddingRight: '40px', width: '100%' }}
                />
                <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {pin && (
              <div className="form-group" style={{ margin: 0, animation: 'fadeIn 0.2s ease' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>
                  Confirm New {loginMethod === 'PIN' ? 'Access PIN' : 'Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    className="form-input"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Repeat for confirmation"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    required={!!pin}
                  />
                  <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Saving Changes...
              </>
            ) : (
              'Save Profile Settings'
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ===== EMAIL DELIVERY LOGS ===== */}
      <div className="card" style={{ padding: '24px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MailCheck size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Email Delivery Logs</h2>
          </div>
          <button onClick={fetchEmailLogs} style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats Row */}
        {emailStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Sent', count: emailStats.sent, color: '#10b981' },
              { label: 'Failed', count: emailStats.failed, color: '#ef4444' },
              { label: 'Pending', count: emailStats.pending, color: 'var(--color-primary)' },
              { label: 'Retrying', count: emailStats.retrying, color: '#f59e0b' }
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.count}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {emailLogsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px auto', display: 'block' }} />
            Loading email logs...
          </div>
        ) : emailLogs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px', padding: '20px' }}>No email records found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {emailLogs.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--color-bg)', borderRadius: '6px',
                border: '1px solid var(--color-border)', gap: '12px', flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.subject}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    To: {log.to} &bull; {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {log.status === 'SENT' && <CheckCircle2 size={14} color="#10b981" />}
                  {log.status === 'FAILED' && <XCircle size={14} color="#ef4444" />}
                  {log.status === 'PENDING' && <Clock size={14} color="var(--color-primary)" />}
                  {log.status === 'RETRYING' && <RefreshCw size={14} color="#f59e0b" />}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: log.status === 'SENT' ? '#10b981' : log.status === 'FAILED' ? '#ef4444' : log.status === 'RETRYING' ? '#f59e0b' : 'var(--color-primary)' }}>
                    {log.status}
                  </span>
                  {log.attempts > 1 && <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>({log.attempts} attempts)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
