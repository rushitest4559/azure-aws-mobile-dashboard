import { useState } from "react";
import { FaHome, FaServer, FaBars, FaTimes } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Helper to highlight the active link
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: "Instances", path: "/instances", icon: <FaServer className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO / HOME */}
          <Link
            to="/"
            className="flex items-center space-x-2 group"
            onClick={() => setOpen(false)}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg transition-transform group-hover:scale-110">
              <FaHome className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight text-lg">AWS Dash</span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden sm:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive(link.path)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
            onClick={() => setOpen(!open)}
          >
            {open ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU (Slide Down) */}
      <div
        className={`sm:hidden bg-white border-b border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold ${
                isActive(link.path)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-gray-50 text-gray-700 active:bg-gray-100"
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}