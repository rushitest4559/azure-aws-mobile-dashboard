import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function ENIPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-enis'],
    queryFn: async () => {
      // Matches your main.py route: /aws/ec2/enis
      const res = await fetch(`${API_URL}/aws/ec2/enis`);
      if (!res.ok) throw new Error('Failed to fetch Network Interfaces');
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
          <h1 className="text-2xl font-bold text-gray-900">Network Interfaces</h1>
          <p className="text-sm text-gray-500">ENIs, IP Addresses, and Service Attachments</p>
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Interface ID / Type</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">IP Addresses</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Attachment</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((eni) => (
                <tr key={eni.NetworkInterfaceId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{eni.Region}</td>
                  <td className="p-4">
                    <div className="font-mono text-xs text-blue-600 font-bold">{eni.NetworkInterfaceId}</div>
                    <div className="text-[10px] text-gray-400 uppercase">{eni.InterfaceType}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-900 font-semibold">{eni.PrivateIp} <span className="text-[10px] text-gray-400 font-normal">(Pri)</span></div>
                    {eni.PublicIp !== 'None' && (
                      <div className="text-sm text-blue-600 font-semibold">{eni.PublicIp} <span className="text-[10px] text-gray-400 font-normal">(Pub)</span></div>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-600 truncate max-w-[200px]">
                    <div className="font-bold">{eni.Attachment}</div>
                    <div className="text-[10px] italic">{eni.Description || 'No description'}</div>
                  </td>
                  <td className="p-4"><ENIStatusBadge state={eni.Status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. DATA VIEW: Mobile Cards */}
      {hasData && (
        <div className="md:hidden grid grid-cols-1 gap-4">
          {data.map((eni) => (
            <div key={eni.NetworkInterfaceId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{eni.Region}</span>
                <ENIStatusBadge state={eni.Status} />
              </div>
              
              <div className="text-md font-mono font-bold text-gray-800 mb-1">{eni.NetworkInterfaceId}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-widest">{eni.InterfaceType}</div>

              <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">Private IP</span>
                  <span className="text-sm font-mono font-bold text-gray-700">{eni.PrivateIp}</span>
                </div>
                {eni.PublicIp !== 'None' && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-blue-500 uppercase">Public IP</span>
                    <span className="text-sm font-mono font-bold text-blue-600">{eni.PublicIp}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-50">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Attached To</div>
                <div className="text-xs font-bold text-gray-700 truncate">{eni.Attachment}</div>
                <div className="text-[10px] text-gray-500 italic truncate">{eni.Description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="text-lg font-semibold text-gray-900">No Interfaces Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Refresh to see all IP assignments across your AWS infrastructure.</p>
        </div>
      )}
    </div>
  );
}

function ENIStatusBadge({ state }) {
  const isAvailable = state === 'available'; // 'in-use' is standard
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      state === 'in-use' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
    }`}>
      {state}
    </span>
  );
}