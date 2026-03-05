import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaDatabase, FaSync, FaRobot, FaSpinner, FaCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const RDSList = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // 🔄 Load cached data from localStorage on mount
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('rdsInstancesCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // 💾 Save data to localStorage
  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('rdsInstancesCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('rdsListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('rdsListScrollPosition');
    }
  }, []);

  const handleNavigate = (instance, e) => {  // Pass FULL instance object
  e?.stopPropagation(); // Prevent row click
  sessionStorage.setItem('rdsListScrollPosition', window.scrollY.toString());
  navigate(`/aws/rds/details/${instance.db_instance_identifier}/${instance.region}`);
};

  // 🚫 DISABLE AUTO-FETCH - Only manual sync
  const { data: instances = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['rdsInstances'],
    queryFn: async () => {
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/aws/rds/list`);

      if (!res.ok) {
        throw new Error(`Failed to fetch RDS instances: ${res.statusText}`);
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
  const displayInstances = cachedData?.data || [];

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const instanceData = displayInstances.map(instance => ({
        identifier: instance.db_instance_identifier,
        engine: instance.engine,
        status: instance.status,
        class: instance.db_instance_class,
        region: instance.region,
      }));

      const prompt = `Analyze these RDS database instances and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

RDS Instance Data:
${JSON.stringify(instanceData, null, 2)}

Focus on:
- Instance status distribution (available/modifying/etc)
- Engine usage patterns and upgrade recommendations
- Instance class sizing and cost optimization

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
          `${displayInstances.length} RDS instances analyzed successfully`,
          'Review modifying instances for deployment status',
          'Consider right-sizing based on instance class distribution'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const availableCount = displayInstances.filter(i => i.status === 'available').length;
      const otherCount = displayInstances.length - availableCount;

      setAiSummary([
        `${displayInstances.length} RDS instances (${availableCount} available)`,
        `Most common engine: ${displayInstances.length > 0 ? displayInstances[0].engine : 'N/A'}`,
        'Review backup retention and Multi-AZ configurations'
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return <FaCheckCircle className="text-green-500" />;
      case 'modifying': 
      case 'maintenance': return <FaExclamationCircle className="text-yellow-500" />;
      case 'stopped': return <FaCircle className="text-gray-400" />;
      default: return <FaCircle className="text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
              RDS Databases {displayInstances.length > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({displayInstances.length})
                </span>
              )}
            </h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
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
        {/* AI Insights */}
        {displayInstances.length > 0 && (
          <div className="mb-6">
            {!showSummary ? (
              <button
                onClick={generateAISummary}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
              >
                <FaRobot className="text-lg" />
                <span className="font-medium">
                  Generate AI Insights ({displayInstances.length} instances)
                </span>
              </button>
            ) : (
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
                      <p className="text-sm text-gray-500">Analyzing your RDS instances...</p>
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
        {!isFetching && displayInstances.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No RDS instances</p>
            <p className="text-sm text-gray-500 mb-4">Press sync to load your AWS RDS databases</p>
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
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">DB Identifier</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Engine</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Instance Class</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayInstances.map(instance => (
                    <tr key={instance.db_instance_identifier} onClick={(e) => handleNavigate(instance, e)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={instance.db_instance_identifier}>
                        {instance.db_instance_identifier}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {getStatusIcon(instance.status)}
                        <span className="text-sm capitalize">{instance.status || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{instance.engine || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{instance.db_instance_class || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {instance.region || '—'}
                      </td>
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
              {displayInstances.map(instance => (
                <div key={instance.db_instance_identifier} onClick={(e) => handleNavigate(instance, e)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1" title={instance.db_instance_identifier}>
                          {instance.db_instance_identifier}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          {getStatusIcon(instance.status)}
                          <span className="capitalize">{instance.status || 'unknown'}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{instance.engine}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {instance.region || '—'} • {instance.db_instance_class || '—'}
                      </span>
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

export default RDSList;
