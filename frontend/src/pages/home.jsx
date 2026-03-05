import {
  FaDatabase,
  FaArrowRight,
  FaMagic,
  FaCloud,
  FaMicrochip,
  FaServer,
  FaHdd,
  FaAws,
  FaMicrosoft
} from "react-icons/fa";
import { SiKubernetes } from "react-icons/si";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="pt-20 pb-12 px-6 min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center">
      {/* Hero Section - Clean & Minimal */}
      <div className="text-center max-w-lg mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
          Cloud<span className="text-purple-600 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text"> Intelligence</span>
        </h1>

        <p className="text-gray-600 text-base leading-relaxed">
          Unified dashboard for your AWS & Azure infrastructure.
          <span className="font-semibold text-purple-600">AI-powered insights</span> included.
        </p>
      </div>

      {/* Cards Grid - Apple-style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mb-16">

        {/* AWS EKS Clusters */}
        <Link
          to="/aws/eks/list"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-indigo-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <SiKubernetes className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">EKS Clusters</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">Kubernetes clusters, networking & security</p>
          <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* AWS S3 Buckets */}
        <Link
          to="/aws/s3/list"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-emerald-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <FaCloud className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">S3 Buckets</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">Bucket distribution & lifecycle analysis</p>
          <div className="flex items-center text-emerald-600 font-medium text-sm group-hover:text-emerald-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* AWS EC2 Instances */}
        <Link
          to="/aws/ec2/list"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-orange-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <FaServer className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors">EC2 Instances</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">Health monitoring & right-sizing</p>
          <div className="flex items-center text-orange-600 font-medium text-sm group-hover:text-orange-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* AWS RDS Databases */}
        <Link
          to="/aws/rds/list"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-blue-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <FaDatabase className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">RDS Databases</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">Performance & scaling insights</p>
          <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Azure Storage Accounts */}
        <Link
          to="/azure/storage/list"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-purple-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <FaHdd className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Azure Storage</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">SKU optimization & regional analysis</p>
          <div className="flex items-center text-purple-600 font-medium text-sm group-hover:text-purple-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Azure Function Apps */}
        <Link
          to="/azure/functions"
          className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-pink-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-[220px] overflow-hidden"
        >
          <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-2xl blur-xl group-hover:scale-105 transition-transform" />
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white mb-4 shadow-lg group-hover:scale-105 transition-transform mx-auto">
            <FaMicrochip className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-700 transition-colors">Function Apps</h2>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">Serverless performance insights</p>
          <div className="flex items-center text-pink-600 font-medium text-sm group-hover:text-pink-700">
            Explore <FaArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Footer - Minimal */}
      <div className="mt-auto flex flex-col items-center space-y-2 opacity-60">
        <div className="flex items-center gap-4">
          <FaAws className="w-5 h-5 text-orange-500" />
          <FaMicrosoft className="w-5 h-5 text-blue-500" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Multi-Cloud • Real-time • AI Powered
        </p>
      </div>
    </div>
  );
}
