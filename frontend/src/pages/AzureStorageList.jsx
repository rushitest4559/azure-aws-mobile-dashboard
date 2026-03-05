import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCloud, FaSync, FaRobot, FaSpinner, FaDatabase } from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';
import { useNavigate } from 'react-router-dom';

const AzureStorageList = () => {
    const navigate = useNavigate();
    const subscriptionId = import.meta.env.VITE_AZURE_SUBSCRIPTION_ID || '';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    // 🔄 Load cached data from localStorage on mount
    const getCachedData = useCallback(() => {
        try {
            const cached = localStorage.getItem(`azureStorageCache_${subscriptionId}`);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }, [subscriptionId]);

    // 💾 Save data to localStorage
    const saveToCache = useCallback((data) => {
        try {
            localStorage.setItem(`azureStorageCache_${subscriptionId}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }, [subscriptionId]);

    // Restore scroll position
    useEffect(() => {
        const savedScrollPosition = sessionStorage.getItem('azureStorageListScrollPosition');
        if (savedScrollPosition) {
            window.scrollTo(0, parseInt(savedScrollPosition));
            sessionStorage.removeItem('azureStorageListScrollPosition');
        }
    }, []);

    const handleNavigate = (account) => {
        sessionStorage.setItem('azureStorageListScrollPosition', window.scrollY.toString());
        navigate(`/azure/storage/details/${account.name}?subscription_id=${subscriptionId}&resource_group=${account.resource_group}`);
    };

    // 🚫 DISABLE AUTO-FETCH - Only manual sync
    const { data: accounts = [], refetch, isFetching, error, isError } = useQuery({
        queryKey: ['azureStorageAccounts', subscriptionId],
        queryFn: async () => {
            if (!subscriptionId) throw new Error('Subscription ID required');

            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/azure/storage/list?subscription_id=${subscriptionId}`
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch Azure Storage accounts: ${res.statusText}`);
            }

            const data = await res.json();
            saveToCache(data); // 💾 Auto-save on successful fetch
            return data;
        },
        enabled: false, // 🚫 NEVER auto-fetch
        staleTime: Infinity,
        cacheTime: Infinity,
        retry: false,
    });

    // 🎯 Load cached data immediately for instant UI
    const cachedData = getCachedData();
    const displayAccounts = cachedData?.data || accounts;

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);

        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const accountData = displayAccounts.map(account => ({
                name: account.name,
                location: account.location,
                sku: account.sku,
                kind: account.kind,
                resource_group: account.resource_group,
            }));

            const prompt = `Analyze these Azure Storage accounts and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Azure Storage Accounts:
${JSON.stringify(accountData, null, 2)}

Focus on:
- Regional distribution and cost optimization
- SKU types and performance tiers
- Account kinds and use cases

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
                    text.trim() || `${displayAccounts.length} storage accounts analyzed`,
                    'Review regional distribution for latency optimization',
                    'Consider SKU consolidation for cost savings'
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const totalAccounts = displayAccounts.length;
            const uniqueRegions = new Set(displayAccounts.map(a => a.location)).size;
            const uniqueSkus = new Set(displayAccounts.map(a => a.sku)).size;

            setAiSummary([
                `${totalAccounts} Storage accounts across ${uniqueRegions} regions`,
                `${uniqueSkus} different SKU types detected`,
                `Resource groups: ${new Set(displayAccounts.map(a => a.resource_group)).size}`
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
                            Azure Storage Accounts {displayAccounts.length > 0 && (
                                <span className="text-sm text-gray-500 font-normal ml-2">
                                    ({displayAccounts.length})
                                </span>
                            )}
                        </h1>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching || !subscriptionId}
                            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
                            title="Sync from Azure (updates cache)"
                        >
                            <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isFetching ? 'Syncing...' : 'Refresh'}</span>
                            <span className="sm:hidden">{isFetching ? 'Syncing' : 'Sync'}</span>
                        </button>
                    </div>
                    {/* ✅ REMOVE the yellow warning banner - no longer needed */}
                    {/* {!subscriptionId && ( ... )} */}
                </div>
            </div>


            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Show cached data count for AI insights */}
                {displayAccounts.length > 0 && (
                    <div className="mb-6">
                        {!showSummary ? (
                            <button
                                onClick={generateAISummary}
                                disabled={isGenerating}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                            >
                                <FaRobot className="text-lg" />
                                <span className="font-medium">
                                    Generate AI Insights ({displayAccounts.length} accounts)
                                </span>
                            </button>
                        ) : (
                            // AI Summary component
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FaRobot className="text-purple-600" />
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
                                            <FaSpinner className="text-3xl text-purple-600 animate-spin mb-3" />
                                            <p className="text-sm text-gray-500">Analyzing your storage accounts...</p>
                                        </div>
                                    ) : aiSummary ? (
                                        <div className="space-y-3">
                                            {aiSummary.map((insight, index) => (
                                                <div key={index} className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-xs font-semibold text-purple-600">
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
                {!isFetching && displayAccounts.length === 0 ? (
                    <div className="text-center py-16 sm:py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No Storage Accounts</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Press sync to load Azure Storage accounts
                        </p>
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
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Account Name</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">SKU</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kind</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Resource Group</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayAccounts.map(account => (
                                        <tr key={account.id || account.name} onClick={() => handleNavigate(account)} className="hover:bg-purple-50/50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{account.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{account.location}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{account.sku}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{account.kind}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]">{account.resource_group}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-purple-600 hover:text-purple-700 font-medium text-sm">Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden space-y-3">
                            {displayAccounts.map(account => (
                                <div key={account.id || account.name} onClick={() => handleNavigate(account)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
                                    <div className="px-4 py-3.5 border-b border-gray-50">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate mb-1">{account.name}</h3>
                                                <p className="text-xs text-gray-500 truncate">{account.location} • {account.sku}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Kind</span>
                                            <span className="font-medium text-gray-900">{account.kind}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Resource Group</span>
                                            <span className="font-medium text-gray-900 truncate max-w-[120px]">{account.resource_group}</span>
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

export default AzureStorageList;
