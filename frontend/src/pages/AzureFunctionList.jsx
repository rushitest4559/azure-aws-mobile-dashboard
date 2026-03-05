import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaServer, FaSync, FaExclamationTriangle, FaRobot, FaSpinner } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const AzureFunctionsList = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // 🔄 Load cached data from localStorage on mount
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('azureFunctionsCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // 💾 Save data to localStorage
  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('azureFunctionsCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('azureFunctionsListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('azureFunctionsListScrollPosition');
    }
  }, []);

  const handleNavigate = (name, resourceGroup) => {
    sessionStorage.setItem('azureFunctionsListScrollPosition', window.scrollY.toString());
    navigate(`/azure/functions/${name}?rg=${resourceGroup}`);
  };

  // 🚫 DISABLE AUTO-FETCH - Only manual sync
  const { data: functions = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['azureFunctions'],
    queryFn: async () => {
      const subscriptionId = import.meta.env.VITE_AZURE_SUBSCRIPTION_ID;
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/azure/functions/list?subscription_id=${subscriptionId}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch functions: ${res.statusText}`);
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
  const displayFunctions = cachedData?.data || [];

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const functionData = displayFunctions.map(func => ({
        name: func.name,
        location: func.location,
        kind: func.kind,
        resource_group: func.resource_group,
        state: func.state,
      }));

      const prompt = `Analyze these Azure Function Apps and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Function App Data:
${JSON.stringify(functionData, null, 2)}

Focus on:
- Regional distribution and recommendations
- Function app states (Running/Stopped)
- Resource organization patterns
- Potential scaling or cost optimization opportunities

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
          text.trim() || `${displayFunctions.length} Azure Function apps analyzed successfully`,
          'Review stopped functions for potential cleanup or restart',
          'Consider consistent regional deployment for better latency'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const runningCount = displayFunctions.filter(f => f.state?.toLowerCase() === 'running').length;
      const totalFunctions = displayFunctions.length;

      setAiSummary([
        `${runningCount}/${totalFunctions} Function apps are running`,
        `Functions spread across ${new Set(displayFunctions.map(f => f.location)).size} regions`,
        'Review resource group organization for better management'
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
              Function Apps {displayFunctions.length > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({displayFunctions.length})
                </span>
              )}
            </h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
              title="Sync from Azure (updates cache)"
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
        {displayFunctions.length > 0 && (
          <div className="mb-6">
            {!showSummary ? (
              <button
                onClick={generateAISummary}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
              >
                <FaRobot className="text-lg" />
                <span className="font-medium">
                  Generate AI Insights ({displayFunctions.length} apps)
                </span>
              </button>
            ) : (
              // AI Summary component (unchanged)
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaRobot className="text-blue-600" />
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
                      <FaSpinner className="text-3xl text-blue-600 animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Analyzing your Function apps...</p>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-3">
                      {aiSummary.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-blue-600">
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
        {!isFetching && displayFunctions.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <FaServer className="text-2xl sm:text-3xl text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No Function apps</p>
            <p className="text-sm text-gray-500 mb-4">Press sync to load your Azure Function apps</p>
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
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Function App</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">State</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kind</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayFunctions.map(func => (
                    <tr key={func.name} onClick={() => handleNavigate(func.name, func.resource_group)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{func.name}</td>
                      <td className="px-6 py-4 text-gray-600">{func.location}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          func.state?.toLowerCase() === 'running' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {func.state || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{func.kind}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {displayFunctions.map(func => (
                <div key={func.name} onClick={() => handleNavigate(func.name, func.resource_group)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">{func.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{func.resource_group}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        func.state?.toLowerCase() === 'running' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {func.state || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-gray-900">{func.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Kind</span>
                      <span className="font-medium text-gray-900">{func.kind}</span>
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

export default AzureFunctionsList;
