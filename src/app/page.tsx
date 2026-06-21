'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
  Menu as MenuIcon,
  MessageCircle,
  Users,
  Calendar,
  Award,
  Home,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Heart,
  MessageSquare
} from 'lucide-react';
import { BRANDING, formatCurrency } from '@/config/branding';

const Instagram = ({ size = 24, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

/* ──────────────────────────────────────────────
   Animated counter hook
   ────────────────────────────────────────────── */
function useCounter(end: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Number((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, decimals]);

  return { count, ref };
}

/* ──────────────────────────────────────────────
   Popular menu items helper
   ────────────────────────────────────────────── */
function getPopularItems() {
  const items: typeof BRANDING.menu[0]['categories'][0]['items'] = [];
  for (const cuisine of BRANDING.menu) {
    for (const cat of cuisine.categories) {
      for (const item of cat.items) {
        if (item.isPopular) items.push(item);
      }
    }
  }
  return items.slice(0, 4);
}

export default function HomePage() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Dynamic CMS States
  const [instagramFeed, setInstagramFeed] = useState<any[]>([]);
  const [eventsGallery, setEventsGallery] = useState<any[]>([]);
  const [activeEventCategory, setActiveEventCategory] = useState('Birthday Celebrations');
  const [loadingCms, setLoadingCms] = useState(true);

  // Event Planner Calculator States
  const [planCategory, setPlanCategory] = useState<'BIRTHDAY' | 'ANNIVERSARY' | 'CORPORATE' | 'FULL_VENUE'>('BIRTHDAY');
  const [planGuests, setPlanGuests] = useState(15);
  const [planBudgetPerGuest, setPlanBudgetPerGuest] = useState(75);
  const [planProposal, setPlanProposal] = useState<any>(null);

  const branch = BRANDING.branches[0];
  const popularItems = getPopularItems();

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch CMS Gallery data (Instagram mock feed & Events Gallery categories)
  useEffect(() => {
    fetch('/api/cms/gallery')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInstagramFeed(data.instagram || []);
          setEventsGallery(data.events || []);
          if (data.events?.[0]?.category) {
            setActiveEventCategory(data.events[0].category);
          }
        }
      })
      .catch(err => console.error('Failed to load CMS data:', err))
      .finally(() => setLoadingCms(false));
  }, []);

  // Calculate Event Recommendations
  useEffect(() => {
    const matchedPkg = BRANDING.eventPackages.find(p => p.type === planCategory);
    if (!matchedPkg) return;

    const baseCost = matchedPkg.pricePerGuest * planGuests;
    const isBudgetOk = planBudgetPerGuest >= matchedPkg.pricePerGuest;
    
    // Generate recommendation proposals
    setPlanProposal({
      packageName: matchedPkg.name,
      estimatedCost: baseCost,
      isFeasible: isBudgetOk,
      inclusions: matchedPkg.inclusions,
      minGuestsRequired: matchedPkg.minGuests,
      suggestion: isBudgetOk 
        ? `Great! Your budget is sufficient to host a ${matchedPkg.name}. We recommend proceeding with reservation.`
        : `Your budget per guest (₹${planBudgetPerGuest}) is slightly below our minimum pricing of ₹${matchedPkg.pricePerGuest} per guest for this package. Consider upgrading your budget or choosing a regular Table booking.`
    });
  }, [planCategory, planGuests, planBudgetPerGuest]);

  // Lock body scroll for mobile nav / lightbox
  useEffect(() => {
    document.body.style.overflow = mobileOpen || lightbox !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, lightbox]);

  // Counter stats
  const ratingCounter = useCounter(BRANDING.globalRating, 1500, 1);
  const reservationsCounter = useCounter(12840, 2000);
  const customersCounter = useCounter(8420, 2200);
  const eventsCounter = useCounter(340, 1800);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const NAV_LINKS = [
    { label: 'Home', href: '#', icon: Home },
    { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
    { label: 'Reserve', href: '/reserve', icon: Calendar },
    { label: 'Events', href: '#events', icon: Sparkles },
    { label: 'Contact', href: '#contact', icon: Phone },
  ];

  const isActive = (href: string) => {
    if (href === '#' || href === '/') {
      return pathname === '/';
    }
    return pathname === href;
  };

  const getEventImages = () => {
    const cat = eventsGallery.find(c => c.category === activeEventCategory);
    return cat ? cat.images : [];
  };

  return (
    <>
      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link href="/" className="navbar-brand">
            {BRANDING.logo}
          </Link>

          <ul className="navbar-links">
            {NAV_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <li key={l.label}>
                  <Link href={l.href} className={isActive(l.href) ? 'active' : ''}>
                    <Icon size={14} />
                    <span>{l.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/reserve" className="btn-nav-cta">
                <Calendar size={14} />
                <span>Book A Table</span>
                <ArrowRight size={14} />
              </Link>
            </li>
          </ul>

          <div className="mobile-actions">
            <Link href="/reserve" className="mobile-book-btn">
              <Calendar size={12} />
              <span>BOOK</span>
            </Link>
            <button className="mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Nav ─── */}
      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <button className="mobile-nav-close" onClick={closeMobile} aria-label="Close menu">
          <X size={28} />
        </button>
        {NAV_LINKS.map((l, index) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.label}
              href={l.href}
              className={isActive(l.href) ? 'active' : ''}
              onClick={closeMobile}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <Icon size={20} />
              <span>{l.label}</span>
            </Link>
          );
        })}
        <div
          className="mobile-nav-cta"
          style={{ transitionDelay: `${NAV_LINKS.length * 50}ms` }}
        >
          <Link href="/reserve" className="btn-nav-cta" style={{ width: '100%' }} onClick={closeMobile}>
            <Calendar size={16} />
            <span>Book A Table</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ═══════════ HERO ═══════════ */}
      <section className="hero" id="home">
        <video
          className="hero-video cinematic-zoom"
          src={BRANDING.videoHeroUrl}
          poster="/images/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="hero-overlay" />
        <div className="hero-content animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', padding: '0 16px' }}>
          
          <h1 style={{ 
            fontFamily: 'var(--font-title)', 
            fontSize: 'clamp(24px, 5.5vw, 68px)', 
            lineHeight: 1.2, 
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            maxWidth: '100%',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            padding: '0 8px'
          }}>
            Where Fine Dining
            <br className="desktop-br" />
            Meets <span>Boho Luxury</span>
          </h1>

          <p className="hero-tagline" style={{ letterSpacing: '4px', textTransform: 'uppercase', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '20px', textAlign: 'center', maxWidth: '100%' }}>
            Kanpur&apos;s Premium Cafe Experience
          </p>

          <div className="hero-cta-group" style={{ marginTop: '30px' }}>
            <Link href="/reserve" className="btn btn-primary btn-lg">
              Reserve a Table
            </Link>
            <Link href="/menu" className="btn btn-outline btn-lg">
              Explore Menu
            </Link>
          </div>

          {/* Elegant Pulsing Scroll Indicator */}
          <div className="scroll-indicator-mouse" style={{ marginTop: '60px' }}>
            <div className="mouse-wheel" />
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST METRICS ═══════════ */}
      <section className="section" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="container">
          <div className="trust-grid">
            <div className="card stat-card animate-fade-in-up delay-1" ref={ratingCounter.ref}>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {ratingCounter.count}
                <Star size={24} fill="#f59e0b" color="#f59e0b" />
              </div>
              <div className="stat-label">Google Rating</div>
            </div>

            <div className="card stat-card animate-fade-in-up delay-2" ref={reservationsCounter.ref}>
              <div className="stat-value">{reservationsCounter.count.toLocaleString()}+</div>
              <div className="stat-label">Reservations Served</div>
            </div>

            <div className="card stat-card animate-fade-in-up delay-3" ref={customersCounter.ref}>
              <div className="stat-value">{customersCounter.count.toLocaleString()}+</div>
              <div className="stat-label">Happy Customers</div>
            </div>

            <div className="card stat-card animate-fade-in-up delay-4" ref={eventsCounter.ref}>
              <div className="stat-value">{eventsCounter.count.toLocaleString()}+</div>
              <div className="stat-label">Events Hosted</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ GUEST EXPERIENCES & TESTIMONIALS ═══════════ */}
      <section className="section" id="guest-experiences" style={{ background: 'var(--color-card)' }}>
        <div className="container">
          <div className="section-title">
            <span className="overline">Authentic Reviews</span>
            <h2>Guest Experiences</h2>
            <p>Read detailed reviews from guests who have experienced our dining sanctuary.</p>
          </div>

          <div className="reviews-grid">
            {BRANDING.reviews.map((review, i) => (
              <div key={review.id} className={`card review-card animate-fade-in-up delay-${i + 1}`}>
                <div className="review-header" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                  <img
                    className="review-avatar"
                    src={review.authorAvatar}
                    alt={review.author}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                  />
                  <div>
                    <h4 className="review-author" style={{ fontSize: '15px', fontWeight: 600 }}>{review.author}</h4>
                    <span className="review-time" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{review.relativeTime}</span>
                  </div>
                </div>
                <div className="review-stars" style={{ color: '#f59e0b', fontSize: '13px', marginBottom: '12px' }}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                <p className="review-text" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>
            ))}
          </div>

          {/* Real Google Reviews integration status */}
          <div style={{ maxWidth: '600px', margin: '48px auto 0 auto', textAlign: 'center' }}>
            <div className="card" style={{ border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', color: '#f59e0b', fontSize: '16px' }}>★★★★★</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Google Reviews API Integration Coming Soon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ EVENTS GALLERY ═══════════ */}
      <section className="section" id="events-gallery">
        <div className="container">
          <div className="section-title">
            <span className="overline">Interactive Portfolios</span>
            <h2>Events Gallery</h2>
            <p>Explore luxury decorations and setups customized for special banquets.</p>
          </div>

          {/* Event Category Tab Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {eventsGallery.map((eg) => (
              <button
                key={eg.category}
                onClick={() => setActiveEventCategory(eg.category)}
                className={`btn btn-sm ${activeEventCategory === eg.category ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: '30px' }}
              >
                {eg.category}
              </button>
            ))}
          </div>

          {/* Gallery setup photos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {getEventImages().map((img: any, idx: number) => (
              <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden', height: '280px', position: 'relative' }}>
                <img
                  src={img.src}
                  alt={img.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '20px',
                  background: 'linear-gradient(transparent, rgba(10,8,7,0.9))'
                }}>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 600 }}>{img.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ EVENTS & PARTY PLANNER CALCULATOR ═══════════ */}
      <section className="section" id="events" style={{ background: 'var(--color-card)' }}>
        <div className="container">
          <div className="section-title">
            <span className="overline">Interactive Calculator</span>
            <h2>Luxury Event Planner</h2>
            <p>Estimate costs and inclusions dynamically based on guests and target budget.</p>
          </div>

          <div className="event-planner-grid">
            {/* Input Form */}
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Celebration Type</label>
                  <select
                    className="form-input"
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value as any)}
                  >
                    <option value="BIRTHDAY">Birthday Celebrations</option>
                    <option value="ANNIVERSARY">Anniversary Celebrations</option>
                    <option value="CORPORATE">Corporate Events</option>
                    <option value="FULL_VENUE">Private Dining (Full Takeover)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Guest Count ({planGuests} guests)</label>
                  <input
                    type="range"
                    min={2}
                    max={150}
                    value={planGuests}
                    onChange={(e) => setPlanGuests(parseInt(e.target.value) || 2)}
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  />
                </div>

                <div className="form-group">
                  <label>Target Budget per Guest (₹{planBudgetPerGuest})</label>
                  <input
                    type="range"
                    min={40}
                    max={250}
                    value={planBudgetPerGuest}
                    onChange={(e) => setPlanBudgetPerGuest(parseInt(e.target.value) || 40)}
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Proposal recommendation results */}
            {planProposal && (
              <div className="card" style={{ border: `1px solid ${planProposal.isFeasible ? 'var(--color-primary)' : 'var(--color-border)'}`, padding: '32px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', marginBottom: '8px', color: 'var(--color-primary)' }}>
                  Recommended: {planProposal.packageName}
                </h3>
                
                <div style={{ margin: '20px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Estimated Total Cost</span>
                  <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                    {formatCurrency(planProposal.estimatedCost)}
                  </div>
                </div>

                <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--color-text-secondary)' }}>
                  Inclusions List
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '13px' }}>
                  {planProposal.inclusions.map((inc: string) => (
                    <li key={inc} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-success)' }}>✓</span> {inc}
                    </li>
                  ))}
                </ul>

                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                  {planProposal.suggestion}
                </p>

                {planProposal.isFeasible && (
                  <Link href={`/reserve?type=${planCategory}&guests=${planGuests}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Book Package Now
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ INSTAGRAM SHOWCASE ═══════════ */}
      <section className="section" id="instagram-showcase">
        <div className="container">
          <div className="section-title">
            <span className="overline">Instagram Feed</span>
            <h2>Boho Showcase</h2>
            <p>Browse posts, reels, and user generated content from our social community.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {instagramFeed.map((post) => (
              <a 
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-item"
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'block'
                }}
              >
                <img
                  src={post.mediaUrl}
                  alt={post.caption}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.5s ease' }}
                />
                
                {/* Hover Showcase Details */}
                <div className="instagram-overlay">
                  <Instagram size={24} style={{ marginBottom: '16px' }} />
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Heart size={16} fill="currentColor" /> {post.likesCount}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={16} fill="currentColor" /> {post.commentsCount}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.caption}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ MENU PREVIEW ═══════════ */}
      <section className="section" id="menu-preview" style={{ background: 'var(--color-card)' }}>
        <div className="container">
          <div className="section-title">
            <span className="overline">Culinary Excellence</span>
            <h2>Popular from Our Menu</h2>
            <p>Hand-picked favourites loved by our guests — crafted with passion and the finest ingredients.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {popularItems.map((item, i) => (
              <div key={item.id} className={`card animate-fade-in-up delay-${i + 1}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ objectFit: 'cover', width: '100%', height: '100%', transition: 'transform 0.5s ease' }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </div>
                <div style={{ padding: '20px 24px 24px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {item.isPopular && <span className="badge badge-primary">Popular</span>}
                    {item.isChefSpecial && <span className="badge badge-warning">Chef Special</span>}
                    {item.isVegetarian && <span className="badge badge-success">Vegetarian</span>}
                  </div>
                  <h3 style={{ fontSize: 18, fontFamily: 'var(--font-title)', marginBottom: 8 }}>{item.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-title)' }}>
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/menu" className="btn btn-outline btn-lg">
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT & MAP ═══════════ */}
      <section className="section" id="contact">
        <div className="container">
          <div className="section-title">
            <span className="overline">Get in Touch</span>
            <h2>Visit Us</h2>
          </div>

          <div className="contact-grid">
            <div className="animate-fade-in-up">
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: 22, marginBottom: 24, color: 'var(--color-primary)' }}>
                {branch.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <MapPin size={18} color="var(--color-primary)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{branch.address}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Phone size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{branch.phone}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Mail size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{branch.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Clock size={18} color="var(--color-primary)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <div>
                    {branch.openingHours.map((oh) => (
                      <div key={oh.days} style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--color-text)' }}>{oh.days}:</strong> {oh.hours}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/${branch.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ gap: 10 }}
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
            </div>

            <div className="animate-fade-in-up delay-2" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', height: 400 }}>
              <iframe
                src={branch.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${branch.name} location`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">{BRANDING.logo}</div>
              <p className="footer-desc">
                A sanctuary of bohemian elegance and culinary excellence in Kanpur, Uttar Pradesh, India.
              </p>
            </div>

            <div>
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/menu">Menu</Link></li>
                <li><Link href="/account">Guest Portal</Link></li>
                <li><Link href="/staff-login" style={{ opacity: 0.6, fontSize: '13px' }}>✦ Staff Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4>Opening Hours</h4>
              <ul className="footer-links">
                {branch.openingHours.map((oh) => (
                  <li key={oh.days}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                      {oh.days}<br />{oh.hours}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Contact</h4>
              <ul className="footer-links">
                <li><a href={`tel:${branch.phone}`}>{branch.phone}</a></li>
                <li><a href={`mailto:${branch.email}`}>{branch.email}</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            © {new Date().getFullYear()} {BRANDING.name}. All rights reserved. Kanpur, India.
          </div>
        </div>
      </footer>

      {/* Interactive Global Styles for Hero and Showcase */}
      <style jsx global>{`
        /* Desktop line break toggle */
        @media (max-width: 768px) {
          .desktop-br {
            display: none !important;
          }
        }

        /* Cinematic Zoom Hero */
        .cinematic-zoom {
          animation: zoomInHero 20s ease-in-out infinite alternate;
        }
        @keyframes zoomInHero {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }

        /* Mouse Scroll Down Indicator */
        .scroll-indicator-mouse {
          width: 24px;
          height: 40px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.4);
          position: relative;
          display: flex;
          justify-content: center;
        }
        .mouse-wheel {
          width: 4px;
          height: 8px;
          border-radius: 2px;
          background: var(--color-primary);
          position: absolute;
          top: 6px;
          animation: scrollWheel 1.5s infinite;
        }
        @keyframes scrollWheel {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(12px); }
        }

        /* Instagram Hover Showcase Overlay */
        .instagram-item:hover img {
          transform: scale(1.08);
          filter: brightness(0.3);
        }
        .instagram-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(10,8,7,0.75);
          opacity: 0;
          transition: opacity 0.3s;
          color: #f5f2eb;
        }
        .instagram-item:hover .instagram-overlay {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
