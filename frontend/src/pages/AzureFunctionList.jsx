import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaServer, FaSync, FaExclamationTriangle, FaRobot, FaSpinner } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * AzureFunctionsList — Cloud Control
 * Design: identical tokens/layout to EksList
 * Logic: unchanged
 */

const AzureFunctionsList = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // ── Logic untouched ──────────────────────────────────────────────
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('azureFunctionsCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('azureFunctionsCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('azureFunctionsListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('azureFunctionsListScrollPosition');
    }
  }, []);

  const handleNavigate = (name, resourceGroup) => {
    sessionStorage.setItem('azureFunctionsListScrollPosition', window.scrollY.toString());
    navigate(`/azure/functions/${name}?rg=${resourceGroup}`);
  };

  const { data: functions = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['azureFunctions'],
    queryFn: async () => {
      const subscriptionId = import.meta.env.VITE_AZURE_SUBSCRIPTION_ID;
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/azure/functions/list?subscription_id=${subscriptionId}`);
      if (!res.ok) throw new Error(`Failed to fetch functions: ${res.statusText}`);
      const data = await res.json();
      saveToCache(data);
      return data;
    },
    enabled: false,
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: false,
  });

  const cachedData = getCachedData();
  const displayFunctions = cachedData?.data || [];

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const functionData = displayFunctions.map(func => ({
        name: func.name,
        location: func.location,
        kind: func.kind,
        resource_group: func.resource_group,
        state: func.state,
      }));

      const prompt = `Analyze these Azure Function Apps and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Function App Data:
${JSON.stringify(functionData, null, 2)}

Focus on:
- Regional distribution and recommendations
- Function app states (Running/Stopped)
- Resource organization patterns
- Potential scaling or cost optimization opportunities

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
          text.trim() || `${displayFunctions.length} Azure Function apps analyzed successfully`,
          'Review stopped functions for potential cleanup or restart',
          'Consider consistent regional deployment for better latency',
        ]);
      }
    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const runningCount = displayFunctions.filter(f => f.state?.toLowerCase() === 'running').length;
      const totalFunctions = displayFunctions.length;
      setAiSummary([
        `${runningCount}/${totalFunctions} Function apps are running`,
        `Functions spread across ${new Set(displayFunctions.map(f => f.location)).size} regions`,
        'Review resource group organization for better management',
      ]);
    } finally {
      setIsGenerating(false);
    }
  };
  // ── End logic ────────────────────────────────────────────────────

  const statusCfg = (state) => {
    const s = state?.toLowerCase();
    if (s === 'running') return { color: '#00C875', bg: 'rgba(0,200,117,0.1)',  border: 'rgba(0,200,117,0.22)',  pulse: true  };
    if (s === 'stopped') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', pulse: false };
    return                      { color: '#8A95A8', bg: 'rgba(138,149,168,0.1)', border: 'rgba(138,149,168,0.22)', pulse: false };
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

        .af, .af * {
          font-family: var(--font-body);
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        @keyframes af-up {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .af-enter { animation: af-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes af-card {
          from { opacity:0; transform:translateY(16px) scale(0.99); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        .af-card { animation: af-card 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        .af-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

        @keyframes af-spin { to { transform:rotate(360deg); } }
        .af-spin { animation: af-spin 0.75s linear infinite; }

        @keyframes af-pulse {
          0%,100% { opacity:1;   transform:scale(1);    }
          50%      { opacity:0.4; transform:scale(0.82); }
        }
        .af-pulse { animation: af-pulse 2s ease-in-out infinite; }

        @keyframes af-rise {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .af-rise { animation: af-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes af-insight {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0);    }
        }
        .af-insight { animation: af-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes af-shimmer {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
        .af-shimmer-bar {
          background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
          background-size: 200% 100%;
          animation: af-shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }

        @keyframes af-orb {
          0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.45; }
          50%      { transform:translate(-50%,-50%) scale(1.1); opacity:0.65; }
        }
        .af-orb { animation: af-orb 7s ease-in-out infinite; }
      `}</style>

      {/* ── Page ─────────────────────────────────────────────────────── */}
      <div className="af" style={{
        minHeight: "100vh",
        background: "var(--surface)",
        paddingTop: 56,
        overflowX: "hidden",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 56px" }}>

          {/* ── Page header ───────────────────────────────────────── */}
          <div className="af-enter" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 22,
            animationDelay: "0s",
          }}>
            <div>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: 20, fontWeight: 800,
                color: "var(--ink)", letterSpacing: "-0.7px",
                margin: 0, lineHeight: 1.2,
              }}>Function Apps</h1>
              {displayFunctions.length > 0 && (
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11.5, fontWeight: 500,
                  color: "var(--muted)", marginTop: 3,
                  letterSpacing: "0.1px",
                }}>
                  {displayFunctions.length} app{displayFunctions.length !== 1 ? 's' : ''} · Azure
                </div>
              )}
            </div>

            {/* Sync */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="af-press"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px",
                background: isFetching ? "rgba(0,200,117,0.08)" : "var(--ink)",
                border: isFetching ? "1.5px solid rgba(0,200,117,0.3)" : "1.5px solid transparent",
                borderRadius: 99,
                cursor: isFetching ? "default" : "pointer",
                boxShadow: isFetching ? "none" : "0 2px 12px rgba(10,15,30,0.22)",
                transition: "all 0.22s ease",
                flexShrink: 0,
              }}
            >
              <FaSync
                className={isFetching ? "af-spin" : ""}
                style={{ fontSize: 11, color: isFetching ? "var(--green)" : "#fff" }}
              />
              <span style={{
                fontFamily: "var(--font-body)",
                fontSize: 13, fontWeight: 600,
                color: isFetching ? "var(--green)" : "#fff",
                letterSpacing: "0.1px",
              }}>
                {isFetching ? "Syncing" : "Sync"}
              </span>
            </button>
          </div>

          {/* ── AI Insights ───────────────────────────────────────── */}
          {displayFunctions.length > 0 && (
            <div className="af-enter" style={{ marginBottom: 18, animationDelay: "0.07s" }}>
              {!showSummary ? (
                <button
                  onClick={generateAISummary}
                  disabled={isGenerating}
                  className="af-press"
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
                    }}>Analyze {displayFunctions.length} app{displayFunctions.length !== 1 ? 's' : ''} with Gemini</div>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>

              ) : (
                <div className="af-rise" style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  boxShadow: "var(--s-lift)",
                  overflow: "hidden",
                }}>
                  {/* Header */}
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
                          ? <FaSpinner className="af-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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

                  {/* Body */}
                  <div style={{ padding: "14px 15px" }}>
                    {isGenerating ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[90, 72, 55].map((w, i) => (
                          <div key={i} className="af-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                        ))}
                      </div>
                    ) : aiSummary ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                        {aiSummary.map((insight, i) => (
                          <div key={i} className="af-insight"
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

          {/* ── Empty state ───────────────────────────────────────── */}
          {!isFetching && displayFunctions.length === 0 ? (
            <div className="af-enter" style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "72px 24px", textAlign: "center",
              position: "relative", animationDelay: "0.1s",
            }}>
              <div className="af-orb" style={{
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
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 16, fontWeight: 700,
                color: "var(--ink)", letterSpacing: "-0.3px", marginBottom: 7,
              }}>No Function apps yet</div>
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: 13, color: "var(--muted)",
                lineHeight: 1.6, maxWidth: 220, marginBottom: 5,
              }}>Hit Sync to pull your Azure Function apps</div>
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: 11, color: "var(--muted)", opacity: 0.55,
              }}>Loads instantly from cache after first sync</div>
            </div>

          ) : (
            /* ── Function app cards ─────────────────────────────── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {displayFunctions.map((func, i) => {
                const st = statusCfg(func.state);
                return (
                  <div
                    key={func.name}
                    onClick={() => handleNavigate(func.name, func.resource_group)}
                    className="af-card af-press"
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
                    {/* Main content */}
                    <div style={{ padding: "14px 15px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>

                      {/* Glowing left bar */}
                      <div style={{
                        width: 3, alignSelf: "stretch", minHeight: 36,
                        borderRadius: 2, flexShrink: 0,
                        background: st.color,
                        boxShadow: `0 0 8px ${st.color}88`,
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name + state pill */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                          <div style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 14.5, fontWeight: 700,
                            color: "var(--ink)", letterSpacing: "-0.3px",
                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          }}>{func.name}</div>

                          <div style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "3px 9px",
                            background: st.bg, border: `1px solid ${st.border}`,
                            borderRadius: 99, flexShrink: 0,
                          }}>
                            {st.pulse && (
                              <div className="af-pulse" style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: st.color, flexShrink: 0,
                              }} />
                            )}
                            <span style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 11, fontWeight: 600,
                              color: st.color, letterSpacing: "0.1px",
                            }}>{func.state || 'Unknown'}</span>
                          </div>
                        </div>

                        {/* Location + resource group */}
                        <div style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12.5, color: "var(--muted)",
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }}>{func.location}{func.resource_group ? ` · ${func.resource_group}` : ''}</div>
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
                        }}>{func.kind || '—'}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12, fontWeight: 600,
                          color: "var(--accent)",
                        }}>Details</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                             stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AzureFunctionsList;