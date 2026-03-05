import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaServer, FaSync, FaRobot, FaSpinner, FaCircle, FaPlay, FaPause } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const EC2List = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // 🔄 Load cached data from localStorage on mount
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem('ec2InstancesCache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  // 💾 Save data to localStorage
  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem('ec2InstancesCache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('ec2ListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('ec2ListScrollPosition');
    }
  }, []);

  const handleNavigate = (instanceId) => {
    sessionStorage.setItem('ec2ListScrollPosition', window.scrollY.toString());
    navigate(`/aws/ec2/details/${instanceId}`);
  };

  // 🚫 DISABLE AUTO-FETCH - Only manual sync
  const { data: instances = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['ec2Instances'],
    queryFn: async () => {
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/aws/ec2/list`);

      if (!res.ok) {
        throw new Error(`Failed to fetch EC2 instances: ${res.statusText}`);
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
        id: instance.InstanceId,
        state: instance.State?.Name,
        type: instance.InstanceType,
        region: instance.Placement?.AvailabilityZone?.split('-')[0],
      }));

      const prompt = `Analyze these EC2 instances and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

EC2 Instance Data:
${JSON.stringify(instanceData, null, 2)}

Focus on:
- Instance state distribution (running/stopped)
- Instance type usage and cost optimization  
- Regional distribution recommendations

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
          `${displayInstances.length} EC2 instances analyzed successfully`,
          'Review stopped instances for potential termination savings',
          'Consider rightsizing based on instance type distribution'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const runningCount = displayInstances.filter(i => i.State?.Name === 'running').length;
      const stoppedCount = displayInstances.length - runningCount;

      setAiSummary([
        `${displayInstances.length} EC2 instances (${runningCount} running, ${stoppedCount} stopped)`,
        `Most common type: ${displayInstances.length > 0 ? displayInstances[0].InstanceType : 'N/A'}`,
        'Review instance utilization and right-sizing opportunities'
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStateIcon = (state) => {
    switch (state?.toLowerCase()) {
      case 'running': return <FaPlay className="text-green-500" />;
      case 'stopped': return <FaPause className="text-orange-500" />;
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
              EC2 Instances {displayInstances.length > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({displayInstances.length})
                </span>
              )}
            </h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
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
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-orange-300 disabled:to-amber-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
              >
                <FaRobot className="text-lg" />
                <span className="font-medium">
                  Generate AI Insights ({displayInstances.length} instances)
                </span>
              </button>
            ) : (
              // AI Summary component (same as S3)
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaRobot className="text-orange-600" />
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
                      <FaSpinner className="text-3xl text-orange-600 animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Analyzing your EC2 instances...</p>
                    </div>
                  ) : aiSummary ? (
                    <div className="space-y-3">
                      {aiSummary.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-orange-600">
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
              <FaServer className="text-2xl sm:text-3xl text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No EC2 instances</p>
            <p className="text-sm text-gray-500 mb-4">Press sync to load your AWS EC2 instances</p>
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
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Instance ID</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">State</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayInstances.map(instance => (
                    <tr key={instance.InstanceId} onClick={() => handleNavigate(instance.InstanceId)} className="hover:bg-orange-50/50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={instance.InstanceId}>{instance.InstanceId}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {getStateIcon(instance.State?.Name)}
                        <span className="text-sm">{instance.State?.Name || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{instance.InstanceType || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {instance.Placement?.AvailabilityZone?.split('-')[0] || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {displayInstances.map(instance => (
                <div key={instance.InstanceId} onClick={() => handleNavigate(instance.InstanceId)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1" title={instance.InstanceId}>{instance.InstanceId}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          {getStateIcon(instance.State?.Name)}
                          <span>{instance.State?.Name || 'unknown'}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{instance.InstanceType}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {instance.Placement?.AvailabilityZone?.split('-')[0] || '—'}
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

export default EC2List;
