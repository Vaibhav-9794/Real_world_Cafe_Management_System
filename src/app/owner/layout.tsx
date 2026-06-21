'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Tag, 
  LogOut, 
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  Settings
} from 'lucide-react';
import { BRANDING } from '@/config/branding';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (res.ok && data.success && data.user.role === 'OWNER') {
          setProfile(data.user);
        } else {
          router.replace('/staff-login?error=unauthenticated');
        }
      } catch {
        router.replace('/staff-login?error=unauthenticated');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/staff-login');
    } catch {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0807', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} color="#c5a880" />
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!profile) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/owner', icon: LayoutDashboard },
    { name: 'Staff Management', path: '/owner/staff', icon: UserCheck },
    { name: 'Customer CRM', path: '/owner/customers', icon: Users },
    { name: 'Promotions & Marketing', path: '/owner/promotions', icon: Tag },
    { name: 'Settings', path: '/owner/settings', icon: Settings },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: '280px',
        borderRight: '1px solid var(--color-border)',
        background: 'rgba(18, 15, 13, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        transition: 'transform 0.3s ease',
      }} className="desktop-sidebar">
        <div style={{ padding: '30px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--color-primary-glow)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="var(--color-primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-title)', letterSpacing: '1px' }}>BOHO</h2>
            <p style={{ fontSize: '10px', color: 'var(--color-primary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Owner Suite</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  background: isActive ? 'var(--color-primary-glow)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div style={{ padding: '20px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#251f1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'var(--color-primary)',
              fontSize: '14px'
            }}>
              {profile.name[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-error)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
              e.currentTarget.style.borderColor = 'var(--color-error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div style={{ display: 'none' }} className="mobile-header-bar">
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(18, 15, 13, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 110
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--color-primary)" />
            <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-title)', letterSpacing: '1px' }}>BOHO OWNER</span>
          </div>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            style={{ cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {mobileOpen ? <X size={24} color="#f5f2eb" /> : <Menu size={24} color="#f5f2eb" />}
          </button>
        </header>

        {mobileOpen && (
          <div style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--color-bg)',
            zIndex: 105,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.01)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    fontSize: '15px'
                  }}
                >
                  <Icon size={18} />
                  {item.name}
                </a>
              );
            })}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--color-error)',
                fontSize: '15px',
                marginTop: 'auto',
                cursor: 'pointer'
              }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        marginLeft: '280px',
        padding: '40px',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top right, rgba(197, 168, 128, 0.03), transparent 60%)',
        transition: 'margin-left 0.3s ease',
      }} className="content-container">
        {children}
      </main>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .desktop-sidebar {
            transform: translateX(-280px);
            display: none !important;
          }
          .mobile-header-bar {
            display: block !important;
          }
          .content-container {
            margin-left: 0 !important;
            padding: 100px 20px 40px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
