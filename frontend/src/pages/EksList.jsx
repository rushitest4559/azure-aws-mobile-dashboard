import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaDatabase, FaSync, FaExclamationTriangle, FaRobot, FaSpinner, FaCube } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const EksList = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // 🔄 Load cached data from localStorage on mount
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('eksClustersCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // 💾 Save data to localStorage
  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('eksClustersCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('eksListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('eksListScrollPosition');
    }
  }, []);

  const handleNavigate = (name, region) => {
    sessionStorage.setItem('eksListScrollPosition', window.scrollY.toString());
    navigate(`/aws/eks/details/${name}?region=${region}`);
  };

  // 🚫 DISABLE AUTO-FETCH - Only manual sync
  const { data: clusters = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['eksClusters'],
    queryFn: async () => {
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/aws/eks/list`);

      if (!res.ok) {
        throw new Error(`Failed to fetch EKS clusters: ${res.statusText}`);
      }

      const data = await res.json();
      saveToCache(data); // 💾 Auto-save on successful fetch
      return data;
    },
    enabled: false, // 🚫 NEVER auto-fetch
    staleTime: Infinity, // Never consider stale
    cacheTime: Infinity, // Never GC from cache
    retry: false, // No retries
  });

  // 🎯 Load cached data immediately for instant UI
  const cachedData = getCachedData();
  const displayClusters = cachedData?.data || [];

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const clusterData = displayClusters.map(cluster => ({
        name: cluster.name,
        region: cluster.region,
        status: cluster.status,
        endpoint: cluster.endpoint,
        role_arn: cluster.role_arn,
        version: cluster.version,
      }));

      const prompt = `Analyze these EKS clusters and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

EKS Cluster Data:
${JSON.stringify(clusterData, null, 2)}

Focus on:
- Regional distribution and recommendations
- Cluster status (Active/Creating/Deleting)
- Version consistency and upgrade needs
- Potential scaling or cost optimization

Format your response as:
1. First insight here
2. Second insight here
3. Third insight here`;

      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini response:', text);

      const insights = text
        .split('\n')
        .filter(line => line.trim().match(/^\d+[\.)]/))
        .map(line => line.replace(/^\d+[\.)]\s*/, '').trim())
        .filter(line => line.length > 0);

      if (insights.length > 0) {
        setAiSummary(insights.slice(0, 3));
      } else {
        setAiSummary([
          text.trim() || `${displayClusters.length} EKS clusters analyzed successfully`,
          'Review clusters with outdated Kubernetes versions',
          'Consider consolidating regions for better management'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const activeCount = displayClusters.filter(c => c.status?.toLowerCase() === 'active').length;
      const totalClusters = displayClusters.length;

      setAiSummary([
        `${activeCount}/${totalClusters} clusters are active`,
        `Clusters spread across ${new Set(displayClusters.map(c => c.region)).size} regions`,
        'Review endpoint access and security configurations'
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
              EKS Clusters {displayClusters.length > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({displayClusters.length})
                </span>
              )}
            </h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
              title="Sync from AWS (updates cache)"
            >
              <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isFetching ? 'Syncing...' : 'Refresh'}</span>
              <span className="sm:hidden">{isFetching ? 'Syncing' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Show cached data count for AI insights */}
        {displayClusters.length > 0 && (
          <div className="mb-6">
            {!showSummary ? (
              <button
                onClick={generateAISummary}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-emerald-300 disabled:to-teal-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
              >
                <FaRobot className="text-lg" />
                <span className="font-medium">
                  Generate AI Insights ({displayClusters.length} clusters)
                </span>
              </button>
            ) : (
              // AI Summary component
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaRobot className="text-emerald-600" />
                    <h2 className="text-sm font-semibold text-gray-900">AI Insights</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowSummary(false);
                      setAiSummary(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FaSpinner className="text-3xl text-emerald-600 animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Analyzing your EKS clusters...</p>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-3">
                      {aiSummary.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-emerald-600">
                              {index + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 flex-1">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No cached data */}
        {!isFetching && displayClusters.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <FaCube className="text-2xl sm:text-3xl text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No EKS clusters</p>
            <p className="text-sm text-gray-500 mb-4">Press sync to load your AWS EKS clusters</p>
            <div className="text-xs text-gray-400">
              Data loads instantly from cache after first sync
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cluster Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Version</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayClusters.map(cluster => (
                    <tr key={cluster.name} onClick={() => handleNavigate(cluster.name, cluster.region)} className="hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{cluster.name}</td>
                      <td className="px-6 py-4 text-gray-600">{cluster.region}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cluster.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 
                          cluster.status?.toLowerCase() === 'creating' ? 'bg-blue-100 text-blue-800' : 
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {cluster.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{cluster.version || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {displayClusters.map(cluster => (
                <div key={cluster.name} onClick={() => handleNavigate(cluster.name, cluster.region)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">{cluster.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{cluster.region}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        cluster.status?.toLowerCase() === 'active' ? 'bg-green-50 text-green-700' : 
                        cluster.status?.toLowerCase() === 'creating' ? 'bg-blue-50 text-blue-700' : 
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {cluster.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Version</span>
                      <span className="font-medium text-gray-900">{cluster.version || '—'}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tap to view details</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EksList;
