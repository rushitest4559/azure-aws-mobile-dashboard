import { useState } from "react";
import { FaDatabase, FaLayerGroup, FaMicrochip, FaCloud, FaServer, FaHdd } from "react-icons/fa";
import { SiKubernetes } from "react-icons/si";
import { Link, useLocation } from "react-router-dom";
import { useMsal, useAccount } from "@azure/msal-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const navLinks = [
    { name: "Storage Accounts", path: "/azure/storage/list", icon: <FaDatabase /> },
    { name: "Function Apps", path: "/azure/functions", icon: <FaMicrochip /> },
    { name: "S3 Buckets", path: "/aws/s3/list", icon: <FaCloud /> },
    { name: "EC2 Instances", path: "/aws/ec2/list", icon: <FaServer /> },
    { name: "EKS Clusters", path: "/aws/eks/list", icon: <SiKubernetes /> },
    { name: "RDS Databases", path: "/aws/rds/list", icon: <FaHdd /> },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    const logoutRequest = {
      postLogoutRedirectUri: window.location.origin,
      mainWindowRedirectUri: window.location.origin,
    };
    instance.logoutRedirect(logoutRequest);
  };

  const userName = account.name || account.username || "User";

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          
          {/* BRAND */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
            <div className="relative w-9 h-9 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900/70 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-105 transition-all duration-200 border border-white/20">
              <FaLayerGroup className="text-white text-sm drop-shadow-sm" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 rounded-xl blur-sm -z-10" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-base font-black text-gray-900 tracking-tight">Cloud</span>
              <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase">Control</span>
            </div>
          </Link>

          {/* DESKTOP NAV - Only on XL+ */}
          <div className="hidden xl:flex items-center gap-1 px-4 py-2 bg-slate-50/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center gap-1 rounded-lg whitespace-nowrap ${
                  isActive(link.path)
                    ? "text-slate-900 bg-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${isActive(link.path) ? 'bg-slate-900 scale-110' : 'bg-current opacity-50'}`} />
                {link.name}
              </Link>
            ))}
          </div>

          {/* DESKTOP USER & LOGOUT - lg and up */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 backdrop-blur-sm rounded-full border border-slate-100 hover:border-slate-200 transition-all">
              <div className="w-7 h-7 bg-gradient-to-br from-slate-900 to-purple-900 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-xs font-bold text-white leading-none">
                  {userName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-24 truncate">
                {userName.split(" ")[0]}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all hover:scale-105"
            onClick={() => setOpen(!open)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* MOBILE MENU - FIXED HEIGHT + SCROLLABLE */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
            open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pt-3 pb-6 px-4 bg-gradient-to-b from-white/95 to-slate-50/90 backdrop-blur-xl border-t border-slate-100 shadow-2xl">
            
            {/* Mobile User */}
            <div className="flex items-center gap-3 py-4 px-4 bg-gradient-to-r from-slate-50 to-blue-50/50 backdrop-blur-sm rounded-2xl mb-6 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-sm font-bold text-white leading-none">
                  {userName.split(" ")[0]?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-slate-900 truncate">Hi, {userName.split(" ")[0]}</div>
                <div className="text-sm text-slate-500 tracking-wider uppercase">Cloud Control</div>
              </div>
            </div>

            {/* Mobile Nav Links - FULLY SCROLLABLE */}
            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pb-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group hover:shadow-lg active:scale-[0.98] border ${
                    isActive(link.path)
                      ? "bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-200 shadow-md bg-white"
                      : "bg-white/80 hover:bg-white border border-slate-100/50 hover:border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105 shadow-sm ${
                    isActive(link.path) 
                      ? "bg-gradient-to-r from-blue-500 to-emerald-500 shadow-lg" 
                      : "bg-gradient-to-r from-slate-100 to-slate-200"
                  }`}>
                    <span className={`text-xl ${isActive(link.path) ? 'text-white drop-shadow-sm' : 'text-slate-600'}`}>
                      {link.icon}
                    </span>
                  </div>
                  <span className="font-semibold text-base tracking-wide flex-1 min-w-0 truncate">{link.name}</span>
                  {isActive(link.path) && (
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg animate-pulse flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border-2 border-red-100 hover:from-rose-100 hover:to-red-100 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-rose-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                </svg>
              </div>
              <span className="font-semibold text-base text-red-700 tracking-wide flex-1">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
