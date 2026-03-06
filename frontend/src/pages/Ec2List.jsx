import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaServer, FaSync, FaRobot, FaSpinner, FaCircle, FaPlay, FaPause } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

/*
 * EC2List — Cloud Control
 * Design: identical tokens/layout to EksList
 * Logic: unchanged
 */

const EC2List = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // ── Logic untouched ──────────────────────────────────────────────
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('ec2InstancesCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('ec2InstancesCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('ec2ListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('ec2ListScrollPosition');
    }
  }, []);

  const handleNavigate = (instanceId) => {
    sessionStorage.setItem('ec2ListScrollPosition', window.scrollY.toString());
    navigate(`/aws/ec2/details/${instanceId}`);
  };

  const { data: instances = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['ec2Instances'],
    queryFn: async () => {
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/aws/ec2/list`);
      if (!res.ok) throw new Error(`Failed to fetch EC2 instances: ${res.statusText}`);
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
  const displayInstances = cachedData?.data || [];

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const instanceData = displayInstances.map(instance => ({
        id: instance.InstanceId,
        state: instance.State?.Name,
        type: instance.InstanceType,
        region: instance.Placement?.AvailabilityZone?.split('-')[0],
      }));

      const prompt = `Analyze these EC2 instances and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

EC2 Instance Data:
${JSON.stringify(instanceData, null, 2)}

Focus on:
- Instance state distribution (running/stopped)
- Instance type usage and cost optimization  
- Regional distribution recommendations

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
          `${displayInstances.length} EC2 instances analyzed successfully`,
          'Review stopped instances for potential termination savings',
          'Consider rightsizing based on instance type distribution',
        ]);
      }
    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const runningCount = displayInstances.filter(i => i.State?.Name === 'running').length;
      const stoppedCount = displayInstances.length - runningCount;
      setAiSummary([
        `${displayInstances.length} EC2 instances (${runningCount} running, ${stoppedCount} stopped)`,
        `Most common type: ${displayInstances.length > 0 ? displayInstances[0].InstanceType : 'N/A'}`,
        'Review instance utilization and right-sizing opportunities',
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
  // ── End logic ────────────────────────────────────────────────────

  const statusCfg = (state) => {
    const s = state?.toLowerCase();
    if (s === 'running')  return { color: '#00C875', bg: 'rgba(0,200,117,0.1)',  border: 'rgba(0,200,117,0.22)',  pulse: true  };
    if (s === 'stopped')  return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', pulse: false };
    if (s === 'pending' ||
        s === 'stopping') return { color: '#0066FF', bg: 'rgba(0,102,255,0.1)',  border: 'rgba(0,102,255,0.22)',  pulse: false };
    return                       { color: '#8A95A8', bg: 'rgba(138,149,168,0.1)', border: 'rgba(138,149,168,0.22)', pulse: false };
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

        .ec, .ec * {
          font-family: var(--font-body);
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        @keyframes ec-up {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .ec-enter { animation: ec-up 0.44s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes ec-card {
          from { opacity:0; transform:translateY(16px) scale(0.99); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        .ec-card { animation: ec-card 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        .ec-press:active { transform:scale(0.97); transition:transform 0.1s ease; }

        @keyframes ec-spin { to { transform:rotate(360deg); } }
        .ec-spin { animation: ec-spin 0.75s linear infinite; }

        @keyframes ec-pulse {
          0%,100% { opacity:1;   transform:scale(1);    }
          50%      { opacity:0.4; transform:scale(0.82); }
        }
        .ec-pulse { animation: ec-pulse 2s ease-in-out infinite; }

        @keyframes ec-rise {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .ec-rise { animation: ec-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes ec-insight {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0);    }
        }
        .ec-insight { animation: ec-insight 0.36s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes ec-shimmer {
          0%   { background-position:-200% center; }
          100% { background-position: 200% center; }
        }
        .ec-shimmer-bar {
          background: linear-gradient(90deg, rgba(10,15,30,0.05) 25%, rgba(10,15,30,0.1) 50%, rgba(10,15,30,0.05) 75%);
          background-size: 200% 100%;
          animation: ec-shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }

        @keyframes ec-orb {
          0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.45; }
          50%      { transform:translate(-50%,-50%) scale(1.1); opacity:0.65; }
        }
        .ec-orb { animation: ec-orb 7s ease-in-out infinite; }
      `}</style>

      {/* ── Page ─────────────────────────────────────────────────────── */}
      <div className="ec" style={{
        minHeight: "100vh",
        background: "var(--surface)",
        paddingTop: 56,
        overflowX: "hidden",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 56px" }}>

          {/* ── Page header ───────────────────────────────────────── */}
          <div className="ec-enter" style={{
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
              }}>EC2 Instances</h1>
              {displayInstances.length > 0 && (
                <div style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11.5, fontWeight: 500,
                  color: "var(--muted)", marginTop: 3,
                  letterSpacing: "0.1px",
                }}>
                  {displayInstances.length} instance{displayInstances.length !== 1 ? 's' : ''} · AWS
                </div>
              )}
            </div>

            {/* Sync */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="ec-press"
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
                className={isFetching ? "ec-spin" : ""}
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
          {displayInstances.length > 0 && (
            <div className="ec-enter" style={{ marginBottom: 18, animationDelay: "0.07s" }}>
              {!showSummary ? (
                <button
                  onClick={generateAISummary}
                  disabled={isGenerating}
                  className="ec-press"
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
                    }}>Analyze {displayInstances.length} instance{displayInstances.length !== 1 ? 's' : ''} with Gemini</div>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>

              ) : (
                <div className="ec-rise" style={{
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
                          ? <FaSpinner className="ec-spin" style={{ fontSize: 11, color: "var(--green)" }} />
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
                          <div key={i} className="ec-shimmer-bar" style={{ height: 13, width: `${w}%` }} />
                        ))}
                      </div>
                    ) : aiSummary ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                        {aiSummary.map((insight, i) => (
                          <div key={i} className="ec-insight"
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
          {!isFetching && displayInstances.length === 0 ? (
            <div className="ec-enter" style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "72px 24px", textAlign: "center",
              position: "relative", animationDelay: "0.1s",
            }}>
              <div className="ec-orb" style={{
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
              }}>No instances yet</div>
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: 13, color: "var(--muted)",
                lineHeight: 1.6, maxWidth: 220, marginBottom: 5,
              }}>Hit Sync to pull your AWS EC2 instances</div>
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: 11, color: "var(--muted)", opacity: 0.55,
              }}>Loads instantly from cache after first sync</div>
            </div>

          ) : (
            /* ── Instance cards ─────────────────────────────────── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {displayInstances.map((instance, i) => {
                const st = statusCfg(instance.State?.Name);
                const region = instance.Placement?.AvailabilityZone?.split('-')[0] || '—';
                return (
                  <div
                    key={instance.InstanceId}
                    onClick={() => handleNavigate(instance.InstanceId)}
                    className="ec-card ec-press"
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
                        {/* ID + state row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                          <div style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 14.5, fontWeight: 700,
                            color: "var(--ink)", letterSpacing: "-0.3px",
                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          }}>{instance.InstanceId}</div>

                          <div style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "3px 9px",
                            background: st.bg, border: `1px solid ${st.border}`,
                            borderRadius: 99, flexShrink: 0,
                          }}>
                            {st.pulse && (
                              <div className="ec-pulse" style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: st.color, flexShrink: 0,
                              }} />
                            )}
                            <span style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 11, fontWeight: 600,
                              color: st.color, letterSpacing: "0.1px",
                            }}>{instance.State?.Name || 'Unknown'}</span>
                          </div>
                        </div>

                        {/* Region */}
                        <div style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12.5, color: "var(--muted)",
                        }}>{region}</div>
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
                        }}>Type</span>
                        <span style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 12, fontWeight: 600, color: "var(--ink-soft)",
                        }}>{instance.InstanceType || '—'}</span>
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

export default EC2List;