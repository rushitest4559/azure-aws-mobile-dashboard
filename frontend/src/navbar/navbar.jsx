import { useState } from "react";
import { FaDatabase, FaBars, FaTimes, FaLayerGroup } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useMsal, useAccount } from "@azure/msal-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0] || {});

  const navLinks = [
    { name: "Storage Assets", path: "/storage", icon: <FaDatabase /> },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    const logoutRequest = {
      postLogoutRedirectUri: window.location.origin,
      mainWindowRedirectUri: window.location.origin
    };
    instance.logoutRedirect(logoutRequest);
  };

  // Get display name or fallback to username
  const userName = account.name || account.username || "User";

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-16">
          
          {/* BRAND LOGO */}
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
            <div className="relative h-8 w-8 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-lg flex items-center justify-center shadow-md group-hover:rotate-12 transition-transform duration-300">
               <FaLayerGroup className="text-white text-xs" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black text-gray-900 tracking-widest uppercase">Cloud</span>
              <span className="text-[10px] font-medium text-blue-600 tracking-[0.2em] uppercase">Control</span>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-5 py-2 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
                  isActive(link.path)
                    ? "text-blue-600"
                    : "text-gray-400 hover:text-gray-900"
                }`}
              >
                {link.name}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </Link>
            ))}
            <div className="h-4 w-[1px] bg-gray-200 mx-4" />
            
            {/* USER GREETING */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-full backdrop-blur-sm border border-gray-200">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white leading-none">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900 hidden sm:inline">
                Hi, {userName.split(' ')[0]}
              </span>
            </div>
            
            <button className="bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest hover:bg-blue-600 transition-colors">
              Refresh All
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest hover:bg-red-800 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* MOBILE TOGGLE */}
          <button 
            className="lg:hidden text-gray-900 p-2" 
            onClick={() => setOpen(!open)}
          >
            {open ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${open ? "max-h-64 bg-white border-b" : "max-h-0"}`}>
        <div className="p-6 space-y-4">
          
          {/* MOBILE USER GREETING */}
          <div className="flex items-center gap-3 py-2 px-1 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white leading-none">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">Hi, {userName.split(' ')[0]}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Cloud Control</div>
            </div>
          </div>
          
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-4 text-xs font-black uppercase tracking-widest ${
                isActive(link.path) ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {link.icon} {link.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-red-600 text-xs font-black uppercase tracking-widest flex items-center gap-3 py-2"
          >
            <div className="w-5 h-5 bg-red-100 rounded-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </div>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
