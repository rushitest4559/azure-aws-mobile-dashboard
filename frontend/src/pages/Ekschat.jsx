import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaRobot } from 'react-icons/fa';

/*
 * EksChat — Liquid-glass chatbot for EKS cluster queries
 *
 * KEY FIX: Uses ReactDOM.createPortal to render directly into document.body,
 * completely escaping any parent transform / overflow:hidden / z-index stacking
 * contexts that would break position:fixed.
 */

/* ── Spring physics hook ────────────────────────────────────────────────────── */
function useSpring(target, { stiffness = 260, damping = 24, mass = 1 } = {}) {
  const [value, setValue] = useState(target);
  const velRef    = useRef(0);
  const valRef    = useRef(target);
  const rafRef    = useRef(null);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    const tick = () => {
      const a = (-stiffness * (valRef.current - targetRef.current) - damping * velRef.current) / mass;
      velRef.current += a / 60;
      valRef.current += velRef.current / 60;
      setValue(valRef.current);
      if (Math.abs(valRef.current - targetRef.current) > 0.0005 || Math.abs(velRef.current) > 0.0005) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        valRef.current = targetRef.current;
        setValue(targetRef.current);
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, stiffness, damping, mass]);

  return value;
}

const SUGGESTIONS = [
  "How many clusters are active?",
  "Which regions have clusters?",
  "Any outdated K8s versions?",
  "Show clusters by status",
];

/* ── Typing indicator ────────────────────────────────────────────────────────── */
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

/* ── Message bubble ──────────────────────────────────────────────────────────── */
const Bubble = ({ msg, idx }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      animation: `ekc-rise 0.38s cubic-bezier(0.34,1.4,0.64,1) ${Math.min(idx, 5) * 0.04}s both`,
    }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,200,117,0.18), rgba(0,200,117,0.06))',
          border: '1px solid rgba(0,200,117,0.28)',
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
          : 'rgba(255,255,255,0.85)',
        border: isUser
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(10,15,30,0.08)',
        boxShadow: isUser
          ? '0 4px 20px rgba(10,15,30,0.22)'
          : '0 2px 12px rgba(10,15,30,0.07)',
        color: isUser ? '#F5F7FA' : '#0A0F1E',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontSize: 13.5,
        lineHeight: 1.65,
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

