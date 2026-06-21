'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card" style={{ maxWidth: '440px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
        <AlertTriangle size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '12px' }}>Missing Reset Token</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          This link appears to be invalid or incomplete. Please request a new password reset link from the login page.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/account')} style={{ width: '100%' }}>
          Go to Customer Portal
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card" style={{ maxWidth: '440px', margin: '40px auto', padding: '32px', textAlign: 'center', animation: 'scaleIn 0.3s ease-out' }}>
        <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '12px' }}>Password Updated</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your BOHO Customer Portal password has been reset successfully. You can now log in using your email and new password.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/account')} style={{ width: '100%' }}>
          Proceed to Login
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '440px', margin: '40px auto', padding: '32px', animation: 'scaleIn 0.3s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <Lock size={36} color="var(--color-primary)" style={{ margin: '0 auto 12px auto' }} />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '8px' }}>Choose New Password</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          Enter your new password below to update your login credentials.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: 'var(--radius-sm)',
          color: '#ef4444',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ paddingLeft: '40px', paddingRight: '40px' }}
            />
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
            Confirm New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{ paddingLeft: '40px' }}
            />
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <Loader2 className="spin" size={18} /> : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'radial-gradient(circle at top, #1c1510 0%, #0d0a08 100%)'
    }}>
      <Suspense fallback={
        <div className="card" style={{ maxWidth: '440px', padding: '32px', textAlign: 'center' }}>
          <Loader2 className="spin" size={32} color="var(--color-primary)" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading password reset portal...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
