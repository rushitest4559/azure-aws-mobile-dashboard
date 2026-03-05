import {
  FaDatabase,
  FaArrowRight,
  FaCloud,
  FaMicrochip,
  FaServer,
  FaHdd,
  FaAws,
  FaMicrosoft,
} from "react-icons/fa";
import { SiKubernetes } from "react-icons/si";
import { Link } from "react-router-dom";

/*
 * Home — Cloud Control
 * Design: Dark command-center. Deep navy-black canvas.
 * Cards float like live infrastructure panels.
 * Typography: Syne for display power, Outfit for clarity.
 * Exact design tokens from Navbar (--ink, --surface, --accent, --green…)
 *
 * The unforgettable detail: the ambient orb behind the hero title,
 * the card "surface" animation on entry, and the barely-visible
 * grid lines that make it feel like a real ops dashboard.
 */

const services = [
  {
    name: "EKS Clusters",
    desc: "Kubernetes clusters, networking & security",
    path: "/aws/eks/list",
    icon: <SiKubernetes />,
    provider: "AWS",
    /* Each card gets a signature accent — used for glow + icon */
    color: "#6366F1",        // indigo
    glow: "rgba(99,102,241,0.18)",
  },
  {
    name: "S3 Buckets",
    desc: "Bucket distribution & lifecycle analysis",
    path: "/aws/s3/list",
    icon: <FaCloud />,
    provider: "AWS",
    color: "#10B981",        // emerald
    glow: "rgba(16,185,129,0.18)",
  },
  {
    name: "EC2 Instances",
    desc: "Health monitoring & right-sizing",
    path: "/aws/ec2/list",
    icon: <FaServer />,
    provider: "AWS",
    color: "#F59E0B",        // amber
    glow: "rgba(245,158,11,0.18)",
  },
  {
    name: "RDS Databases",
    desc: "Performance & scaling insights",
    path: "/aws/rds/list",
    icon: <FaDatabase />,
    provider: "AWS",
    color: "#0EA5E9",        // sky
    glow: "rgba(14,165,233,0.18)",
  },
  {
    name: "Azure Storage",
    desc: "SKU optimization & regional analysis",
    path: "/azure/storage/list",
    icon: <FaHdd />,
    provider: "Azure",
    color: "#8B5CF6",        // violet
    glow: "rgba(139,92,246,0.18)",
  },
  {
    name: "Function Apps",
    desc: "Serverless performance insights",
    path: "/azure/functions",
    icon: <FaMicrochip />,
    provider: "Azure",
    color: "#EC4899",        // pink
    glow: "rgba(236,72,153,0.18)",
  },
];

