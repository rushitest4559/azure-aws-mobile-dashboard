import {
  FaDatabase,
  FaArrowRight,
  FaMagic
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="pt-20 pb-12 px-6 min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-md mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {/* Applied gradient to text */}
          Storage <span className="text-transparent bg-clip-text bg-gradient-to-tr from-blue-700 to-indigo-500">Intelligence</span>
        </h1>
        <p className="text-gray-500 mt-3 text-sm leading-relaxed">
          Unified view of S3 & Azure Storage with AI-generated data summaries.
        </p>
      </div>

      {/* Unified Storage Section */}
      <div className="w-full max-w-md">
        <Link
          to="/storage"
          className="group p-6 bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-indigo-400 transition-all duration-300 relative overflow-hidden flex flex-col"
        >
          {/* AI Powered Badge - Updated to use the gradient */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-tr from-blue-700 to-indigo-500 text-white px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <FaMagic /> AI Powered
          </div>

          {/* Icon Container - Now matches your favorite logo style */}
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl mb-4 bg-gradient-to-tr from-blue-700 to-indigo-500 text-white shadow-md group-hover:rotate-12 transition-transform duration-300">
            <FaDatabase className="text-xl" />
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-1">All Storage Assets</h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-6">
            View a consolidated list of S3 buckets and Storage accounts across all regions.
          </p>

          {/* View Dashboard Link - Updated color to match blue-700 */}
          <div className="flex items-center text-blue-700 font-bold text-[10px] uppercase tracking-wider ">
            View Dashboard <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Infrastructure Note */}
      <div className="mt-auto pt-16 flex flex-col items-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
          Unified API • Real-time Sync
        </p>
      </div>
    </div>
  );
}