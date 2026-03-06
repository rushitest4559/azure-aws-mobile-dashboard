import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaCube, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner, FaNetworkWired
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * EksDetails — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 */

const EksDetails = () => {
    const { clusterName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const region = searchParams.get('region') || 'unknown';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['eksDetails', clusterName, region],
        queryFn: async () => {
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/aws/eks/details?name=${clusterName}&region=${region}`
            );
            if (!res.ok) throw new Error(`Failed to fetch EKS details: ${res.statusText}`);
            return res.json();
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
            const clusterData = {
                name: clusterName,
                region: details?.core?.region,
                status: details?.core?.status,
                version: details?.core?.version,
                endpoint: details?.core?.endpoint,
                vpc_id: details?.networking?.vpc_id,
                endpoint_public_access: details?.networking?.endpoint_public_access,
                endpoint_private_access: details?.networking?.endpoint_private_access,
                subnets: details?.networking?.subnet_ids?.length,
                security_groups: details?.networking?.cluster_security_group_ids?.length,
            };

            const prompt = `Analyze this EKS cluster configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

EKS Cluster Details:
${JSON.stringify(clusterData, null, 2)}

Focus on:
- Cluster status and accessibility
- Networking configuration (public/private endpoints)
- Version and upgrade recommendations
- Security and VPC considerations

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
                    text.trim() || `${clusterName} analyzed successfully`,
                    'Review endpoint access configuration for security',
                    'Consider Kubernetes version upgrades for latest features',
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const isActive = details?.core?.status?.toLowerCase() === 'active';
            const publicAccess = details?.networking?.endpoint_public_access;
            const version = details?.core?.version;
            setAiSummary([
                `${clusterName} is ${isActive ? 'active' : details?.core?.status?.toLowerCase() || 'unknown status'}`,
                publicAccess ? 'Public endpoint enabled - review security groups' : 'Private endpoint configuration',
                version ? `Kubernetes version: ${version}` : 'Version information unavailable',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };
    // ── End logic ────────────────────────────────────────────────────

    const status = details?.core?.status;
    const statusCfg = (s) => {
        const sl = s?.toLowerCase();
        if (sl === 'active')   return { color: '#00C875', bg: 'rgba(0,200,117,0.1)',  border: 'rgba(0,200,117,0.22)',  pulse: true  };
        if (sl === 'creating') return { color: '#0066FF', bg: 'rgba(0,102,255,0.1)',  border: 'rgba(0,102,255,0.22)',  pulse: false };
        return                        { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', pulse: false };
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

                .xd, .xd * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes xd-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .xd-enter  { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .xd-enter2 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .xd-enter3 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .xd-enter4 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .xd-enter5 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
                .xd-enter6 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
                .xd-enter7 { animation: xd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.36s both; }

                .xd-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes xd-spin { to { transform:rotate(360deg); } }
                .xd-spin { animation: xd-spin 0.75s linear infinite; }

                @keyframes xd-pulse {
                    0%,100% { opacity:1;   transform:scale(1);    }
                    50%      { opacity:0.4; transform:scale(0.82); }
                }
                .xd-pulse { animation: xd-pulse 2s ease-in-out infinite; }

                @keyframes xd-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .xd-rise { animation: xd-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes xd-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .xd-insight { animation: xd-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes xd-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .xd-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: xd-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes xd-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .xd-orb { animation: xd-orb 8s ease-in-out infinite; }
            `}</style>

            <div className="xd" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync bar ───────────────────────────────── */}
                    <div className="xd-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="xd-press"
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
                        >
                            <FaArrowLeft style={{ fontSize: 11, color: "var(--accent)" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.1px" }}>Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="xd-press"
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "8px 16px",
                                background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                                border: isFetching ? "1.5px solid rgba(0,200,117,0.3)" : "1.5px solid transparent",
                                borderRadius: 99,
                                cursor: isFetching ? "default" : "pointer",
                                boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                                transition: "all 0.22s ease",
                            }}
                        >
                            <FaSync className={isFetching ? "xd-spin" : ""} style={{ fontSize: 10, color: isFetching ? "var(--green)" : "#fff" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: isFetching ? "var(--green)" : "#fff" }}>
                                {isFetching ? "Syncing" : "Sync"}
                            </span>
                        </button>
                    </div>

                    {/* ── Hero header ───────────────────────────────────── */}
                    <div className="xd-enter2" style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        boxShadow: "var(--s-lift)",
                        padding: "22px 20px",
                        marginBottom: 14,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        <div className="xd-orb" style={{
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
                                <FaCube style={{ fontSize: 18, color: "#fff" }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px",
                                    margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{clusterName}</h1>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                    EKS Cluster · {region}
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
                                    padding: "4px 10px",
                                    background: st.bg, border: `1px solid ${st.border}`,
                                    borderRadius: 99, flexShrink: 0,
                                }}>
                                    {st.pulse && (
                                        <div className="xd-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                                    )}
                                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: st.color }}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* K8s version + endpoint access strip */}
                        {(details?.core?.version || details?.networking?.endpoint_public_access !== undefined) && (
                            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {details?.core?.version && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.14)",
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaCube style={{ fontSize: 10, color: "var(--accent)", flexShrink: 0 }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>
                                            K8s {details.core.version}
                                        </span>
                                    </div>
                                )}
                                {details?.networking?.endpoint_public_access !== undefined && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: details.networking.endpoint_public_access
                                            ? "rgba(245,158,11,0.07)" : "rgba(0,200,117,0.07)",
                                        border: `1px solid ${details.networking.endpoint_public_access
                                            ? "rgba(245,158,11,0.18)" : "rgba(0,200,117,0.18)"}`,
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaLock style={{
                                            fontSize: 10,
                                            color: details.networking.endpoint_public_access ? "#F59E0B" : "var(--green)",
                                            flexShrink: 0,
                                        }} />
                                        <span style={{
                                            fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500,
                                            color: details.networking.endpoint_public_access ? "#F59E0B" : "var(--green)",
                                        }}>
                                            {details.networking.endpoint_public_access ? "Public Endpoint" : "Private Endpoint"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="xd-enter2" style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "14px 16px",
                            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 14, marginBottom: 14,
                        }}>
                            <FaTimesCircle style={{ fontSize: 14, color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                Failed to retrieve cluster configuration
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="xd-enter3" style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            padding: "72px 24px", textAlign: "center", position: "relative",
                        }}>
                            <div className="xd-orb" style={{
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
                                <FaCube style={{ fontSize: 20, color: "var(--muted)" }} />
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7 }}>
                                No data loaded
                            </div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                                Tap Sync to fetch cluster details
                            </div>
                        </div>
                    ) : (
                        <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.3s ease" }}>

                            {/* ── AI Insights ───────────────────────────── */}
                            {hasData && (
                                <div className="xd-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button
                                            onClick={generateAISummary}
                                            disabled={isGenerating}
                                            className="xd-press"
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
                                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Analyze this cluster with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="xd-rise" style={{
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
                                                            ? <FaSpinner className="xd-spin" style={{ fontSize: 11, color: "var(--green)" }} />
                                                            : <FaRobot style={{ fontSize: 11, color: "var(--green)" }} />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.2px" }}>AI Insights</div>
                                                        <div style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--muted)" }}>{isGenerating ? "Analyzing…" : "Powered by Gemini"}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setShowSummary(false); setAiSummary(null); }}
                                                    style={{
                                                        background: "var(--surface)", border: "1px solid var(--border)",
                                                        borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                                                        fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--muted)",
                                                    }}
                                                >Done</button>
                                            </div>
                                            <div style={{ padding: "14px 15px" }}>
                                                {isGenerating ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                        {[90, 72, 55].map((w, i) => (
                                                            <div key={i} className="xd-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="xd-insight" style={{ display: "flex", alignItems: "flex-start", gap: 11, animationDelay: `${i * 0.09}s` }}>
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
                            <div className="xd-enter4" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader label="Configuration" />
                                <XdRow icon={<FaGlobe     style={{ fontSize: 11, color: "var(--muted)" }} />} label="Region"           value={details?.core?.region} />
                                <XdRow icon={<FaCube      style={{ fontSize: 11, color: "var(--muted)" }} />} label="Version"          value={details?.core?.version} />
                                <XdRow icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />} label="Platform Version" value={details?.core?.platform_version} />
                                <XdRow icon={<FaNetworkWired style={{ fontSize: 11, color: "var(--muted)" }} />} label="VPC ID"        value={details?.networking?.vpc_id || 'Unknown'} last />
                            </div>

                            {/* ── Networking card ───────────────────────── */}
                            <div className="xd-enter5" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader icon={<FaNetworkWired style={{ fontSize: 10, color: "var(--muted)" }} />} label="Networking" />
                                <SecurityXdRow label="Public Endpoint"  active={details?.networking?.endpoint_public_access} />
                                <SecurityXdRow label="Private Endpoint" active={details?.networking?.endpoint_private_access} />
                                <XdRow icon={<FaGlobe     style={{ fontSize: 11, color: "var(--muted)" }} />} label="Subnets"        value={details?.networking?.subnet_ids?.length || 0} />
                                <XdRow icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />} label="Security Groups" value={details?.networking?.cluster_security_group_ids?.length || 0} last />
                            </div>

                            {/* ── API Endpoint card ─────────────────────── */}
                            {details?.core?.endpoint && (
                                <div className="xd-enter6" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                    <SectionHeader icon={<FaGlobe style={{ fontSize: 10, color: "var(--muted)" }} />} label="API Endpoint" />
                                    <div style={{ padding: "14px 16px" }}>
                                        <span style={{
                                            fontFamily: "'Plus Jakarta Sans', monospace",
                                            fontSize: 11, fontWeight: 500, color: "var(--accent)",
                                            background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.14)",
                                            borderRadius: 8, padding: "8px 12px",
                                            display: "block", wordBreak: "break-all", lineHeight: 1.6,
                                        }}>{details.core.endpoint}</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Tags card ─────────────────────────────── */}
                            <div className="xd-enter7" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden" }}>
                                <SectionHeader icon={<FaTag style={{ fontSize: 10, color: "var(--muted)" }} />} label="Resource Tags" />
                                <div style={{ padding: "14px 16px" }}>
                                    {Object.keys(details?.tags?.tags || {}).length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                            {Object.entries(details.tags.tags).map(([key, value]) => (
                                                <span key={key} style={{
                                                    display: "inline-flex", alignItems: "center",
                                                    padding: "4px 10px", borderRadius: 99,
                                                    fontSize: 11.5, fontWeight: 600,
                                                    fontFamily: "var(--font-body)",
                                                    background: "rgba(10,15,30,0.04)",
                                                    border: "1px solid var(--border)",
                                                    color: "var(--ink-soft)",
                                                }}>
                                                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>{key}:</span>
                                                    &nbsp;{value}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>
                                            No tags assigned
                                        </div>
                                    )}
                                </div>
                            </div>

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
        padding: "11px 16px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,15,30,0.018)",
    }}>
        {icon}
        <span style={{
            fontFamily: "var(--font-body)",
            fontSize: 10.5, fontWeight: 700,
            color: "var(--muted)", letterSpacing: "0.8px", textTransform: "uppercase",
        }}>{label}</span>
    </div>
);

const XdRow = ({ icon, label, value, last }) => (
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
            fontFamily: "var(--font-display)",
            fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
            flexShrink: 0, maxWidth: "55%",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            textAlign: "right",
        }}>{value ?? '—'}</span>
    </div>
);

const SecurityXdRow = ({ label, active }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", gap: 12,
        borderBottom: "1px solid var(--border)",
    }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
                fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                color: active ? "var(--green)" : "#EF4444",
            }}>{active ? "Enabled" : "Disabled"}</span>
            <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: active ? "var(--green)" : "#EF4444",
                boxShadow: active ? "0 0 6px rgba(0,200,117,0.5)" : "0 0 6px rgba(239,68,68,0.4)",
            }} />
        </div>
    </div>
);

export default EksDetails;