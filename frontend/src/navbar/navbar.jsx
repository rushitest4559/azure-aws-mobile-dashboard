import { useState } from "react";
import { FaDatabase, FaLayerGroup, FaMicrochip, FaCloud, FaServer, FaHdd } from "react-icons/fa";
import { SiKubernetes } from "react-icons/si";
import { Link, useLocation } from "react-router-dom";
import { useMsal, useAccount } from "@azure/msal-react";

/*
 * Navbar — Apple-inspired, mobile-first
 * Design language: SF-style clarity · frosted glass · physical motion · zero noise
 * Mobile: full-sheet drawer with icon-first nav cards
 * Logout: minimal, red, impossible to forget — no decoration needed
 */

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const navLinks = [
    { name: "Storage Accounts", path: "/azure/storage/list", icon: <FaDatabase />, label: "Azure" },
    { name: "Function Apps",    path: "/azure/functions",    icon: <FaMicrochip />, label: "Azure" },
    { name: "S3 Buckets",       path: "/aws/s3/list",        icon: <FaCloud />,     label: "AWS"   },
    { name: "EC2 Instances",    path: "/aws/ec2/list",       icon: <FaServer />,    label: "AWS"   },
    { name: "EKS Clusters",     path: "/aws/eks/list",       icon: <SiKubernetes />,label: "AWS"   },
    { name: "RDS Databases",    path: "/aws/rds/list",       icon: <FaHdd />,       label: "AWS"   },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    const logoutRequest = {
      postLogoutRedirectUri: window.location.origin,
      mainWindowRedirectUri: window.location.origin,
    };
    instance.logoutRedirect(logoutRequest);
  };

  const userName = account?.name || account?.username || "User";
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const firstName = userName.split(" ")[0];

  return (
    <>
      {/* ─── Inject keyframes & font ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .nav-root * { font-family: 'DM Sans', -apple-system, sans-serif; }

        /* Drawer slide-up */
        .drawer-enter  { transform: translateY(100%); opacity: 0; }
        .drawer-open   { transform: translateY(0);    opacity: 1; }
        .drawer-closed { transform: translateY(100%); opacity: 0; pointer-events: none; }

        /* Overlay fade */
        .overlay-open   { opacity: 1; pointer-events: all; }
        .overlay-closed { opacity: 0; pointer-events: none; }

        /* Nav card press */
        .nav-card:active { transform: scale(0.97); }

        /* Logout pulse ring on mount */
        @keyframes ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
          70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0);  }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0);     }
        }
        .logout-btn { animation: ring-pulse 2.4s ease-out 0.8s 1; }
        .logout-btn:active { transform: scale(0.96); }

        /* Stagger fade-up for nav cards */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-card-animate {
          opacity: 0;
          animation: fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
        }
      `}</style>

      <nav className="nav-root fixed top-0 w-full z-50"
           style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>

        <div className="max-w-2xl mx-auto px-5">
          <div className="flex justify-between items-center" style={{ height: 56 }}>

            {/* ── Brand ──────────────────────────────────────────── */}
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}
                  style={{ textDecoration: "none" }}>
              <div style={{
                width: 34, height: 34,
                background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)"
              }}>
                <FaLayerGroup style={{ color: "#fff", fontSize: 13 }} />
              </div>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
                  Cloud<span style={{ fontWeight: 300 }}>Control</span>
                </div>
              </div>
            </Link>

            {/* ── Right: avatar + hamburger ───────────────────────── */}
            <div className="flex items-center gap-3">

              {/* Avatar — always visible */}
              <div style={{
                width: 32, height: 32,
                background: "linear-gradient(145deg, #0f172a 0%, #334155 100%)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>
                  {initials}
                </span>
              </div>

              {/* Hamburger */}
              <button
                onClick={() => setOpen(!open)}
                style={{
                  width: 36, height: 36,
                  background: open ? "#f1f5f9" : "transparent",
                  border: "none", borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "background 0.2s"
                }}
                aria-label="Menu"
              >
                {/* Animated lines → X */}
                <div style={{ width: 18, height: 14, position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 0, width: "100%", height: 1.5,
                    background: "#0f172a", borderRadius: 2,
                    top: open ? "50%" : 0,
                    transform: open ? "translateY(-50%) rotate(45deg)" : "none",
                    transition: "all 0.26s cubic-bezier(0.4,0,0.2,1)"
                  }} />
                  <span style={{
                    position: "absolute", left: 0, width: "100%", height: 1.5,
                    background: "#0f172a", borderRadius: 2, top: "50%", marginTop: -0.75,
                    opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "scaleX(1)",
                    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)"
                  }} />
                  <span style={{
                    position: "absolute", left: 0, width: "100%", height: 1.5,
                    background: "#0f172a", borderRadius: 2,
                    bottom: open ? "50%" : 0,
                    transform: open ? "translateY(50%) rotate(-45deg)" : "none",
                    transition: "all 0.26s cubic-bezier(0.4,0,0.2,1)"
                  }} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Scrim overlay ──────────────────────────────────────── */}
      <div
        onClick={() => setOpen(false)}
        className={`overlay-${open ? "open" : "closed"}`}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.32)",
          backdropFilter: "blur(2px)",
          transition: "opacity 0.3s ease"
        }}
      />

      {/* ─── Bottom Sheet Drawer ─────────────────────────────────── */}
      <div
        className={`drawer-${open ? "open" : "closed"}`}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#f8fafc",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          padding: "0 0 calc(env(safe-area-inset-bottom) + 24px)",
          transition: "transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
          maxHeight: "88vh", overflowY: "auto"
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2 }} />
        </div>

        <div style={{ padding: "0 20px" }}>

          {/* ── User greeting ─────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: "#fff",
            borderRadius: 16,
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)"
          }}>
            <div style={{
              width: 44, height: 44,
              background: "linear-gradient(145deg, #0f172a 0%, #334155 100%)",
              borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{initials}</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.2px" }}>
                {firstName}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.4px", marginTop: 1 }}>
                CLOUD CONTROL
              </div>
            </div>
          </div>

          {/* ── Section label ─────────────────────────────────── */}
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.8px", marginBottom: 10, paddingLeft: 4 }}>
            SERVICES
          </div>

          {/* ── Nav Cards ─────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {navLinks.map((link, i) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className="nav-card nav-card-animate"
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px",
                    background: active ? "#0f172a" : "#fff",
                    borderRadius: 14,
                    textDecoration: "none",
                    border: active ? "none" : "1px solid rgba(0,0,0,0.05)",
                    boxShadow: active
                      ? "0 4px 14px rgba(15,23,42,0.25)"
                      : "0 1px 3px rgba(0,0,0,0.05)",
                    transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                    animationDelay: `${i * 0.045}s`,
                    cursor: "pointer"
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "rgba(255,255,255,0.12)" : "#f1f5f9",
                  }}>
                    <span style={{ fontSize: 16, color: active ? "#fff" : "#475569" }}>
                      {link.icon}
                    </span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600,
                      color: active ? "#fff" : "#0f172a",
                      letterSpacing: "-0.1px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}>
                      {link.name}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 500,
                      color: active ? "rgba(255,255,255,0.5)" : "#94a3b8",
                      letterSpacing: "0.4px", marginTop: 1
                    }}>
                      {link.label}
                    </div>
                  </div>

                  {/* Active dot */}
                  {active && (
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#4ade80",
                      boxShadow: "0 0 6px rgba(74,222,128,0.8)",
                      flexShrink: 0
                    }} />
                  )}

                  {/* Chevron */}
                  {!active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                         style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Sign Out — the unforgettable button ───────────── */}
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "16px",
              background: "#fff",
              border: "1.5px solid #fca5a5",
              borderRadius: 14,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 1px 3px rgba(239,68,68,0.08)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#fff1f2";
              e.currentTarget.style.borderColor = "#f87171";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#fca5a5";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(239,68,68,0.08)";
            }}
          >
            {/* Exit icon — single stroke, clean */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                 stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: "#ef4444", letterSpacing: "-0.1px"
            }}>
              Sign Out
            </span>
          </button>

        </div>
      </div>
    </>
  );
}