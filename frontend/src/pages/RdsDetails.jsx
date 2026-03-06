import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaDatabase, FaGlobe, FaCheckCircle, FaExclamationCircle,
    FaLock, FaNetworkWired, FaHdd, FaTag, FaShieldAlt, FaSync,
    FaTimesCircle, FaRobot, FaSpinner, FaCircle
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * RDSDetails — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 */

const RDSDetails = () => {
    const { instanceId: rawId, region } = useParams();
    const navigate = useNavigate();

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['rdsInstanceDetails', rawId, region],
        queryFn: async () => {
            const id = rawId.split('_')[0];
            const url = new URL(`${import.meta.env.VITE_API_URL}/aws/rds/details`);
            url.searchParams.append('instance_id', id);
            url.searchParams.append('region', region);
            const res = await secureFetch(url.toString());
            if (!res.ok) throw new Error(`Failed to fetch RDS instance details: ${res.statusText}`);
            return res.json();
        },
        enabled: false,
        staleTime: Infinity,
    });

    const hasData = !!details && !details.error;

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'available':    return <FaCheckCircle className="text-green-500" />;
            case 'modifying':
            case 'maintenance':  return <FaExclamationCircle className="text-yellow-500" />;
            default:             return <FaCircle className="text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'available':    return 'text-green-600 bg-green-100';
            case 'modifying':
            case 'maintenance':  return 'text-yellow-600 bg-yellow-100';
            default:             return 'text-gray-600 bg-gray-100';
        }
    };

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const rdsData = {
                identifier: details?.core?.db_instance_identifier,
                engine: details?.core?.engine,
                status: details?.core?.status,
                instance_class: details?.core?.db_instance_class,
                multi_az: details?.core?.multi_az,
                storage_encrypted: details?.core?.storage_encrypted,
                region: details?.core?.region,
                backup_days: details?.performance?.backup_retention_days,
            };

            const prompt = `Analyze this RDS database instance configuration and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

RDS Instance Details:
${JSON.stringify(rdsData, null, 2)}

Focus on:
- High availability (Multi-AZ) status
- Security configuration (encryption, IAM auth)
- Backup and maintenance optimization

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
                    `${rawId} configuration analyzed`,
                    'Review Multi-AZ deployment for high availability',
                    'Verify encryption status and backup retention period',
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const multiAZ = details?.core?.multi_az;
            const encrypted = details?.core?.storage_encrypted;
            const status = details?.core?.status;
            setAiSummary([
                `${rawId} is ${status || 'unknown'}`,
                multiAZ ? 'Multi-AZ enabled - high availability configured' : 'Single-AZ - consider Multi-AZ for production',
                encrypted ? 'Storage encrypted ✓' : 'No encryption detected ⚠️',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };
    // ── End logic ────────────────────────────────────────────────────

    const status = details?.core?.status;
    const statusCfg = (s) => {
        const sl = s?.toLowerCase();
        if (sl === 'available')                     return { color: '#00C875', bg: 'rgba(0,200,117,0.1)',  border: 'rgba(0,200,117,0.22)',  pulse: true  };
        if (sl === 'modifying' || sl === 'maintenance') return { color: '#0066FF', bg: 'rgba(0,102,255,0.1)',  border: 'rgba(0,102,255,0.22)',  pulse: false };
        return                                             { color: '#8A95A8', bg: 'rgba(138,149,168,0.1)', border: 'rgba(138,149,168,0.22)', pulse: false };
    };
    const st = statusCfg(status);

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

                .rd, .rd * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes rd-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .rd-enter  { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .rd-enter2 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .rd-enter3 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .rd-enter4 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .rd-enter5 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
                .rd-enter6 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
                .rd-enter7 { animation: rd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.36s both; }

                .rd-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes rd-spin { to { transform:rotate(360deg); } }
                .rd-spin { animation: rd-spin 0.75s linear infinite; }

                @keyframes rd-pulse {
                    0%,100% { opacity:1;   transform:scale(1);    }
                    50%      { opacity:0.4; transform:scale(0.82); }
                }
                .rd-pulse { animation: rd-pulse 2s ease-in-out infinite; }

                @keyframes rd-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .rd-rise { animation: rd-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes rd-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .rd-insight { animation: rd-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes rd-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .rd-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: rd-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes rd-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .rd-orb { animation: rd-orb 8s ease-in-out infinite; }
            `}</style>

            <div className="rd" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync ───────────────────────────────────── */}
                    <div className="rd-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                    }}>
                        <button onClick={() => navigate(-1)} className="rd-press"
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}>
                            <FaArrowLeft style={{ fontSize: 11, color: "var(--accent)" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Back</span>
                        </button>

                        <button onClick={() => refetch()} disabled={isFetching} className="rd-press"
                            style={{
                                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                                background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                                border: isFetching ? "1.5px solid rgba(0,200,117,0.3)" : "1.5px solid transparent",
                                borderRadius: 99, cursor: isFetching ? "default" : "pointer",
                                boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                                transition: "all 0.22s ease",
                            }}>
                            <FaSync className={isFetching ? "rd-spin" : ""} style={{ fontSize: 10, color: isFetching ? "var(--green)" : "#fff" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: isFetching ? "var(--green)" : "#fff" }}>
                                {isFetching ? "Syncing" : "Sync"}
                            </span>
                        </button>
                    </div>

                    {/* ── Hero header ───────────────────────────────────── */}
                    <div className="rd-enter2" style={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 20, boxShadow: "var(--s-lift)",
                        padding: "22px 20px", marginBottom: 14,
                        position: "relative", overflow: "hidden",
                    }}>
                        <div className="rd-orb" style={{
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
                                <FaDatabase style={{ fontSize: 18, color: "#fff" }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{
                                    fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{rawId}</h1>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                    RDS Database Instance{region ? ` · ${region}` : ''}
                                </div>
                                {hasData && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--muted)", marginTop: 3, opacity: 0.7 }}>
                                        Synced {new Date(dataUpdatedAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>

                            {/* Status pill */}
                            {status && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px", background: st.bg,
                                    border: `1px solid ${st.border}`, borderRadius: 99, flexShrink: 0,
                                }}>
                                    {st.pulse && (
                                        <div className="rd-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                                    )}
                                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: st.color }}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Engine + instance class strip */}
                        {(details?.core?.engine || details?.core?.db_instance_class) && (
                            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {details?.core?.engine && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.14)",
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaDatabase style={{ fontSize: 10, color: "var(--accent)", flexShrink: 0 }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>
                                            {details.core.engine}
                                        </span>
                                    </div>
                                )}
                                {details?.core?.db_instance_class && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(10,15,30,0.03)", border: "1px solid var(--border)",
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaHdd style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}>
                                            {details.core.db_instance_class}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="rd-enter2" style={{
                            display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 14, marginBottom: 14,
                        }}>
                            <FaTimesCircle style={{ fontSize: 14, color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                Failed to retrieve RDS instance details
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="rd-enter3" style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", padding: "72px 24px",
                            textAlign: "center", position: "relative",
                        }}>
                            <div className="rd-orb" style={{
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
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7 }}>
                                No data loaded
                            </div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                                Tap Sync to fetch instance details
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.3s ease" }}>

                            {/* ── AI Insights ───────────────────────────── */}
                            {hasData && (
                                <div className="rd-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button onClick={generateAISummary} disabled={isGenerating} className="rd-press"
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
                                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Analyze this RDS instance with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="rd-rise" style={{
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
                                                            ? <FaSpinner className="rd-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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
                                                            <div key={i} className="rd-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="rd-insight" style={{ display: "flex", alignItems: "flex-start", gap: 11, animationDelay: `${i * 0.09}s` }}>
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

                            {/* ── Core Configuration card ───────────────── */}
                            <div className="rd-enter4" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader label="Core Configuration" />
                                <RdRow icon={<FaDatabase     style={{ fontSize: 11, color: "var(--muted)" }} />} label="Engine"           value={details?.core?.engine} />
                                <RdRow icon={<FaDatabase     style={{ fontSize: 11, color: "var(--muted)" }} />} label="Instance Class"   value={details?.core?.db_instance_class} />
                                <RdRow icon={<FaGlobe        style={{ fontSize: 11, color: "var(--muted)" }} />} label="Region"           value={details?.core?.region} />
                                {/* Status row */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", gap: 12, borderBottom: "1px solid var(--border)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {getStatusIcon(status)}
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>Status</span>
                                    </div>
                                    {status && (
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: 5,
                                            padding: "3px 10px", background: st.bg,
                                            border: `1px solid ${st.border}`, borderRadius: 99,
                                        }}>
                                            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: st.color, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                                                {status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {/* Endpoint address */}
                                {details?.networking?.address && (
                                    <div style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                            <FaNetworkWired style={{ fontSize: 11, color: "var(--muted)" }} />
                                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>Endpoint Address</span>
                                        </div>
                                        <span style={{
                                            fontFamily: "'Plus Jakarta Sans', monospace",
                                            fontSize: 11, fontWeight: 500, color: "var(--accent)",
                                            background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.14)",
                                            borderRadius: 8, padding: "7px 11px",
                                            display: "block", wordBreak: "break-all", lineHeight: 1.6,
                                        }}>{details.networking.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Security & HA card ────────────────────── */}
                            <div className="rd-enter5" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader icon={<FaShieldAlt style={{ fontSize: 10, color: "var(--muted)" }} />} label="Security & High Availability" />
                                <BoolRow icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />} label="Multi-AZ"         active={details?.core?.multi_az} />
                                <BoolRow icon={<FaLock      style={{ fontSize: 11, color: "var(--muted)" }} />} label="Storage Encrypted" active={details?.core?.storage_encrypted} />
                                <BoolRow icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />} label="IAM DB Auth"       active={details?.core?.iam_database_authentication_enabled} last />
                            </div>

                            {/* ── Storage & Performance card ────────────── */}
                            <div className="rd-enter6" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader icon={<FaHdd style={{ fontSize: 10, color: "var(--muted)" }} />} label="Storage & Performance" />
                                <RdRow icon={<FaHdd style={{ fontSize: 11, color: "var(--muted)" }} />} label="Storage Type"       value={details?.core?.storage_type} />
                                <RdRow icon={<FaHdd style={{ fontSize: 11, color: "var(--muted)" }} />} label="Allocated Storage"  value={`${details?.core?.allocated_storage_gb || 0} GB`} />
                                <RdRow icon={<FaHdd style={{ fontSize: 11, color: "var(--muted)" }} />} label="IOPS"               value={details?.performance?.iops || '—'} />
                                <RdRow icon={<FaHdd style={{ fontSize: 11, color: "var(--muted)" }} />} label="Backup Retention"   value={`${details?.performance?.backup_retention_days || 0} days`} last />
                            </div>

                            {/* ── Tags card ─────────────────────────────── */}
                            {details?.tags?.tags?.length > 0 && (
                                <div className="rd-enter7" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden" }}>
                                    <SectionHeader icon={<FaTag style={{ fontSize: 10, color: "var(--muted)" }} />} label={`Tags (${details.tags.tags.length})`} />
                                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                                        {details.tags.tags.map((tag, i, arr) => (
                                            <div key={i} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "11px 16px", gap: 12,
                                                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                                            }}>
                                                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", flexShrink: 0 }}>{tag.Key}</span>
                                                <span style={{
                                                    fontFamily: "'Plus Jakarta Sans', monospace",
                                                    fontSize: 11, fontWeight: 500, color: "var(--muted)",
                                                    background: "rgba(10,15,30,0.03)", border: "1px solid var(--border)",
                                                    borderRadius: 6, padding: "3px 8px",
                                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "55%",
                                                }}>{tag.Value}</span>
                                            </div>
                                        ))}
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

const RdRow = ({ icon, label, value, last }) => (
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
        }}>{value ?? '—'}</span>
    </div>
);

const BoolRow = ({ icon, label, active, last }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", gap: 12,
        borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {icon}
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
                fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                color: active ? "var(--green)" : "#EF4444",
            }}>{active ? "Yes" : "No"}</span>
            <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: active ? "var(--green)" : "#EF4444",
                boxShadow: active ? "0 0 6px rgba(0,200,117,0.5)" : "0 0 6px rgba(239,68,68,0.4)",
            }} />
        </div>
    </div>
);

export default RDSDetails;