import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function VolumesPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-volumes'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/aws/ec2/volumes`);
      if (!res.ok) throw new Error('Failed to fetch volumes');
      return res.json();
    },
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const hasData = data && data.length > 0;

  return (
    <div className="p-4 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EBS Volumes</h1>
          <p className="text-sm text-gray-500">Block storage and volume attachments</p>
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Volume ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Size & Type</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Attachment</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((vol) => (
                <tr key={vol.VolumeId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{vol.Region}</td>
                  <td className="p-4 font-mono text-sm text-blue-600">{vol.VolumeId}</td>
                  <td className="p-4 text-gray-600">
                    <span className="font-bold">{vol.Size} GB</span> 
                    <span className="text-xs ml-2 uppercase text-gray-400">({vol.Type})</span>
                  </td>
                  <td className="p-4 text-xs font-mono text-gray-500">
                    {vol.InstanceId !== 'Unattached' ? vol.InstanceId : <span className="text-orange-500 font-bold">Available</span>}
                  </td>
                  <td className="p-4">
                    <VolumeStatusBadge state={vol.State} />
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
          {data.map((vol) => (
            <div key={vol.VolumeId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{vol.Region}</span>
                <VolumeStatusBadge state={vol.State} />
              </div>
              
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{vol.Size} <span className="text-sm font-normal text-gray-400">GB</span></div>
                  <div className="text-[10px] font-mono text-blue-600">{vol.VolumeId}</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] uppercase font-bold text-gray-400">Type</div>
                   <div className="text-sm font-bold text-gray-700 uppercase">{vol.Type}</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-500">Attached to:</span>
                <span className={`text-xs font-mono font-bold ${vol.InstanceId === 'Unattached' ? 'text-orange-500' : 'text-gray-700'}`}>
                  {vol.InstanceId}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">💾</div>
          <h3 className="text-lg font-semibold text-gray-900">No Volumes Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Refresh to see your block storage usage across regions.</p>
        </div>
      )}
    </div>
  );
}

function VolumeStatusBadge({ state }) {
  // state: 'in-use' (green), 'available' (orange/blue), 'deleting', etc.
  const isInUse = state === 'in-use';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isInUse ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
    }`}>
      {state}
    </span>
  );
}