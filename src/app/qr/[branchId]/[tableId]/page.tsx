'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { BRANDING } from '@/config/branding';
import { QrCode, BookOpen, Calendar, HelpCircle, ArrowRight } from 'lucide-react';

interface QRPageProps {
  params: Promise<{
    branchId: string;
    tableId: string;
  }>;
}

export default function QRRoutePage({ params }: QRPageProps) {
  const { branchId, tableId } = use(params);
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    const branch = BRANDING.branches.find((b) => b.id === branchId);
    setBranchName(branch ? branch.name : 'Boho Cafe & Dining');
  }, [branchId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${BRANDING.colors.secondary} 0%, ${BRANDING.colors.background} 60%)`,
      color: 'var(--color-text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        textAlign: 'center',
        animation: 'scaleIn 0.4s ease-out',
      }}>
        {/* Decorative elements */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: '1px solid var(--color-primary)',
          background: 'var(--color-primary-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto',
        }}>
          <QrCode size={28} color="var(--color-primary)" />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-title)',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}>
          {BRANDING.logo}
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-primary)',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '32px',
        }}>
          Welcome To Your Table
        </p>

        {/* Info Box */}
        <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h2 style={{
            fontFamily: 'var(--font-title)',
            fontSize: '20px',
            marginBottom: '8px',
          }}>
            Table {tableId}
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginBottom: '32px',
          }}>
            {branchName}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Menu Option */}
            <Link
              href={`/menu?branch=${branchId}&table=${tableId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s',
                textDecoration: 'none',
                color: 'var(--color-text)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'var(--color-primary-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <BookOpen size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>Browse Digital Menu</h3>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Explore cuisines, specials, and ingredients</p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--color-text-secondary)" />
            </Link>

            {/* Reserve Option */}
            <Link
              href={`/reserve?branch=${branchId}&table=${tableId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s',
                textDecoration: 'none',
                color: 'var(--color-text)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'var(--color-primary-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Calendar size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>Reserve Next Visit</h3>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Lock in your dates, events, or buyouts</p>
                </div>
              </div>
              <ArrowRight size={16} color="var(--color-text-secondary)" />
            </Link>
          </div>
        </div>

        {/* Future Ordering Notice */}
        <div style={{
          padding: '16px',
          background: 'rgba(197, 168, 128, 0.05)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
        }}>
          <HelpCircle size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Digital Ordering Coming Soon:</strong> You can browse our interactive digital menu above. To place your order, please call one of our hosts.
          </span>
        </div>

        {/* Footnote */}
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '32px' }}>
          ✦ Powered by Boho Hospitality Platform ✦
        </p>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
