import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function SecurityGroupsPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-security-groups'],
    queryFn: async () => {
      // Matches your main.py route: /aws/ec2/security-groups
      const res = await fetch(`${API_URL}/aws/ec2/security-groups`);
      if (!res.ok) throw new Error('Failed to fetch security groups');
      return res.json();
    },
    enabled: false,           // Manual refresh only
    staleTime: Infinity,      // Offline-first
    gcTime: Infinity,         // Keep in cache
  });

  const hasData = data && data.length > 0;

  return (
    <div className="p-4 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Groups</h1>
          <p className="text-sm text-gray-500">Instance Firewalls and Access Rules</p>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 active:scale-95 disabled:bg-blue-300 transition-all"
        >
          {isFetching ? 'Fetching AWS...' : 'Refresh Data'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 mb-6 text-red-800 bg-red-50 border border-red-200 rounded-lg text-sm">
          ⚠️ {error.message}. Check your Lambda/API Gateway CORS.
        </div>
      )}

      {/* 1. DATA VIEW: Desktop Table */}
      {hasData && (
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Region</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Group Details</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">VPC ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Rules (In/Out)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((sg) => (
                <tr key={sg.GroupId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{sg.Region}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{sg.GroupName}</div>
                    <div className="text-[10px] text-blue-600 font-mono">{sg.GroupId}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{sg.Description}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600 font-mono">{sg.VpcId}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <RuleCountBadge count={sg.InboundRulesCount} type="In" />
                      <RuleCountBadge count={sg.OutboundRulesCount} type="Out" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. DATA VIEW: Mobile Cards */}
      {hasData && (
        <div className="md:hidden grid grid-cols-1 gap-4">
          {data.map((sg) => (
            <div key={sg.GroupId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm active:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{sg.Region}</span>
                <span className="text-[10px] font-mono text-gray-400">{sg.VpcId}</span>
              </div>
              
              <div className="text-lg font-bold text-gray-800 mb-1">{sg.GroupName}</div>
              <div className="text-[11px] text-gray-500 mb-3 leading-tight">{sg.Description}</div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <span className="text-xs font-mono text-blue-600">{sg.GroupId}</span>
                <div className="flex gap-2">
                  <RuleCountBadge count={sg.InboundRulesCount} type="Inbound" />
                  <RuleCountBadge count={sg.OutboundRulesCount} type="Outbound" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">🛡️</div>
          <h3 className="text-lg font-semibold text-gray-900">No Security Groups Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">
            Refresh to list all firewalls across your regions.
          </p>
        </div>
      )}
    </div>
  );
}

function RuleCountBadge({ count, type }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
        count > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'
      }`}>
        {count} {type}
      </span>
    </div>
  );
}