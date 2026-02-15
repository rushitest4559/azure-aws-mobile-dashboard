import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaDatabase, FaShieldAlt, FaHistory,
    FaLock, FaTag, FaGlobe, FaSearch, FaSync, FaCheckCircle, FaTimesCircle,
    FaRobot, FaSpinner
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const S3Details = () => {
    const { bucketName } = useParams();
    const navigate = useNavigate();

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['s3Details', bucketName],
        queryFn: async () => {
            // secureFetch attaches the Microsoft token even for AWS-related calls
            // because the Azure Function is the "gatekeeper" for everything.
            const res = await secureFetch(
                `${import.meta.env.VITE_API_URL}/aws/details?bucket_name=${bucketName}`
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch S3 details: ${res.statusText}`);
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
            const bucketData = {
                name: bucketName,
                region: details?.region,
                versioning: details?.versioning,
                logging: details?.logging,
                encryption: details?.encryption,
                public_access: details?.public_access,
                tags: details?.tags,
                ...details
            };

            // Create detailed prompt
            const prompt = `Analyze this AWS S3 Bucket configuration and provide exactly 2-3 key insights (each insight should be one concise sentence under 20 words):

S3 Bucket Details:
${JSON.stringify(bucketData, null, 2)}

Focus on:
- Security configuration and public access settings
- Data protection features (versioning, encryption, logging)
- Cost optimization opportunities
- Compliance and best practices recommendations

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
                    text.trim() || `${bucketName} bucket analyzed successfully`,
                    'Review your public access settings to ensure data security',
                    'Consider enabling versioning and lifecycle policies for data protection'
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            // Fallback summary based on actual data
            const hasPublicAccess = !details?.public_access?.BlockPublicAcls;
            const hasVersioning = details?.versioning === 'Enabled';
            const hasEncryption = details?.encryption?.Rules;

            setAiSummary([
                `Bucket "${bucketName}" in ${details?.region || 'us-east-1'} ${hasPublicAccess ? 'needs security review' : 'has strong security'}`,
                hasVersioning ? 'Versioning enabled provides good data protection' : 'Enable versioning to protect against accidental deletions',
                hasEncryption ? 'Encryption is active for data at rest' : 'Consider enabling server-side encryption for enhanced security'
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Bucket Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FaDatabase className="text-white text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                                {bucketName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                S3 Bucket
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
                            <p className="font-medium">Failed to retrieve bucket configuration</p>
                        </div>
                    </div>
                )}

                {!hasData && !isFetching ? (
                    /* Empty State */
                    <div className="py-20 sm:py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data loaded</p>
                        <p className="text-sm text-gray-500">Tap sync to fetch bucket details</p>
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
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-orange-300 disabled:to-red-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <FaRobot className="text-lg" />
                                        <span className="font-medium">Generate AI Insights</span>
                                    </button>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        {/* Summary Header */}
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

                                        {/* Summary Content */}
                                        <div className="p-4">
                                            {isGenerating ? (
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <FaSpinner className="text-3xl text-orange-600 animate-spin mb-3" />
                                                    <p className="text-sm text-gray-500">Analyzing bucket configuration...</p>
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

                        {/* Security Status Banner */}
                        {details?.public_access?.BlockPublicAcls !== undefined && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 ${details?.public_access?.BlockPublicAcls
                                    ? 'bg-green-50 border border-green-100'
                                    : 'bg-yellow-50 border border-yellow-100'
                                }`}>
                                {details?.public_access?.BlockPublicAcls ? (
                                    <>
                                        <FaCheckCircle className="text-green-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-green-900">Private Access</p>
                                            <p className="text-xs text-green-700 mt-0.5">Public access is blocked</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <FaTimesCircle className="text-yellow-600 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-yellow-900">Review Required</p>
                                            <p className="text-xs text-yellow-700 mt-0.5">Public access settings need attention</p>
                                        </div>
                                    </>
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
                                <DetailRow
                                    label="Region"
                                    value={details?.region || 'us-east-1'}
                                    icon={<FaGlobe className="text-gray-400" />}
                                />
                                <DetailRow
                                    label="Versioning"
                                    value={details?.versioning}
                                    icon={<FaHistory className="text-gray-400" />}
                                />
                                <DetailRow
                                    label="Logging"
                                    value={typeof details?.logging === 'string' ? details?.logging : 'Enabled'}
                                    icon={<FaSearch className="text-gray-400" />}
                                />
                                <DetailRow
                                    label="Encryption"
                                    value={details?.encryption?.Rules ? 'AES-256' : 'Default'}
                                    icon={<FaShieldAlt className="text-gray-400" />}
                                />
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FaLock className="text-gray-400" />
                                    Public Access Block
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-100">
                                <SecurityRow
                                    label="Block Public ACLs"
                                    active={details?.public_access?.BlockPublicAcls}
                                />
                                <SecurityRow
                                    label="Ignore Public ACLs"
                                    active={details?.public_access?.IgnorePublicAcls}
                                />
                                <SecurityRow
                                    label="Block Public Policy"
                                    active={details?.public_access?.BlockPublicPolicy}
                                />
                                <SecurityRow
                                    label="Restrict Public Buckets"
                                    active={details?.public_access?.RestrictPublicBuckets}
                                />
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FaTag className="text-gray-400" />
                                    Resource Tags
                                </h2>
                            </div>

                            <div className="p-4">
                                {details?.tags?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {details.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium"
                                            >
                                                {tag.Key}: {tag.Value}
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

export default S3Details;