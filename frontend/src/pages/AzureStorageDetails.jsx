import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaDatabase, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner, FaLink
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

const AzureStorageDetails = () => {
    const { accountName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const subscriptionId = searchParams.get('subscription_id') || '';
    const resourceGroup = searchParams.get('resource_group') || '';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['azureStorageDetails', accountName, subscriptionId, resourceGroup],
        queryFn: async () => {
            if (!subscriptionId || !resourceGroup || !accountName) {
                throw new Error('Missing required parameters: subscription_id, resource_group, account_name');
            }

            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/azure/storage/details?` +
                `subscription_id=${subscriptionId}&resource_group=${resourceGroup}&name=${accountName}`
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch storage account details: ${res.statusText}`);
            }

            return res.json();
        },
        enabled: false,
        staleTime: Infinity,
    });

    const hasData = !!details && !details.error;

    const generateAISummary = async () => {
        setIsGenerating(true);
        setShowSummary(true);

        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            
            const storageData = {
                name: details?.name,
                location: details?.location,
                sku: details?.sku,
                kind: details?.kind,
                status: details?.status,
                access_tier: details?.access_tier,
                encryption: details?.encryption,
                tags_count: Object.keys(details?.tags || {}).length
            };

            const prompt = `Analyze this Azure Storage Account configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

Azure Storage Account:
${JSON.stringify(storageData, null, 2)}

Focus on:
- Performance tier (SKU) and cost optimization
- Regional location and latency considerations
- Security (encryption, access tier) recommendations
- Account kind and use case fit

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
                    text.trim() || `${accountName} analyzed successfully`,
                    `SKU ${details?.sku || 'N/A'} - review performance tier for workload`,
                    `${details?.location || 'N/A'} region - verify latency requirements`
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const sku = details?.sku;
            const location = details?.location;
            const hasEncryption = !!details?.encryption;

            setAiSummary([
                `${accountName}: ${sku || 'N/A'} (${location || 'N/A'})`,
                hasEncryption ? 'Encryption enabled - good security posture' : 'Enable encryption for data at rest',
                details?.access_tier ? `Access tier: ${details.access_tier}` : 'Review access tier for cost optimization'
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
                        >
                            <FaArrowLeft className="text-xs" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching || !subscriptionId || !resourceGroup}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
                        >
                            <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{isFetching ? 'Syncing' : 'Sync'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Account Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FaDatabase className="text-white text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                                {accountName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                Azure Storage Account • {resourceGroup}
                            </p>
                        </div>
                    </div>

                    {hasData && (
                        <p className="text-xs text-gray-400 pl-[60px] sm:pl-[68px]">
                            Last synced {new Date(dataUpdatedAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Error State */}
                {isError && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
                        <FaTimesCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-sm text-red-800">
                            <p className="font-medium">Failed to retrieve storage account configuration</p>
                            {!subscriptionId && <p className="mt-1">Missing subscription_id parameter</p>}
                            {!resourceGroup && <p className="mt-1">Missing resource_group parameter</p>}
                        </div>
                    </div>
                )}

                {!hasData && !isFetching ? (
                    <div className="py-20 sm:py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data loaded</p>
                        <p className="text-sm text-gray-500">Tap sync to fetch storage account details</p>
                    </div>
                ) : (
                    <div className={`space-y-4 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                        {/* AI Summary Section */}
                        {hasData && (
                            <div className="mb-6">
                                {!showSummary ? (
                                    <button
                                        onClick={generateAISummary}
                                        disabled={isGenerating}
                                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <FaRobot className="text-lg" />
                                        <span className="font-medium">Generate AI Insights</span>
                                    </button>
                                ) : (
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
                                                    <p className="text-sm text-gray-500">Analyzing storage account...</p>
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

                        {/* Configuration Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Configuration
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <DetailRow label="Name" value={details?.name} icon={<FaDatabase className="text-gray-400" />} />
                                <DetailRow label="Location" value={details?.location} icon={<FaGlobe className="text-gray-400" />} />
                                <DetailRow label="SKU" value={details?.sku} icon={<FaShieldAlt className="text-gray-400" />} />
                                <DetailRow label="Kind" value={details?.kind} icon={<FaDatabase className="text-gray-400" />} />
                                <DetailRow label="Status" value={details?.status} icon={<FaCheckCircle className="text-gray-400" />} />
                                <DetailRow label="Access Tier" value={details?.access_tier} icon={<FaLock className="text-gray-400" />} />
                            </div>
                        </div>

                        {/* Endpoints Section */}
                        {details?.endpoints && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FaLink className="text-gray-400" />
                                        Service Endpoints
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    <EndpointRow label="Blob" url={details.endpoints.blob} />
                                    <EndpointRow label="File" url={details.endpoints.file} />
                                    <EndpointRow label="Queue" url={details.endpoints.queue} />
                                    <EndpointRow label="Table" url={details.endpoints.table} />
                                </div>
                            </div>
                        )}

                        {/* Encryption Section */}
                        {details?.encryption && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FaLock className="text-gray-400" />
                                        Encryption
                                    </h2>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Services:</span>
                                            <div className="mt-1 space-y-1">
                                                {Object.entries(details.encryption.services || {}).map(([service, config]) => (
                                                    <div key={service} className="flex items-center gap-2 text-xs">
                                                        <span className="font-medium">{service}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                            config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {config.enabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tags Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FaTag className="text-gray-400" />
                                    Resource Tags
                                </h2>
                            </div>
                            <div className="p-4">
                                {Object.keys(details?.tags || {}).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(details.tags).map(([key, value]) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                                            >
                                                {key}: {value}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">No tags assigned</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, icon }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon}
            <span className="text-sm text-gray-600 truncate">{label}</span>
        </div>
        <span className="text-sm font-medium text-gray-900 flex-shrink-0 truncate max-w-[50%]">
            {value || '—'}
        </span>
    </div>
);

const EndpointRow = ({ label, url }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <FaLink className="text-gray-400 text-sm" />
            <span className="text-sm text-gray-600">{label}</span>
        </div>
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-xs truncate max-w-[60%]">
            {url || '—'}
        </span>
    </div>
);

export default AzureStorageDetails;
