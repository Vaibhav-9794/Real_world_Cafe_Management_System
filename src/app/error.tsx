'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or remote monitoring
    console.error('Next.js Error Boundary caught error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0807',
      color: '#eae6df',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(197, 168, 128, 0.03)',
        border: '1px solid rgba(197, 168, 128, 0.1)',
        padding: '48px 32px',
        borderRadius: '12px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertTriangle size={32} color="#ef4444" />
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '12px',
          color: '#eae6df',
          letterSpacing: '-0.5px'
        }}>
          System Interruption
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#a39f99',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          We encountered an unexpected anomaly while loading this experience.
          Refreshes may resolve temporary network conflicts.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#c5a880',
              color: '#0a0807',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d4bc9c'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#c5a880'}
          >
            <RotateCcw size={16} /> Retry
          </button>
          
          <Link
            href="/"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'transparent',
              color: '#eae6df',
              border: '1px solid rgba(235, 230, 223, 0.2)',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'border-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(235, 230, 223, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(235, 230, 223, 0.2)'}
          >
            <Home size={16} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
