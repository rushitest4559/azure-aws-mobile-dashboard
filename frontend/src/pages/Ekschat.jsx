import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaRobot } from 'react-icons/fa';

/* ─────────────────────────────────────────────────────────────────────────────
   EksChat — Liquid-glass chatbot overlay for EKS cluster queries
   Drop this component anywhere inside EksList (just before the closing </>)
   and pass displayClusters as a prop.

   Usage inside EksList.jsx:
     1. import EksChat from './EksChat';
     2. Add  <EksChat clusters={displayClusters} />  just before the closing  </>

   The component is self-contained — all state lives here.
───────────────────────────────────────────────────────────────────────────── */

/* ── Minimal spring-physics animator (no framer-motion dep) ───────────────── */
function useSpring(target, { stiffness = 260, damping = 24, mass = 1 } = {}) {
  const [value, setValue]   = useState(target);
  const velRef   = useRef(0);
  const valRef   = useRef(target);
  const rafRef   = useRef(null);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    const tick = () => {
      const k   = stiffness;
      const c   = damping;
      const dt  = 1 / 60;
      const x   = valRef.current;
      const t   = targetRef.current;
      const v   = velRef.current;
      const a   = (-k * (x - t) - c * v) / mass;
      velRef.current = v + a * dt;
      valRef.current = x + velRef.current * dt;
      setValue(valRef.current);
      if (Math.abs(valRef.current - t) > 0.001 || Math.abs(velRef.current) > 0.001) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        valRef.current = t;
        setValue(t);
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, stiffness, damping, mass]);

  return value;
}

