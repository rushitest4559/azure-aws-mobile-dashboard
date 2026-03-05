import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaCube, FaGlobe, FaLock, FaTag, FaShieldAlt,
    FaSync, FaCheckCircle, FaTimesCircle, FaRobot, FaSpinner, FaNetworkWired
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api';

const EksDetails = () => {
    const { clusterName } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const region = searchParams.get('region') || 'unknown';

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['eksDetails', clusterName, region],
        queryFn: async () => {
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/aws/eks/details?name=${clusterName}&region=${region}`
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch EKS details: ${res.statusText}`);
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

            const clusterData = {
                name: clusterName,
                region: details?.core?.region,
                status: details?.core?.status,
                version: details?.core?.version,
                endpoint: details?.core?.endpoint,
                vpc_id: details?.networking?.vpc_id,
                endpoint_public_access: details?.networking?.endpoint_public_access,
                endpoint_private_access: details?.networking?.endpoint_private_access,
                subnets: details?.networking?.subnet_ids?.length,
                security_groups: details?.networking?.cluster_security_group_ids?.length
            };

            const prompt = `Analyze this EKS cluster configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

EKS Cluster Details:
${JSON.stringify(clusterData, null, 2)}

Focus on:
- Cluster status and accessibility
- Networking configuration (public/private endpoints)
- Version and upgrade recommendations
- Security and VPC considerations

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
                    text.trim() || `${clusterName} analyzed successfully`,
                    'Review endpoint access configuration for security',
                    'Consider Kubernetes version upgrades for latest features'
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const isActive = details?.core?.status?.toLowerCase() === 'active';
            const publicAccess = details?.networking?.endpoint_public_access;
            const version = details?.core?.version;

            setAiSummary([
                `${clusterName} is ${isActive ? 'active' : details?.core?.status?.toLowerCase() || 'unknown status'}`,
                publicAccess ? 'Public endpoint enabled - review security groups' : 'Private endpoint configuration',
                version ? `Kubernetes version: ${version}` : 'Version information unavailable'
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
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                        >
                            <FaArrowLeft className="text-xs" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
                        >
                            <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{isFetching ? 'Syncing' : 'Sync'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Cluster Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FaCube className="text-white text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                                {clusterName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                EKS Cluster • {region}
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
                            <p className="font-medium">Failed to retrieve cluster configuration</p>
                        </div>
                    </div>
                )}

                {!hasData && !isFetching ? (
                    /* Empty State */
                    <div className="py-20 sm:py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaCube className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data loaded</p>
                        <p className="text-sm text-gray-500">Tap sync to fetch cluster details</p>
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
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-emerald-300 disabled:to-teal-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <FaRobot className="text-lg" />
                                        <span className="font-medium">Generate AI Insights</span>
                                    </button>
                                ) : (
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
                                                    <p className="text-sm text-gray-500">Analyzing cluster configuration...</p>
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

                        {/* Status Banner */}
                        {details?.core?.status && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                                details.core.status.toLowerCase() === 'active'
                                    ? 'bg-green-50 border border-green-100'
                                    : details.core.status.toLowerCase() === 'creating'
                                    ? 'bg-blue-50 border border-blue-100'
                                    : 'bg-orange-50 border border-orange-100'
                            }`}>
                                <div className={`w-3 h-3 rounded-full ${
                                    details.core.status.toLowerCase() === 'active' ? 'bg-green-500' :
                                    details.core.status.toLowerCase() === 'creating' ? 'bg-blue-500' :
                                    'bg-orange-500'
                                }`} />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {details.core.status.charAt(0).toUpperCase() + details.core.status.slice(1)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {details.networking?.endpoint_public_access ? 'Public Endpoint' : 'Private Endpoint'}
                                    </p>
                                </div>
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
                                <DetailRow label="Region" value={details?.core?.region} icon={<FaGlobe className="text-gray-400" />} />
                                <DetailRow label="Version" value={details?.core?.version} icon={<FaCube className="text-gray-400" />} />
                                <DetailRow label="Platform Version" value={details?.core?.platform_version} icon={<FaShieldAlt className="text-gray-400" />} />
                                <DetailRow
                                    label="VPC ID"
                                    value={details?.networking?.vpc_id || 'Unknown'}
                                    icon={<FaNetworkWired className="text-gray-400" />}
                                />
                            </div>
                        </div>

                        {/* Networking Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FaNetworkWired className="text-gray-400" />
                                    Networking
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <SecurityRow label="Public Endpoint" active={details?.networking?.endpoint_public_access} />
                                <SecurityRow label="Private Endpoint" active={details?.networking?.endpoint_private_access} />
                                <DetailRow
                                    label="Subnets"
                                    value={details?.networking?.subnet_ids?.length || 0}
                                    icon={<FaGlobe className="text-gray-400" />}
                                />
                                <DetailRow
                                    label="Security Groups"
                                    value={details?.networking?.cluster_security_group_ids?.length || 0}
                                    icon={<FaShieldAlt className="text-gray-400" />}
                                />
                            </div>
                        </div>

                        {/* Endpoint Section */}
                        {details?.core?.endpoint && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FaGlobe className="text-gray-400" />
                                        API Endpoint
                                    </h2>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500">Endpoint URL:</span>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs truncate">
                                            {details.core.endpoint}
                                        </span>
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
                                {Object.keys(details?.tags?.tags || {}).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(details.tags.tags).map(([key, value]) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium"
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

const SecurityRow = ({ label, active }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-red-600'}`}>
                {active ? 'Enabled' : 'Disabled'}
            </span>
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
    </div>
);

export default EksDetails;
