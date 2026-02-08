import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function InstancesPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-instances'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/aws/ec2/list`);
      if (!res.ok) throw new Error('Failed to fetch instances');
      return res.json();
    },
    // --- STRICT MANUAL SETTINGS ---
    enabled: false,           // Never fetch on its own
    staleTime: Infinity,      // Data is always considered "fresh"
    gcTime: Infinity,         // Never garbage collect (delete) the data
  });

  // Derived state for the UI
  const hasData = data && data.length > 0;

  return (
    <div className="p-4 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header with Mobile-Optimized Spacing */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EC2 Instances</h1>
          <p className="text-sm text-gray-500">Offline-first: Data updates only on refresh</p>
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

      {/* 1. DATA VIEW: Desktop Table (Hidden on Mobile) */}
      {hasData && (
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Region</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Instance ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((inst) => (
                <tr key={inst.InstanceId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{inst.Region}</td>
                  <td className="p-4 font-mono text-sm text-blue-600">{inst.InstanceId}</td>
                  <td className="p-4 text-gray-600 italic">{inst.Type}</td>
                  <td className="p-4"><StatusBadge state={inst.State} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. DATA VIEW: Mobile Cards (Hidden on Desktop) */}
      {hasData && (
        <div className="md:hidden grid grid-cols-1 gap-4">
          {data.map((inst) => (
            <div key={inst.InstanceId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm active:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{inst.Region}</span>
                <StatusBadge state={inst.State} />
              </div>
              <div className="text-lg font-mono font-bold text-gray-800 mb-2 truncate">{inst.InstanceId}</div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Instance Type</span>
                <span className="font-semibold text-gray-900">{inst.Type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY/INITIAL STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">☁️</div>
          <h3 className="text-lg font-semibold text-gray-900">No Data Cached</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">
            Click the refresh button above to fetch your instances from AWS for the first time.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ state }) {
  const isRunning = state === 'running';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isRunning ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      {state}
    </span>
  );
}