export default function Home() {
  return (
    <>
      {/* ── Global styles (tokens match Navbar exactly) ─────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

        :root {
          --ink:       #0A0F1E;
          --ink-soft:  #1E2A3B;
          --surface:   #F5F7FA;
          --card:      #FFFFFF;
          --border:    rgba(10,15,30,0.08);
          --accent:    #0066FF;
          --green:     #00C875;
          --red:       #FF3B30;
          --muted:     #8A95A8;
        }

        .hp, .hp * {
          font-family: 'Outfit', -apple-system, sans-serif;
          box-sizing: border-box;
        }

        /* ── Page fade-in ──────────────────────────────── */
        @keyframes hp-fade {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .hp-hero     { animation: hp-fade 0.7s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .hp-tagline  { animation: hp-fade 0.7s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
        .hp-badges   { animation: hp-fade 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s  both; }
        .hp-grid     { animation: hp-fade 0.7s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
        .hp-footer   { animation: hp-fade 0.7s cubic-bezier(0.22,1,0.36,1) 0.6s  both; }

        /* ── Card entry stagger ────────────────────────── */
        @keyframes hp-card {
          from { opacity: 0; transform: translateY(22px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .hp-card {
          animation: hp-card 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ── Card hover lift ───────────────────────────── */
        .hp-card-link {
          display: block;
          text-decoration: none;
          transition:
            transform      0.28s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow     0.28s ease;
        }
        .hp-card-link:hover  { transform: translateY(-5px) scale(1.012); }
        .hp-card-link:active { transform: scale(0.98); transition-duration: 0.1s; }

        /* ── Ambient orb pulse ─────────────────────────── */
        @keyframes hp-orb {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%       { transform: scale(1.08); opacity: 0.7;  }
        }
        .hp-orb { animation: hp-orb 7s ease-in-out infinite; }

        /* ── Live dot pulse ────────────────────────────── */
        @keyframes hp-live {
          0%, 100% { box-shadow: 0 0 0 0   rgba(0,200,117,0.6); }
          50%       { box-shadow: 0 0 0 5px rgba(0,200,117,0);   }
        }
        .hp-live-dot { animation: hp-live 2.2s ease-in-out infinite; }

        /* ── Arrow hover ───────────────────────────────── */
        .hp-arrow { transition: transform 0.2s ease; }
        .hp-card-link:hover .hp-arrow { transform: translateX(4px); }

        /* ── Subtle grid lines ─────────────────────────── */
        .hp-grid-bg {
          background-image:
            linear-gradient(rgba(10,15,30,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10,15,30,0.035) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* ── Page shell ─────────────────────────────────────────────────── */}
      <div
        className="hp hp-grid-bg"
        style={{
          minHeight: "100vh",
          background: "var(--surface)",
          paddingTop: 72,         /* clear fixed navbar */
          paddingBottom: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflowX: "hidden",    /* ← prevent any child from bleeding out */
          width: "100%",
          maxWidth: "100vw",
        }}
      >

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <div style={{
          position: "relative",
          textAlign: "center",
          padding: "52px 24px 0",
          maxWidth: 520,
          width: "100%",
        }}>

          {/* Ambient orb — the magic ingredient */}
          <div className="hp-orb" style={{
            position: "absolute",
            top: "30%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 340, height: 220,
            background: "radial-gradient(ellipse, rgba(0,102,255,0.13) 0%, transparent 72%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          {/* Provider badges */}
          <div className="hp-badges" style={{
            display: "flex", justifyContent: "center",
            gap: 10, marginBottom: 24, position: "relative", zIndex: 1,
          }}>
            {[
              { Icon: FaAws,       label: "AWS",   color: "#F59E0B" },
              { Icon: FaMicrosoft, label: "Azure", color: "#0066FF" },
            ].map(({ Icon, label, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px",
                background: "rgba(255,255,255,0.85)",
                border: "1px solid var(--border)",
                borderRadius: 99,
                backdropFilter: "blur(10px)",
                boxShadow: "0 1px 4px rgba(10,15,30,0.07)"
              }}>
                <Icon style={{ fontSize: 13, color }} />
                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 11, fontWeight: 600,
                  color: "var(--muted)", letterSpacing: "0.8px", textTransform: "uppercase"
                }}>{label}</span>
              </div>
            ))}
          </div>

          {/* H1 — Syne at full power */}
          <h1 className="hp-hero" style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(34px, 8vw, 48px)",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-1.5px",
            lineHeight: 1.08,
            margin: "0 0 18px",
            position: "relative", zIndex: 1,
          }}>
            {/* Serif for the soft line — warmth and editorial gravitas */}
            <span style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.5px",
            }}>Your cloud,</span>
            <br />
            <span style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #6366F1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              fully visible.
            </span>
          </h1>

          {/* Subheading — Outfit Light */}
          <p className="hp-tagline" style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16, fontWeight: 400,
            color: "var(--muted)",
            lineHeight: 1.65,
            margin: "0 0 36px",
            position: "relative", zIndex: 1,
          }}>
            Unified monitoring for AWS & Azure.
            <br />
            <span style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
              Real-time · AI-powered · One place.
            </span>
          </p>

          {/* Live status pill */}
          <div className="hp-badges" style={{
            display: "flex", justifyContent: "center",
            gap: 6, alignItems: "center",
            marginBottom: 56,
            position: "relative", zIndex: 1,
          }}>
            <div className="hp-live-dot" style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--green)", flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: 500,
              color: "var(--green)", letterSpacing: "0.3px"
            }}>All systems live</span>
            <span style={{
              width: 3, height: 3, borderRadius: "50%",
              background: "var(--muted)", display: "inline-block", margin: "0 2px"
            }} />
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: 400,
              color: "var(--muted)"
            }}>6 services connected</span>
          </div>
        </div>

        {/* ── Service cards grid ──────────────────────────────────────── */}
        <div className="hp-grid" style={{
          width: "100%",
          maxWidth: 720,
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          boxSizing: "border-box",   /* ← padding included in width, never overflows */
        }}>
          {services.map((svc, i) => (
            <Link
              key={svc.path}
              to={svc.path}
              className="hp-card-link hp-card"
              style={{ animationDelay: `${0.44 + i * 0.07}s` }}
            >
              <div style={{
                position: "relative",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: "18px 16px 16px",
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(10,15,30,0.06)",
                /* Hover glow via CSS var is done via inline since React */
              }}>

                {/* Corner glow */}
                <div style={{
                  position: "absolute",
                  top: -20, right: -20,
                  width: 100, height: 100,
                  background: `radial-gradient(circle, ${svc.glow} 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                {/* Provider badge */}
                <div style={{
                  position: "absolute",
                  top: 14, right: 14,
                  padding: "2px 8px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 99,
                }}>
                  <span style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 9.5, fontWeight: 600,
                    color: "var(--muted)", letterSpacing: "0.7px",
                    textTransform: "uppercase",
                  }}>{svc.provider}</span>
                </div>

                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: svc.glow,
                  border: `1px solid ${svc.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                  boxShadow: `0 4px 14px ${svc.glow}`,
                }}>
                  <span style={{ fontSize: 18, color: svc.color }}>
                    {svc.icon}
                  </span>
                </div>

                {/* Name */}
                <div style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.3px",
                  marginBottom: 5,
                  paddingRight: 32,   /* clear the badge */
                }}>{svc.name}</div>

                {/* Description */}
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12.5, fontWeight: 400,
                  color: "var(--muted)",
                  lineHeight: 1.55,
                  marginBottom: 16,
                }}>{svc.desc}</div>

                {/* Explore row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                }}>
                  <span style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 12.5, fontWeight: 600,
                    color: svc.color, letterSpacing: "0.1px",
                  }}>Explore</span>
                  <FaArrowRight className="hp-arrow" style={{ fontSize: 11, color: svc.color }} />
                </div>

              </div>
            </Link>
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="hp-footer" style={{
          marginTop: 52,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          opacity: 0.5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <FaAws style={{ fontSize: 18, color: "#F59E0B" }} />
            {/* Divider dot */}
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted)" }} />
            <FaMicrosoft style={{ fontSize: 15, color: "#0066FF" }} />
          </div>
          <p style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5, fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "1.4px", textTransform: "uppercase",
            margin: 0,
          }}>Multi-Cloud · Real-time · AI Powered</p>
        </footer>

      </div>
    </>
  );
}