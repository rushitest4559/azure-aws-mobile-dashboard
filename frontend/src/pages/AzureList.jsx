import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaServer, FaSync, FaExclamationTriangle, FaRobot, FaSpinner } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useEffect } from 'react';
import { secureFetch } from '../api'; 

const AzureList = () => {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('azureListScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('azureListScrollPosition');
    }
  }, []);

  // Save scroll position before navigating
  const handleNavigate = (name, resourceGroup) => {
    sessionStorage.setItem('azureListScrollPosition', window.scrollY.toString());
    navigate(`/azure/details/${name}?rg=${resourceGroup}`);
  };

  const { data: accounts = [], refetch, isFetching, error, isError } = useQuery({
    queryKey: ['azureAccounts'],
    queryFn: async () => {
      // secureFetch automatically adds the Bearer token
      const res = await secureFetch(`${import.meta.env.VITE_API_URL}/azure/list`);

      if (!res.ok) {
        // This allows React Query to catch 401 (Unauthorized) or 500 errors
        throw new Error(`Failed to fetch accounts: ${res.statusText}`);
      }

      return res.json();
    },
    enabled: false,
  });

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);

    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

      // Prepare data from TanStack Query
      const accountData = accounts.map(acc => ({
        name: acc.name,
        location: acc.location,
        sku: acc.sku,
        kind: acc.kind,
        resource_group: acc.resource_group
      }));

      // Create detailed prompt
      const prompt = `Analyze these Azure Storage Accounts and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Storage Account Data:
${JSON.stringify(accountData, null, 2)}

Focus on:
- Regional distribution and recommendations
- SKU tier optimization opportunities
- Resource organization and naming patterns
- Any cost or performance optimization suggestions

Format your response as:
1. First insight here
2. Second insight here
3. Third insight here`;

      // Call Gemini AI
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini response:', text); // Debug log

      // Parse the response into an array of insights
      const insights = text
        .split('\n')
        .filter(line => line.trim().match(/^\d+[\.)]/)) // Match "1." or "1)"
        .map(line => line.replace(/^\d+[\.)]\s*/, '').trim()) // Remove numbers and dots/parentheses
        .filter(line => line.length > 0); // Remove empty lines

      // Ensure we have at least some insights
      if (insights.length > 0) {
        setAiSummary(insights.slice(0, 3)); // Take max 3 insights
      } else {
        // If parsing failed, use the full response or fallback
        setAiSummary([
          text.trim() || `${accounts.length} Azure storage accounts analyzed successfully`,
          'Review your storage account configurations for optimization opportunities',
          'Consider implementing consistent naming conventions across resource groups'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      // Fallback summary based on actual data
      const uniqueLocations = new Set(accounts.map(acc => acc.location)).size;
      const totalAccounts = accounts.length;

      setAiSummary([
        `Total of ${totalAccounts} storage account${totalAccounts !== 1 ? 's' : ''} across ${uniqueLocations} location${uniqueLocations !== 1 ? 's' : ''}`,
        'Consider consolidating resources in fewer regions for cost optimization',
        'Review storage tier selections to match actual access patterns'
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Clean & Centered */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
              Storage Accounts
            </h1>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
            >
              <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isFetching ? 'Syncing...' : 'Refresh'}</span>
              <span className="sm:hidden">{isFetching ? 'Syncing' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* AI Summary Section - Only show when accounts exist */}
        {accounts.length > 0 && (
          <div className="mb-6">
            {!showSummary ? (
              <button
                onClick={generateAISummary}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
              >
                <FaRobot className="text-lg" />
                <span className="font-medium">Generate AI Insights</span>
              </button>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Summary Header */}
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

                {/* Summary Content */}
                <div className="p-4">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FaSpinner className="text-3xl text-blue-600 animate-spin mb-3" />
                      <p className="text-sm text-gray-500">Analyzing your storage accounts...</p>
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

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-red-800">
              <p className="font-medium mb-1">Unable to fetch accounts</p>
              <p className="text-red-600">{error.message}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isFetching && accounts.length === 0 && !isError ? (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <FaServer className="text-2xl sm:text-3xl text-gray-400" />
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No storage accounts</p>
            <p className="text-sm text-gray-500">Tap refresh to sync your accounts</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Storage Account
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      SKU / Tier
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kind
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map(acc => (
                    <tr
                      key={acc.name}
                      onClick={() => navigate(`/azure/details/${acc.name}?rg=${acc.resource_group}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                      <td className="px-6 py-4 text-gray-600">{acc.location}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {acc.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{acc.kind}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - Apple Style */}
            <div className="lg:hidden space-y-3">
              {accounts.map(acc => (
                <div
                  key={acc.name}
                  onClick={() => handleNavigate(acc.name, acc.resource_group)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
                >
                  {/* Card Header */}
                  <div className="px-4 py-3.5 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {acc.resource_group}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 flex-shrink-0">
                        {acc.kind}
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-gray-900">{acc.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">SKU</span>
                      <span className="font-medium text-gray-900">{acc.sku}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tap to view details</span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
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

export default AzureList;