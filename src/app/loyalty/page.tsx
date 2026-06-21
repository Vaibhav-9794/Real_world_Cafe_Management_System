'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoyaltyRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to customer portal account page which holds the loyalty details
    router.replace('/account');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0807',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      color: '#f5f2eb'
    }}>
      <Loader2 size={32} className="spin" color="#c5a880" />
      <p style={{ fontSize: '14px', color: '#a8a29e' }}>Entering Boho Club Loyalty Portal...</p>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
