import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaCloud, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * S3Details — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 *
 * NEW (ported from EksDetails):
 *  • Last-updated timestamp pill — persists via localStorage, click to flip between absolute & relative
 *  • Sync button shows a live seconds counter while fetching
 */

/* ── Relative-time helper ───────────────────────────────────────────── */
function timeAgo(ts) {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) {
        const m = Math.floor(diff / 60);
        return `${m} min${m !== 1 ? 's' : ''} ago`;
    }
    if (diff < 86400) {
        const h = Math.floor(diff / 3600);
        return `${h} hr${h !== 1 ? 's' : ''} ago`;
    }
    const d = Math.floor(diff / 86400);
    return `${d} day${d !== 1 ? 's' : ''} ago`;
}

/* ── Absolute-time helper ───────────────────────────────────────────── */
function formatAbsolute(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
    return `${date} · ${day} · ${time}`;
}

const S3Details = () => {
    const { bucketName } = useParams();
    const navigate = useNavigate();

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    /* ── Persistent last-synced timestamp (localStorage, keyed per bucket) ── */
    const storageKey = `s3DetailsLastSynced_${bucketName}`;
    const [lastUpdated, setLastUpdated] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? parseInt(saved, 10) : null;
        } catch { return null; }
    });
    const [showRelative, setShowRelative] = useState(false);

    /* ── Live elapsed counter ── */
    const [elapsed, setElapsed] = useState(null);
    const [doneTime, setDoneTime] = useState(null);
    const elapsedRef = useRef(null);
    const syncStartRef = useRef(null);

    /* Tick every second so relative label stays fresh */
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const id = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    /* ── Persist last-synced timestamp to localStorage ── */
    const saveLastSynced = (ts) => {
        try { localStorage.setItem(storageKey, String(ts)); } catch {}
        setLastUpdated(ts);
    };

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
        if (elapsedRef.current) {
            clearInterval(elapsedRef.current);
            elapsedRef.current = null;
        }
        const total = syncStartRef.current
            ? ((Date.now() - syncStartRef.current) / 1000).toFixed(1)
            : null;
        setElapsed(null);
        syncStartRef.current = null;
        if (total) {
            setDoneTime({ value: total, success });
            setTimeout(() => setDoneTime(null), 60 * 60 * 1000); // 1 hour
        }
    };

    /* ── handleSync: wraps refetch + starts counter ── */
    const handleSync = () => {
        if (isFetching) return;
        startElapsed();
        refetch();
    };

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['s3BucketDetails', bucketName],
        queryFn: async () => {
            try {
                const res = await secureFetch(
                    `${import.meta.env.VITE_API_URL}/aws/s3/details?bucket_name=${bucketName}`
                );
                if (!res.ok) throw new Error(`Failed to fetch S3 bucket details: ${res.statusText}`);
                const data = await res.json();
                // ✅ success path — persist timestamp + stop timer
                saveLastSynced(Date.now());
                stopElapsed(true);
                return data;
            } catch (err) {
                // ✅ error path — still record the attempt
                saveLastSynced(Date.now());
                stopElapsed(false);
                throw err;
            }
        },
        enabled: false,
        staleTime: Infinity,
    });

    const hasData = !!details && !details.error;

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const bucketData = {
                name: details?.name,
                region: details?.region,
                policy_exists: details?.policy_exists,
            };

            const prompt = `Analyze this S3 bucket configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

S3 Bucket Details:
${JSON.stringify(bucketData, null, 2)}

Focus on:
- Regional location and recommendations
- Bucket policy security status
- Best practices and optimizations

Format your response as:
1. First insight here
2. Second insight here
3. Third insight here`;

            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log('Gemini response:', text);

            const insights = text
                .split('\n')
                .filter(line => line.trim().match(/^\d+[\.)]/))
                .map(line => line.replace(/^\d+[\.)]\s*/, '').trim())
                .filter(line => line.length > 0);

            if (insights.length > 0) {
                setAiSummary(insights.slice(0, 3));
            } else {
                setAiSummary([
                    text.trim() || `${bucketName} analyzed successfully`,
                    'Consider bucket policy for secure access control',
                    `Optimal region: ${details?.region || 'us-east-1'}`,
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const hasPolicy = details?.policy_exists;
            const region = details?.region;
            setAiSummary([
                `${bucketName} in ${region || 'us-east-1'}`,
                hasPolicy ? 'Bucket policy exists - review permissions' : 'No bucket policy - consider adding security policy',
                'Enable versioning and lifecycle rules for data management',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };
    // ── End logic ────────────────────────────────────────────────────

    const hasPolicy = details?.policy_exists;

    /* ── What to render inside the sync button label area ── */
    const syncLabel = () => {
        if (isFetching && elapsed !== null) {
            return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 13, fontWeight: 600,
                        color: "var(--green)",
                        letterSpacing: "0.1px",
                    }}>Syncing</span>
                    <span style={{
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
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
                color: "#fff",
                letterSpacing: "0.1px",
            }}>Sync</span>
        );
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

                .s3d, .s3d * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes s3d-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .s3d-enter  { animation: s3d-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .s3d-enter2 { animation: s3d-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .s3d-enter3 { animation: s3d-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .s3d-enter4 { animation: s3d-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .s3d-enter5 { animation: s3d-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }

                .s3d-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes s3d-spin { to { transform:rotate(360deg); } }
                .s3d-spin { animation: s3d-spin 0.75s linear infinite; }

                @keyframes s3d-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .s3d-rise { animation: s3d-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes s3d-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .s3d-insight { animation: s3d-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes s3d-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .s3d-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: s3d-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes s3d-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .s3d-orb { animation: s3d-orb 8s ease-in-out infinite; }

                /* Sync button springy press */
                .sync-btn {
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                                box-shadow 0.22s ease,
                                background 0.22s ease,
                                border-color 0.22s ease;
                }
                .sync-btn:not(:disabled):active {
                    transform: scale(0.93);
                }

                /* Timestamp pill hover glow */
                .ts-pill {
                    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
                }
                .ts-pill:hover {
                    background: rgba(10,15,30,0.065) !important;
                    border-color: rgba(10,15,30,0.14) !important;
                    box-shadow: 0 2px 8px rgba(10,15,30,0.07);
                }
                .ts-pill:active {
                    transform: scale(0.96);
                    transition: transform 0.1s ease;
                }

                /* Latency badge — drops in below sync button */
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

            <div className="s3d" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync bar ───────────────────────────────── */}
                    <div className="s3d-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                        gap: 12,
                    }}>
                        {/* Back button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="s3d-press"
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 0", flexShrink: 0 }}
                        >
                            <FaArrowLeft style={{ fontSize: 11, color: "var(--accent)" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.1px" }}>Back</span>
                        </button>

                        {/* ── Sync button + timestamp pill + latency badge (right side) ── */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>

                            {/* Row: timestamp pill + sync button */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                                {/* ── Last-updated timestamp pill — persists across sessions ── */}
                                {lastUpdated ? (
                                    <div
                                        onClick={() => setShowRelative(v => !v)}
                                        className="ts-pill"
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
                                        {/* green dot */}
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
                                        {/* tap hint */}
                                        <span style={{ fontSize: 9, color: "var(--muted)", opacity: 0.6 }}>↕</span>
                                    </div>
                                ) : (
                                    <div style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 11, color: "var(--muted)", opacity: 0.5,
                                    }}>Not synced yet</div>
                                )}

                                {/* Sync button */}
                                <button
                                    onClick={handleSync}
                                    disabled={isFetching}
                                    className="sync-btn"
                                    style={{
                                        display: "flex", alignItems: "center", gap: 7,
                                        padding: "9px 18px",
                                        background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                                        border: isFetching
                                            ? "1.5px solid rgba(0,200,117,0.3)"
                                            : "1.5px solid transparent",
                                        borderRadius: 99,
                                        cursor: isFetching ? "default" : "pointer",
                                        boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                                    }}
                                >
                                    <FaSync
                                        className={isFetching ? "s3d-spin" : ""}
                                        style={{ fontSize: 11, color: isFetching ? "var(--green)" : "#fff" }}
                                    />
                                    {syncLabel()}
                                </button>
                            </div>

                            {/* ── Latency badge — drops in right after sync done ── */}
                            {doneTime && (
                                <div className="lat-badge" style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px",
                                    background: doneTime.success
                                        ? "rgba(0,200,117,0.08)"
                                        : "rgba(245,158,11,0.08)",
                                    border: `1px solid ${doneTime.success ? "rgba(0,200,117,0.22)" : "rgba(245,158,11,0.22)"}`,
                                    borderRadius: 99,
                                }}>
                                    {doneTime.success ? (
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                            stroke="#00C875" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                            stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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
                                        fontSize: 10, fontWeight: 500,
                                        color: "var(--muted)",
                                    }}>{doneTime.success ? "fetched" : "failed"}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Hero header ───────────────────────────────────── */}
                    <div className="s3d-enter2" style={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 20, boxShadow: "var(--s-lift)",
                        padding: "22px 20px", marginBottom: 14,
                        position: "relative", overflow: "hidden",
                    }}>
                        <div className="s3d-orb" style={{
                            position: "absolute", top: "50%", right: "-10%",
                            width: 220, height: 180,
                            background: "radial-gradient(ellipse, rgba(0,102,255,0.07) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }} />

                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
                            {/* Icon */}
                            <div style={{
                                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                background: "linear-gradient(135deg, #0052CC 0%, #0066FF 100%)",
                                boxShadow: "0 4px 14px rgba(0,102,255,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <FaCloud style={{ fontSize: 18, color: "#fff" }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{
                                    fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{bucketName}</h1>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                    S3 Bucket{details?.region ? ` · ${details.region}` : ''}
                                </div>
                                {hasData && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--muted)", marginTop: 3, opacity: 0.7 }}>
                                        Synced {new Date(dataUpdatedAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>

                            {/* Region pill */}
                            {details?.region && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px",
                                    background: "rgba(0,102,255,0.07)", border: "1px solid rgba(0,102,255,0.18)",
                                    borderRadius: 99, flexShrink: 0,
                                }}>
                                    <FaGlobe style={{ fontSize: 9, color: "var(--accent)" }} />
                                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>
                                        {details.region}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Policy status strip */}
                        {details?.policy_exists !== undefined && (
                            <div style={{
                                marginTop: 14, padding: "8px 12px",
                                background: hasPolicy ? "rgba(0,102,255,0.05)" : "rgba(245,158,11,0.07)",
                                border: `1px solid ${hasPolicy ? "rgba(0,102,255,0.14)" : "rgba(245,158,11,0.18)"}`,
                                borderRadius: 10, display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <FaShieldAlt style={{
                                    fontSize: 10,
                                    color: hasPolicy ? "var(--accent)" : "#F59E0B",
                                    flexShrink: 0,
                                }} />
                                <span style={{
                                    fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500,
                                    color: hasPolicy ? "var(--accent)" : "#F59E0B",
                                }}>
                                    {hasPolicy
                                        ? "Bucket policy active — review permissions for least privilege"
                                        : "No bucket policy — consider adding access control"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="s3d-enter2" style={{
                            display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 14, marginBottom: 14,
                        }}>
                            <FaTimesCircle style={{ fontSize: 14, color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                Failed to retrieve bucket configuration
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="s3d-enter3" style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", padding: "72px 24px",
                            textAlign: "center", position: "relative",
                        }}>
                            <div className="s3d-orb" style={{
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
                                <FaCloud style={{ fontSize: 20, color: "var(--muted)" }} />
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7 }}>
                                No data loaded
                            </div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                                Tap Sync to fetch bucket details
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.3s ease" }}>

                            {/* ── AI Insights ───────────────────────────── */}
                            {hasData && (
                                <div className="s3d-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button onClick={generateAISummary} disabled={isGenerating} className="s3d-press"
                                            style={{
                                                width: "100%", display: "flex", alignItems: "center", gap: 12,
                                                padding: "13px 16px", background: "var(--card)",
                                                border: "1px solid var(--border)", borderRadius: 16,
                                                cursor: "pointer", boxShadow: "var(--s-card)",
                                                textAlign: "left", transition: "box-shadow 0.2s, border-color 0.2s",
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--s-lift)"; e.currentTarget.style.borderColor = "rgba(0,200,117,0.28)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--s-card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                                        >
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.2)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <FaRobot style={{ fontSize: 14, color: "var(--green)" }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.2px" }}>AI Insights</div>
                                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Analyze this bucket with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="s3d-rise" style={{
                                            background: "var(--card)", border: "1px solid var(--border)",
                                            borderRadius: 16, boxShadow: "var(--s-lift)", overflow: "hidden",
                                        }}>
                                            <div style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "13px 15px", borderBottom: "1px solid var(--border)",
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                        background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.2)",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                    }}>
                                                        {isGenerating
                                                            ? <FaSpinner className="s3d-spin" style={{ fontSize: 11, color: "var(--green)" }} />
                                                            : <FaRobot style={{ fontSize: 11, color: "var(--green)" }} />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.2px" }}>AI Insights</div>
                                                        <div style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--muted)" }}>{isGenerating ? "Analyzing…" : "Powered by Gemini"}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => { setShowSummary(false); setAiSummary(null); }}
                                                    style={{
                                                        background: "var(--surface)", border: "1px solid var(--border)",
                                                        borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                                                        fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--muted)",
                                                    }}>Done</button>
                                            </div>
                                            <div style={{ padding: "14px 15px" }}>
                                                {isGenerating ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                        {[90, 72, 55].map((w, i) => (
                                                            <div key={i} className="s3d-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="s3d-insight" style={{ display: "flex", alignItems: "flex-start", gap: 11, animationDelay: `${i * 0.09}s` }}>
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                                                    background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.2)",
                                                                    display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                                                                }}>
                                                                    <span style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, color: "var(--green)" }}>{i + 1}</span>
                                                                </div>
                                                                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 400, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0, flex: 1 }}>{insight}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Configuration card ────────────────────── */}
                            <div className="s3d-enter4" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader label="Configuration" />
                                <S3Row icon={<FaCloud  style={{ fontSize: 11, color: "var(--muted)" }} />} label="Name"   value={details?.name} />
                                <S3Row icon={<FaGlobe  style={{ fontSize: 11, color: "var(--muted)" }} />} label="Region" value={details?.region} last={!details} />
                                {/* Bucket Policy row */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", gap: 12,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>Bucket Policy</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                        <span style={{
                                            fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                                            color: hasPolicy ? "var(--green)" : "#EF4444",
                                        }}>{hasPolicy ? "Active" : "None"}</span>
                                        <div style={{
                                            width: 7, height: 7, borderRadius: "50%",
                                            background: hasPolicy ? "var(--green)" : "#EF4444",
                                            boxShadow: hasPolicy ? "0 0 6px rgba(0,200,117,0.5)" : "0 0 6px rgba(239,68,68,0.4)",
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Policy advisory card ──────────────────── */}
                            {details?.policy_exists !== undefined && (
                                <div className="s3d-enter5" style={{
                                    background: "var(--card)", border: "1px solid var(--border)",
                                    borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden",
                                }}>
                                    <SectionHeader
                                        icon={<FaLock style={{ fontSize: 10, color: "var(--muted)" }} />}
                                        label="Security Advisory"
                                    />
                                    <div style={{ padding: "16px" }}>
                                        <div style={{
                                            padding: "13px 14px",
                                            background: hasPolicy ? "rgba(0,200,117,0.06)" : "rgba(245,158,11,0.06)",
                                            border: `1px solid ${hasPolicy ? "rgba(0,200,117,0.18)" : "rgba(245,158,11,0.18)"}`,
                                            borderRadius: 12,
                                            display: "flex", alignItems: "flex-start", gap: 11,
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                background: hasPolicy ? "rgba(0,200,117,0.12)" : "rgba(245,158,11,0.12)",
                                                border: `1px solid ${hasPolicy ? "rgba(0,200,117,0.22)" : "rgba(245,158,11,0.22)"}`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                marginTop: 1,
                                            }}>
                                                {hasPolicy
                                                    ? <FaCheckCircle style={{ fontSize: 12, color: "var(--green)" }} />
                                                    : <FaTimesCircle style={{ fontSize: 12, color: "#F59E0B" }} />
                                                }
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                                                    color: hasPolicy ? "var(--green)" : "#92400E",
                                                    marginBottom: 4,
                                                }}>
                                                    {hasPolicy ? "Bucket Policy Active" : "No Bucket Policy"}
                                                </div>
                                                <div style={{
                                                    fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.6,
                                                    color: hasPolicy ? "var(--ink-soft)" : "#78350F",
                                                }}>
                                                    {hasPolicy
                                                        ? "Review policy permissions to ensure least-privilege access is enforced."
                                                        : "Consider adding a bucket policy to restrict access and enforce security controls."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ── Sub-components ────────────────────────────────────────────────

const SectionHeader = ({ label, icon }) => (
    <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "11px 16px", borderBottom: "1px solid var(--border)",
        background: "rgba(10,15,30,0.018)",
    }}>
        {icon}
        <span style={{
            fontFamily: "var(--font-body)", fontSize: 10.5, fontWeight: 700,
            color: "var(--muted)", letterSpacing: "0.8px", textTransform: "uppercase",
        }}>{label}</span>
    </div>
);

const S3Row = ({ icon, label, value, last }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", gap: 12,
        borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {icon}
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>{label}</span>
        </div>
        <span style={{
            fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
            flexShrink: 0, maxWidth: "55%",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textAlign: "right",
        }}>{value || '—'}</span>
    </div>
);

export default S3Details;