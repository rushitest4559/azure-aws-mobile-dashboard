import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaRobot } from 'react-icons/fa';

/*
 * EksChat v3 — Zero-lag, GPU-accelerated
 *
 * WHY IT WAS SLOW:
 *   The previous version ran a requestAnimationFrame spring loop ~60x/sec
 *   on the main JS thread, blocking paint and causing visible jank on open.
 *
 * THE FIX:
 *   Every animation is now a pure CSS transition on `transform` + `opacity`
 *   only — the two properties the browser compositor can animate entirely on
 *   the GPU with zero JS involvement after the class toggle. This is exactly
 *   how iOS UIKit works: commit a target state, hardware interpolates.
 *
 * SPRING FEEL without JS physics:
 *   cubic-bezier(0.34, 1.56, 0.64, 1) — an overshoot curve that looks and
 *   feels like a spring at zero CPU cost.
 */

const SUGGESTIONS = [
  "How many clusters are active?",
  "Which regions have clusters?",
  "Any outdated K8s versions?",
  "Show clusters by status",
];

/* ── Typing dots ─────────────────────────────────────────────────────── */
const TypingDots = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 2px' }}>
    {[0, 1, 2].map(i => (
      <span key={i} className="ekc-dot" style={{ animationDelay: `${i * 0.16}s` }} />
    ))}
  </span>
);

/* ── Message bubble ──────────────────────────────────────────────────── */
const Bubble = ({ msg, isNew }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      className={isNew ? (isUser ? 'ekc-bubble-in-right' : 'ekc-bubble-in-left') : ''}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(0,200,117,0.2), rgba(0,200,117,0.07))',
          border: '1px solid rgba(0,200,117,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 2,
        }}>
          <FaRobot style={{ fontSize: 10, color: '#00C875' }} />
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '9px 14px' : '10px 14px',
        borderRadius: isUser ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
        background: isUser
          ? 'linear-gradient(150deg, #0d1828 0%, #1a2e48 100%)'
          : 'rgba(255,255,255,0.88)',
        border: isUser
          ? '1px solid rgba(255,255,255,0.07)'
          : '1px solid rgba(10,15,30,0.08)',
        boxShadow: isUser
          ? '0 4px 18px rgba(10,15,30,0.25), 0 1px 0 rgba(255,255,255,0.06) inset'
          : '0 2px 10px rgba(10,15,30,0.07)',
        color: isUser ? '#F0F4FA' : '#0A0F1E',
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

