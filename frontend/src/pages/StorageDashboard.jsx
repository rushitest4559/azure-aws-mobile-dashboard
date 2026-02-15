import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaAws, FaMicrosoft, FaArrowLeft } from "react-icons/fa";
import S3List from "./S3List"; 
import AzureList from "./AzureList"; 

export default function StorageDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [provider, setProvider] = useState(searchParams.get("provider") || "aws");

  // Update URL when provider changes
  useEffect(() => {
    setSearchParams({ provider });
  }, [provider, setSearchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Fixed Glassmorphic Toggle Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back Button */}
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              <FaArrowLeft className="text-xs" />
              <span className="hidden sm:inline">Home</span>
            </button>

            {/* Provider Toggle - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="inline-flex bg-gray-100/80 backdrop-blur-sm rounded-full p-1 gap-1 shadow-sm">
                <button
                  onClick={() => setProvider("aws")}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    provider === "aws" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FaAws className="text-base" />
                  <span>AWS</span>
                </button>
                <button
                  onClick={() => setProvider("azure")}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    provider === "azure" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FaMicrosoft className="text-base" />
                  <span>Azure</span>
                </button>
              </div>
            </div>

            {/* Spacer for alignment */}
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-16">
        <main>
          <div className="transition-opacity duration-300">
            {provider === "aws" ? <S3List /> : <AzureList />}
          </div>
        </main>
      </div>
    </div>
  );
}