'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Calendar, 
  Phone, 
  MessageCircle, 
  HelpCircle,
  Clock,
  MapPin,
  UtensilsCrossed,
  Sparkles
} from 'lucide-react';
import { BRANDING } from '@/config/branding';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export default function FloatingWidgets() {
  const [chatOpen, setChatOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'assistant', text: 'Hello! I am your BOHO Concierge Assistant. How may I serve you today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { sender: 'assistant', text: 'I apologize, I encountered an issue connecting to my concierge engine.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { sender: 'assistant', text: 'A network error occurred. Please check your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Book a Table', text: 'How do I book a table?', icon: Calendar },
    { label: 'View Menu Specials', text: 'What are your chef recommended dishes?', icon: UtensilsCrossed },
    { label: 'Plan a Party', text: 'Tell me about event packages for birthdays.', icon: Sparkles },
    { label: 'Lounge Hours', text: 'What are the opening hours?', icon: Clock },
    { label: 'Map & Location', text: 'Where are you located in Kanpur?', icon: MapPin }
  ];

  return (
    <>
      {/* 1. FLOATING RESERVATION WIDGET (Desktop Only) */}
      <Link href="/reserve" className="desktop-reserve-widget" aria-label="Reserve a table">
        <Calendar size={18} />
        <span>RESERVE</span>
      </Link>

      {/* 2. BOHO ASSISTANT FLOATING CHAT BUTTON */}
      <button 
        className={`floating-assistant-btn ${chatOpen ? 'active' : ''}`}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Open BOHO Concierge Assistant"
      >
        {chatOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* 3. ASSISTANT CHAT PANEL */}
      {chatOpen && (
        <div className="assistant-chat-panel animate-scale-in">
          {/* Header */}
          <div className="chat-header">
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 600 }}>✦ BOHO Assistant ✦</h3>
              <p style={{ fontSize: '10px', color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                Luxury Concierge
              </p>
            </div>
            <button className="chat-close" onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages body */}
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble-wrapper ${m.sender}`}>
                <div className={`chat-bubble ${m.sender}`}>
                  {m.text.split('\n').map((para, idx) => (
                    <p key={idx} style={{ marginBottom: idx < m.text.split('\n').length - 1 ? '8px' : 0 }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-wrapper assistant">
                <div className="chat-bubble assistant typing">
                  <Loader2 size={16} className="spin" />
                  <span>Curating response...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts list */}
          <div className="chat-quick-prompts">
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button 
                  key={idx} 
                  onClick={() => handleSendMessage(qp.text)}
                  className="quick-prompt-btn"
                  disabled={loading}
                >
                  <Icon size={12} />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(prompt);
            }}
            className="chat-input-form"
          >
            <input
              type="text"
              placeholder="Ask me anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="chat-input"
            />
            <button type="submit" disabled={loading || !prompt.trim()} className="chat-submit-btn">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* 4. STICKY MOBILE CTA BAR (Mobile Only) */}
      <div className="mobile-sticky-cta">
        <a href="tel:+918400678200" className="mobile-cta-btn phone">
          <Phone size={16} />
          <span>Call</span>
        </a>
        <a 
          href="https://wa.me/918400678200?text=Hello%20Boho%20Cafe%20and%20Dining" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mobile-cta-btn whatsapp"
        >
          <MessageCircle size={16} />
          <span>WhatsApp</span>
        </a>
        <Link href="/reserve" className="mobile-cta-btn reserve">
          <Calendar size={16} />
          <span>Reserve</span>
        </Link>
      </div>

      {/* STYLING BLOCK FOR THE FLOATING COMPONENTS */}
      <style jsx global>{`
        /* Desktop Floating Widget */
        .desktop-reserve-widget {
          position: fixed;
          right: 0;
          top: 45%;
          transform: translateY(-50%) rotate(-90deg) translate(50%, 0);
          transform-origin: right bottom;
          z-index: 999;
          background: linear-gradient(135deg, #D4AF37 0%, #F5E7B2 50%, #D4AF37 100%);
          color: #0a0807 !important;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 2px;
          padding: 10px 20px;
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: -4px 0 20px rgba(212, 175, 55, 0.3);
          transition: all 0.2s;
          cursor: pointer;
        }
        .desktop-reserve-widget:hover {
          padding-top: 14px;
        }

        /* Floating Assistant Button */
        .floating-assistant-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-primary);
          color: var(--color-bg);
          box-shadow: 0 8px 30px rgba(197, 168, 128, 0.4);
          z-index: 1001;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .floating-assistant-btn:hover {
          transform: scale(1.08) translateY(-2px);
          background: var(--color-primary-hover);
          box-shadow: 0 10px 32px rgba(197, 168, 128, 0.6);
        }
        .floating-assistant-btn.active {
          transform: rotate(90deg);
          background: var(--color-card);
          color: var(--color-primary);
          border: 1px solid var(--color-border);
        }

        /* Assistant Panel */
        .assistant-chat-panel {
          position: fixed;
          bottom: 100px;
          right: 30px;
          width: 380px;
          height: 520px;
          border-radius: var(--radius-lg);
          background: var(--color-card);
          border: 1px solid var(--color-border);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          z-index: 1002;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border);
          background: rgba(255,255,255,0.02);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .chat-close {
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: color 0.2s;
        }
        .chat-close:hover {
          color: var(--color-primary);
        }
        .chat-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chat-bubble-wrapper {
          display: flex;
          width: 100%;
        }
        .chat-bubble-wrapper.user {
          justify-content: flex-end;
        }
        .chat-bubble-wrapper.assistant {
          justify-content: flex-start;
        }
        .chat-bubble {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          line-height: 1.6;
        }
        .chat-bubble.user {
          background: var(--color-primary);
          color: var(--color-bg);
          border-bottom-right-radius: 2px;
          font-weight: 500;
        }
        .chat-bubble.assistant {
          background: var(--color-bg);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-bottom-left-radius: 2px;
        }
        .chat-bubble.typing {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary);
        }
        
        .chat-quick-prompts {
          padding: 10px 16px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          border-top: 1px solid var(--color-border);
          background: rgba(0,0,0,0.1);
        }
        .chat-quick-prompts::-webkit-scrollbar {
          height: 3px;
        }
        .quick-prompt-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 30px;
          font-size: 11px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-prompt-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--color-primary-glow);
        }

        .chat-input-form {
          display: flex;
          padding: 12px 16px;
          border-top: 1px solid var(--color-border);
          background: rgba(255,255,255,0.01);
        }
        .chat-input {
          flex: 1;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 13px;
          color: var(--color-text);
          outline: none;
        }
        .chat-input:focus {
          border-color: var(--color-primary);
        }
        .chat-submit-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--color-primary);
          color: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .chat-submit-btn:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
        .chat-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Sticky Mobile CTA */
        .mobile-sticky-cta {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(60px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: rgba(18, 15, 13, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--color-border);
          z-index: 1000;
          grid-template-columns: repeat(3, 1fr);
        }
        .mobile-cta-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          transition: all 0.2s;
          width: 100%;
          height: 100%;
        }
        .mobile-cta-btn:active {
          background: rgba(255,255,255,0.02);
        }
        .mobile-cta-btn.reserve {
          background: var(--color-primary);
          color: var(--color-bg) !important;
          font-weight: 700;
        }
        .mobile-cta-btn.whatsapp {
          color: #25D366;
        }
        .mobile-cta-btn.phone {
          color: var(--color-text);
        }

        @media (max-width: 768px) {
          .desktop-reserve-widget {
            display: none !important;
          }
          .floating-assistant-btn {
            bottom: calc(80px + env(safe-area-inset-bottom, 0px));
            right: 20px;
          }
          .assistant-chat-panel {
            bottom: calc(150px + env(safe-area-inset-bottom, 0px));
            right: 20px;
            width: calc(100vw - 40px);
            height: 420px;
          }
          .mobile-sticky-cta {
            display: grid !important;
          }
          /* Add extra padding at the bottom of the body so content isn't cut off */
          body {
            padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </>
  );
}