/* ── Main component ──────────────────────────────────────────────────── */
const EksChatInner = ({ clusters = [] }) => {
  const [open,      setOpen]      = useState(false);
  const [input,     setInput]     = useState('');
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [newMsgIdx, setNewMsgIdx] = useState(-1);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 220);
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
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    const clusterData = getClusterData();
    const userIdx = messages.length;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '__typing__' },
    ]);
    setNewMsgIdx(userIdx);
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const prompt = `You are an expert AWS EKS assistant in a cloud management dashboard.

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
      setNewMsgIdx(messages.length + 1);
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
        /* ── Typing dot bounce ────────────────────────────────────── */
        .ekc-dot {
          display: inline-block;
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(0,200,117,0.75);
          animation: ekc-dot-b 1.1s ease-in-out infinite both;
        }
        @keyframes ekc-dot-b {
          0%,80%,100% { transform: scale(0.55) translateY(0);    opacity: 0.35; }
          40%          { transform: scale(1)    translateY(-3px); opacity: 1;    }
        }

        /* ── Bubble entrance ──────────────────────────────────────── */
        @keyframes ekc-from-r {
          from { opacity:0; transform:translateX(14px) scale(0.96); }
          to   { opacity:1; transform:translateX(0)    scale(1);    }
        }
        @keyframes ekc-from-l {
          from { opacity:0; transform:translateX(-14px) scale(0.96); }
          to   { opacity:1; transform:translateX(0)      scale(1);   }
        }
        .ekc-bubble-in-right { animation: ekc-from-r 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .ekc-bubble-in-left  { animation: ekc-from-l 0.28s cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Chip entrance ────────────────────────────────────────── */
        @keyframes ekc-chip-in {
          from { opacity:0; transform:translateY(8px) scale(0.94); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        .ekc-chip-in { animation: ekc-chip-in 0.3s cubic-bezier(0.22,1,0.36,1) both; }

        /* ── Panel — CSS class toggle, GPU compositor handles it ──── */
        .ekc-panel {
          will-change: transform, opacity;
          transform-origin: bottom right;
          transform: translateY(20px) scale(0.94);
          opacity: 0;
          pointer-events: none;
          transition:
            transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            opacity   0.26s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ekc-panel-open {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: all;
        }

        /* ── Backdrop ─────────────────────────────────────────────── */
        .ekc-backdrop {
          will-change: opacity;
          opacity: 0; pointer-events: none;
          transition: opacity 0.26s ease;
        }
        .ekc-backdrop-open { opacity: 1; pointer-events: all; }

        /* ── FAB ──────────────────────────────────────────────────── */
        .ekc-fab {
          will-change: transform;
          transition:
            transform    0.34s cubic-bezier(0.34, 1.56, 0.64, 1),
            background   0.24s ease,
            border-color 0.24s ease,
            box-shadow   0.24s ease;
        }
        .ekc-fab:hover  { transform: scale(1.1);  }
        .ekc-fab:active { transform: scale(0.88); transition-duration: 0.1s; }

        /* Idle pulse ring */
        @keyframes ekc-fab-ring {
          0%,100% { box-shadow: 0 0 0 0px rgba(0,200,117,0.5),  0 8px 28px rgba(10,15,30,0.3); }
          55%     { box-shadow: 0 0 0 10px rgba(0,200,117,0),   0 8px 28px rgba(10,15,30,0.3); }
        }
        .ekc-fab-idle { animation: ekc-fab-ring 3s ease-in-out infinite; }

        /* FAB icon flip */
        .ekc-fab-icon {
          will-change: transform;
          transition: transform 0.32s cubic-bezier(0.34,1.4,0.64,1);
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Buttons ──────────────────────────────────────────────── */
        .ekc-send {
          will-change: transform;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.18s ease, box-shadow 0.18s ease;
        }
        .ekc-send:not(:disabled):hover  { transform: scale(1.09); }
        .ekc-send:not(:disabled):active { transform: scale(0.87); transition-duration: 0.09s; }

        .ekc-chip {
          will-change: transform;
          transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1),
                      background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ekc-chip:hover {
          transform: translateY(-2px) scale(1.04);
          background: rgba(0,200,117,0.12) !important;
          border-color: rgba(0,200,117,0.4) !important;
          box-shadow: 0 4px 14px rgba(0,200,117,0.15) !important;
        }
        .ekc-chip:active { transform: scale(0.93) !important; transition-duration: 0.09s; }

        .ekc-close {
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease;
        }
        .ekc-close:hover  { transform: scale(1.1); background: rgba(10,15,30,0.09) !important; }
        .ekc-close:active { transform: scale(0.88); }

        .ekc-clear { transition: opacity 0.15s ease, color 0.15s ease; }
        .ekc-clear:hover { opacity: 1 !important; color: #0A0F1E !important; }

        /* ── Input focus ring (CSS-only) ──────────────────────────── */
        .ekc-input-wrap {
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .ekc-input-wrap:focus-within {
          border-color: rgba(0,200,117,0.45) !important;
          box-shadow: 0 0 0 3px rgba(0,200,117,0.1), 0 2px 10px rgba(10,15,30,0.06) !important;
        }
        .ekc-textarea { outline: none; }
        .ekc-textarea::placeholder { color: rgba(10,15,30,0.25); }

        /* ── Scrollbar ────────────────────────────────────────────── */
        .ekc-scroll::-webkit-scrollbar       { width: 3px; }
        .ekc-scroll::-webkit-scrollbar-track { background: transparent; }
        .ekc-scroll::-webkit-scrollbar-thumb { background: rgba(10,15,30,0.1); border-radius: 99px; }

        /* ── Badge pop ────────────────────────────────────────────── */
        @keyframes ekc-badge-pop {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          65%  { transform: scale(1.25) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .ekc-badge { animation: ekc-badge-pop 0.42s cubic-bezier(0.34,1.4,0.64,1) both; }

        /* ── Status dot pulse ─────────────────────────────────────── */
        @keyframes ekc-status {
          0%,100% { box-shadow: 0 0 0 0px rgba(0,200,117,0.5); }
          55%     { box-shadow: 0 0 0 5px rgba(0,200,117,0);   }
        }
        .ekc-status { animation: ekc-status 2.2s ease-in-out infinite; }

        /* ── Spin ─────────────────────────────────────────────────── */
        @keyframes ekc-spin { to { transform: rotate(360deg); } }
        .ekc-spin { animation: ekc-spin 0.75s linear infinite; }
      `}</style>

      {/* Backdrop */}
      <div
        className={`ekc-backdrop${open ? ' ekc-backdrop-open' : ''}`}
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(10,15,30,0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Chat panel */}
      <div
        className={`ekc-panel${open ? ' ekc-panel-open' : ''}`}
        style={{
          position: 'fixed',
          bottom: 90, right: 20,
          zIndex: 9999,
          width: 'min(400px, calc(100vw - 32px))',
          maxHeight: '72vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: 28,
          overflow: 'hidden',
          background: 'rgba(244,246,250,0.86)',
          backdropFilter: 'blur(48px) saturate(2)',
          WebkitBackdropFilter: 'blur(48px) saturate(2)',
          border: '1px solid rgba(255,255,255,0.78)',
          boxShadow:
            '0 32px 80px rgba(10,15,30,0.22),' +
            '0 1px 0 rgba(255,255,255,0.95) inset,' +
            '0 -1px 0 rgba(10,15,30,0.05) inset',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '15px 17px 13px',
          borderBottom: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.56)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', gap: 11,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(0,200,117,0.2) 0%, rgba(0,200,117,0.06) 100%)',
            border: '1px solid rgba(0,200,117,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,200,117,0.16)',
          }}>
            <FaRobot style={{ fontSize: 14, color: '#00C875' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Figtree', -apple-system, sans-serif",
              fontSize: 15, fontWeight: 800,
              color: '#0A0F1E', letterSpacing: '-0.4px', lineHeight: 1.2,
            }}>Cluster Assistant</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2.5 }}>
              <div className="ekc-status" style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#00C875', flexShrink: 0,
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
              <button onClick={clearChat} className="ekc-clear" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                fontSize: 11, fontWeight: 600, color: '#8A95A8',
                padding: '4px 8px', borderRadius: 8, opacity: 0.6,
              }}>Clear</button>
            )}
            <button onClick={() => setOpen(false)} className="ekc-close" style={{
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
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} isNew={i >= newMsgIdx && newMsgIdx >= 0} />
          ))}

          {messages.length === 1 && !loading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="ekc-chip ekc-chip-in"
                  style={{
                    animationDelay: `${0.16 + i * 0.07}s`,
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.78)',
                    border: '1px solid rgba(10,15,30,0.1)',
                    borderRadius: 99, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                    fontSize: 12, fontWeight: 500, color: '#1E2A3B',
                    boxShadow: '0 1px 6px rgba(10,15,30,0.06)',
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '11px 13px 13px',
          borderTop: '1px solid rgba(10,15,30,0.07)',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <div className="ekc-input-wrap" style={{
            display: 'flex', alignItems: 'flex-end', gap: 9,
            background: 'rgba(255,255,255,0.92)',
            border: '1.5px solid rgba(10,15,30,0.1)',
            borderRadius: 18,
            padding: '9px 9px 9px 14px',
            boxShadow: '0 2px 10px rgba(10,15,30,0.06)',
          }}>
            <textarea
              ref={inputRef}
              className="ekc-textarea"
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
              className="ekc-send"
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
                <svg className="ekc-spin" width="13" height="13" viewBox="0 0 24 24"
                     fill="none" stroke="rgba(10,15,30,0.3)" strokeWidth="2.5" strokeLinecap="round">
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
            fontSize: 10, color: '#8A95A8', opacity: 0.65,
            textAlign: 'center', marginTop: 7,
          }}>↵ send · ⇧↵ newline</div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`ekc-fab${!open ? ' ekc-fab-idle' : ''}`}
        style={{
          position: 'fixed',
          bottom: 24, right: 20,
          zIndex: 10000,
          width: 56, height: 56,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open
            ? 'rgba(244,246,250,0.94)'
            : 'linear-gradient(145deg, #0d1828 0%, #162540 100%)',
          border: open
            ? '1.5px solid rgba(10,15,30,0.14)'
            : '1.5px solid rgba(255,255,255,0.1)',
          outline: 'none',
        }}
      >
        {!open && messages.length > 1 && (
          <div className="ekc-badge" style={{
            position: 'absolute', top: 9, right: 9,
            width: 9, height: 9, borderRadius: '50%',
            background: '#00C875', border: '2px solid #F5F7FA',
          }} />
        )}

        <div
          className="ekc-fab-icon"
          style={{ transform: open ? 'rotate(90deg) scale(0.84)' : 'rotate(0deg) scale(1)' }}
        >
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
              <line x1="9" y1="14" x2="13" y2="14" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            </svg>
          )}
        </div>
      </button>
    </>
  );
};

/* ── Portal wrapper ──────────────────────────────────────────────────── */
const EksChat = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<EksChatInner {...props} />, document.body);
};

export default EksChat;