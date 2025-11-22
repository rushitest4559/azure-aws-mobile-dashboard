import { useState } from "react";
import { FaHome } from "react-icons/fa"; // "Home" icon
import { Link } from "react-router-dom";

export default function Navbar({ signOut, user }) {
    const [open, setOpen] = useState(false);

    return (
        <nav className="bg-gray-900 text-white fixed w-full top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-14">
                {/* HOME Icon/button */}
                <Link
                    to="/"
                    className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-700 transition"
                >
                    <FaHome className="h-5 w-5" />
                    <span className="font-semibold">HOME</span>
                </Link>
                {/* Desktop Nav Links */}
                <div className="hidden sm:flex space-x-5">
                    <a
                        href="instances"
                        className="px-3 py-2 uppercase rounded hover:bg-gray-700 transition-all duration-200"
                    >
                        Instances
                    </a>
                    <div>Hello, {user?.signInDetails?.loginId || 'User'}</div>
                    <button onClick={signOut} style={{ background: 'red', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
                <button
                    className="sm:hidden flex items-center px-3 py-2"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                    </svg>
                </button>
            </div>

            {open && (
                <div className="sm:hidden fixed inset-0 bg-black bg-opacity-40 z-50" onClick={() => setOpen(false)}>
                    <div
                        className="fixed right-0 top-0 h-full w-56 bg-gray-900 shadow-2xl flex flex-col py-6 px-4 transition-transform duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="self-end mb-8"
                            onClick={() => setOpen(false)}
                            aria-label="Close menu"
                        >
                            {/* बंदचं चिन्ह */}
                            <svg className="h-7 w-7" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <a
                            href="instances"
                            className="px-3 py-2 uppercase rounded hover:bg-gray-700 transition-all duration-200"
                            onClick={() => setOpen(false)}
                        >
                            Instances
                        </a>
                        <div>Hello, {user?.signInDetails?.loginId || 'User'}</div>
                        <button onClick={signOut} style={{ background: 'red', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
