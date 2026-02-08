import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function LoadBalancerPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-load-balancers'],
    queryFn: async () => {
      // Matches your main.py route: /aws/ec2/load-balancers
      const res = await fetch(`${API_URL}/aws/ec2/load-balancers`);
      if (!res.ok) throw new Error('Failed to fetch load balancers');
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
          <h1 className="text-2xl font-bold text-gray-900">Load Balancers</h1>
          <p className="text-sm text-gray-500">ALB, NLB, and Gateway Load Balancers</p>
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((lb, index) => (
                <tr key={`${lb.Name}-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{lb.Region}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{lb.Name}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs">{lb.DNSName}</div>
                  </td>
                  <td className="p-4 text-gray-600 italic uppercase text-xs">{lb.Type}</td>
                  <td className="p-4"><LBStatusBadge state={lb.State} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. DATA VIEW: Mobile Cards */}
      {hasData && (
        <div className="md:hidden grid grid-cols-1 gap-4">
          {data.map((lb, index) => (
            <div key={`${lb.Name}-${index}`} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm active:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{lb.Region}</span>
                <LBStatusBadge state={lb.State} />
              </div>
              <div className="text-lg font-bold text-gray-800 mb-1 truncate">{lb.Name}</div>
              <div className="text-[10px] font-mono text-gray-400 mb-3 truncate border-b border-gray-50 pb-2">
                {lb.DNSName}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">LB Type</span>
                <span className="font-semibold text-gray-900 uppercase">{lb.Type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">⚖️</div>
          <h3 className="text-lg font-semibold text-gray-900">No Load Balancers</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">
            Click refresh to scan all regions for Application, Network, and Gateway Load Balancers.
          </p>
        </div>
      )}
    </div>
  );
}

function LBStatusBadge({ state }) {
  // elbv2 states are usually 'active', 'provisioning', 'failed'
  const isActive = state === 'active';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }`}>
      {state}
    </span>
  );
}