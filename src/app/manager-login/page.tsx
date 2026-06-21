'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/staff-login');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0807', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#c5a880' }}>Redirecting to Unified Login...</p>
    </div>
  );
}
