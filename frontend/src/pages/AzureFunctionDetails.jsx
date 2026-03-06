import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaMicrochip, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner, FaServer
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * AzureFunctionDetails — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 */

const AzureFunctionDetails = () => {
    const { functionName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const resourceGroup = searchParams.get('rg') || 'unknown';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    const subscriptionId = import.meta.env.VITE_AZURE_SUBSCRIPTION_ID;

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['azureFunctionDetails', functionName, resourceGroup],
        queryFn: async () => {
            if (!subscriptionId) throw new Error('Azure subscription ID not configured');
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/azure/functions/details?subscription_id=${subscriptionId}&resource_group=${resourceGroup}&name=${functionName}`
            );
            if (!res.ok) throw new Error(`Failed to fetch Function details: ${res.statusText}`);
            return res.json();
        },
        enabled: false,
        staleTime: Infinity,
    });

    const hasData = !!details;

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const functionData = {
                name: functionName,
                resource_group: resourceGroup,
                location: details?.location,
                kind: details?.kind,
                state: details?.state,
                host_names: details?.host_names,
                enabled: details?.enabled,
                https_only: details?.https_only,
                app_service_plan: details?.app_service_plan,
                sku: details?.sku,
                tags: details?.tags,
            };

            const prompt = `Analyze this Azure Function App configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Function App Details:
${JSON.stringify(functionData, null, 2)}

Focus on:
- Runtime configuration and scaling settings
- Security features (HTTPS only, hostnames)
- App Service Plan optimization
- Cost and performance recommendations

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
                    text.trim() || `${functionName} analyzed successfully`,
                    'Review App Service Plan for cost optimization opportunities',
                    'Consider enabling HTTPS-only for enhanced security',
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const isRunning = details?.state?.toLowerCase() === 'running';
            const httpsOnly = details?.https_only;
            const planName = details?.app_service_plan?.name;
            setAiSummary([
                `${functionName} is ${isRunning ? 'running' : 'stopped'}`,
                httpsOnly ? 'HTTPS-only is enabled for security' : 'Consider enabling HTTPS-only mode',
                planName ? `Running on ${planName} App Service Plan` : 'Review App Service Plan configuration',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };
    // ── End logic ────────────────────────────────────────────────────

    const isRunning = details?.state?.toLowerCase() === 'running';
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
                    --s-deep:   0 16px 48px rgba(10,15,30,0.14);
                }

                .fd, .fd * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes fd-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .fd-enter  { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .fd-enter2 { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .fd-enter3 { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .fd-enter4 { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .fd-enter5 { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
                .fd-enter6 { animation: fd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.30s both; }

                .fd-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes fd-spin { to { transform:rotate(360deg); } }
                .fd-spin { animation: fd-spin 0.75s linear infinite; }

                @keyframes fd-pulse {
                    0%,100% { opacity:1;   transform:scale(1);    }
                    50%      { opacity:0.4; transform:scale(0.82); }
                }
                .fd-pulse { animation: fd-pulse 2s ease-in-out infinite; }

                @keyframes fd-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .fd-rise { animation: fd-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes fd-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .fd-insight { animation: fd-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes fd-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .fd-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: fd-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes fd-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .fd-orb { animation: fd-orb 8s ease-in-out infinite; }

                .fd-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 13px 16px;
                    gap: 12px;
                    transition: background 0.15s ease;
                }
                .fd-row:not(:last-child) {
                    border-bottom: 1px solid var(--border);
                }

                .fd-tag {
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

            <div className="fd" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync bar ───────────────────────────────── */}
                    <div className="fd-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="fd-press"
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "none", border: "none",
                                cursor: "pointer", padding: "6px 0",
                            }}
                        >
                            <FaArrowLeft style={{ fontSize: 11, color: "var(--accent)" }} />
                            <span style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 13, fontWeight: 600,
                                color: "var(--accent)", letterSpacing: "0.1px",
                            }}>Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="fd-press"
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
                            <FaSync
                                className={isFetching ? "fd-spin" : ""}
                                style={{ fontSize: 10, color: isFetching ? "var(--green)" : "#fff" }}
                            />
                            <span style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 12.5, fontWeight: 600,
                                color: isFetching ? "var(--green)" : "#fff",
                            }}>{isFetching ? "Syncing" : "Sync"}</span>
                        </button>
                    </div>

                    {/* ── Hero header ───────────────────────────────────── */}
                    <div className="fd-enter2" style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        boxShadow: "var(--s-lift)",
                        padding: "22px 20px",
                        marginBottom: 14,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        {/* Subtle background orb */}
                        <div className="fd-orb" style={{
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
                                <FaMicrochip style={{ fontSize: 18, color: "#fff" }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px",
                                    margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{functionName}</h1>
                                <div style={{
                                    fontFamily: "var(--font-body)",
                                    fontSize: 12, color: "var(--muted)", marginTop: 4,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>Function App · {resourceGroup}</div>
                                {hasData && (
                                    <div style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 10.5, color: "var(--muted)", marginTop: 3, opacity: 0.7,
                                    }}>Synced {new Date(dataUpdatedAt).toLocaleTimeString()}</div>
                                )}
                            </div>

                            {/* State pill — top right */}
                            {details?.state && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 10px",
                                    background: stateBg,
                                    border: `1px solid ${stateBorder}`,
                                    borderRadius: 99, flexShrink: 0,
                                }}>
                                    {isRunning && (
                                        <div className="fd-pulse" style={{
                                            width: 5, height: 5, borderRadius: "50%",
                                            background: stateColor, flexShrink: 0,
                                        }} />
                                    )}
                                    <span style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 11, fontWeight: 600,
                                        color: stateColor,
                                    }}>{details.state}</span>
                                </div>
                            )}
                        </div>

                        {/* HTTPS indicator strip */}
                        {details?.https_only !== undefined && (
                            <div style={{
                                marginTop: 14,
                                padding: "8px 12px",
                                background: details.https_only ? "rgba(0,200,117,0.07)" : "rgba(245,158,11,0.07)",
                                border: `1px solid ${details.https_only ? "rgba(0,200,117,0.18)" : "rgba(245,158,11,0.18)"}`,
                                borderRadius: 10,
                                display: "flex", alignItems: "center", gap: 8,
                            }}>
                                <FaLock style={{ fontSize: 10, color: details.https_only ? "var(--green)" : "#F59E0B", flexShrink: 0 }} />
                                <span style={{
                                    fontFamily: "var(--font-body)",
                                    fontSize: 11.5, fontWeight: 500,
                                    color: details.https_only ? "var(--green)" : "#F59E0B",
                                }}>{details.https_only ? "HTTPS Only — traffic is encrypted" : "HTTP enabled — consider enforcing HTTPS"}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="fd-enter2" style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "14px 16px",
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 14,
                            marginBottom: 14,
                        }}>
                            <FaTimesCircle style={{ fontSize: 14, color: "#EF4444", marginTop: 1, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                    Failed to retrieve Function configuration
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="fd-enter3" style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            padding: "72px 24px", textAlign: "center",
                            position: "relative",
                        }}>
                            <div className="fd-orb" style={{
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
                                <FaMicrochip style={{ fontSize: 20, color: "var(--muted)" }} />
                            </div>
                            <div style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 16, fontWeight: 700,
                                color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7,
                            }}>No data loaded</div>
                            <div style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 13, color: "var(--muted)", lineHeight: 1.6,
                            }}>Tap Sync to fetch Function details</div>
                        </div>
                    ) : (
                        <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.3s ease" }}>

                            {/* ── AI Insights ───────────────────────────── */}
                            {hasData && (
                                <div className="fd-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button
                                            onClick={generateAISummary}
                                            disabled={isGenerating}
                                            className="fd-press"
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
                                                }}>Analyze this Function App with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                 stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="fd-rise" style={{
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
                                                            ? <FaSpinner className="fd-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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
                                                            <div key={i} className="fd-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="fd-insight"
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

                            {/* ── Configuration card ────────────────────── */}
                            <div className="fd-enter4" style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                boxShadow: "var(--s-card)",
                                overflow: "hidden",
                                marginBottom: 14,
                            }}>
                                <SectionHeader label="Configuration" />
                                <FdRow
                                    icon={<FaGlobe style={{ fontSize: 11, color: "var(--muted)" }} />}
                                    label="Location"
                                    value={details?.location}
                                />
                                <FdRow
                                    icon={<FaMicrochip style={{ fontSize: 11, color: "var(--muted)" }} />}
                                    label="Kind"
                                    value={details?.kind}
                                />
                                <FdRow
                                    icon={<FaServer style={{ fontSize: 11, color: "var(--muted)" }} />}
                                    label="App Service Plan"
                                    value={details?.app_service_plan?.name || 'Unknown'}
                                />
                                <FdRow
                                    icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />}
                                    label="SKU"
                                    value={details?.sku?.name || 'Dynamic'}
                                    last
                                />
                            </div>

                            {/* ── Security card ─────────────────────────── */}
                            <div className="fd-enter4" style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                boxShadow: "var(--s-card)",
                                overflow: "hidden",
                                marginBottom: 14,
                            }}>
                                <SectionHeader icon={<FaLock style={{ fontSize: 10, color: "var(--muted)" }} />} label="Security" />
                                <SecurityFdRow label="Enabled"    active={details?.enabled} />
                                <SecurityFdRow label="HTTPS Only" active={details?.https_only} last />
                            </div>

                            {/* ── Hostnames card ────────────────────────── */}
                            <div className="fd-enter5" style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                boxShadow: "var(--s-card)",
                                overflow: "hidden",
                                marginBottom: 14,
                            }}>
                                <SectionHeader icon={<FaGlobe style={{ fontSize: 10, color: "var(--muted)" }} />} label="Host Names" />
                                <div style={{ padding: "14px 16px" }}>
                                    {details?.host_names?.length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                            {details.host_names.map((host, i) => (
                                                <span key={i} className="fd-tag" style={{
                                                    background: "rgba(0,102,255,0.07)",
                                                    border: "1px solid rgba(0,102,255,0.15)",
                                                    color: "var(--accent)",
                                                }}>{host}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            fontFamily: "var(--font-body)",
                                            fontSize: 13, color: "var(--muted)",
                                            textAlign: "center", padding: "12px 0",
                                        }}>No custom hostnames</div>
                                    )}
                                </div>
                            </div>

                            {/* ── Tags card ─────────────────────────────── */}
                            <div className="fd-enter6" style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                boxShadow: "var(--s-card)",
                                overflow: "hidden",
                            }}>
                                <SectionHeader icon={<FaTag style={{ fontSize: 10, color: "var(--muted)" }} />} label="Resource Tags" />
                                <div style={{ padding: "14px 16px" }}>
                                    {Object.keys(details?.tags || {}).length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                            {Object.entries(details.tags).map(([key, value]) => (
                                                <span key={key} className="fd-tag" style={{
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
                                        <div style={{
                                            fontFamily: "var(--font-body)",
                                            fontSize: 13, color: "var(--muted)",
                                            textAlign: "center", padding: "12px 0",
                                        }}>No tags assigned</div>
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

const FdRow = ({ icon, label, value, last }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", gap: 12,
        borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {icon}
            <span style={{
                fontFamily: "var(--font-body)",
                fontSize: 13, color: "var(--muted)",
            }}>{label}</span>
        </div>
        <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 13, fontWeight: 600,
            color: "var(--ink-soft)",
            flexShrink: 0, maxWidth: "55%",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            textAlign: "right",
        }}>{value || '—'}</span>
    </div>
);

const SecurityFdRow = ({ label, active, last }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", gap: 12,
        borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
        <span style={{
            fontFamily: "var(--font-body)",
            fontSize: 13, color: "var(--muted)",
        }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 12, fontWeight: 700,
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

export default AzureFunctionDetails;