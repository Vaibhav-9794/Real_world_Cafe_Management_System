'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  ArrowLeft,
  MapPin,
  Loader2,
  AlertTriangle,
  Gift,
  LayoutGrid
} from 'lucide-react';
import { BRANDING, formatCurrency } from '@/config/branding';

type ReservationType = 'TABLE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'CORPORATE' | 'FULL_CAFE';

export default function ReservationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form State
  const [branchId, setBranchId] = useState(BRANDING.branches[0]?.id || '');
  const [type, setType] = useState<ReservationType>('TABLE');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');

  // Customer State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Table Selection States
  const [loadingTables, setLoadingTables] = useState(false);
  const [availableTablesList, setAvailableTablesList] = useState<any[]>([]);
  const [occupiedTablesList, setOccupiedTablesList] = useState<any[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [tableWarning, setTableWarning] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'RAZORPAY' | 'UPI' | 'PAYTM'>('STRIPE');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Waitlist Fallback State
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistRegistered, setWaitlistRegistered] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Successful Reservation Data
  const [successData, setSuccessData] = useState<{
    id: string;
    tables: string[];
    allocationMessage: string;
    totalPaid: number;
    discount: number;
  } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const timeSlots = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const selectedBranch = BRANDING.branches.find(b => b.id === branchId) || BRANDING.branches[0];

  const matchedEventPackage = type !== 'TABLE' ? BRANDING.eventPackages.find(p => {
    if (type === 'FULL_CAFE') return p.type === 'FULL_VENUE';
    return p.type === type;
  }) : null;

  const depositBase = matchedEventPackage
    ? matchedEventPackage.pricePerGuest * Math.max(guests, matchedEventPackage.minGuests)
    : 25.00;

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalAmount = Math.max(0, depositBase - discountAmount);

  const isStep1Valid = date && time && guests > 0 && branchId;
  const isStep3Valid = name.trim() && email.trim() && phone.trim();

  // Load Seating Data dynamically when step 2 is active
  useEffect(() => {
    if (step === 2 && !showWaitlistForm) {
      setLoadingTables(true);
      setTableWarning('');
      setSelectedTableIds([]);

      const checkUrl = `/api/reservation/availability?branchId=${branchId}&date=${date}&time=${time}&guests=${guests}`;
      fetch(checkUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAvailableTablesList(data.availableTables || []);
            setOccupiedTablesList(data.occupiedTables || []);
            
            // Auto-select optimal table matches initially
            const optimal = (data.availableTables || []).filter((t: any) => t.capacity >= guests).slice(0, 1);
            if (optimal.length > 0) {
              setSelectedTableIds([optimal[0].id]);
            } else if ((data.availableTables || []).length > 0) {
              // Select first few tables to fulfill capacity
              let cap = 0;
              const ids: string[] = [];
              for (const t of data.availableTables) {
                ids.push(t.id);
                cap += t.capacity;
                if (cap >= guests) break;
              }
              setSelectedTableIds(ids);
            }
          } else if (data.conflict === 'CAPACITY_OVERFLOW') {
            setShowWaitlistForm(true);
          }
        })
        .catch(err => {
          console.error('Error fetching layout data:', err);
        })
        .finally(() => {
          setLoadingTables(false);
        });
    }
  }, [step, branchId, date, time, guests, showWaitlistForm]);

  // Track combined seating capacity
  const getSelectedCapacity = () => {
    let capacity = 0;
    for (const id of selectedTableIds) {
      const t = availableTablesList.find(x => x.id === id);
      if (t) capacity += t.capacity;
    }
    return capacity;
  };

  const handleTableToggle = (tableId: string) => {
    setSelectedTableIds(prev => {
      const next = prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId];
      
      // Calculate capacity and warn if insufficient
      let cap = 0;
      for (const id of next) {
        const t = availableTablesList.find(x => x.id === id);
        if (t) cap += t.capacity;
      }
      if (cap < guests) {
        setTableWarning(`Selected seating capacity (${cap}) is less than guests count (${guests}).`);
      } else {
        setTableWarning('');
      }

      return next;
    });
  };

  const getTableCategory = (capacity: number, number: string): string => {
    const num = parseInt(number);
    if (num === 9 || num === 10) return 'VIP Table';
    if (capacity === 2) return 'Couple Table';
    if (capacity === 4) return 'Window Table';
    if (capacity === 6) return 'Family Table';
    return 'Garden Table';
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch(`/api/coupons?code=${couponCode.trim()}&spend=${depositBase}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedCoupon(data.coupon);
        setCouponError('');
      } else {
        setCouponError(data.message || 'Coupon not applicable.');
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon.');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleConfirmAndPay = async () => {
    setSubmitting(true);
    setApiError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          type,
          date,
          time,
          guests,
          notes,
          branchId,
          paymentMethod,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          selectedTableIds: selectedTableIds.length > 0 ? selectedTableIds : undefined
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.fullyBooked) {
        setShowWaitlistForm(true);
        setStep(2);
      } else if (!res.ok) {
        setApiError(data.message || 'Payment/Reservation failed. Please try again.');
      } else {
        setSuccessData(data.reservation);
        setStep(5);
      }
    } catch {
      setApiError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    setApiError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          guests,
          date,
          timeSlot: time,
          branchId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaitlistRegistered(true);
      } else {
        setApiError(data.message || 'Could not register to waitlist.');
      }
    } catch {
      setApiError('Network error registering waitlist.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const getWhatsAppShareLink = () => {
    if (!successData) return '#';
    const message = `Hello, I've successfully booked a table at ${selectedBranch.name}!\n\nReservation Details:\nID: ${successData.id.substring(0, 8)}\nDate: ${date}\nTime: ${time}\nGuests: ${guests}\nType: ${type}\nAllocated: ${successData.tables.join(', ')}\nTotal Paid: ₹${successData.totalPaid.toFixed(2)}`;
    return `https://wa.me/${selectedBranch.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header navbar */}
      <header className="navbar scrolled">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {BRANDING.logo}
          </div>
          <div style={{ width: '40px' }} />
        </div>
      </header>

      <main className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '36px', marginBottom: '8px' }}>
              Secure Your Table
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
              Experience high-end culinary hospitality customized to your preference
            </p>
          </div>

          {!successData && !waitlistRegistered && (
            <>
              {/* Desktop Stepper */}
              <div className="stepper desktop-stepper-only">
                {[
                  { label: 'Details', idx: 1 },
                  { label: 'Seating Layout', idx: 2 },
                  { label: 'Customer Info', idx: 3 },
                  { label: 'Deposit Payment', idx: 4 },
                ].map((s, i) => (
                  <div key={s.idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <div className={`step ${step === s.idx ? 'active' : step > s.idx ? 'completed' : ''}`}>
                      <div className="step-circle">
                        {step > s.idx ? <Check size={16} /> : s.idx}
                      </div>
                      <span className="step-label" style={{ display: 'inline-block', marginLeft: '6px', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </div>
                    {i < 3 && <div className="step-line" />}
                  </div>
                ))}
              </div>

              {/* Mobile Stacked Stepper */}
              <div className="mobile-stepper-only" style={{ display: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '0 auto 32px auto', maxWidth: '280px', width: '100%' }}>
                  {[
                    { label: 'Details', idx: 1 },
                    { label: 'Seating Layout', idx: 2 },
                    { label: 'Customer Info', idx: 3 },
                    { label: 'Deposit Payment', idx: 4 },
                  ].map((s, i) => (
                    <div key={s.idx} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div className={`step ${step === s.idx ? 'active' : step > s.idx ? 'completed' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="step-circle">
                          {step > s.idx ? <Check size={16} /> : s.idx}
                        </div>
                        <span className="step-label" style={{ 
                          display: 'inline-block', 
                          marginLeft: '12px', 
                          fontSize: '14px', 
                          fontWeight: step === s.idx ? 700 : 500, 
                          color: step === s.idx ? 'var(--color-primary)' : step > s.idx ? 'var(--color-success)' : 'var(--color-text-secondary)' 
                        }}>
                          {s.label}
                        </span>
                      </div>
                      {i < 3 && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            left: '17px', 
                            top: '36px', 
                            width: '2px', 
                            height: '20px', 
                            background: step > s.idx ? 'var(--color-success)' : 'var(--color-border)' 
                          }} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {apiError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              color: 'var(--color-error)',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <AlertTriangle size={20} />
              <span>{apiError}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && !successData && (
            <div className="card" style={{ padding: '32px', animation: 'scaleIn 0.3s ease-out' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                1. Reservation Details
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Select Location Branch</label>
                  <select
                    className="form-input"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    {BRANDING.branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div className="form-group">
                    <label>Dining Type / Package</label>
                    <select
                      className="form-input"
                      value={type}
                      onChange={(e) => setType(e.target.value as ReservationType)}
                    >
                      <option value="TABLE">Regular Table Booking</option>
                      <option value="BIRTHDAY">Birthday Package Hires</option>
                      <option value="ANNIVERSARY">Anniversary Celebration</option>
                      <option value="CORPORATE">Corporate Booking Hires</option>
                      <option value="FULL_CAFE">Full Cafe Buyout</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Guest Count</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={100}
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div className="form-group">
                    <label>Preferred Date</label>
                    <input
                      type="date"
                      className="form-input"
                      min={todayStr}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Arrival Time Slot</label>
                    <select
                      className="form-input"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Seating layout selection */}
          {step === 2 && !successData && (
            <div className="card" style={{ padding: '32px', animation: 'scaleIn 0.3s ease-out' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                2. Visual Seating Selection
              </h2>

              {showWaitlistForm ? (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                    <AlertTriangle size={32} color="var(--color-warning)" />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '12px' }}>Fully Booked for Selected Slot</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                    Unfortunately, we do not have available tables to accommodate {guests} guests on {date} at {time}. Join our waitlist to get notified immediately of cancellations.
                  </p>

                  {waitlistRegistered ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)', padding: '24px', color: 'var(--color-success)' }}>
                      <Check size={28} style={{ margin: '0 auto 12px auto' }} />
                      <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Joined Waitlist Successfully</h4>
                      <Link href="/" className="btn btn-outline" style={{ marginTop: '20px' }}>Back to Home</Link>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                      <div className="form-group"><label>Your Name</label><input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
                      <div className="form-group" style={{ marginTop: '12px' }}><label>Email Address</label><input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                      <div className="form-group" style={{ marginTop: '12px' }}><label>Phone Number</label><input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button onClick={() => { setShowWaitlistForm(false); setStep(1); }} className="btn btn-outline" style={{ flex: 1 }}>Change Date</button>
                        <button onClick={handleJoinWaitlist} disabled={waitlistLoading || !name.trim() || !email.trim() || !phone.trim()} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {waitlistLoading ? <Loader2 size={16} className="spin" /> : 'Join Priority List'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                    Select your preferred tables below. Tap any available table to include it in your reservation.
                  </p>

                  {loadingTables ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                      <Loader2 size={24} className="spin" color="var(--color-primary)" />
                      <span>Loading active seating layout...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                      
                      {/* Seating Layout Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: '16px'
                      }}>
                        {availableTablesList.map((t) => {
                          const isSelected = selectedTableIds.includes(t.id);
                          const cat = getTableCategory(t.capacity, t.number);
                          return (
                            <div 
                              key={t.id}
                              onClick={() => handleTableToggle(t.id)}
                              style={{
                                background: isSelected ? 'var(--color-primary-glow)' : 'var(--color-card)',
                                border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '16px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 16px rgba(197, 168, 128, 0.15)' : 'none'
                              }}
                            >
                              <LayoutGrid size={24} color={isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)'} style={{ margin: '0 auto 8px auto' }} />
                              <h4 style={{ fontWeight: 700, fontSize: '15px' }}>Table {t.number}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{cat}</p>
                              <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontWeight: 600, marginTop: '10px' }}>
                                {t.capacity} Seats
                              </span>
                            </div>
                          );
                        })}

                        {occupiedTablesList.map((t) => {
                          const cat = getTableCategory(t.capacity, t.number);
                          return (
                            <div 
                              key={t.id}
                              style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '2px solid rgba(255,255,255,0.04)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '16px',
                                textAlign: 'center',
                                opacity: 0.5,
                                cursor: 'not-allowed'
                              }}
                            >
                              <LayoutGrid size={24} color="var(--color-text-secondary)" style={{ margin: '0 auto 8px auto' }} />
                              <h4 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-secondary)' }}>Table {t.number}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{cat}</p>
                              <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', fontWeight: 600, marginTop: '10px' }}>
                                Reserved
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {tableWarning && (
                        <p style={{ color: 'var(--color-warning)', fontSize: '13px', background: 'rgba(245, 158, 11, 0.05)', padding: '10px', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <AlertTriangle size={14} /> {tableWarning}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                        <span>Combined Seats Selected:</span>
                        <strong style={{ color: 'var(--color-primary)' }}>{getSelectedCapacity()} / {guests} Seats needed</strong>
                      </div>
                    </div>
                  )}

                  {matchedEventPackage && (
                    <div style={{ padding: '20px', background: 'rgba(197, 168, 128, 0.05)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '12px' }}>
                        <Gift size={20} />
                        <span>Event Package Inclusions: {matchedEventPackage.name}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>{matchedEventPackage.description}</p>
                      <ul style={{ paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {matchedEventPackage.inclusions.map((inc, i) => <li key={i}>{inc}</li>)}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={() => setStep(1)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ChevronLeft size={18} /> Modify Details
                    </button>
                    <button 
                      onClick={() => setStep(3)} 
                      disabled={selectedTableIds.length === 0}
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      Confirm Tables <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Customer Details */}
          {step === 3 && !successData && (
            <div className="card" style={{ padding: '32px', animation: 'scaleIn 0.3s ease-out' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                3. Customer Information
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Contact Full Name</label>
                  <input type="text" className="form-input" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" className="form-input" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Contact Number</label>
                    <input type="tel" className="form-input" placeholder="e.g. +91 84006 78200" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Special Notes / Dietary Requirements (Optional)</label>
                  <textarea className="form-input" rows={3} placeholder="E.g. Wheelchair access needed, gluten allergy..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                </div>

                {/* Coupon Code Section */}
                <div style={{ padding: '20px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginTop: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Have a Premium Promo Coupon?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" className="form-input" placeholder="E.g. BOHO50" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} style={{ textTransform: 'uppercase' }} />
                    <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="btn btn-outline" style={{ minWidth: '100px' }}>
                      {couponLoading ? <Loader2 size={16} className="spin" /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '8px' }}>{couponError}</p>}
                  {appliedCoupon && <p style={{ color: 'var(--color-success)', fontSize: '12px', marginTop: '8px', fontWeight: 500 }}>✓ Promo Applied: {appliedCoupon.code}. Saved {formatCurrency(appliedCoupon.discountAmount)}!</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button onClick={() => setStep(2)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ChevronLeft size={18} /> Back</button>
                  <button onClick={() => setStep(4)} disabled={!isStep3Valid} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Proceed to Payment <ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Payment */}
          {step === 4 && !successData && (
            <div className="card" style={{ padding: '32px', animation: 'scaleIn 0.3s ease-out' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                4. Secure Payment checkout
              </h2>

              <div style={{ background: 'var(--color-bg)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '16px' }}>Reservation Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Branch:</span><span>{selectedBranch.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Date & Time:</span><span>{date} at {time}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Seating:</span><span>Table IDs Selected: {selectedTableIds.length} ({guests} Guests)</span></div>
                  <div style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Secure Booking Fee:</span><span>{formatCurrency(depositBase)}</span></div>
                  {appliedCoupon && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}><span>Discount:</span><span>-{formatCurrency(discountAmount)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', color: 'var(--color-primary)', marginTop: '8px' }}><span>Amount Payable:</span><span>{formatCurrency(finalAmount)}</span></div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label style={{ marginBottom: '12px' }}>Select Payment Provider</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  {['STRIPE', 'RAZORPAY', 'UPI', 'PAYTM'].map((gw) => (
                    <label key={gw} style={{ border: `1px solid ${paymentMethod === gw ? 'var(--color-primary)' : 'var(--color-border)'}`, background: paymentMethod === gw ? 'var(--color-primary-glow)' : 'var(--color-card)', borderRadius: 'var(--radius-sm)', padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', textAlign: 'center' }}>
                      <input type="radio" name="paymentMethod" value={gw} checked={paymentMethod === gw} onChange={() => setPaymentMethod(gw as any)} style={{ display: 'none' }} />
                      <CreditCard size={20} color={paymentMethod === gw ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
                      <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>{gw}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '24px' }}>🔒 Local Sandbox Environment active. Transact virtual balance.</p>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(3)} disabled={submitting} className="btn btn-outline"><ChevronLeft size={18} /> Back</button>
                <button onClick={handleConfirmAndPay} disabled={submitting} className="btn btn-primary" style={{ minWidth: '180px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {submitting ? <Loader2 size={18} className="spin" /> : null}
                  {submitting ? 'Processing...' : `Confirm & Pay (${formatCurrency(finalAmount)})`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Confirmation */}
          {step === 5 && successData && (
            <div className="card" style={{ padding: '40px', textAlign: 'center', animation: 'scaleIn 0.4s ease-out' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <Check size={36} color="var(--color-success)" />
              </div>

              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '30px', marginBottom: '12px' }}>Booking Confirmed!</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', maxWidth: '500px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
                Your table at <strong>{selectedBranch.name}</strong> is reserved for <strong>{date}</strong> at <strong>{time}</strong>.
              </p>

              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '24px', maxWidth: '480px', margin: '0 auto 40px auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span style={{ color: 'var(--color-text-secondary)' }}>Reservation ID:</span><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{successData.id}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span style={{ color: 'var(--color-text-secondary)' }}>Allocated Seating:</span><span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{successData.tables.join(', ') || 'Auto-allocated'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span style={{ color: 'var(--color-text-secondary)' }}>Status:</span><span style={{ color: 'var(--color-success)', fontWeight: 600 }}>PAID ({formatCurrency(successData.totalPaid)})</span></div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
                <a href={getWhatsAppShareLink()} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                  <MessageCircle size={20} fill="#fff" /> Share on WhatsApp
                </a>
                <Link href="/account" className="btn btn-outline" style={{ padding: '12px 24px' }}>Track in Guest Portal</Link>
                <Link href="/" className="btn btn-ghost" style={{ padding: '12px 24px' }}>Back to Home</Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .desktop-stepper-only {
          display: flex !important;
        }
        .mobile-stepper-only {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-stepper-only {
            display: none !important;
          }
          .mobile-stepper-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
