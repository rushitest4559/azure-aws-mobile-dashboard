import { FaServer, FaShieldAlt, FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="pt-24 px-6 min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Cloud <span className="text-blue-600">Overview</span>
        </h1>
        <p className="text-gray-600 mt-4 text-lg">
          Monitor your multi-region AWS infrastructure from a single, 
          mobile-optimized dashboard.
        </p>
      </div>

      {/* Main Navigation Card */}
      <Link 
        to="/instances" 
        className="group w-full max-w-md p-6 bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <FaServer size={80} className="text-blue-600" />
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <FaServer className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">EC2 Instances</h2>
        </div>
        
        <p className="text-gray-600 text-sm mb-6">
          View all running and stopped instances across every AWS region 
          using parallel discovery.
        </p>
        
        <div className="flex items-center text-blue-600 font-semibold text-sm">
          Go to Instances <FaArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
        </div>
      </Link>

      {/* System Status / Quick Info */}
      <div className="mt-8 w-full max-w-md grid grid-cols-1 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-start space-x-4">
          <div className="p-2 bg-green-100 rounded-full">
            <FaShieldAlt className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Security Status</h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 font-medium">
              <li className="flex items-center italic">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> 
                IAM Least-Privilege Active
              </li>
              <li className="flex items-center italic">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> 
                API Gateway TLS 1.2 Encrypted
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <p className="mt-12 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        Infrastructure managed via Terraform
      </p>
    </div>
  );
}