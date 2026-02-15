import { useState } from "react";
import { FaDatabase, FaBars, FaTimes, FaLayerGroup } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Storage Assets", path: "/storage", icon: <FaDatabase /> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-16">
          
          {/* BRAND LOGO - Abstract Geometric */}
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
            <button className="bg-gray-900 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest hover:bg-blue-600 transition-colors">
              Refresh All
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
        </div>
      </div>
    </nav>
  );
}