import { useState } from "react";
import { FaDatabase, FaLayerGroup, FaMicrochip, FaCloud, FaServer, FaHdd } from "react-icons/fa";
import { SiKubernetes } from "react-icons/si";
import { Link, useLocation } from "react-router-dom";
import { useMsal, useAccount } from "@azure/msal-react";

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           CLOUD CONTROL — GLOBAL DESIGN SYSTEM              ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FONTS                                                       ║
 * ║  Display / Brand  →  "Syne"   wght 400–800                  ║
 * ║                       geometric, wide, commanding            ║
 * ║  UI / Body        →  "Outfit" wght 300–700                  ║
 * ║                       modern, airy, perfectly readable       ║
 * ║                                                              ║
 * ║  COLORS                                                      ║
 * ║  --ink        #0A0F1E   deepest navy-black (NOT pure black)  ║
 * ║  --ink-soft   #1E2A3B   secondary text, icon fills           ║
 * ║  --surface    #F5F7FA   page / sheet background              ║
 * ║  --card       #FFFFFF   elevated card surface                ║
 * ║  --border     rgba(10,15,30,0.08)  hairline borders          ║
 * ║  --accent     #0066FF   electric blue — primary actions      ║
 * ║  --green      #00C875   live / healthy / success             ║
 * ║  --red        #FF3B30   iOS-native destructive red           ║
 * ║  --muted      #8A95A8   labels, metadata, placeholders       ║
 * ║                                                              ║
 * ║  RADIUS                                                      ║
 * ║  --r-sm 10px  --r-md 14px  --r-lg 20px  --r-xl 26px         ║
 * ║                                                              ║
 * ║  SHADOWS                                                     ║
 * ║  --s-card  0 2px 12px rgba(10,15,30,0.07)                   ║
 * ║  --s-lift  0 8px 32px rgba(10,15,30,0.14)                   ║
 * ║  --s-deep  0 20px 60px rgba(10,15,30,0.22)                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const navLinks = [
    { name: "Storage Accounts", path: "/azure/storage/list", icon: <FaDatabase />,   provider: "Azure" },
    { name: "Function Apps",    path: "/azure/functions",    icon: <FaMicrochip />,  provider: "Azure" },
    { name: "S3 Buckets",       path: "/aws/s3/list",        icon: <FaCloud />,      provider: "AWS"   },
    { name: "EC2 Instances",    path: "/aws/ec2/list",       icon: <FaServer />,     provider: "AWS"   },
    { name: "EKS Clusters",     path: "/aws/eks/list",       icon: <SiKubernetes />, provider: "AWS"   },
    { name: "RDS Databases",    path: "/aws/rds/list",       icon: <FaHdd />,        provider: "AWS"   },
  ];

  const isActive  = (path) => location.pathname === path;
  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
      mainWindowRedirectUri: window.location.origin,
    });
  };

  const userName  = account?.name || account?.username || "User";
  const initials  = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const firstName = userName.split(" ")[0];

  return (
    <>
      {/* ── Design tokens + animations ────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

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
          --r-sm:      10px;
          --r-md:      14px;
          --r-lg:      20px;
          --r-xl:      26px;
          --s-card:    0 2px 12px rgba(10,15,30,0.07);
          --s-lift:    0 8px 32px rgba(10,15,30,0.14);
          --s-deep:    0 20px 60px rgba(10,15,30,0.22);
        }

        .cc, .cc * {
          font-family: 'Outfit', -apple-system, sans-serif;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        /* Drawer */
        .cc-drawer {
          transform: translateY(100%);
          opacity: 0;
          transition:
            transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
            opacity   0.3s  ease;
        }
        .cc-drawer.open {
          transform: translateY(0);
          opacity: 1;
        }

        /* Scrim */
        .cc-scrim {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          background: rgba(10,15,30,0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .cc-scrim.open {
          opacity: 1;
          pointer-events: all;
        }

        /* Nav item stagger */
        @keyframes cc-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .cc-item {
          opacity: 0;
          animation: cc-up 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* Logout red ring — fires once, 1.2s after drawer opens */
        @keyframes cc-ring {
          0%   { box-shadow: 0 0 0 0   rgba(255,59,48,0.45); }
          65%  { box-shadow: 0 0 0 12px rgba(255,59,48,0);   }
          100% { box-shadow: 0 0 0 0   rgba(255,59,48,0);    }
        }
        .cc-logout-ring {
          animation: cc-ring 2.4s ease-out 1.2s 1;
        }

        /* Haptic-feel press */
        .cc-pressable:active { transform: scale(0.97); transition: transform 0.1s ease; }

        /* Hamburger bars */
        .cc-bar {
          display: block;
          width: 18px; height: 1.5px;
          background: var(--ink);
          border-radius: 2px;
          transform-origin: center;
          transition:
            transform 0.28s cubic-bezier(0.4,0,0.2,1),
            opacity   0.2s  ease,
            width     0.28s ease;
        }
      `}</style>

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <nav className="cc" style={{
        position:  "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height:    56,
        background:"rgba(245,247,250,0.9)",
        backdropFilter:         "blur(28px)",
        WebkitBackdropFilter:   "blur(28px)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",          /* ← kills horizontal bleed */
      }}>
        <div style={{
          maxWidth: 680, margin: "0 auto", padding: "0 18px",
          height: "100%", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          minWidth: 0,               /* ← flex children can shrink */
        }}>

          {/* Brand */}
          <Link to="/" onClick={() => setOpen(false)}
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--r-sm)",
              background: "var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(10,15,30,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              flexShrink: 0
            }}>
              <FaLayerGroup style={{ color: "#fff", fontSize: 12 }} />
            </div>
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 17, fontWeight: 700,
              color: "var(--ink)", letterSpacing: "-0.5px", lineHeight: 1
            }}>
              Cloud<span style={{ fontWeight: 400, color: "var(--muted)" }}>Control</span>
            </span>
          </Link>

          {/* Right: avatar pill + menu button */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>

            {/* Avatar pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "4px 11px 4px 5px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 99,
              boxShadow: "var(--s-card)",
              minWidth: 0, maxWidth: "38vw",   /* ← clamp on tiny screens */
              overflow: "hidden",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--ink)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.3px"
                }}>{initials}</span>
              </div>
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13, fontWeight: 500, color: "var(--ink-soft)",
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>{firstName}</span>
            </div>

            {/* Menu button */}
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
              style={{
                width: 36, height: 36, border: "none", cursor: "pointer",
                background: open ? "var(--card)" : "transparent",
                borderRadius: "var(--r-sm)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4.5,
                transition: "background 0.2s",
                boxShadow: open ? "var(--s-card)" : "none",
                padding: 0,
              }}
            >
              <span className="cc-bar" style={{
                transform: open ? "translateY(6px) rotate(45deg)" : "none"
              }} />
              <span className="cc-bar" style={{
                opacity: open ? 0 : 1,
                width:   open ? "0px" : "18px"
              }} />
              <span className="cc-bar" style={{
                transform: open ? "translateY(-6px) rotate(-45deg)" : "none"
              }} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Scrim ─────────────────────────────────────────────────────── */}
      <div className={`cc cc-scrim ${open ? "open" : ""}`}
           onClick={() => setOpen(false)}
           style={{ position: "fixed", inset: 0, zIndex: 48 }} />

      {/* ── Bottom sheet ──────────────────────────────────────────────── */}
      <div className={`cc cc-drawer ${open ? "open" : ""}`} style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 49,
        background: "var(--surface)",
        borderRadius: "22px 22px 0 0",
        boxShadow: "var(--s-deep)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
        maxHeight: "90vh", overflowY: "auto",
      }}>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "13px 0 6px" }}>
          <div style={{ width: 34, height: 3.5, background: "rgba(10,15,30,0.12)", borderRadius: 99 }} />
        </div>

        <div style={{ padding: "4px 16px 0" }}>

          {/* ── User card ─────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "13px 15px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--s-card)",
            marginBottom: 20,
          }}>
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              background: "var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(10,15,30,0.22)"
            }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 15, fontWeight: 700, color: "#fff"
              }}>{initials}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 16, fontWeight: 700,
                color: "var(--ink)", letterSpacing: "-0.3px"
              }}>{firstName}</div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 10.5, fontWeight: 500,
                color: "var(--muted)", letterSpacing: "1.1px",
                textTransform: "uppercase", marginTop: 2
              }}>Cloud Control</div>
            </div>

            {/* Live badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 9px",
              background: "rgba(0,200,117,0.08)",
              border: "1px solid rgba(0,200,117,0.2)",
              borderRadius: 99,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--green)",
                boxShadow: "0 0 7px rgba(0,200,117,0.75)"
              }} />
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 11, fontWeight: 600,
                color: "var(--green)", letterSpacing: "0.1px"
              }}>Live</span>
            </div>
          </div>

          {/* ── Section label ────────────────────────────────────── */}
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5, fontWeight: 600, color: "var(--muted)",
            letterSpacing: "1.3px", textTransform: "uppercase",
            marginBottom: 9, paddingLeft: 3
          }}>Services</div>

          {/* ── Nav cards ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
            {navLinks.map((link, i) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`cc-item cc-pressable`}
                  style={{
                    display: "flex", alignItems: "center", gap: 13,
                    padding: "13px 14px",
                    borderRadius: "var(--r-md)",
                    textDecoration: "none",
                    animationDelay: `${i * 0.048}s`,
                    transition: "box-shadow 0.2s ease, background 0.2s ease",
                    background: active ? "var(--ink)" : "var(--card)",
                    border: active ? "none" : "1px solid var(--border)",
                    boxShadow: active
                      ? "0 6px 24px rgba(10,15,30,0.28)"
                      : "var(--s-card)",
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: "var(--r-sm)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    background: active ? "rgba(255,255,255,0.1)" : "var(--surface)",
                    border: `1px solid ${active ? "rgba(255,255,255,0.07)" : "var(--border)"}`,
                  }}>
                    <span style={{ fontSize: 15, color: active ? "#fff" : "var(--ink-soft)" }}>
                      {link.icon}
                    </span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 15, fontWeight: 600,
                      color: active ? "#fff" : "var(--ink)",
                      letterSpacing: "-0.1px",
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis"
                    }}>{link.name}</div>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 10.5, fontWeight: 500,
                      color: active ? "rgba(255,255,255,0.38)" : "var(--muted)",
                      letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 1.5
                    }}>{link.provider}</div>
                  </div>

                  {/* Trailing */}
                  {active ? (
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: "var(--green)",
                      boxShadow: "0 0 10px rgba(0,200,117,0.85)"
                    }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="var(--muted)" strokeWidth="2.5"
                         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Sign Out ─────────────────────────────────────────── */}
          {/*
           * Apple's destructive pattern: restraint IS the signal.
           * No red background. No icon overload. Just the iOS red
           * on white — and one pulse ring that fires once.
           * The user FEELS the weight of this button before they tap it.
           */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button
              onClick={handleLogout}
              className="cc-pressable cc-logout-ring"
              style={{
                width: "100%",
                padding: "15px",
                background: "var(--card)",
                border: "1.5px solid rgba(255,59,48,0.25)",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                transition: "all 0.22s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background      = "#FFF5F4";
                e.currentTarget.style.borderColor     = "rgba(255,59,48,0.5)";
                e.currentTarget.style.boxShadow       = "0 4px 20px rgba(255,59,48,0.12)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background  = "var(--card)";
                e.currentTarget.style.borderColor = "rgba(255,59,48,0.25)";
                e.currentTarget.style.boxShadow   = "none";
              }}
              onTouchStart={e => {
                e.currentTarget.style.background  = "#FFF5F4";
                e.currentTarget.style.borderColor = "rgba(255,59,48,0.5)";
              }}
              onTouchEnd={e => {
                e.currentTarget.style.background  = "var(--card)";
                e.currentTarget.style.borderColor = "rgba(255,59,48,0.25)";
              }}
            >
              {/* Door-exit icon — clean, 2px stroke */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="#FF3B30" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 14.5, fontWeight: 600,
                color: "#FF3B30", letterSpacing: "0.1px"
              }}>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}