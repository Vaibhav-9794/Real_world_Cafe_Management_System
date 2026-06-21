'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, HelpCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorQuery = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetModal, setResetModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // Set default errors from URL search queries
  useEffect(() => {
    if (errorQuery) {
      const errorMap: Record<string, string> = {
        suspended: 'This account has been suspended by the Owner.',
        inactive: 'This account is currently marked inactive.',
        access_denied: 'Access denied: You do not have permissions for this dashboard.',
        unauthenticated: 'Please log in to access the management portal.',
      };
      setErrorMsg(errorMap[errorQuery] || 'Authentication check failed.');
    }
  }, [errorQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) {
      setErrorMsg('Please enter both your email and access PIN.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Authentication credentials rejected.');
        setLoading(false);
        return;
      }

      // Success - Redirect user based on role returned by route
      const role = data.user.role;
      if (role === 'OWNER') {
        router.push('/owner');
      } else {
        router.push('/manager');
      }
    } catch {
      setErrorMsg('Network error. Failed to reach auth gateway.');
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoveryLoading(true);
    setRecoveryError('');

    try {
      const res = await fetch('/api/auth/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoverySent(true);
      } else {
        setRecoveryError(data.message || 'Failed to submit recovery request.');
      }
    } catch {
      setRecoveryError('Network error submitting recovery request.');
    } finally {
      setRecoveryLoading(false);
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
      <div style={{ width: '100%', maxWidth: '420px', animation: 'scaleIn 0.4s ease-out' }}>
        {/* Logo and Titles */}
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
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            Staff Authentication
          </p>
        </div>

        {/* Card Frame */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-primary-glow)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Lock size={24} color="var(--color-primary)" />
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-title)',
            fontSize: '22px',
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            Enter your credentials to enter the workspace
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              fontSize: '13px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Work Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@bohocafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginBottom: 0 }}>Access PIN / Password</label>
                <button
                  type="button"
                  onClick={() => setResetModal(true)}
                  style={{ fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer' }}
                >
                  Forgot credentials?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter PIN or password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  maxLength={32}
                  style={{ paddingLeft: '40px', paddingRight: '44px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 size={18} className="spin" /> : 'Authenticate'}
            </button>
          </form>
        </div>

        {/* Home Redirect */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ← Back to Customer Website
          </a>
        </div>
      </div>

      {/* PIN Recovery Modal */}
      {resetModal && (
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
          padding: '24px',
          zIndex: 1000,
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
            <HelpCircle size={36} color="var(--color-primary)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '8px', textAlign: 'center' }}>
              Request PIN Recovery
            </h3>

            {recoverySent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>✓ Request Submitted</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                  Your PIN recovery request has been submitted. The Cafe Owner will review your request and you will receive a new access code via email.
                </p>
                <button
                  onClick={() => { setResetModal(false); setRecoverySent(false); setRecoveryEmail(''); }}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoveryRequest}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                  Enter your work email address below. A recovery request will be submitted to the Cafe Owner for review. You will receive a new PIN via email once approved.
                </p>
                {recoveryError && (
                  <p style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '12px', background: 'rgba(239,68,68,0.08)', padding: '8px', borderRadius: '4px' }}>
                    {recoveryError}
                  </p>
                )}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ marginBottom: '6px', display: 'block', fontSize: '13px' }}>Work Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@bohocafe.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setResetModal(false); setRecoveryEmail(''); setRecoveryError(''); }}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={recoveryLoading}
                    style={{ flex: 2 }}
                  >
                    {recoveryLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-primary)' }}>Loading Staff Portal...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
