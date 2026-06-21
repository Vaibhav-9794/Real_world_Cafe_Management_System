'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Leaf,
  Flame,
  Star,
  Wheat,
  Calendar,
  ArrowRight,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Eye,
  Loader2,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { BRANDING, MenuItem, formatCurrency } from '@/config/branding';

function MenuContent() {
  const searchParams = useSearchParams();
  const branchParam = searchParams.get('branch');
  const tableParam = searchParams.get('table');

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState(BRANDING.menu[0]?.id || '');
  const [expandedCuisines, setExpandedCuisines] = useState<Record<string, boolean>>({
    [BRANDING.menu[0]?.id]: true,
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // QR Ordering & Cart States
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState<any>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Favorites & Recently Viewed States
  const [favorites, setFavorites] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Fetch session & favorites
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/loyalty/search');
        const data = await res.json();
        if (res.ok && data.success) {
          setCustomerSession(data.customer);
          // fetch favorites
          const favRes = await fetch('/api/customers/favorites');
          const favData = await favRes.json();
          if (favRes.ok && favData.success) {
            setFavorites(favData.favorites);
          }
        }
      } catch {
        // ignore unauthenticated
      }
    }
    checkSession();
    setIsLoading(false);

    // load recently viewed
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recently-viewed-dishes');
      if (stored) {
        try {
          setRecentlyViewed(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Track dish view
  const trackView = (item: MenuItem) => {
    setPreviewItem(item);
    if (typeof window !== 'undefined') {
      const current = [item.id, ...recentlyViewed.filter((id) => id !== item.id)].slice(0, 10);
      setRecentlyViewed(current);
      localStorage.setItem('recently-viewed-dishes', JSON.stringify(current));
    }
  };

  // Toggle favorite dish
  const toggleFavorite = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!customerSession) {
      alert('Please log in to your Boho Guest Portal (/account) to save favorite dishes.');
      return;
    }

    const isFav = favorites.includes(itemId);
    const action = isFav ? 'REMOVE' : 'ADD';
    try {
      const res = await fetch('/api/customers/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action })
      });
      if (res.ok) {
        setFavorites((prev) =>
          action === 'ADD' ? [...prev, itemId] : prev.filter((id) => id !== itemId)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const current = prev[item.id] || { item, qty: 0 };
      return {
        ...prev,
        [item.id]: { item, qty: current.qty + 1 }
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      if (current.qty <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...current, qty: current.qty - 1 }
      };
    });
  };

  const clearCart = () => setCart({});

  const cartTotal = Object.values(cart).reduce(
    (sum, c) => sum + c.item.price * c.qty,
    0
  );
  const cartItemCount = Object.values(cart).reduce((sum, c) => sum + c.qty, 0);

  // Submit Order to KDS queue
  const handlePlaceOrder = async () => {
    if (cartItemCount === 0 || placingOrder) return;
    setPlacingOrder(true);

    try {
      const itemsPayload = Object.values(cart).map((c) => ({
        itemId: c.item.id,
        itemName: c.item.name,
        quantity: c.qty,
        price: c.item.price
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branchParam || 'downtown',
          tableNumber: tableParam || '1',
          customerEmail: customerSession?.email || null,
          customerPhone: customerSession?.phone || null,
          items: itemsPayload,
          totalAmount: cartTotal
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPlacedOrder(data.order);
        clearCart();
        setCartOpen(false);
      } else {
        alert(data.message || 'Failed to submit order to KDS queue.');
      }
    } catch {
      alert('Network failure placing order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Flattened search items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const matches: MenuItem[] = [];

    for (const cuisine of BRANDING.menu) {
      for (const category of cuisine.categories) {
        for (const item of category.items) {
          if (
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
          ) {
            matches.push(item);
          }
        }
      }
    }
    return matches;
  }, [searchQuery]);

  const toggleCuisine = (cuisineId: string) => {
    setExpandedCuisines((prev) => ({
      ...prev,
      [cuisineId]: !prev[cuisineId],
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const scrollToSection = (categoryId: string) => {
    const el = document.getElementById(`cat-${categoryId}`);
    if (el) {
      const yOffset = -90; // Fixed navbar/header offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return <MenuSkeleton />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Top Header */}
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container menu-header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <ArrowLeft size={20} />
              <span className="desktop-content">Home</span>
            </Link>
            <div style={{ height: '24px', width: '1px', background: 'var(--color-border)' }} />
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 600 }}>
              {BRANDING.logo}
            </h1>
          </div>

          <div className="menu-header-search" style={{ flex: '0 1 400px', margin: '0 24px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search culinary creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  borderRadius: '30px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          <div className="menu-header-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {customerSession ? (
              <Link href="/account" className="btn btn-outline btn-sm menu-header-portal-btn">
                Portal ({customerSession.name.split(' ')[0]})
              </Link>
            ) : (
              <Link href="/account" className="btn btn-outline btn-sm menu-header-portal-btn">
                Portal Login
              </Link>
            )}
            <Link href="/reserve" className="btn-nav-cta menu-header-book-btn" style={{ padding: '10px 18px', fontSize: '12px' }}>
              <Calendar size={14} />
              <span>Book A Table</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* QR Code Scan Greeting */}
      {tableParam && (
        <div style={{
          background: 'var(--color-primary-glow)',
          borderBottom: '1px solid var(--color-border)',
          padding: '12px 0',
          textAlign: 'center',
        }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>✦ Welcome to Table {tableParam} ✦</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              ({branchParam === 'uptown' ? 'Uptown Lounge' : 'Downtown Sanctuary'}). Browse and place orders directly to the Kitchen Queue.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="section">
        <div className="container">
          {searchQuery.trim() ? (
            // Search Results Mode
            <div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '24px' }}>
                Search Results for &quot;{searchQuery}&quot;
              </h2>
              {filteredItems && filteredItems.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                  {filteredItems.map((item) => (
                    <MenuItemCard 
                      key={item.id} 
                      item={item} 
                      onView={() => trackView(item)}
                      onToggleFav={(e) => toggleFavorite(e, item.id)}
                      isFav={favorites.includes(item.id)}
                      onAddToCart={(e) => addToCart(item, e)}
                      showOrderBtn={!!tableParam}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-secondary)' }}>No items match your search. Try another keyword!</p>
              )}
            </div>
          ) : (
            // Standard Menu Mode
            <div className="menu-layout">
              {/* Desktop Left Sidebar Accordion */}
              <aside className="menu-sidebar">
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-primary)', marginBottom: '16px', fontWeight: 600 }}>
                  Cuisines
                </h3>
                <ul className="menu-sidebar-list">
                  {BRANDING.menu.map((cuisine) => (
                    <li key={cuisine.id} style={{ marginBottom: '8px' }}>
                      <button
                        onClick={() => setSelectedCuisine(cuisine.id)}
                        className={`menu-cuisine-btn ${selectedCuisine === cuisine.id ? 'active' : ''}`}
                      >
                        {cuisine.name}
                      </button>
                      {selectedCuisine === cuisine.id && (
                        <ul className="menu-category-list" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                          {cuisine.categories.map((category) => (
                            <li key={category.id}>
                              <button
                                onClick={() => scrollToSection(category.id)}
                                className="menu-category-btn"
                              >
                                {category.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Right Side Content Areas */}
              <div style={{ flex: 1 }}>
                {/* 1. Desktop Content (Scrolling layout) */}
                <div className="desktop-content">
                  {BRANDING.menu.map((cuisine) => (
                    <div key={cuisine.id} style={{ marginBottom: '48px' }}>
                      <h2 style={{
                        fontFamily: 'var(--font-title)',
                        fontSize: '32px',
                        color: 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: '12px',
                        marginBottom: '32px',
                      }}>
                        {cuisine.name}
                      </h2>
                      {cuisine.categories.map((category) => (
                        <div key={category.id} id={`cat-${category.id}`} style={{ marginBottom: '32px', scrollMarginTop: '100px' }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}>
                            <span>✦</span> {category.name}
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                            {category.items.map((item) => (
                              <MenuItemCard 
                                key={item.id} 
                                item={item} 
                                onView={() => trackView(item)}
                                onToggleFav={(e) => toggleFavorite(e, item.id)}
                                isFav={favorites.includes(item.id)}
                                onAddToCart={(e) => addToCart(item, e)}
                                showOrderBtn={!!tableParam}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* 2. Mobile Content (Collapsible Accordion layout) */}
                <div className="mobile-accordion">
                  {BRANDING.menu.map((cuisine) => {
                    const isCuisineExpanded = !!expandedCuisines[cuisine.id];
                    return (
                      <div key={cuisine.id} style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-card)',
                        marginBottom: '16px',
                        overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => toggleCuisine(cuisine.id)}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text)',
                            fontSize: '18px',
                            fontFamily: 'var(--font-title)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span>{cuisine.name}</span>
                          {isCuisineExpanded ? <ChevronDown size={20} color="var(--color-primary)" /> : <ChevronRight size={20} />}
                        </button>

                        {isCuisineExpanded && (
                          <div style={{ padding: '0 16px 16px 16px', background: 'rgba(0,0,0,0.15)' }}>
                            {cuisine.categories.map((category) => {
                              const isCategoryExpanded = !!expandedCategories[category.id];
                              return (
                                <div key={category.id} style={{
                                  marginTop: '12px',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  overflow: 'hidden',
                                }}>
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: 'var(--color-card)',
                                      border: 'none',
                                      color: 'var(--color-primary)',
                                      fontSize: '14px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <span>{category.name}</span>
                                    {isCategoryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </button>

                                  {isCategoryExpanded && (
                                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                      {category.items.map((item) => (
                                        <MenuItemCard 
                                          key={item.id} 
                                          item={item} 
                                          onView={() => trackView(item)}
                                          onToggleFav={(e) => toggleFavorite(e, item.id)}
                                          isFav={favorites.includes(item.id)}
                                          onAddToCart={(e) => addToCart(item, e)}
                                          showOrderBtn={!!tableParam}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          QR FLOATING CART TRAY (Active if tableParam exists)
          ======================================================== */}
      {tableParam && cartItemCount > 0 && (
        <button className="floating-cart-tray-btn" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={20} />
          <span className="cart-badge">{cartItemCount}</span>
          <span>View Table Order (₹{cartTotal})</span>
        </button>
      )}

      {/* ========================================================
          CART SIDE DRAWER (QR ORDER CHECKOUT)
          ======================================================== */}
      {cartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 600 }}>
                Table {tableParam} Order Checkout
              </h3>
              <button onClick={() => setCartOpen(false)} style={{ color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-drawer-body">
              {Object.values(cart).map(({ item, qty }) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '2px' }}>
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => removeFromCart(item.id)} style={{ padding: '6px', borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{qty}</span>
                    <button onClick={() => addToCart(item)} style={{ padding: '6px', borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
                <span>Subtotal:</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(cartTotal)}</span>
              </div>
              <button 
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center' }}
              >
                {placingOrder ? <Loader2 size={16} className="spin" /> : <ShoppingBag size={16} />}
                {placingOrder ? 'Submitting to Kitchen...' : 'Send to Kitchen Queue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DISH QUICK PREVIEW DIALOG/DRAWER
          ======================================================== */}
      {previewItem && (
        <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '260px', position: 'relative', width: '100%' }}>
              <img src={previewItem.image} alt={previewItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => setPreviewItem(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: 600 }}>{previewItem.name}</h3>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(previewItem.price)}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {previewItem.isPopular && <span className="badge badge-primary">Most Ordered</span>}
                {previewItem.isChefSpecial && <span className="badge badge-warning">Chef Recommended</span>}
                {previewItem.isVegetarian && <span className="badge badge-success">Veg</span>}
                {previewItem.isGlutenFree && <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Gluten Free</span>}
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                {previewItem.description}
              </p>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={(e) => {
                    toggleFavorite(e, previewItem.id);
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
                >
                  <Heart size={16} fill={favorites.includes(previewItem.id) ? 'currentColor' : 'none'} color={favorites.includes(previewItem.id) ? 'var(--color-error)' : 'currentColor'} />
                  <span>{favorites.includes(previewItem.id) ? 'Favorited' : 'Save to Wishlist'}</span>
                </button>
                {tableParam && (
                  <button 
                    onClick={() => {
                      addToCart(previewItem);
                      setPreviewItem(null);
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1.2, display: 'flex', gap: '8px', justifyContent: 'center' }}
                  >
                    <Plus size={16} />
                    <span>Add to Table Order</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          KITCHEN QUEUE LIVE PROGRESS TRACKER POPUP (Immediately after QR order)
          ======================================================== */}
      {placedOrder && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px', padding: '32px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <CheckCircle2 size={30} color="var(--color-success)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', marginBottom: '8px' }}>Order Sent to Kitchen</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Your order has been queued for Table {placedOrder.tableNumber}. You can track preparation status inside your account dashboard.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/account" className="btn btn-primary" style={{ flex: 1.2, fontSize: '12px' }}>
                Track in Account Portal
              </Link>
              <button 
                onClick={() => setPlacedOrder(null)} 
                className="btn btn-outline" 
                style={{ flex: 1, fontSize: '12px' }}
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Styles */}
      <style jsx global>{`
        /* Floating Cart Tray button */
        .floating-cart-tray-btn {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1001;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 28px;
          border-radius: 30px;
          background: linear-gradient(135deg, #D4AF37 0%, #F5E7B2 50%, #D4AF37 100%);
          color: #0a0807 !important;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 1px;
          box-shadow: 0 8px 32px rgba(212, 175, 55, 0.4);
          cursor: pointer;
          transition: all 0.2s;
        }
        .floating-cart-tray-btn:hover {
          transform: translateX(-50%) scale(1.05);
          box-shadow: 0 10px 40px rgba(212, 175, 55, 0.6);
        }
        .cart-badge {
          background: #0a0807;
          color: #D4AF37;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        /* Cart Side Drawer */
        .cart-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.3s ease;
        }
        .cart-drawer {
          width: 100%;
          max-width: 440px;
          height: 100vh;
          background: var(--color-card);
          border-left: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          animation: slideLeft 0.3s ease-out;
        }
        .cart-drawer-header {
          padding: 24px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cart-drawer-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        .cart-drawer-footer {
          padding: 24px;
          border-top: 1px solid var(--color-border);
          background: rgba(255,255,255,0.01);
        }

        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        /* Image hover zoom */
        .menu-item-card {
          overflow: hidden;
        }
        .menu-item-card img {
          transition: transform 0.5s ease !important;
        }
        .menu-item-card:hover img {
          transform: scale(1.08) !important;
        }

        @media (min-width: 769px) {
          .desktop-content {
            display: block !important;
          }
          .mobile-accordion {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-content {
            display: none !important;
          }
          .mobile-accordion {
            display: block !important;
          }
          .floating-cart-tray-btn {
            bottom: 80px;
          }
          .cart-drawer {
            max-width: 100vw;
          }
          .menu-header-container {
            flex-wrap: wrap !important;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
            gap: 12px !important;
          }
          .menu-header-search {
            flex: 0 0 100% !important;
            margin: 0 !important;
            order: 3;
          }
          .menu-header-actions {
            order: 2;
          }
          .menu-header-book-btn {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .menu-item-card {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            padding: 16px !important;
          }
          .menu-item-img-wrapper {
            width: 100% !important;
            height: 180px !important;
          }
          .menu-item-content {
            padding-right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function MenuItemCard({ 
  item, 
  onView, 
  onToggleFav, 
  isFav, 
  onAddToCart,
  showOrderBtn
}: { 
  item: MenuItem; 
  onView: () => void;
  onToggleFav: (e: React.MouseEvent) => void;
  isFav: boolean;
  onAddToCart: (e: React.MouseEvent) => void;
  showOrderBtn: boolean;
}) {
  return (
    <div 
      className="card menu-item-card" 
      onClick={onView}
      style={{ 
        cursor: 'pointer',
        display: 'grid', 
        gridTemplateColumns: '120px 1fr', 
        gap: '20px', 
        padding: '20px', 
        alignItems: 'center',
        position: 'relative'
      }}
    >
      {/* Favorite Heart Trigger */}
      <button 
        onClick={onToggleFav}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          color: isFav ? 'var(--color-error)' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          zIndex: 5,
          transition: 'color 0.2s'
        }}
      >
        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
      </button>

      <div className="menu-item-img-wrapper" style={{ width: '120px', height: '90px', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="120px"
          style={{ objectFit: 'cover' }}
        />
      </div>

      <div className="menu-item-content" style={{ paddingRight: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h4 className="menu-item-name" style={{ fontSize: '16px', fontWeight: 600 }}>{item.name}</h4>
        </div>
        <p className="menu-item-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.description}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
          <span className="menu-item-price" style={{ fontSize: '15px', fontWeight: 700 }}>{formatCurrency(item.price)}</span>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={12} /> Preview
            </span>
            {showOrderBtn && (
              <button 
                onClick={onAddToCart}
                style={{
                  background: 'var(--color-primary-glow)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={10} /> Add
              </button>
            )}
          </div>
        </div>

        <div className="menu-item-tags" style={{ marginTop: '8px' }}>
          {item.isPopular && (
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', padding: '2px 8px' }}>
              <Star size={9} fill="currentColor" /> Popular
            </span>
          )}
          {item.isChefSpecial && (
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', padding: '2px 8px' }}>
              <Flame size={9} /> Recommended
            </span>
          )}
          {item.isVegetarian && (
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', padding: '2px 8px' }}>
              <Leaf size={9} /> Veg
            </span>
          )}
          {item.isGlutenFree && (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '9px', padding: '2px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <Wheat size={9} /> Gluten Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header className="navbar scrolled" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ width: '120px', height: '24px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
          <div style={{ width: '300px', height: '36px', background: 'rgba(255,255,255,0.06)', borderRadius: '30px' }} className="skeleton" />
          <div style={{ width: '100px', height: '36px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        </div>
      </header>

      <main className="section">
        <div className="container">
          <div className="menu-layout">
            <aside className="menu-sidebar">
              <div style={{ width: '80px', height: '16px', background: 'rgba(255,255,255,0.06)', marginBottom: '24px', borderRadius: '4px' }} className="skeleton" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: '140px', height: '36px', background: 'rgba(255,255,255,0.04)', marginBottom: '12px', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
              ))}
            </aside>
            <div style={{ flex: 1 }}>
              <div style={{ width: '200px', height: '32px', background: 'rgba(255,255,255,0.06)', marginBottom: '32px', borderRadius: '4px' }} className="skeleton" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card menu-item-card" style={{ height: '140px', border: '1px solid var(--color-border)', display: 'flex', gap: '16px', padding: '16px' }}>
                    <div style={{ width: '120px', height: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: '60%', height: '18px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} className="skeleton" />
                      <div style={{ width: '90%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                      <div style={{ width: '40%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} className="skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%);
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s infinite;
        }
        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}
