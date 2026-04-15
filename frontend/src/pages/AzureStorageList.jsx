import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCloud, FaSync, FaRobot, FaSpinner, FaDatabase } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';
import { useNavigate } from 'react-router-dom';

/* ── Relative-time helper ───────────────────────────────────────────── */
function timeAgo(ts) {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5)    return 'just now';
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) { const m = Math.floor(diff / 60); return `${m} min${m !== 1 ? 's' : ''} ago`; }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return `${h} hr${h !== 1 ? 's' : ''} ago`; }
    const d = Math.floor(diff / 86400);
    return `${d} day${d !== 1 ? 's' : ''} ago`;
}

/* ── Absolute-time helper ───────────────────────────────────────────── */
function formatAbsolute(ts) {
    if (!ts) return null;
    const d    = new Date(ts);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const day  = d.toLocaleDateString('en-US', { weekday: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${date} · ${day} · ${time}`;
}

const AzureStorageList = () => {
    const navigate = useNavigate();
    const subscriptionId = import.meta.env.VITE_AZURE_SUBSCRIPTION_ID || '';

    const [showSummary,  setShowSummary]  = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary,    setAiSummary]    = useState(null);

    /* ── Timestamp + sync-counter state ────────────────────────────── */
    const storageKey = `azureStorageLastSynced_${subscriptionId}`;
    const [lastUpdated,  setLastUpdated]  = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? parseInt(saved, 10) : null;
        } catch { return null; }
    });
    const [showRelative, setShowRelative] = useState(false);
    const [elapsed,      setElapsed]      = useState(null);
    const [doneTime,     setDoneTime]     = useState(null);
    const elapsedRef   = useRef(null);
    const syncStartRef = useRef(null);

    /* tick every second so relative label stays fresh */
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const id = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    /* ── Cache helpers ──────────────────────────────────────────────── */
    const getCachedData = useCallback(() => {
        try {
            const cached = localStorage.getItem(`azureStorageCache_${subscriptionId}`);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    }, [subscriptionId]);

    const saveToCache = useCallback((data) => {
        try {
            localStorage.setItem(`azureStorageCache_${subscriptionId}`, JSON.stringify({
                data,
                timestamp: Date.now(),
            }));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }, [subscriptionId]);

    /* ── Persist last-synced timestamp ─────────────────────────────── */
    const saveLastSynced = useCallback((ts) => {
        try { localStorage.setItem(storageKey, String(ts)); } catch {}
        setLastUpdated(ts);
    }, [storageKey]);

    /* ── Scroll restoration ─────────────────────────────────────────── */
    useEffect(() => {
        const saved = sessionStorage.getItem('azureStorageListScrollPosition');
        if (saved) {
            window.scrollTo(0, parseInt(saved));
            sessionStorage.removeItem('azureStorageListScrollPosition');
        }
    }, []);

    const handleNavigate = (account) => {
        sessionStorage.setItem('azureStorageListScrollPosition', window.scrollY.toString());
        navigate(`/azure/storage/details/${account.name}?subscription_id=${subscriptionId}&resource_group=${account.resource_group}`);
    };

    /* ── Elapsed timer helpers ──────────────────────────────────────── */
    const startElapsed = () => {
        setDoneTime(null);
        setElapsed('0.0');
        syncStartRef.current = Date.now();
        elapsedRef.current = setInterval(() => {
            const s = ((Date.now() - syncStartRef.current) / 1000).toFixed(1);
            setElapsed(s);
        }, 100);
    };

    const stopElapsed = (success = true) => {
        if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
        const total = syncStartRef.current
            ? ((Date.now() - syncStartRef.current) / 1000).toFixed(1)
            : null;
        setElapsed(null);
        syncStartRef.current = null;
        if (total) {
            setDoneTime({ value: total, success });
            setTimeout(() => setDoneTime(null), 60 * 60 * 1000);
        }
    };

    /* ── Query ──────────────────────────────────────────────────────── */
    const { data: accounts = [], refetch, isFetching, isError } = useQuery({
        queryKey: ['azureStorageAccounts', subscriptionId],
        queryFn: async () => {
            try {
                if (!subscriptionId) throw new Error('Subscription ID required');
                const res = await secureFetch(
                    `${import.meta.env.VITE_API_URL}/azure/storage/list?subscription_id=${subscriptionId}`
                );
                if (!res.ok) throw new Error(`Failed to fetch Azure Storage accounts: ${res.statusText}`);
                const data = await res.json();
                saveToCache(data);
                saveLastSynced(Date.now());
                stopElapsed(true);
                return data;
            } catch (err) {
                saveLastSynced(Date.now());
                stopElapsed(false);
                throw err;
            }
        },
        enabled:   false,
        staleTime: Infinity,
        gcTime:    Infinity,
        retry:     false,
    });

    const cachedData       = getCachedData();
    const displayAccounts  = cachedData?.data || accounts;

    /* ── handleSync ─────────────────────────────────────────────────── */
    const handleSync = () => {
        if (isFetching || !subscriptionId) return;
        startElapsed();
        refetch();
    };

    const handleFlip = () => {
        if (!lastUpdated) return;
        setShowRelative(v => !v);
    };

    /* ── Sync button label ──────────────────────────────────────────── */
    const syncLabel = () => {
        if (isFetching && elapsed !== null) {
            return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 13, fontWeight: 600,
                        color: "var(--green)", letterSpacing: "0.1px",
                    }}>Syncing</span>
                    <span style={{
                        fontFamily: "'SF Mono','Fira Code',monospace",
                        fontSize: 11, fontWeight: 700,
                        color: "var(--green)",
                        background: "rgba(0,200,117,0.12)",
                        border: "1px solid rgba(0,200,117,0.2)",
                        borderRadius: 6,
                        padding: "1px 6px",
                        letterSpacing: "0.5px",
                        minWidth: 32,
                        textAlign: "center",
                    }}>{elapsed}s</span>
                </span>
            );
        }
        return (
            <span style={{
                fontFamily: "var(--font-body)",
                fontSize: 13, fontWeight: 600,
                color: "#fff", letterSpacing: "0.1px",
            }}>Sync</span>
        );
    };

    /* ── AI Summary ─────────────────────────────────────────────────── */
    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const accountData = displayAccounts.map(account => ({
                name:           account.name,
                location:       account.location,
                sku:            account.sku,
                kind:           account.kind,
                resource_group: account.resource_group,
            }));

            const prompt = `Analyze these Azure Storage accounts and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Azure Storage Accounts:
${JSON.stringify(accountData, null, 2)}

Focus on:
- Regional distribution and cost optimization
- SKU types and performance tiers
- Account kinds and use cases

Format your response as:
1. First insight here
2. Second insight here
3. Third insight here`;

            const model  = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const result = await model.generateContent(prompt);
            const text   = result.response.text();

            const insights = text
                .split('\n')
                .filter(line => line.trim().match(/^\d+[\.)]/))
                .map(line => line.replace(/^\d+[\.)]\s*/, '').trim())
                .filter(line => line.length > 0);

            setAiSummary(insights.length > 0 ? insights.slice(0, 3) : [
                text.trim() || `${displayAccounts.length} storage accounts analyzed`,
                'Review regional distribution for latency optimization',
                'Consider SKU consolidation for cost savings',
            ]);
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const uniqueRegions = new Set(displayAccounts.map(a => a.location)).size;
            const uniqueSkus    = new Set(displayAccounts.map(a => a.sku)).size;
            setAiSummary([
                `${displayAccounts.length} storage accounts across ${uniqueRegions} regions`,
                `${uniqueSkus} different SKU types detected`,
                `Resource groups: ${new Set(displayAccounts.map(a => a.resource_group)).size}`,
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

                :root {
                    --font-display: 'Figtree', -apple-system, sans-serif;
                    --font-body:    'Plus Jakarta Sans', -apple-system, sans-serif;
                    --ink:      #0A0F1E;
                    --ink-soft: #1E2A3B;
                    --surface:  #F5F7FA;
                    --card:     #FFFFFF;
                    --border:   rgba(10,15,30,0.08);
                    --accent:   #0066FF;
                    --green:    #00C875;
                    --muted:    #8A95A8;
                    --s-card:   0 2px 12px rgba(10,15,30,0.06);
                    --s-lift:   0 8px 28px rgba(10,15,30,0.12);
                }

                .az, .az * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes az-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .az-enter { animation: az-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes az-card {
                    from { opacity:0; transform:translateY(16px) scale(0.99); }
                    to   { opacity:1; transform:translateY(0)    scale(1);    }
                }
                .az-card { animation: az-card 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                .az-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes az-spin { to { transform:rotate(360deg); } }
                .az-spin { animation: az-spin 0.75s linear infinite; }

                @keyframes az-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .az-rise { animation: az-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes az-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .az-insight { animation: az-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes az-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .az-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: az-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes az-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.45; }
                    50%      { transform:translate(-50%,-50%) scale(1.1); opacity:0.65; }
                }
                .az-orb { animation: az-orb 7s ease-in-out infinite; }

                /* Sync button springy press */
                .sync-btn {
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                                box-shadow 0.22s ease,
                                background 0.22s ease,
                                border-color 0.22s ease;
                }
                .sync-btn:not(:disabled):active { transform: scale(0.93); }

                /* Timestamp pill */
                .ts-pill {
                    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
                }
                .ts-pill:hover {
                    background: rgba(10,15,30,0.065) !important;
                    border-color: rgba(10,15,30,0.14) !important;
                    box-shadow: 0 2px 8px rgba(10,15,30,0.07);
                }
                .ts-pill:active { transform: scale(0.96); transition: transform 0.1s ease; }

                /* Latency badge */
                @keyframes lat-drop {
                    from { opacity:0; transform:translateY(-6px) scale(0.94); }
                    to   { opacity:1; transform:translateY(0)    scale(1);    }
                }
                @keyframes lat-out {
                    0%,70% { opacity:1; }
                    100%   { opacity:0; transform:translateY(4px); }
                }
                .lat-badge {
                    animation: lat-drop 0.32s cubic-bezier(0.34,1.4,0.64,1) both,
                               lat-out  5s ease-in-out 0.1s forwards;
                }
            `}</style>

            <div className="az" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 56px" }}>

                    {/* ── Page header ─────────────────────────────────────── */}
                    <div className="az-enter" style={{
                        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                        marginBottom: 22, animationDelay: "0s",
                    }}>
                        {/* Left: title + timestamp */}
                        <div>
                            <h1 style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 20, fontWeight: 800,
                                color: "var(--ink)", letterSpacing: "-0.7px",
                                margin: 0, lineHeight: 1.2,
                            }}>Storage Accounts</h1>

                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                                {/* Account count */}
                                {displayAccounts.length > 0 && (
                                    <div style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 11.5, fontWeight: 500,
                                        color: "var(--muted)", letterSpacing: "0.1px",
                                    }}>
                                        {displayAccounts.length} account{displayAccounts.length !== 1 ? 's' : ''} · Azure
                                    </div>
                                )}

                                {/* ── Last-updated pill ── */}
                                {lastUpdated ? (
                                    <div
                                        className="ts-pill"
                                        onClick={handleFlip}
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: 5,
                                            background: "rgba(10,15,30,0.04)",
                                            border: "1px solid rgba(10,15,30,0.09)",
                                            borderRadius: 99,
                                            padding: "3px 10px",
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        title="Click to switch between exact time and relative time"
                                    >
                                        <div style={{
                                            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                                            background: "var(--green)",
                                            boxShadow: "0 0 5px var(--green)",
                                        }} />
                                        <span style={{
                                            fontFamily: showRelative ? "var(--font-body)" : "'SF Mono','Fira Code',monospace",
                                            fontSize: 11, fontWeight: 600,
                                            color: "var(--ink-soft)",
                                            letterSpacing: showRelative ? "0.1px" : "0.3px",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {showRelative ? timeAgo(lastUpdated) : formatAbsolute(lastUpdated)}
                                        </span>
                                        <span style={{ fontSize: 9, color: "var(--muted)", opacity: 0.6 }}>↕</span>
                                    </div>
                                ) : (
                                    <div style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 11, color: "var(--muted)", opacity: 0.5,
                                    }}>Not synced yet</div>
                                )}
                            </div>
                        </div>

                        {/* ── Sync button + latency badge ──────────────────── */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                            <button
                                onClick={handleSync}
                                disabled={isFetching || !subscriptionId}
                                className="sync-btn"
                                style={{
                                    display: "flex", alignItems: "center", gap: 7,
                                    padding: "9px 18px",
                                    background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                                    border: isFetching
                                        ? "1.5px solid rgba(0,200,117,0.3)"
                                        : "1.5px solid transparent",
                                    borderRadius: 99,
                                    cursor: (isFetching || !subscriptionId) ? "default" : "pointer",
                                    boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                                    opacity: !subscriptionId ? 0.45 : 1,
                                }}
                            >
                                <FaSync
                                    className={isFetching ? "az-spin" : ""}
                                    style={{ fontSize: 11, color: isFetching ? "var(--green)" : "#fff" }}
                                />
                                {syncLabel()}
                            </button>

                            {/* Latency badge */}
                            {doneTime && (
                                <div className="lat-badge" style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px",
                                    background: doneTime.success ? "rgba(0,200,117,0.08)" : "rgba(245,158,11,0.08)",
                                    border: `1px solid ${doneTime.success ? "rgba(0,200,117,0.22)" : "rgba(245,158,11,0.22)"}`,
                                    borderRadius: 99,
                                }}>
                                    {doneTime.success ? (
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                             stroke="#00C875" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    ) : (
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                             stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                        </svg>
                                    )}
                                    <span style={{
                                        fontFamily: "'SF Mono','Fira Code',monospace",
                                        fontSize: 10.5, fontWeight: 700,
                                        color: doneTime.success ? "var(--green)" : "#F59E0B",
                                        letterSpacing: "0.4px",
                                    }}>{doneTime.value}s</span>
                                    <span style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 10, fontWeight: 500, color: "var(--muted)",
                                    }}>{doneTime.success ? "fetched" : "failed"}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── AI Insights ─────────────────────────────────────── */}
                    {displayAccounts.length > 0 && (
                        <div className="az-enter" style={{ marginBottom: 18, animationDelay: "0.07s" }}>
                            {!showSummary ? (
                                <button
                                    onClick={generateAISummary}
                                    disabled={isGenerating}
                                    className="az-press"
                                    style={{
                                        width: "100%",
                                        display: "flex", alignItems: "center", gap: 12,
                                        padding: "13px 16px",
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 16,
                                        cursor: "pointer",
                                        boxShadow: "var(--s-card)",
                                        textAlign: "left",
                                        transition: "box-shadow 0.2s, border-color 0.2s",
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow   = "var(--s-lift)";
                                        e.currentTarget.style.borderColor = "rgba(0,200,117,0.28)";
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow   = "var(--s-card)";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                    }}
                                >
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                        background: "rgba(0,200,117,0.1)",
                                        border: "1px solid rgba(0,200,117,0.2)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <FaRobot style={{ fontSize: 14, color: "var(--green)" }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontFamily: "var(--font-display)",
                                            fontSize: 14, fontWeight: 700,
                                            color: "var(--ink)", letterSpacing: "-0.2px",
                                        }}>AI Insights</div>
                                        <div style={{
                                            fontFamily: "var(--font-body)",
                                            fontSize: 12, color: "var(--muted)", marginTop: 1,
                                        }}>Analyze {displayAccounts.length} account{displayAccounts.length !== 1 ? 's' : ''} with Gemini</div>
                                    </div>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                         stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                </button>

                            ) : (
                                <div className="az-rise" style={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 16,
                                    boxShadow: "var(--s-lift)",
                                    overflow: "hidden",
                                }}>
                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "13px 15px",
                                        borderBottom: "1px solid var(--border)",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                background: "rgba(0,200,117,0.1)",
                                                border: "1px solid rgba(0,200,117,0.2)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                {isGenerating
                                                    ? <FaSpinner className="az-spin" style={{ fontSize: 11, color: "var(--green)" }} />
                                                    : <FaRobot style={{ fontSize: 11, color: "var(--green)" }} />
                                                }
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontFamily: "var(--font-display)",
                                                    fontSize: 13, fontWeight: 700,
                                                    color: "var(--ink)", letterSpacing: "-0.2px",
                                                }}>AI Insights</div>
                                                <div style={{
                                                    fontFamily: "var(--font-body)",
                                                    fontSize: 10.5, color: "var(--muted)",
                                                }}>{isGenerating ? "Analyzing…" : "Powered by Gemini"}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setShowSummary(false); setAiSummary(null); }}
                                            style={{
                                                background: "var(--surface)", border: "1px solid var(--border)",
                                                borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                                                fontFamily: "var(--font-body)",
                                                fontSize: 11, fontWeight: 600, color: "var(--muted)",
                                            }}
                                        >Done</button>
                                    </div>

                                    <div style={{ padding: "14px 15px" }}>
                                        {isGenerating ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {[90, 72, 55].map((w, i) => (
                                                    <div key={i} className="az-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                ))}
                                            </div>
                                        ) : aiSummary ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                {aiSummary.map((insight, i) => (
                                                    <div key={i} className="az-insight"
                                                         style={{ display: "flex", alignItems: "flex-start", gap: 11, animationDelay: `${i * 0.09}s` }}>
                                                        <div style={{
                                                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                                            background: "rgba(0,200,117,0.1)",
                                                            border: "1px solid rgba(0,200,117,0.2)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            marginTop: 1,
                                                        }}>
                                                            <span style={{
                                                                fontFamily: "var(--font-display)",
                                                                fontSize: 9, fontWeight: 700, color: "var(--green)",
                                                            }}>{i + 1}</span>
                                                        </div>
                                                        <p style={{
                                                            fontFamily: "var(--font-body)",
                                                            fontSize: 13, fontWeight: 400,
                                                            color: "var(--ink-soft)", lineHeight: 1.6, margin: 0, flex: 1,
                                                        }}>{insight}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Empty state ─────────────────────────────────────── */}
                    {!isFetching && displayAccounts.length === 0 ? (
                        <div className="az-enter" style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            padding: "72px 24px", textAlign: "center",
                            position: "relative", animationDelay: "0.1s",
                        }}>
                            <div className="az-orb" style={{
                                position: "absolute", top: "50%", left: "50%",
                                width: 260, height: 160,
                                background: "radial-gradient(ellipse, rgba(0,102,255,0.08) 0%, transparent 70%)",
                                pointerEvents: "none",
                            }} />
                            <div style={{
                                width: 56, height: 56, borderRadius: 16,
                                background: "var(--card)", border: "1px solid var(--border)",
                                boxShadow: "var(--s-card)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                marginBottom: 16, position: "relative",
                            }}>
                                <FaDatabase style={{ fontSize: 20, color: "var(--muted)" }} />
                            </div>
                            <div style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 16, fontWeight: 700,
                                color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7,
                            }}>No storage accounts yet</div>
                            <div style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 13, color: "var(--muted)",
                                lineHeight: 1.6, maxWidth: 220, marginBottom: 5,
                            }}>Hit Sync to pull your Azure Storage accounts</div>
                            <div style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 11, color: "var(--muted)", opacity: 0.55,
                            }}>Loads instantly from cache after first sync</div>
                        </div>

                    ) : (
                        /* ── Account cards ──────────────────────────────── */
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {displayAccounts.map((account, i) => (
                                <div
                                    key={account.id || account.name}
                                    onClick={() => handleNavigate(account)}
                                    className="az-card az-press"
                                    style={{
                                        animationDelay: `${0.1 + i * 0.05}s`,
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 16,
                                        boxShadow: "var(--s-card)",
                                        overflow: "hidden",
                                        cursor: "pointer",
                                        transition: "box-shadow 0.2s, border-color 0.2s",
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow   = "var(--s-lift)";
                                        e.currentTarget.style.borderColor = "rgba(10,15,30,0.13)";
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow   = "var(--s-card)";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                    }}
                                >
                                    <div style={{ padding: "14px 15px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        {/* Accent left bar — blue for Azure */}
                                        <div style={{
                                            width: 3, alignSelf: "stretch", minHeight: 36,
                                            borderRadius: 2, flexShrink: 0,
                                            background: "var(--accent)",
                                            boxShadow: "0 0 8px rgba(0,102,255,0.4)",
                                        }} />

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                                                <div style={{
                                                    fontFamily: "var(--font-display)",
                                                    fontSize: 14.5, fontWeight: 700,
                                                    color: "var(--ink)", letterSpacing: "-0.3px",
                                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                                }}>{account.name}</div>

                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: 5,
                                                    padding: "3px 9px",
                                                    background: "rgba(0,102,255,0.07)",
                                                    border: "1px solid rgba(0,102,255,0.18)",
                                                    borderRadius: 99, flexShrink: 0,
                                                }}>
                                                    <span style={{
                                                        fontFamily: "var(--font-body)",
                                                        fontSize: 11, fontWeight: 600,
                                                        color: "var(--accent)", letterSpacing: "0.1px",
                                                    }}>{account.sku || 'Standard'}</span>
                                                </div>
                                            </div>

                                            <div style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 12.5, color: "var(--muted)",
                                                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                            }}>{account.location}{account.resource_group ? ` · ${account.resource_group}` : ''}</div>
                                        </div>
                                    </div>

                                    {/* Footer row */}
                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "9px 15px",
                                        borderTop: "1px solid var(--border)",
                                        background: "rgba(10,15,30,0.012)",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 10.5, fontWeight: 600,
                                                color: "var(--muted)", letterSpacing: "0.7px", textTransform: "uppercase",
                                            }}>Kind</span>
                                            <span style={{
                                                fontFamily: "var(--font-display)",
                                                fontSize: 12, fontWeight: 600, color: "var(--ink-soft)",
                                            }}>{account.kind || '—'}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 12, fontWeight: 600, color: "var(--accent)",
                                            }}>Details</span>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                                 stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AzureStorageList;