/* ── Main inner component ──────────────────────────────────────────────────── */
const EksChatInner = ({ clusters = [] }) => {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fabHover, setFabHover] = useState(false);
  const [fabPress, setFabPress] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const fabScale  = useSpring(fabPress ? 0.88 : fabHover ? 1.1 : 1, { stiffness: 340, damping: 22 });
  const panelY    = useSpring(open ? 0 : 112, { stiffness: 280, damping: 26 });
  const panelO    = useSpring(open ? 1 : 0,   { stiffness: 200, damping: 22 });
  const backdropO = useSpring(open ? 1 : 0,   { stiffness: 180, damping: 24 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 160);
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: clusters.length > 0
            ? `Hey! I can answer anything about your ${clusters.length} EKS cluster${clusters.length !== 1 ? 's' : ''}. What would you like to know?`
            : `Hey! No clusters loaded yet — hit Sync first, then ask me anything about them.`,
        }]);
      }
    }
  }, [open]);

  const getClusterData = () => {
    try {
      const cached = localStorage.getItem('eksClustersCache');
      const parsed = cached ? JSON.parse(cached) : null;
      return parsed?.data || clusters;
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are an expert AWS EKS assistant embedded in a cloud management dashboard.

Current EKS cluster data:
${JSON.stringify(clusterData, null, 2)}

Rules:
- Answer concisely (2-4 sentences unless a list is needed)
- Reference actual cluster names, regions, versions from the data above
- No markdown headers, keep it conversational
- If data is missing for a question, say so clearly

User question: ${trimmed}`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim();

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: answer },
      ]);
    } catch (err) {
      console.error('EksChat error:', err);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Something went wrong — check the console and try again.' },
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
      content: `Chat cleared! Ask me anything about your EKS clusters.`,
    }]);
  };

  return (
    <>
      <style>{`
        @keyframes ekc-dot {
          0%,80%,100% { transform:scale(0.55); opacity:0.35; }
          40%          { transform:scale(1);    opacity:1;    }
        }
        @keyframes ekc-rise {
          from { opacity:0; transform:translateY(10px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes ekc-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ekc-ring-pulse {
          0%,100% { box-shadow: 0 0 0 0px rgba(0,200,117,0.55), 0 8px 32px rgba(10,15,30,0.32); }
          50%     { box-shadow: 0 0 0 8px rgba(0,200,117,0),    0 8px 32px rgba(10,15,30,0.32); }
        }
        @keyframes ekc-badge-pop {
          0%   { transform:scale(0) rotate(-12deg); opacity:0; }
          70%  { transform:scale(1.2) rotate(4deg); opacity:1; }
          100% { transform:scale(1) rotate(0deg);   opacity:1; }
        }

        .ekc-input:focus        { outline: none; }
        .ekc-input::placeholder { color: rgba(10,15,30,0.25); }

        .ekc-suggest {
          transition: background 0.16s ease,
                      transform  0.18s cubic-bezier(0.34,1.4,0.64,1),
                      border-color 0.16s ease,
                      box-shadow 0.16s ease;
        }
        .ekc-suggest:hover {
          background: rgba(0,200,117,0.12) !important;
          border-color: rgba(0,200,117,0.4) !important;
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 4px 14px rgba(0,200,117,0.14) !important;
        }
        .ekc-suggest:active { transform: scale(0.95) !important; }

        .ekc-send-btn {
          transition: background 0.18s ease,
                      transform  0.14s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.18s ease;
        }
        .ekc-send-btn:not(:disabled):hover {
          background: #182233 !important;
          transform: scale(1.07);
          box-shadow: 0 4px 18px rgba(10,15,30,0.3) !important;
        }
        .ekc-send-btn:not(:disabled):active { transform: scale(0.9) !important; }

        .ekc-close-btn {
          transition: background 0.14s ease,
                      transform  0.14s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ekc-close-btn:hover  { background: rgba(10,15,30,0.09) !important; transform: scale(1.1); }
        .ekc-close-btn:active { transform: scale(0.9) !important; }

        .ekc-clear-btn {
          transition: opacity 0.14s ease, color 0.14s ease;
        }
        .ekc-clear-btn:hover { opacity: 1 !important; color: #0A0F1E !important; }

        .ekc-scroll::-webkit-scrollbar       { width: 3px; }
        .ekc-scroll::-webkit-scrollbar-track { background: transparent; }
        .ekc-scroll::-webkit-scrollbar-thumb {
          background: rgba(10,15,30,0.1);
          border-radius: 99px;
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 9998,
          background: `rgba(10,15,30,${backdropO * 0.2})`,
          backdropFilter: `blur(${backdropO * 5}px)`,
          WebkitBackdropFilter: `blur(${backdropO * 5}px)`,
          pointerEvents: open ? 'all' : 'none',
          transition: 'none',
        }}
      />

      {/* Chat panel */}
      <div style={{
        position: 'fixed',
        bottom: 90,
        right: 20,
        zIndex: 9999,
        width: 'min(400px, calc(100vw - 32px))',
        maxHeight: '72vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 28,
        overflow: 'hidden',
        pointerEvents: panelO > 0.05 ? 'all' : 'none',
        background: 'rgba(244,246,250,0.86)',
        backdropFilter: 'blur(44px) saturate(1.9)',
        WebkitBackdropFilter: 'blur(44px) saturate(1.9)',
        border: '1px solid rgba(255,255,255,0.76)',
        boxShadow: '0 32px 80px rgba(10,15,30,0.22), 0 1px 0 rgba(255,255,255,0.95) inset, 0 -1px 0 rgba(10,15,30,0.05) inset',
        opacity: panelO,
        transform: `translateY(${panelY}%) scale(${0.91 + panelO * 0.09})`,
        transformOrigin: 'bottom right',
        transition: 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '15px 17px 13px',
          borderBottom: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.58)',
          backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 11,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,200,117,0.18) 0%, rgba(0,200,117,0.06) 100%)',
            border: '1px solid rgba(0,200,117,0.26)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,200,117,0.14)',
          }}>
            <FaRobot style={{ fontSize: 14, color: '#00C875' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Figtree', -apple-system, sans-serif",
              fontSize: 15, fontWeight: 800,
              color: '#0A0F1E', letterSpacing: '-0.4px', lineHeight: 1.2,
            }}>Cluster Assistant</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#00C875',
                boxShadow: '0 0 0 2px rgba(0,200,117,0.25)',
              }} />
              <span style={{
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 11, fontWeight: 500, color: '#8A95A8',
              }}>
                {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} · Gemini
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {messages.length > 1 && (
              <button onClick={clearChat} className="ekc-clear-btn" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 11, fontWeight: 600, color: '#8A95A8',
                padding: '4px 8px', borderRadius: 8, opacity: 0.65,
              }}>Clear</button>
            )}
            <button onClick={() => setOpen(false)} className="ekc-close-btn" style={{
              width: 28, height: 28,
              background: 'rgba(10,15,30,0.05)',
              border: '1px solid rgba(10,15,30,0.08)',
              borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                   stroke="#8A95A8" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="ekc-scroll" style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
          minHeight: 0,
        }}>
          {messages.map((msg, i) => <Bubble key={i} msg={msg} idx={i} />)}

          {messages.length === 1 && !loading && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4,
              animation: 'ekc-rise 0.45s cubic-bezier(0.34,1.4,0.64,1) 0.18s both',
            }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} className="ekc-suggest" style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(10,15,30,0.1)',
                  borderRadius: 99, cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                  fontSize: 12, fontWeight: 500, color: '#1E2A3B',
                  boxShadow: '0 1px 6px rgba(10,15,30,0.06)',
                  animation: `ekc-rise 0.36s cubic-bezier(0.34,1.4,0.64,1) ${0.22 + i * 0.06}s both`,
                }}>{s}</button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '11px 13px 13px',
          borderTop: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <div
            style={{
              display: 'flex', alignItems: 'flex-end', gap: 9,
              background: 'rgba(255,255,255,0.9)',
              border: '1.5px solid rgba(10,15,30,0.1)',
              borderRadius: 18,
              padding: '9px 9px 9px 14px',
              boxShadow: '0 2px 10px rgba(10,15,30,0.06)',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
            }}
            onFocusCapture={e => {
              e.currentTarget.style.borderColor = 'rgba(0,200,117,0.45)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,200,117,0.09), 0 2px 10px rgba(10,15,30,0.06)';
            }}
            onBlurCapture={e => {
              e.currentTarget.style.borderColor = 'rgba(10,15,30,0.1)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(10,15,30,0.06)';
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
                flex: 1, background: 'none', border: 'none', resize: 'none',
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 13.5, fontWeight: 400,
                color: '#0A0F1E', lineHeight: 1.5,
                maxHeight: 90, overflowY: 'auto',
              }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="ekc-send-btn"
              style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                background: input.trim() && !loading ? '#0A0F1E' : 'rgba(10,15,30,0.07)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() && !loading ? '0 2px 10px rgba(10,15,30,0.22)' : 'none',
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
                     stroke={input.trim() ? '#fff' : 'rgba(10,15,30,0.22)'}
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            fontSize: 10, color: '#8A95A8', opacity: 0.7,
            textAlign: 'center', marginTop: 7,
          }}>↵ to send · ⇧↵ for newline</div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setFabHover(true)}
        onMouseLeave={() => { setFabHover(false); setFabPress(false); }}
        onMouseDown={() => setFabPress(true)}
        onMouseUp={() => setFabPress(false)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          zIndex: 10000,
          width: 56, height: 56,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open
            ? 'rgba(244,246,250,0.92)'
            : 'linear-gradient(145deg, #0d1525 0%, #1a2e48 100%)',
          outline: 'none',
          transform: `scale(${fabScale})`,
          animation: !open ? 'ekc-ring-pulse 2.8s ease-in-out infinite' : 'none',
          transition: 'background 0.28s ease, border 0.28s ease',
          /* border set once cleanly */
          border: open ? '1.5px solid rgba(10,15,30,0.14)' : '1.5px solid rgba(255,255,255,0.1)',
        }}
      >
        {!open && messages.length > 1 && (
          <div style={{
            position: 'absolute', top: 9, right: 9,
            width: 9, height: 9, borderRadius: '50%',
            background: '#00C875',
            border: '2px solid #F5F7FA',
            animation: 'ekc-badge-pop 0.48s cubic-bezier(0.34,1.4,0.64,1) both',
          }} />
        )}

        <div style={{
          transition: 'transform 0.32s cubic-bezier(0.34,1.4,0.64,1)',
          transform: open ? 'rotate(90deg) scale(0.84)' : 'rotate(0deg) scale(1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="#0A0F1E" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10" stroke="#00C875" strokeWidth="2"/>
              <line x1="9" y1="14" x2="13" y2="14" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"/>
            </svg>
          )}
        </div>
      </button>
    </>
  );
};

/* ── Portal wrapper ─────────────────────────────────────────────────────────── */
const EksChat = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<EksChatInner {...props} />, document.body);
};

export default EksChat;