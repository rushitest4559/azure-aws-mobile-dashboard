import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaServer, FaGlobe, FaPlay, FaPause, FaNetworkWired,
    FaHdd, FaTag, FaShieldAlt, FaSync, FaCheckCircle, FaTimesCircle,
    FaRobot, FaSpinner, FaCircle
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * EC2Details — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 */

const EC2Details = () => {
    const { instanceId } = useParams();
    const navigate = useNavigate();

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['ec2InstanceDetails', instanceId],
        queryFn: async () => {
            const [id, region] = instanceId.split('_');
            const url = new URL(`${import.meta.env.VITE_API_URL}/aws/ec2/details`);
            url.searchParams.append('instance_id', id || instanceId);
            url.searchParams.append('region', region || 'us-east-1');
            const res = await secureFetch(url.toString());
            if (!res.ok) throw new Error(`Failed to fetch EC2 instance details: ${res.statusText}`);
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
            const instanceData = {
                instance_id: details?.core?.instance_id,
                state: details?.core?.state,
                type: details?.core?.instance_type,
                region: details?.core?.region,
                public_ip: details?.networking?.public_ip,
                vpc_id: details?.networking?.vpc_id,
                security_groups: details?.vpc?.security_groups?.length || 0,
                tags_count: Object.keys(details?.tags || {}).length,
            };

            const prompt = `Analyze this EC2 instance configuration and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

EC2 Instance Details:
${JSON.stringify(instanceData, null, 2)}

Focus on:
- Instance state and cost optimization
- Networking configuration security
- Instance sizing recommendations

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
                    `${instanceId} analyzed successfully`,
                    'Review security group rules for least privilege access',
                    'Consider instance right-sizing for cost optimization',
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const state = details?.core?.state;
            const publicIp = details?.networking?.public_ip;
            const sgCount = details?.vpc?.security_groups?.length || 0;
            setAiSummary([
                `${instanceId} is ${state || 'unknown'}`,
                publicIp ? 'Public IP exposed - review security groups' : 'Private instance - good for security',
                sgCount > 0 ? `${sgCount} security group(s) configured` : 'No security groups assigned',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    const getStateIcon = (state) => {
        switch (state?.toLowerCase()) {
            case 'running': return <FaPlay className="text-green-500" />;
            case 'stopped': return <FaPause className="text-orange-500" />;
            default: return <FaCircle className="text-gray-400" />;
        }
    };

    const getStateColor = (state) => {
        switch (state?.toLowerCase()) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'stopped': return 'text-orange-600 bg-orange-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };
    // ── End logic ────────────────────────────────────────────────────

    const state = details?.core?.state;
    const isRunning = state?.toLowerCase() === 'running';
    const stateColor  = isRunning ? '#00C875' : '#F59E0B';
    const stateBg     = isRunning ? 'rgba(0,200,117,0.1)'  : 'rgba(245,158,11,0.1)';
    const stateBorder = isRunning ? 'rgba(0,200,117,0.22)' : 'rgba(245,158,11,0.22)';

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

                .ed, .ed * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes ed-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .ed-enter  { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .ed-enter2 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .ed-enter3 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .ed-enter4 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .ed-enter5 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
                .ed-enter6 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
                .ed-enter7 { animation: ed-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.36s both; }

                .ed-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes ed-spin { to { transform:rotate(360deg); } }
                .ed-spin { animation: ed-spin 0.75s linear infinite; }

                @keyframes ed-pulse {
                    0%,100% { opacity:1;   transform:scale(1);    }
                    50%      { opacity:0.4; transform:scale(0.82); }
                }
                .ed-pulse { animation: ed-pulse 2s ease-in-out infinite; }

                @keyframes ed-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .ed-rise { animation: ed-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes ed-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .ed-insight { animation: ed-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes ed-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .ed-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: ed-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes ed-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .ed-orb { animation: ed-orb 8s ease-in-out infinite; }

                .ed-tag {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 99px;
                    font-size: 11.5px;
                    font-weight: 600;
                    font-family: var(--font-body);
                    letter-spacing: 0.1px;
                }
            `}</style>

            <div className="ed" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync bar ───────────────────────────────── */}
                    <div className="ed-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="ed-press"
                            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
                        >
                            <FaArrowLeft style={{ fontSize: 11, color: "var(--accent)" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.1px" }}>Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="ed-press"
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
                            <FaSync className={isFetching ? "ed-spin" : ""} style={{ fontSize: 10, color: isFetching ? "var(--green)" : "#fff" }} />
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: isFetching ? "var(--green)" : "#fff" }}>
                                {isFetching ? "Syncing" : "Sync"}
                            </span>
                        </button>
                    </div>

                    {/* ── Hero header ───────────────────────────────────── */}
                    <div className="ed-enter2" style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        boxShadow: "var(--s-lift)",
                        padding: "22px 20px",
                        marginBottom: 14,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        <div className="ed-orb" style={{
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
                                <FaServer style={{ fontSize: 18, color: "#fff" }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px",
                                    margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{instanceId}</h1>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                    EC2 Instance
                                    {details?.core?.region ? ` · ${details.core.region}` : ''}
                                </div>
                                {hasData && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--muted)", marginTop: 3, opacity: 0.7 }}>
                                        Synced {new Date(dataUpdatedAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>

                            {/* State pill */}
                            {state && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px",
                                    background: stateBg, border: `1px solid ${stateBorder}`,
                                    borderRadius: 99, flexShrink: 0,
                                }}>
                                    {isRunning && (
                                        <div className="ed-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: stateColor, flexShrink: 0 }} />
                                    )}
                                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: stateColor }}>
                                        {state}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Instance type + AZ strip */}
                        {(details?.core?.instance_type || details?.core?.placement?.availability_zone) && (
                            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {details?.core?.instance_type && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.14)",
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaServer style={{ fontSize: 10, color: "var(--accent)", flexShrink: 0 }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>
                                            {details.core.instance_type}
                                        </span>
                                    </div>
                                )}
                                {details?.core?.placement?.availability_zone && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(10,15,30,0.03)", border: "1px solid var(--border)",
                                        borderRadius: 10, display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaGlobe style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}>
                                            {details.core.placement.availability_zone}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="ed-enter2" style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "14px 16px",
                            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 14, marginBottom: 14,
                        }}>
                            <FaTimesCircle style={{ fontSize: 14, color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                Failed to retrieve instance details
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="ed-enter3" style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            padding: "72px 24px", textAlign: "center", position: "relative",
                        }}>
                            <div className="ed-orb" style={{
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
                                <FaServer style={{ fontSize: 20, color: "var(--muted)" }} />
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
                                <div className="ed-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button
                                            onClick={generateAISummary}
                                            disabled={isGenerating}
                                            className="ed-press"
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
                                                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Analyze this instance with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="ed-rise" style={{
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
                                                            ? <FaSpinner className="ed-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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
                                                            <div key={i} className="ed-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="ed-insight" style={{ display: "flex", alignItems: "flex-start", gap: 11, animationDelay: `${i * 0.09}s` }}>
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
                            <div className="ed-enter4" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader label="Core Configuration" />
                                <EdRow icon={<FaServer style={{ fontSize: 11, color: "var(--muted)" }} />}      label="Instance Type"      value={details?.core?.instance_type} />
                                <EdRow icon={<FaGlobe  style={{ fontSize: 11, color: "var(--muted)" }} />}      label="Region"             value={details?.core?.region} />
                                <EdRow icon={<FaGlobe  style={{ fontSize: 11, color: "var(--muted)" }} />}      label="Availability Zone"  value={details?.core?.placement?.availability_zone} last />
                                {/* State row inline */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", gap: 12,
                                    borderTop: "1px solid var(--border)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {getStateIcon(state)}
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>Status</span>
                                    </div>
                                    {state && (
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: 5,
                                            padding: "3px 10px",
                                            background: stateBg, border: `1px solid ${stateBorder}`,
                                            borderRadius: 99,
                                        }}>
                                            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: stateColor, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                                                {state}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Networking card ───────────────────────── */}
                            <div className="ed-enter5" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                <SectionHeader icon={<FaNetworkWired style={{ fontSize: 10, color: "var(--muted)" }} />} label="Networking" />
                                {/* Public IP highlighted */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "12px 16px", gap: 12,
                                    borderBottom: "1px solid var(--border)",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                        <FaNetworkWired style={{ fontSize: 11, color: "var(--muted)" }} />
                                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>Public IP</span>
                                    </div>
                                    {details?.networking?.public_ip ? (
                                        <span style={{
                                            fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                                            color: "#F59E0B",
                                            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                                            borderRadius: 99, padding: "2px 10px", flexShrink: 0,
                                        }}>{details.networking.public_ip}</span>
                                    ) : (
                                        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>None</span>
                                    )}
                                </div>
                                <EdRow icon={<FaNetworkWired style={{ fontSize: 11, color: "var(--muted)" }} />} label="Private IP"       value={details?.networking?.private_ip || 'None'} />
                                <EdRow icon={<FaNetworkWired style={{ fontSize: 11, color: "var(--muted)" }} />} label="VPC ID"           value={details?.networking?.vpc_id} />
                                <EdRow icon={<FaShieldAlt   style={{ fontSize: 11, color: "var(--muted)" }} />} label="Security Groups" value={details?.vpc?.security_groups?.join(', ') || 'None'} last />
                            </div>

                            {/* ── Storage card ──────────────────────────── */}
                            {details?.storage?.length > 0 && (
                                <div className="ed-enter6" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden", marginBottom: 14 }}>
                                    <SectionHeader icon={<FaHdd style={{ fontSize: 10, color: "var(--muted)" }} />} label={`Block Devices (${details.storage.length})`} />
                                    {details.storage.map((device, index) => (
                                        <div key={index} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "12px 16px", gap: 12,
                                            borderBottom: index < details.storage.length - 1 ? "1px solid var(--border)" : "none",
                                        }}>
                                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", flexShrink: 0 }}>
                                                {device.device_name}
                                            </span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{
                                                    fontFamily: "'Plus Jakarta Sans', monospace",
                                                    fontSize: 11, fontWeight: 500, color: "var(--accent)",
                                                    background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.14)",
                                                    borderRadius: 6, padding: "3px 8px",
                                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 160,
                                                }}>{device.volume_id}</span>
                                                {device.delete_on_termination && (
                                                    <span style={{
                                                        fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600,
                                                        color: "#EF4444", background: "rgba(239,68,68,0.07)",
                                                        border: "1px solid rgba(239,68,68,0.18)", borderRadius: 99, padding: "2px 7px",
                                                        flexShrink: 0,
                                                    }}>Auto-delete</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Tags card ─────────────────────────────── */}
                            {Object.keys(details?.tags || {}).length > 0 && (
                                <div className="ed-enter7" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--s-card)", overflow: "hidden" }}>
                                    <SectionHeader icon={<FaTag style={{ fontSize: 10, color: "var(--muted)" }} />} label={`Tags (${Object.keys(details.tags || {}).length})`} />
                                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                                        {Object.entries(details.tags || {}).map(([key, value], i, arr) => (
                                            <div key={key} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "11px 16px", gap: 12,
                                                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                                            }}>
                                                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", flexShrink: 0 }}>{key}</span>
                                                <span style={{
                                                    fontFamily: "'Plus Jakarta Sans', monospace",
                                                    fontSize: 11, fontWeight: 500,
                                                    color: "var(--muted)",
                                                    background: "rgba(10,15,30,0.03)", border: "1px solid var(--border)",
                                                    borderRadius: 6, padding: "3px 8px",
                                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "55%",
                                                }}>{value}</span>
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

const EdRow = ({ icon, label, value, last }) => (
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
        }}>{value || '—'}</span>
    </div>
);

export default EC2Details;