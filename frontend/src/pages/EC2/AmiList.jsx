import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function AMIPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-amis'],
    queryFn: async () => {
      // Matches your main.py route: /aws/ec2/amis
      const res = await fetch(`${API_URL}/aws/ec2/amis`);
      if (!res.ok) throw new Error('Failed to fetch AMIs');
      return res.json();
    },
    enabled: false,           // Manual refresh only
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const hasData = data && data.length > 0;

  return (
    <div className="p-4 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom AMIs</h1>
          <p className="text-sm text-gray-500">Golden images owned by your account</p>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 active:scale-95 disabled:bg-blue-300 transition-all"
        >
          {isFetching ? 'Fetching AWS...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 text-red-800 bg-red-50 border border-red-200 rounded-lg text-sm">
          ⚠️ {error.message}
        </div>
      )}

      {/* 1. DATA VIEW: Desktop Table */}
      {hasData && (
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Region</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">AMI Name & ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Architecture</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Visibility</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((ami) => (
                <tr key={ami.ImageId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{ami.Region}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{ami.Name}</div>
                    <div className="text-[10px] text-blue-600 font-mono">{ami.ImageId}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600 uppercase font-semibold">{ami.Architecture}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ami.Public ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                      {ami.Public ? 'PUBLIC' : 'PRIVATE'}
                    </span>
                  </td>
                  <td className="p-4">
                    <AMIStatusBadge state={ami.State} />
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
          {data.map((ami) => (
            <div key={ami.ImageId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{ami.Region}</span>
                <AMIStatusBadge state={ami.State} />
              </div>
              
              <div className="text-lg font-bold text-gray-800 mb-1 truncate">{ami.Name}</div>
              <div className="text-[10px] font-mono text-blue-600 mb-4">{ami.ImageId}</div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <div className="flex gap-2">
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{ami.Architecture}</span>
                  {!ami.Public && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">PRIVATE</span>}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(ami.CreationDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">💿</div>
          <h3 className="text-lg font-semibold text-gray-900">No AMIs Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Refresh to see your custom Amazon Machine Images across regions.</p>
        </div>
      )}
    </div>
  );
}

function AMIStatusBadge({ state }) {
  const isAvailable = state === 'available';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }`}>
      {state}
    </span>
  );
}