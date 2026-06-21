'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

function OwnerRecoveryContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid recovery link. No token found.');
      return;
    }

    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PIN entries do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/owner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin, recoveryToken: token })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Your PIN has been reset successfully. You can now log in with your new credentials.');
      } else {
        setError(data.message || 'Failed to reset PIN. The link may have expired.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `radial-gradient(ellipse at top, ${BRANDING.colors.secondary} 0%, ${BRANDING.colors.background} 60%)`,
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-title)',
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            letterSpacing: '4px',
            marginBottom: '8px',
          }}>
            {BRANDING.logo}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Owner Account Recovery
          </p>
        </div>

        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--color-primary-glow)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={24} color="var(--color-primary)" />
            </div>
          </div>

          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', textAlign: 'center', marginBottom: '8px' }}>
            Reset Owner Credentials
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
            Enter a new PIN or password for the Owner account.
          </p>

          {!token && (
            <div style={{
              padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '6px', color: 'var(--color-error)', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>Invalid recovery link. Please request a new one.</span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '6px', color: 'var(--color-error)', fontSize: '13px', marginBottom: '20px',
              display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '6px', color: '#10b981', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6'
              }}>
                ✓ {success}
              </div>
              <a href="/staff-login" className="btn btn-primary" style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                Go to Staff Login
              </a>
            </div>
          ) : token && (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px', position: 'relative' }}>
                <label>New PIN / Password</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Minimum 4 characters"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  minLength={4}
                  style={{ paddingLeft: '40px', paddingRight: '44px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', bottom: '13px', color: 'var(--color-text-secondary)' }} />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '12px', bottom: '12px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label>Confirm New PIN / Password</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter new credential"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                  minLength={4}
                  style={{ paddingLeft: '40px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', bottom: '13px', color: 'var(--color-text-secondary)' }} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !token}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : 'Reset Credentials'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/staff-login" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ← Back to Staff Login
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

export default function OwnerRecoveryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-primary)' }}>Loading...</p>
      </div>
    }>
      <OwnerRecoveryContent />
    </Suspense>
  );
}
