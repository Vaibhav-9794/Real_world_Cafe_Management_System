'use client';

import { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Calendar, 
  Clock, 
  Users, 
  Percent, 
  ArrowUpRight, 
  TrendingUp, 
  RefreshCw,
  MapPin,
  Activity,
  Award
} from 'lucide-react';
import { formatCurrency } from '@/config/branding';

export default function OwnerDashboard() {
  const [branchFilter, setBranchFilter] = useState('All');
  const [revenueData, setRevenueData] = useState<any>(null);
  const [resData, setResData] = useState<any>(null);
  const [custData, setCustData] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    setRefreshing(true);
    try {
      const branchParam = branchFilter !== 'All' ? `?branchId=${branchFilter}` : '';
      
      const [revRes, resRes, custRes, logsRes] = await Promise.all([
        fetch(`/api/analytics/revenue${branchParam}`),
        fetch(`/api/analytics/reservations${branchParam}`),
        fetch('/api/analytics/customers'), // Customer CRM data
        fetch('/api/activity-logs?limit=8') // Live activity logs
      ]);

      const revJ = await revRes.json();
      const resJ = await resRes.json();
      const custJ = await custRes.json();
      const logsJ = await logsRes.json();

      if (revJ.success) setRevenueData(revJ.metrics);
      if (resJ.success) setResData(resJ.metrics);
      if (custJ.success) setCustData(custJ.metrics);
      if (logsJ.success) setActivityLogs(logsJ.logs);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [branchFilter]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite' }} size={32} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading real-time executive analytics...</p>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const metrics = [
    {
      title: "Today's Revenue",
      value: formatCurrency(revenueData?.todayRevenue || 0),
      description: "From completed orders & bookings",
      icon: IndianRupee,
      color: "var(--color-success)",
      glow: "rgba(16, 185, 129, 0.1)"
    },
    {
      title: "Weekly Revenue",
      value: formatCurrency(revenueData?.weeklyRevenue || 0),
      description: "7-day rolling sales volume",
      icon: TrendingUp,
      color: "var(--color-primary)",
      glow: "rgba(197, 168, 128, 0.1)"
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(revenueData?.monthlyRevenue || 0),
      description: `Growth: ${revenueData?.growthRate > 0 ? '+' : ''}${revenueData?.growthRate || 0}% vs last month`,
      icon: IndianRupee,
      color: "var(--color-primary)",
      glow: "rgba(197, 168, 128, 0.1)"
    },
    {
      title: "Table Utilization",
      value: `${resData?.tableUtilization || 0}%`,
      description: "Average seat-to-capacity occupancy",
      icon: Percent,
      color: "var(--color-warning)",
      glow: "rgba(245, 158, 11, 0.1)"
    },
    {
      title: "Today's Occupancy",
      value: `${resData?.occupancyPercentage || 0}%`,
      description: "Active tables vs total tables",
      icon: Clock,
      color: "var(--color-primary)",
      glow: "rgba(197, 168, 128, 0.1)"
    },
    {
      title: "Customer Return Rate",
      value: `${custData?.returnRate || 0}%`,
      description: "Visit count > 1 ratio",
      icon: Users,
      color: "var(--color-success)",
      glow: "rgba(16, 185, 129, 0.1)"
    }
  ];

  const reservationCards = [
    { title: "Total Bookings", value: resData?.total || 0, color: "var(--color-text)" },
    { title: "Pending Approval", value: resData?.pending || 0, color: "var(--color-warning)" },
    { title: "Confirmed / Active", value: resData?.confirmed || 0, color: "var(--color-success)" },
    { title: "Cancelled Bookings", value: resData?.cancelled || 0, color: "var(--color-error)" }
  ];

  // Helper for rendering SVG charts
  const dailyChart = revenueData?.dailyChart || [];
  const maxAmount = Math.max(...dailyChart.map((d: any) => d.amount), 100);
  const chartHeight = 140;
  const chartWidth = 500;

  // Generate SVG points for Line Chart
  const linePoints = dailyChart.map((d: any, i: number) => {
    const x = (i / (dailyChart.length - 1)) * chartWidth;
    const y = chartHeight - (d.amount / maxAmount) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-title)', letterSpacing: '0.5px' }}>Executive Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Real-time business performance & administrative oversight</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Branch selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-card)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <MapPin size={16} color="var(--color-primary)" />
            <select 
              value={branchFilter} 
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', outline: 'none', fontSize: '13px', paddingRight: '8px' }}
            >
              <option value="All" style={{ background: 'var(--color-card)' }}>All Branches</option>
              <option value="downtown" style={{ background: 'var(--color-card)' }}>Downtown Sanctuary</option>
              <option value="uptown" style={{ background: 'var(--color-card)' }}>Uptown Lounge</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              color: 'var(--color-text)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            <RefreshCw className={refreshing ? 'spin' : ''} size={16} />
          </button>
        </div>
      </div>

      {/* Main metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx}
              className="card"
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: `0 8px 32px 0 ${m.glow}`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{m.title}</p>
                <h3 style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 4px 0', fontFamily: 'monospace' }}>{m.value}</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{m.description}</p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: m.color
              }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reservation sub-metrics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {reservationCards.map((rc, idx) => (
          <div key={idx} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{rc.title}</span>
            <strong style={{ fontSize: '18px', color: rc.color, fontFamily: 'monospace' }}>{rc.value}</strong>
          </div>
        ))}
      </div>

      {/* Charts & BI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '24px' }}>
        {/* Revenue Line Chart */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>7-Day Revenue Trend</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Daily aggregate payments & deposits</p>
            </div>
            <ArrowUpRight size={18} color="var(--color-primary)" />
          </div>

          <div style={{ width: '100%', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="var(--color-border)" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="var(--color-border)" strokeDasharray="3 3" />
              <line x1="0" y1="130" x2={chartWidth} y2="130" stroke="var(--color-border)" strokeDasharray="3 3" />

              {/* Area Under Line */}
              <path
                d={`M 0,${chartHeight} L ${linePoints} L ${chartWidth},${chartHeight} Z`}
                fill="url(#chartGlow)"
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                points={linePoints}
              />

              {/* Points */}
              {dailyChart.map((d: any, i: number) => {
                const x = (i / (dailyChart.length - 1)) * chartWidth;
                const y = chartHeight - (d.amount / maxAmount) * (chartHeight - 30) - 15;
                return (
                  <g key={i} className="chart-node">
                    <circle cx={x} cy={y} r="5" fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="2" />
                    <title>{d.date}: {formatCurrency(d.amount)}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
            {dailyChart.map((d: any, i: number) => {
              const label = d.date.split('-').slice(1).join('/'); // MM/DD
              return <span key={i}>{label}</span>;
            })}
          </div>
        </div>

        {/* Customer Tiers & Live Audit Log Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* CRM Loyalty Breakdown */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Loyalty Tiers Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {custData?.tiers && Object.entries(custData.tiers).map(([tier, count]: any) => {
                const totalCust = custData?.total || 1;
                const percent = ((count / totalCust) * 100).toFixed(0);
                let color = "var(--color-text-secondary)";
                if (tier === 'Gold') color = "#eab308";
                if (tier === 'Platinum' || tier === 'VIP Elite') color = "#38bdf8";
                if (tier === 'Silver') color = "#94a3b8";

                return (
                  <div key={tier}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={14} style={{ color }} /> {tier}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{count} ({percent}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: color, width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Operations Feed & Activity logs */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Activity size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Live Operations Activity Timeline</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activityLogs.length > 0 ? activityLogs.map((log) => {
            const timeStr = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div 
                key={log.id} 
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '13px', 
                  paddingBottom: '12px', 
                  borderBottom: '1px solid var(--color-border)',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ color: 'var(--color-primary)', minWidth: '60px', fontFamily: 'monospace', fontWeight: 500 }}>
                  {timeStr}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    [{log.actorRole}] {log.actorEmail}
                  </span>
                  <span style={{ margin: '0 8px', color: 'var(--color-primary)' }}>→</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {log.details}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '10px', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  background: log.action.includes('CREATE') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(197, 168, 128, 0.1)',
                  color: log.action.includes('CREATE') ? 'var(--color-success)' : 'var(--color-primary)',
                  fontWeight: 600,
                  fontFamily: 'monospace'
                }}>
                  {log.action}
                </span>
              </div>
            );
          }) : (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              No system activity logs found.
            </p>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .chart-node:hover circle { r: 7px; fill: var(--color-primary); }
      `}</style>
    </div>
  );
}
