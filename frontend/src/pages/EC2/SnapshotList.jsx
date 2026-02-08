import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function SnapshotsPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-snapshots'],
    queryFn: async () => {
      // Matches your main.py route: /aws/ec2/snapshots
      const res = await fetch(`${API_URL}/aws/ec2/snapshots`);
      if (!res.ok) throw new Error('Failed to fetch snapshots');
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
          <h1 className="text-2xl font-bold text-gray-900">EBS Snapshots</h1>
          <p className="text-sm text-gray-500">Point-in-time backups of your volumes</p>
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Snapshot ID</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Size</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Created On</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((snap) => (
                <tr key={snap.SnapshotId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{snap.Region}</td>
                  <td className="p-4">
                    <div className="font-mono text-sm text-blue-600">{snap.SnapshotId}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-xs">{snap.Description || 'No description'}</div>
                  </td>
                  <td className="p-4 text-gray-900 font-bold">{snap.SizeGb} GB</td>
                  <td className="p-4 text-xs text-gray-600">{snap.StartTime}</td>
                  <td className="p-4">
                    <SnapshotStatusBadge state={snap.State} progress={snap.Progress} />
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
          {data.map((snap) => (
            <div key={snap.SnapshotId} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{snap.Region}</span>
                <SnapshotStatusBadge state={snap.State} progress={snap.Progress} />
              </div>
              
              <div className="text-lg font-mono font-bold text-gray-800 mb-1">{snap.SnapshotId}</div>
              <div className="text-xs text-gray-500 mb-4 italic truncate">{snap.Description || 'Manual Snapshot'}</div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Size</div>
                  <div className="text-sm font-bold text-gray-800">{snap.SizeGb} GB</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Created</div>
                  <div className="text-[11px] font-medium text-gray-700">{snap.StartTime.split(' ')[0]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">📸</div>
          <h3 className="text-lg font-semibold text-gray-900">No Snapshots Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Refresh to see your backup history across all regions.</p>
        </div>
      )}
    </div>
  );
}

function SnapshotStatusBadge({ state, progress }) {
  const isCompleted = state === 'completed';
  return (
    <div className="flex flex-col items-end">
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
        isCompleted ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}>
        {state}
      </span>
      {!isCompleted && <span className="text-[9px] font-mono text-blue-500 mt-1">{progress}</span>}
    </div>
  );
}