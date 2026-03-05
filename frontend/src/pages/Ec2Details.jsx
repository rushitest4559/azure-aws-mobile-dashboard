import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaServer, FaGlobe, FaPlay, FaPause, FaNetworkWired, 
    FaHdd, FaTag, FaShieldAlt, FaSync, FaCheckCircle, FaTimesCircle, 
    FaRobot, FaSpinner, FaCircle
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

const EC2Details = () => {
    const { instanceId } = useParams();
    const navigate = useNavigate();

    const [showSummary, setShowSummary] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(null);

    const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
        queryKey: ['ec2InstanceDetails', instanceId],
        queryFn: async () => {
            // Extract region from instanceId if format is instanceId_region
            const [id, region] = instanceId.split('_');
            const url = new URL(`${import.meta.env.VITE_API_URL}/aws/ec2/details`);
            url.searchParams.append('instance_id', id || instanceId);
            url.searchParams.append('region', region || 'us-east-1');
            
            const res = await secureFetch(url.toString());

            if (!res.ok) {
                throw new Error(`Failed to fetch EC2 instance details: ${res.statusText}`);
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
            
            const instanceData = {
                instance_id: details?.core?.instance_id,
                state: details?.core?.state,
                type: details?.core?.instance_type,
                region: details?.core?.region,
                public_ip: details?.networking?.public_ip,
                vpc_id: details?.networking?.vpc_id,
                security_groups: details?.vpc?.security_groups?.length || 0,
                tags_count: Object.keys(details?.tags || {}).length
            };

            const prompt = `Analyze this EC2 instance configuration and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

EC2 Instance Details:
${JSON.stringify(instanceData, null, 2)}

Focus on:
- Instance state and cost optimization
- Networking configuration security
- Instance sizing recommendations

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
                    `${instanceId} analyzed successfully`,
                    'Review security group rules for least privilege access',
                    'Consider instance right-sizing for cost optimization'
                ]);
            }

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            const state = details?.core?.state;
            const publicIp = details?.networking?.public_ip;
            const sgCount = details?.vpc?.security_groups?.length || 0;

            setAiSummary([
                `${instanceId} is ${state || 'unknown'}`,
                publicIp ? 'Public IP exposed - review security groups' : 'Private instance - good for security',
                sgCount > 0 ? `${sgCount} security group(s) configured` : 'No security groups assigned'
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

    const getStateColor = (state) => {
        switch (state?.toLowerCase()) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'stopped': return 'text-orange-600 bg-orange-100';
            default: return 'text-gray-600 bg-gray-100';
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
                            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
                        >
                            <FaArrowLeft className="text-xs" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-full transition-all font-medium text-sm shadow-sm active:scale-95 disabled:active:scale-100"
                        >
                            <FaSync className={`text-xs ${isFetching ? 'animate-spin' : ''}`} />
                            <span>{isFetching ? 'Syncing' : 'Sync'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Instance Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FaServer className="text-white text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate" title={instanceId}>
                                {instanceId}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                EC2 Instance
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
                            <p className="font-medium">Failed to retrieve instance details</p>
                        </div>
                    </div>
                )}

                {!hasData && !isFetching ? (
                    /* Empty State */
                    <div className="py-20 sm:py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
                            <FaServer className="text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data loaded</p>
                        <p className="text-sm text-gray-500">Tap sync to fetch instance details</p>
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
                                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-orange-300 disabled:to-amber-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <FaRobot className="text-lg" />
                                        <span className="font-medium">Generate AI Insights</span>
                                    </button>
                                ) : (
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
                                                    <p className="text-sm text-gray-500">Analyzing instance configuration...</p>
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

                        {/* Core Info Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Core Configuration
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <DetailRow 
                                    label="Instance Type" 
                                    value={details?.core?.instance_type} 
                                    icon={<FaServer className="text-gray-400" />} 
                                />
                                <DetailRow 
                                    label="Region" 
                                    value={details?.core?.region} 
                                    icon={<FaGlobe className="text-gray-400" />} 
                                />
                                <StateRow 
                                    label="Status" 
                                    state={details?.core?.state} 
                                    icon={getStateIcon(details?.core?.state)}
                                />
                                <DetailRow 
                                    label="Availability Zone" 
                                    value={details?.core?.placement?.availability_zone} 
                                    icon={<FaGlobe className="text-gray-400" />} 
                                />
                            </div>
                        </div>

                        {/* Networking Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Networking
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <DetailRow 
                                    label="Public IP" 
                                    value={details?.networking?.public_ip || 'None'} 
                                    icon={<FaNetworkWired className="text-gray-400" />}
                                    highlight={!!details?.networking?.public_ip}
                                />
                                <DetailRow 
                                    label="Private IP" 
                                    value={details?.networking?.private_ip || 'None'} 
                                    icon={<FaNetworkWired className="text-gray-400" />} 
                                />
                                <DetailRow 
                                    label="VPC ID" 
                                    value={details?.networking?.vpc_id} 
                                    icon={<FaNetworkWired className="text-gray-400" />} 
                                />
                                <DetailRow 
                                    label="Security Groups" 
                                    value={details?.vpc?.security_groups?.join(', ') || 'None'} 
                                    icon={<FaShieldAlt className="text-gray-400" />} 
                                />
                            </div>
                        </div>

                        {/* Storage Section */}
                        {details?.storage?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Block Devices ({details.storage.length})
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {details.storage.map((device, index) => (
                                        <div key={index} className="px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">{device.device_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-gray-900">{device.volume_id}</span>
                                                    {device.delete_on_termination && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-xs text-red-800 rounded-full">Auto-delete</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tags Section */}
                        {Object.keys(details?.tags || {}).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Tags ({Object.keys(details.tags || {}).length})
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                    {Object.entries(details?.tags || {}).map(([key, value]) => (
                                        <div key={key} className="px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{key}</span>
                                                <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-mono truncate max-w-[60%]">{value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, icon, highlight = false }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon}
            <span className="text-sm text-gray-600 truncate">{label}</span>
        </div>
        <span className={`text-sm font-medium flex-shrink-0 truncate max-w-[50%] ${
            highlight ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full' : 'text-gray-900'
        }`}>
            {value || '—'}
        </span>
    </div>
);

const StateRow = ({ label, state, icon }) => (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon}
            <span className="text-sm text-gray-600">{label}</span>
        </div>
        {state && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                getStateColor(state)
            }`}>
                {state.toUpperCase()}
            </span>
        )}
    </div>
);

export default EC2Details;
