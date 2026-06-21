'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/config/branding';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your access PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Authentication failed.');
        setLoading(false);
        return;
      }

      // Store session info in localStorage
      localStorage.setItem('auth', JSON.stringify(data.user));

      // Route based on role
      const role = data.user.role;
      if (role === 'OWNER') {
        router.push('/dashboard/owner');
      } else if (role === 'MANAGER') {
        router.push('/dashboard/manager');
      } else {
        router.push('/dashboard/staff');
      }
    } catch {
      setError('Network error. Please try again.');
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
      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'scaleIn 0.4s ease-out',
      }}>
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
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            Management Portal
          </p>
        </div>

        {/* Login Card */}
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
            Enter your access PIN to continue
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Access PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={8}
                  style={{ paddingRight: '44px', letterSpacing: '8px', textAlign: 'center', fontSize: '18px' }}
                />
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
                    background: 'none',
                    border: 'none',
                  }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: '13px',
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? <Loader2 size={18} className="spin" /> : 'Access Dashboard'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '12px',
              textAlign: 'center',
            }}>
              Demo Access PINs
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { role: 'Owner', pin: '8888', color: 'var(--color-primary)' },
                { role: 'Manager', pin: '7777', color: 'var(--color-warning)' },
                { role: 'Staff', pin: '1111', color: 'var(--color-success)' },
              ].map((demo) => (
                <div
                  key={demo.role}
                  onClick={() => setPin(demo.pin)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-card)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: demo.color, fontWeight: 600 }}>{demo.role}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{demo.pin}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back to Website */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ← Back to Website
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