/* ── Suggested prompts ─────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "How many clusters are active?",
  "Which regions have clusters?",
  "Any outdated K8s versions?",
  "Show clusters by status",
];

/* ── Typing dots ───────────────────────────────────────────────────────────── */
const TypingDots = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'rgba(0,200,117,0.7)',
        display: 'inline-block',
        animation: `ekc-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
      }} />
    ))}
  </span>
);

/* ── Message bubble ────────────────────────────────────────────────────────── */
const Bubble = ({ msg, idx }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      animation: `ekc-rise 0.38s cubic-bezier(0.34,1.4,0.64,1) ${idx * 0.04}s both`,
    }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,200,117,0.18), rgba(0,200,117,0.06))',
          border: '1px solid rgba(0,200,117,0.28)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 2,
        }}>
          <FaRobot style={{ fontSize: 10, color: '#00C875' }} />
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '9px 14px' : '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #0A0F1E 0%, #1E2A3B 100%)'
          : 'rgba(255,255,255,0.72)',
        border: isUser
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(10,15,30,0.08)',
        backdropFilter: isUser ? 'none' : 'blur(16px)',
        boxShadow: isUser
          ? '0 4px 20px rgba(10,15,30,0.22)'
          : '0 2px 12px rgba(10,15,30,0.07)',
        color: isUser ? '#F5F7FA' : '#0A0F1E',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontSize: 13.5,
        lineHeight: 1.6,
        fontWeight: 400,
        letterSpacing: '-0.1px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content === '__typing__' ? <TypingDots /> : msg.content}
      </div>
    </div>
  );
};

/* ── Main component ────────────────────────────────────────────────────────── */
const EksChat = ({ clusters = [] }) => {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fabHover, setFabHover] = useState(false);
  const [fabPress, setFabPress] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const panelRef       = useRef(null);

  /* spring for FAB scale */
  const fabScale = useSpring(fabPress ? 0.88 : fabHover ? 1.08 : 1, { stiffness: 320, damping: 20 });

  /* spring for panel translateY (0 = visible, 100 = hidden below) */
  const panelY = useSpring(open ? 0 : 110, { stiffness: 280, damping: 26 });

  /* spring for panel opacity */
  const panelO = useSpring(open ? 1 : 0, { stiffness: 200, damping: 22 });

  /* spring for backdrop blur */
  const backdropO = useSpring(open ? 1 : 0, { stiffness: 180, damping: 24 });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hey! I can answer anything about your ${clusters.length} EKS cluster${clusters.length !== 1 ? 's' : ''}. What would you like to know?`,
        }]);
      }
    }
  }, [open]);

  const getClusterData = () => {
    try {
      const cached = localStorage.getItem('eksClustersCache');
      return cached ? JSON.parse(cached).data : clusters;
    } catch { return clusters; }
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');

    const clusterData = getClusterData();

    setMessages(prev => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '__typing__' },
    ]);
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-preview' });

      const systemContext = `You are an expert AWS EKS assistant embedded in a cloud management dashboard.
The user is asking questions about their EKS clusters.

Current EKS cluster data:
${JSON.stringify(clusterData, null, 2)}

Guidelines:
- Answer concisely and clearly (2-4 sentences max unless a list is needed)
- Use bullet points for lists of clusters or comparisons
- Be specific — reference actual cluster names, regions, versions from the data
- If data is unavailable for a question, say so honestly
- Don't use markdown headers, keep it conversational
- Numbers and facts should be precise`;

      const result = await model.generateContent([
        { text: systemContext },
        { text: `User question: ${trimmed}` },
      ]);

      const answer = result.response.text().trim();

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: answer },
      ]);
    } catch (err) {
      console.error('EksChat error:', err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat cleared! Ask me anything about your ${clusters.length} EKS cluster${clusters.length !== 1 ? 's' : ''}.`,
    }]);
  };

  return (
    <>
      <style>{`
        @keyframes ekc-dot {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40%          { transform:scale(1);   opacity:1;   }
        }
        @keyframes ekc-rise {
          from { opacity:0; transform:translateY(12px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes ekc-fab-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,200,117,0.35), 0 8px 32px rgba(10,15,30,0.28); }
          50%     { box-shadow: 0 0 0 10px rgba(0,200,117,0), 0 8px 32px rgba(10,15,30,0.28); }
        }
        @keyframes ekc-shimmer {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ekc-badge {
          0%   { transform:scale(0) rotate(-10deg); opacity:0; }
          70%  { transform:scale(1.15) rotate(3deg); opacity:1; }
          100% { transform:scale(1) rotate(0deg); opacity:1; }
        }

        .ekc-input:focus { outline: none; }
        .ekc-input::placeholder { color: rgba(10,15,30,0.28); }

        .ekc-suggest {
          transition: background 0.18s ease, transform 0.18s cubic-bezier(0.34,1.4,0.64,1), border-color 0.18s ease;
        }
        .ekc-suggest:hover {
          background: rgba(0,200,117,0.1) !important;
          border-color: rgba(0,200,117,0.35) !important;
          transform: translateY(-2px) scale(1.02);
        }
        .ekc-suggest:active { transform: scale(0.96); }

        .ekc-send {
          transition: background 0.18s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
        }
        .ekc-send:not(:disabled):hover {
          background: #1a2a3e !important;
          transform: scale(1.06);
          box-shadow: 0 4px 16px rgba(10,15,30,0.28) !important;
        }
        .ekc-send:not(:disabled):active { transform: scale(0.92); }

        .ekc-close {
          transition: background 0.15s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ekc-close:hover { background: rgba(10,15,30,0.08) !important; transform: scale(1.08); }
        .ekc-close:active { transform: scale(0.92); }

        .ekc-scroll::-webkit-scrollbar { width: 4px; }
        .ekc-scroll::-webkit-scrollbar-track { background: transparent; }
        .ekc-scroll::-webkit-scrollbar-thumb {
          background: rgba(10,15,30,0.12);
          border-radius: 99px;
        }

        .ekc-clear {
          transition: color 0.15s ease, opacity 0.15s ease;
        }
        .ekc-clear:hover { opacity: 1 !important; color: #0A0F1E !important; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(10,15,30,0.18)',
            backdropFilter: `blur(${backdropO * 4}px)`,
            WebkitBackdropFilter: `blur(${backdropO * 4}px)`,
            opacity: backdropO,
            transition: 'none',
          }}
        />
      )}

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          zIndex: 999,
          width: 'min(400px, calc(100vw - 32px))',
          maxHeight: '74vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 28,
          overflow: 'hidden',
          pointerEvents: open && panelO > 0.1 ? 'all' : 'none',

          /* Liquid glass */
          background: 'rgba(245,247,250,0.82)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 32px 80px rgba(10,15,30,0.22), 0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(10,15,30,0.06) inset',

          opacity: panelO,
          transform: `translateY(${panelY}%) scale(${0.92 + panelO * 0.08})`,
          transformOrigin: 'bottom right',
          transition: 'none',
        }}
      >
        {/* ── Panel header (bento top) ────────────────────────────────── */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0,
        }}>
          {/* Icon bento cell */}
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,200,117,0.16) 0%, rgba(0,200,117,0.06) 100%)',
            border: '1px solid rgba(0,200,117,0.24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,200,117,0.12)',
          }}>
            <FaRobot style={{ fontSize: 14, color: '#00C875' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Figtree', -apple-system, sans-serif",
              fontSize: 15, fontWeight: 800,
              color: '#0A0F1E', letterSpacing: '-0.4px',
              lineHeight: 1.2,
            }}>Cluster Assistant</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#00C875',
                boxShadow: '0 0 6px #00C875',
                animation: 'ekc-fab-pulse 2.4s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 11, fontWeight: 500, color: '#8A95A8',
              }}>
                {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} loaded · Gemini
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {messages.length > 1 && (
              <button
                onClick={clearChat}
                className="ekc-clear"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                  fontSize: 11, fontWeight: 600, color: '#8A95A8',
                  padding: '4px 8px', borderRadius: 8,
                  opacity: 0.7,
                }}
              >Clear</button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="ekc-close"
              style={{
                width: 28, height: 28,
                background: 'rgba(10,15,30,0.05)',
                border: '1px solid rgba(10,15,30,0.08)',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                   stroke="#8A95A8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────────── */}
        <div
          className="ekc-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} idx={i} />
          ))}

          {/* ── Suggestion chips (shown after first assistant msg if no convo yet) */}
          {messages.length === 1 && !loading && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4,
              animation: 'ekc-rise 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.2s both',
            }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="ekc-suggest"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(10,15,30,0.1)',
                    borderRadius: 99,
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                    fontSize: 12, fontWeight: 500,
                    color: '#1E2A3B',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 1px 6px rgba(10,15,30,0.06)',
                    animationDelay: `${0.25 + i * 0.06}s`,
                    animation: 'ekc-rise 0.4s cubic-bezier(0.34,1.4,0.64,1) both',
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area (bento bottom) ───────────────────────────────── */}
        <div style={{
          padding: '12px 14px 14px',
          borderTop: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 9,
            background: 'rgba(255,255,255,0.85)',
            border: '1.5px solid rgba(10,15,30,0.1)',
            borderRadius: 18,
            padding: '10px 10px 10px 15px',
            boxShadow: '0 2px 12px rgba(10,15,30,0.07)',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'rgba(0,200,117,0.4)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,200,117,0.08), 0 2px 12px rgba(10,15,30,0.07)';
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'rgba(10,15,30,0.1)';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,15,30,0.07)';
          }}
          >
            <textarea
              ref={inputRef}
              className="ekc-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your clusters…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                background: 'none', border: 'none', resize: 'none',
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 13.5, fontWeight: 400,
                color: '#0A0F1E', lineHeight: 1.5,
                maxHeight: 96, overflowY: 'auto',
              }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="ekc-send"
              style={{
                width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? '#0A0F1E' : 'rgba(10,15,30,0.07)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() && !loading ? '0 2px 10px rgba(10,15,30,0.2)' : 'none',
                transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {loading ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke="rgba(10,15,30,0.3)" strokeWidth="2.5" strokeLinecap="round"
                     style={{ animation: 'ekc-spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                     stroke={input.trim() ? '#fff' : 'rgba(10,15,30,0.25)'}
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            fontSize: 10.5, color: '#8A95A8',
            textAlign: 'center', marginTop: 8,
            letterSpacing: '0.1px',
          }}>
            Return ↵ to send · Shift+Return for newline
          </div>
        </div>
      </div>

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setFabHover(true)}
        onMouseLeave={() => { setFabHover(false); setFabPress(false); }}
        onMouseDown={() => setFabPress(true)}
        onMouseUp={() => setFabPress(false)}
        style={{
          position: 'fixed',
          bottom: 24, right: 20,
          zIndex: 1000,
          width: 56, height: 56,
          borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',

          /* Liquid glass FAB */
          background: open
            ? 'rgba(245,247,250,0.88)'
            : 'linear-gradient(135deg, #0A0F1E 0%, #1a2a40 100%)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          border: open
            ? '1.5px solid rgba(10,15,30,0.12)'
            : '1.5px solid rgba(255,255,255,0.08)',
          boxShadow: open
            ? '0 8px 32px rgba(10,15,30,0.16)'
            : '0 8px 32px rgba(10,15,30,0.28), 0 0 0 0 rgba(0,200,117,0)',

          transform: `scale(${fabScale})`,
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          animation: !open ? 'ekc-fab-pulse 3s ease-in-out infinite' : 'none',
        }}
      >
        {/* Unread badge — shown when closed and messages > 1 */}
        {!open && messages.length > 1 && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 9, height: 9, borderRadius: '50%',
            background: '#00C875',
            border: '2px solid #F5F7FA',
            animation: 'ekc-badge 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
          }} />
        )}

        {/* Icon morphs: chat → X */}
        <div style={{
          position: 'relative', width: 22, height: 22,
          transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1)',
          transform: open ? 'rotate(90deg) scale(0.85)' : 'rotate(0deg) scale(1)',
        }}>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke={open ? '#0A0F1E' : '#fff'}
                 strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10" stroke="#00C875" strokeWidth="2"/>
              <line x1="9" y1="14" x2="13" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
            </svg>
          )}
        </div>
      </button>
    </>
  );
};

export default EksChat;