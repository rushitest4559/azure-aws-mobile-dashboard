import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FaArrowLeft, FaDatabase, FaGlobe, FaCheckCircle, FaExclamationCircle, 
    FaLock, FaNetworkWired, FaHdd, FaTag, FaShieldAlt, FaSync, 
    FaTimesCircle, FaRobot, FaSpinner, FaCircle
} from 'react-icons/fa';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { secureFetch } from '../api'; 

// 🆕 MOVED ALL COMPONENTS OUTSIDE - FIXES SCOPE ERROR
const StatusBadge = ({ status, getStatusColor }) => (
  status && (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getStatusColor(status)}`}>
      {status.toUpperCase()}
    </span>
  )
);

const YesNoBadge = ({ value }) => (
  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
    value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
  }`}>
    {value ? 'Yes ✓' : 'No —'}
  </div>
);

const DetailRow = ({ label, value, icon }) => (
  <div className="px-4 py-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {icon}
      <span className="text-sm text-gray-600 truncate">{label}</span>
    </div>
    <div className="text-sm font-medium text-gray-900 flex-shrink-0 truncate max-w-[50%]">
      {value}
    </div>
  </div>
);

const StateRow = ({ label, state, icon, getStatusColor }) => (
  <div className="px-4 py-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {icon}
      <span className="text-sm text-gray-600">{label}</span>
    </div>
    <StatusBadge state={state} getStatusColor={getStatusColor} />
  </div>
);

const RDSDetails = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();

  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const { data: details, refetch, isFetching, isError, dataUpdatedAt } = useQuery({
    queryKey: ['rdsInstanceDetails', instanceId],
    queryFn: async () => {
      const [id, region] = instanceId.split('_');
      const url = new URL(`${import.meta.env.VITE_API_URL}/aws/rds/details`);
      url.searchParams.append('instance_id', id || instanceId);
      url.searchParams.append('region', region || 'us-east-1');
      
      const res = await secureFetch(url.toString());

      if (!res.ok) {
        throw new Error(`Failed to fetch RDS instance details: ${res.statusText}`);
      }

      return res.json();
    },
    enabled: false,
    staleTime: Infinity,
  });

  const hasData = !!details && !details.error;

  // 🆕 SHARED FUNCTIONS - PASSED AS PROPS
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return <FaCheckCircle className="text-green-500" />;
      case 'modifying': 
      case 'maintenance': return <FaExclamationCircle className="text-yellow-500" />;
      default: return <FaCircle className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'modifying': 
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const generateAISummary = async () => {
    setIsGenerating(true);
    setShowSummary(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      
      const rdsData = {
        identifier: details?.core?.db_instance_identifier,
        engine: details?.core?.engine,
        status: details?.core?.status,
        instance_class: details?.core?.db_instance_class,
        multi_az: details?.core?.multi_az,
        storage_encrypted: details?.core?.storage_encrypted,
        region: details?.core?.region,
        backup_days: details?.performance?.backup_retention_days
      };

      const prompt = `Analyze this RDS database instance configuration and provide exactly 2-3 key insights (each insight one concise sentence under 20 words):

RDS Instance Details:
${JSON.stringify(rdsData, null, 2)}

Focus on:
- High availability (Multi-AZ) status
- Security configuration (encryption, IAM auth)
- Backup and maintenance optimization

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
          `${instanceId} configuration analyzed`,
          'Review Multi-AZ deployment for high availability',
          'Verify encryption status and backup retention period'
        ]);
      }

    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const multiAZ = details?.core?.multi_az;
      const encrypted = details?.core?.storage_encrypted;
      const status = details?.core?.status;

      setAiSummary([
        `${instanceId} is ${status || 'unknown'}`,
        multiAZ ? 'Multi-AZ enabled - high availability configured' : 'Single-AZ - consider Multi-AZ for production',
        encrypted ? 'Storage encrypted ✓' : 'No encryption detected ⚠️'
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
        {/* Instance Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <FaDatabase className="text-white text-lg sm:text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate" title={instanceId}>
                {instanceId}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                RDS Database Instance
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
              <p className="font-medium">Failed to retrieve RDS instance details</p>
            </div>
          </div>
        )}

        {!hasData && !isFetching ? (
          <div className="py-20 sm:py-24 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4">
              <FaDatabase className="text-2xl sm:text-3xl text-gray-400" />
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
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white rounded-2xl p-4 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99]"
                  >
                    <FaRobot className="text-lg" />
                    <span className="font-medium">Generate AI Insights</span>
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
                          <p className="text-sm text-gray-500">Analyzing RDS configuration...</p>
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

            {/* Core Info Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Core Configuration
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                <DetailRow 
                  label="Engine" 
                  value={details?.core?.engine} 
                  icon={<FaDatabase className="text-gray-400" />} 
                />
                <DetailRow 
                  label="Instance Class" 
                  value={details?.core?.db_instance_class} 
                  icon={<FaDatabase className="text-gray-400" />} 
                />
                <DetailRow 
                  label="Region" 
                  value={details?.core?.region} 
                  icon={<FaGlobe className="text-gray-400" />} 
                />
                <StateRow 
                  label="Status" 
                  state={details?.core?.status} 
                  icon={getStatusIcon(details?.core?.status)}
                  getStatusColor={getStatusColor}
                />
                <DetailRow 
                  label="Endpoint Address" 
                  value={details?.networking?.address} 
                  icon={<FaNetworkWired className="text-gray-400" />}
                />
              </div>
            </div>

            {/* Security & HA Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Security & High Availability
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                <DetailRow 
                  label="Multi-AZ" 
                  value={<YesNoBadge value={details?.core?.multi_az} />} 
                  icon={<FaShieldAlt className="text-gray-400" />}
                />
                <DetailRow 
                  label="Storage Encrypted" 
                  value={<YesNoBadge value={details?.core?.storage_encrypted} />} 
                  icon={<FaLock className="text-gray-400" />}
                />
                <DetailRow 
                  label="IAM DB Auth" 
                  value={<YesNoBadge value={details?.core?.iam_database_authentication_enabled} />} 
                  icon={<FaShieldAlt className="text-gray-400" />}
                />
              </div>
            </div>

            {/* Storage & Performance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Storage & Performance
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                <DetailRow 
                  label="Storage Type" 
                  value={details?.core?.storage_type} 
                  icon={<FaHdd className="text-gray-400" />} 
                />
                <DetailRow 
                  label="Allocated Storage" 
                  value={`${details?.core?.allocated_storage_gb || 0} GB`} 
                  icon={<FaHdd className="text-gray-400" />} 
                />
                <DetailRow 
                  label="IOPS" 
                  value={details?.performance?.iops || '—'} 
                  icon={<FaHdd className="text-gray-400" />} 
                />
                <DetailRow 
                  label="Backup Retention" 
                  value={`${details?.performance?.backup_retention_days || 0} days`} 
                  icon={<FaHdd className="text-gray-400" />} 
                />
              </div>
            </div>

            {/* Tags Section */}
            {details?.tags?.tags?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tags ({details.tags.tags.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {details.tags.tags.map((tag, index) => (
                    <div key={index} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{tag.Key}</span>
                        <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-mono truncate max-w-[60%]">
                          {tag.Value}
                        </span>
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

export default RDSDetails;
