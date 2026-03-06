import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaDatabase, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner, FaLink
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * AzureStorageDetails — Cloud Control
 * Design: EKS token system + Apple-like detail page feel
 * Logic: unchanged
 */

const AzureStorageDetails = () => {
    const { accountName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const subscriptionId = searchParams.get('subscription_id') || '';
    const resourceGroup = searchParams.get('resource_group') || '';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    // ── Logic untouched ──────────────────────────────────────────────
    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['azureStorageDetails', accountName, subscriptionId, resourceGroup],
        queryFn: async () => {
            if (!subscriptionId || !resourceGroup || !accountName)
                throw new Error('Missing required parameters: subscription_id, resource_group, account_name');
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/azure/storage/details?` +
                `subscription_id=${subscriptionId}&resource_group=${resourceGroup}&name=${accountName}`
            );
            if (!res.ok) throw new Error(`Failed to fetch storage account details: ${res.statusText}`);
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
            const storageData = {
                name: details?.name,
                location: details?.location,
                sku: details?.sku,
                kind: details?.kind,
                status: details?.status,
                access_tier: details?.access_tier,
                encryption: details?.encryption,
                tags_count: Object.keys(details?.tags || {}).length,
            };

            const prompt = `Analyze this Azure Storage Account configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Azure Storage Account:
${JSON.stringify(storageData, null, 2)}

Focus on:
- Performance tier (SKU) and cost optimization
- Regional location and latency considerations
- Security (encryption, access tier) recommendations
- Account kind and use case fit

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
                    text.trim() || `${accountName} analyzed successfully`,
                    `SKU ${details?.sku || 'N/A'} - review performance tier for workload`,
                    `${details?.location || 'N/A'} region - verify latency requirements`,
                ]);
            }
        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const sku = details?.sku;
            const location = details?.location;
            const hasEncryption = !!details?.encryption;
            setAiSummary([
                `${accountName}: ${sku || 'N/A'} (${location || 'N/A'})`,
                hasEncryption ? 'Encryption enabled - good security posture' : 'Enable encryption for data at rest',
                details?.access_tier ? `Access tier: ${details.access_tier}` : 'Review access tier for cost optimization',
            ]);
        } finally {
            setIsGenerating(false);
        }
    };
    // ── End logic ────────────────────────────────────────────────────

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

                .sd, .sd * {
                    font-family: var(--font-body);
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                @keyframes sd-up {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .sd-enter  { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }
                .sd-enter2 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
                .sd-enter3 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
                .sd-enter4 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
                .sd-enter5 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
                .sd-enter6 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
                .sd-enter7 { animation: sd-up 0.44s cubic-bezier(0.22,1,0.36,1) 0.36s both; }

                .sd-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

                @keyframes sd-spin { to { transform:rotate(360deg); } }
                .sd-spin { animation: sd-spin 0.75s linear infinite; }

                @keyframes sd-rise {
                    from { opacity:0; transform:translateY(20px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                .sd-rise { animation: sd-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes sd-insight {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0);    }
                }
                .sd-insight { animation: sd-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

                @keyframes sd-shimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .sd-shimmer-bar {
                    background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
                    background-size: 200% 100%;
                    animation: sd-shimmer 1.6s ease-in-out infinite;
                    border-radius: 6px;
                }

                @keyframes sd-orb {
                    0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.35; }
                    50%      { transform:translate(-50%,-50%) scale(1.15); opacity:0.55; }
                }
                .sd-orb { animation: sd-orb 8s ease-in-out infinite; }

                .sd-tag {
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

            <div className="sd" style={{
                minHeight: "100vh",
                background: "var(--surface)",
                paddingTop: 56,
                overflowX: "hidden",
            }}>
                <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 64px" }}>

                    {/* ── Back + Sync bar ───────────────────────────────── */}
                    <div className="sd-enter" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 0 20px",
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            className="sd-press"
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
                            disabled={isFetching || !subscriptionId || !resourceGroup}
                            className="sd-press"
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "8px 16px",
                                background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                                border: isFetching ? "1.5px solid rgba(0,200,117,0.3)" : "1.5px solid transparent",
                                borderRadius: 99,
                                cursor: (isFetching || !subscriptionId || !resourceGroup) ? "default" : "pointer",
                                boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                                transition: "all 0.22s ease",
                                opacity: (!subscriptionId || !resourceGroup) ? 0.45 : 1,
                            }}
                        >
                            <FaSync
                                className={isFetching ? "sd-spin" : ""}
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
                    <div className="sd-enter2" style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        boxShadow: "var(--s-lift)",
                        padding: "22px 20px",
                        marginBottom: 14,
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        <div className="sd-orb" style={{
                            position: "absolute", top: "50%", right: "-10%",
                            width: 220, height: 180,
                            background: "radial-gradient(ellipse, rgba(0,102,255,0.07) 0%, transparent 70%)",
                            pointerEvents: "none",
                        }} />

                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
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
                                    fontFamily: "var(--font-display)",
                                    fontSize: 18, fontWeight: 800,
                                    color: "var(--ink)", letterSpacing: "-0.5px",
                                    margin: 0, lineHeight: 1.2,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>{accountName}</h1>
                                <div style={{
                                    fontFamily: "var(--font-body)",
                                    fontSize: 12, color: "var(--muted)", marginTop: 4,
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                }}>Azure Storage Account · {resourceGroup}</div>
                                {hasData && (
                                    <div style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 10.5, color: "var(--muted)", marginTop: 3, opacity: 0.7,
                                    }}>Synced {new Date(dataUpdatedAt).toLocaleTimeString()}</div>
                                )}
                            </div>

                            {/* SKU pill */}
                            {details?.sku && (
                                <div style={{
                                    display: "flex", alignItems: "center",
                                    padding: "4px 10px",
                                    background: "rgba(0,102,255,0.07)",
                                    border: "1px solid rgba(0,102,255,0.18)",
                                    borderRadius: 99, flexShrink: 0,
                                }}>
                                    <span style={{
                                        fontFamily: "var(--font-body)",
                                        fontSize: 11, fontWeight: 600,
                                        color: "var(--accent)",
                                    }}>{details.sku}</span>
                                </div>
                            )}
                        </div>

                        {/* Access tier + status strip */}
                        {(details?.access_tier || details?.status) && (
                            <div style={{
                                marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap",
                            }}>
                                {details?.status && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(0,200,117,0.07)",
                                        border: "1px solid rgba(0,200,117,0.18)",
                                        borderRadius: 10,
                                        display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaCheckCircle style={{ fontSize: 10, color: "var(--green)", flexShrink: 0 }} />
                                        <span style={{
                                            fontFamily: "var(--font-body)",
                                            fontSize: 11.5, fontWeight: 500, color: "var(--green)",
                                        }}>{details.status}</span>
                                    </div>
                                )}
                                {details?.access_tier && (
                                    <div style={{
                                        padding: "7px 12px",
                                        background: "rgba(0,102,255,0.05)",
                                        border: "1px solid rgba(0,102,255,0.14)",
                                        borderRadius: 10,
                                        display: "flex", alignItems: "center", gap: 7, flex: 1,
                                    }}>
                                        <FaLock style={{ fontSize: 10, color: "var(--accent)", flexShrink: 0 }} />
                                        <span style={{
                                            fontFamily: "var(--font-body)",
                                            fontSize: 11.5, fontWeight: 500, color: "var(--accent)",
                                        }}>Access: {details.access_tier}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Error state ───────────────────────────────────── */}
                    {isError && (
                        <div className="sd-enter2" style={{
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
                                    Failed to retrieve storage account configuration
                                </div>
                                {!subscriptionId && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#B91C1C", marginTop: 4 }}>
                                        Missing subscription_id parameter
                                    </div>
                                )}
                                {!resourceGroup && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#B91C1C", marginTop: 4 }}>
                                        Missing resource_group parameter
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Empty / no data ───────────────────────────────── */}
                    {!hasData && !isFetching ? (
                        <div className="sd-enter3" style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            padding: "72px 24px", textAlign: "center",
                            position: "relative",
                        }}>
                            <div className="sd-orb" style={{
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
                            }}>No data loaded</div>
                            <div style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 13, color: "var(--muted)", lineHeight: 1.6,
                            }}>Tap Sync to fetch storage account details</div>
                        </div>
                    ) : (
                        <div style={{ opacity: isFetching ? 0.5 : 1, transition: "opacity 0.3s ease" }}>

                            {/* ── AI Insights ───────────────────────────── */}
                            {hasData && (
                                <div className="sd-enter3" style={{ marginBottom: 14 }}>
                                    {!showSummary ? (
                                        <button
                                            onClick={generateAISummary}
                                            disabled={isGenerating}
                                            className="sd-press"
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
                                                }}>Analyze this storage account with Gemini</div>
                                            </div>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                 stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 18l6-6-6-6"/>
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="sd-rise" style={{
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
                                                            ? <FaSpinner className="sd-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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
                                                            <div key={i} className="sd-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                                                        ))}
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                                                        {aiSummary.map((insight, i) => (
                                                            <div key={i} className="sd-insight"
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
                            <div className="sd-enter4" style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: 16,
                                boxShadow: "var(--s-card)",
                                overflow: "hidden",
                                marginBottom: 14,
                            }}>
                                <SectionHeader label="Configuration" />
                                <SdRow icon={<FaDatabase style={{ fontSize: 11, color: "var(--muted)" }} />} label="Name"        value={details?.name} />
                                <SdRow icon={<FaGlobe    style={{ fontSize: 11, color: "var(--muted)" }} />} label="Location"    value={details?.location} />
                                <SdRow icon={<FaShieldAlt style={{ fontSize: 11, color: "var(--muted)" }} />} label="SKU"        value={details?.sku} />
                                <SdRow icon={<FaDatabase style={{ fontSize: 11, color: "var(--muted)" }} />} label="Kind"        value={details?.kind} />
                                <SdRow icon={<FaCheckCircle style={{ fontSize: 11, color: "var(--muted)" }} />} label="Status"   value={details?.status} />
                                <SdRow icon={<FaLock     style={{ fontSize: 11, color: "var(--muted)" }} />} label="Access Tier" value={details?.access_tier} last />
                            </div>

                            {/* ── Endpoints card ────────────────────────── */}
                            {details?.endpoints && (
                                <div className="sd-enter5" style={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 16,
                                    boxShadow: "var(--s-card)",
                                    overflow: "hidden",
                                    marginBottom: 14,
                                }}>
                                    <SectionHeader icon={<FaLink style={{ fontSize: 10, color: "var(--muted)" }} />} label="Service Endpoints" />
                                    <EndpointRow label="Blob"  url={details.endpoints.blob} />
                                    <EndpointRow label="File"  url={details.endpoints.file} />
                                    <EndpointRow label="Queue" url={details.endpoints.queue} />
                                    <EndpointRow label="Table" url={details.endpoints.table} last />
                                </div>
                            )}

                            {/* ── Encryption card ───────────────────────── */}
                            {details?.encryption && (
                                <div className="sd-enter5" style={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 16,
                                    boxShadow: "var(--s-card)",
                                    overflow: "hidden",
                                    marginBottom: 14,
                                }}>
                                    <SectionHeader icon={<FaLock style={{ fontSize: 10, color: "var(--muted)" }} />} label="Encryption" />
                                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                                        {Object.entries(details.encryption.services || {}).map(([service, config]) => (
                                            <div key={service} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                            }}>
                                                <span style={{
                                                    fontFamily: "var(--font-display)",
                                                    fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
                                                    textTransform: "capitalize",
                                                }}>{service}</span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                    <span style={{
                                                        fontFamily: "var(--font-display)",
                                                        fontSize: 12, fontWeight: 700,
                                                        color: config.enabled ? "var(--green)" : "#EF4444",
                                                    }}>{config.enabled ? "Enabled" : "Disabled"}</span>
                                                    <div style={{
                                                        width: 7, height: 7, borderRadius: "50%",
                                                        background: config.enabled ? "var(--green)" : "#EF4444",
                                                        boxShadow: config.enabled ? "0 0 6px rgba(0,200,117,0.5)" : "0 0 6px rgba(239,68,68,0.4)",
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Tags card ─────────────────────────────── */}
                            <div className="sd-enter6" style={{
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
                                                <span key={key} className="sd-tag" style={{
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

const SdRow = ({ icon, label, value, last }) => (
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

const EndpointRow = ({ label, url, last }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 16px", gap: 12,
        borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <FaLink style={{ fontSize: 10, color: "var(--muted)" }} />
            <span style={{
                fontFamily: "var(--font-body)",
                fontSize: 12, fontWeight: 600, color: "var(--muted)",
                letterSpacing: "0.5px", textTransform: "uppercase",
            }}>{label}</span>
        </div>
        <span style={{
            fontFamily: "'Plus Jakarta Sans', monospace",
            fontSize: 11, fontWeight: 500, color: "var(--accent)",
            background: "rgba(0,102,255,0.06)",
            border: "1px solid rgba(0,102,255,0.14)",
            borderRadius: 6, padding: "3px 8px",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            maxWidth: "65%", textAlign: "right",
        }}>{url || '—'}</span>
    </div>
);

export default AzureStorageDetails;