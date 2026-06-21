'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Global Root Layout caught error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        background: '#0a0807',
        color: '#eae6df',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
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
              Critical System Failure
            </h1>
            
            <p style={{
              fontSize: '14px',
              color: '#a39f99',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              A structural error occurred in the application root system.
              A full reset is recommended.
            </p>

            <button
              onClick={() => reset()}
              style={{
                width: '100%',
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
              <RotateCcw size={16} /> Re-Initialize Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
