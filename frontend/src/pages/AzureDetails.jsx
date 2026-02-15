import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaServer, FaMicrochip, FaGlobe,
    FaShieldAlt, FaSync, FaDatabase, FaChevronRight, FaRobot, FaSpinner
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

const AzureDetails = () => {
    const { accountName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const rg = searchParams.get('rg');

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null); 

    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['azureDetails', accountName],
        queryFn: async () => {
            // Use secureFetch instead of fetch
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/api/azure/details?account_name=${accountName}&resource_group=${rg}`
            );

            if (!res.ok) {
                throw new Error('Network response was not ok');
            }

            return res.json();
        },
        enabled: false,
        staleTime: Infinity,
    });

    const hasData = !!details;

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);

        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

            // Prepare data from TanStack Query
            const accountData = {
                name: accountName,
                resource_group: rg,
                location: details?.location,
                sku: details?.sku,
                kind: details?.kind,
                access_tier: details?.access_tier,
                ...details
            };

            // Create detailed prompt
            const prompt = `Analyze this Azure Storage Account configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Storage Account Details:
${JSON.stringify(accountData, null, 2)}

Focus on:
- Performance and tier optimization recommendations
- Security and access configuration analysis
- Cost optimization opportunities
- Best practices and configuration improvements

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
                    text.trim() || `${accountName} storage account analyzed successfully`,
                    'Review your access tier configuration to match actual usage patterns',
                    'Consider implementing lifecycle management policies for cost optimization'
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            // Fallback summary based on actual data
            setAiSummary([
                `Storage account "${accountName}" is using ${details?.sku || 'standard'} tier in ${details?.location || 'unknown'} region`,
                'Review your replication settings to balance cost and redundancy needs',
                'Consider enabling soft delete and versioning for data protection'
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                            <FaArrowLeft className="text-xs" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
                        >
                            <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{isFetching ? 'Syncing' : 'Sync'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Account Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FaServer className="text-white text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                                {accountName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                {details?.kind || 'Storage Account'}
                            </p>
                        </div>
                    </div>

                    {hasData && (
                        <p className="text-xs text-gray-400 pl-[60px] sm:pl-[68px]">
                            Last synced {new Date(dataUpdatedAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {!hasData && !isFetching ? (
                    /* Empty State */
                    <div className="py-20 sm:py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data loaded</p>
                        <p className="text-sm text-gray-500">Tap sync to fetch account details</p>
                    </div>
                ) : (
                    <div className={`space-y-4 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                        {/* AI Summary Section - Only show when details exist */}
                        {hasData && (
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
                                                    <p className="text-sm text-gray-500">Analyzing storage account configuration...</p>
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

                        {/* Quick Info Cards */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <InfoCard
                                icon={<FaGlobe />}
                                label="Location"
                                value={details?.location}
                            />
                            <InfoCard
                                icon={<FaMicrochip />}
                                label="SKU Tier"
                                value={details?.sku}
                            />
                        </div>

                        {/* Details Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Details
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-100">
                                <DetailRow
                                    label="Resource Group"
                                    value={rg}
                                    icon={<FaShieldAlt className="text-gray-400" />}
                                />
                                <DetailRow
                                    label="Access Tier"
                                    value={details?.access_tier || 'Hot'}
                                />
                                <DetailRow
                                    label="Provisioning State"
                                    value="Succeeded"
                                    badge
                                    badgeColor="bg-green-50 text-green-700"
                                />
                            </div>
                        </div>

                        {/* Raw Data - Collapsible */}
                        <details className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
                            <summary className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Raw Response
                                </span>
                                <FaChevronRight className="text-gray-400 text-xs transition-transform group-open:rotate-90" />
                            </summary>

                            <div className="px-4 py-3 bg-gray-900 border-t border-gray-100">
                                <pre className="text-xs text-green-400 font-mono overflow-x-auto leading-relaxed">
                                    {JSON.stringify(details, null, 2)}
                                </pre>
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoCard = ({ icon, label, value }) => (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2 text-gray-400">
            {icon}
            <span className="text-xs font-medium text-gray-500">{label}</span>
        </div>
        <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {value || '—'}
        </p>
    </div>
);

const DetailRow = ({ label, value, icon, badge, badgeColor }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon}
            <span className="text-sm text-gray-600 truncate">{label}</span>
        </div>
        {badge ? (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor} flex-shrink-0`}>
                {value}
            </span>
        ) : (
            <span className="text-sm font-medium text-gray-900 flex-shrink-0 truncate max-w-[50%]">
                {value || '—'}
            </span>
        )}
    </div>
);

export default AzureDetails;