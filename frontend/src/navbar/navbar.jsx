import { useState } from "react";
import { 
  FaHome, FaServer, FaBars, FaTimes, FaBoxOpen, 
  FaCode, FaShieldAlt, FaTable, FaDatabase, FaCubes 
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Navigation items matching your new Home page grid
  const navLinks = [
    { name: "Instances", path: "/instances", icon: <FaServer /> },
    { name: "S3", path: "/s3", icon: <FaBoxOpen /> },
    { name: "Lambda", path: "/lambda", icon: <FaCode /> },
    { name: "IAM", path: "/iam", icon: <FaShieldAlt /> },
    { name: "RDS", path: "/rds", icon: <FaDatabase /> },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link
            to="/"
            className="flex items-center space-x-2 group"
            onClick={() => setOpen(false)}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg transition-transform group-hover:scale-110 shadow-sm">
              <FaHome className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight text-lg">AWS Dash</span>
          </Link>

          {/* DESKTOP LINKS (Hidden on small screens) */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${
                  isActive(link.path)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU (Slide Down) */}
      <div
        className={`lg:hidden bg-white border-b border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-1">
          {/* Home link for mobile */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className={`flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-bold ${
              isActive("/") ? "bg-blue-600 text-white" : "text-gray-600"
            }`}
          >
            <FaHome /> <span>Dashboard Home</span>
          </Link>

          <div className="h-[1px] bg-gray-100 my-2 mx-4"></div>

          {/* Service links for mobile */}
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-bold ${
                isActive(link.path)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-gray-50 text-gray-600 active:bg-gray-100"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}