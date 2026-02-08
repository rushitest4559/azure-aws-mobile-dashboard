import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL;

export function AutoScalingPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['ec2-asgs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/aws/ec2/asg`);
      if (!res.ok) throw new Error('Failed to fetch ASGs');
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
          <h1 className="text-2xl font-bold text-gray-900">Auto Scaling Groups</h1>
          <p className="text-sm text-gray-500">Fleet management and scaling policies</p>
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">ASG Name</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Capacity (D/m/M)</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((asg, idx) => (
                <tr key={`${asg.AutoScalingGroupName}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-700 font-medium">{asg.Region}</td>
                  <td className="p-4 font-bold text-gray-800">{asg.AutoScalingGroupName}</td>
                  <td className="p-4 text-sm font-mono text-gray-600">
                    {asg.DesiredCapacity} / {asg.MinSize} / {asg.MaxSize}
                  </td>
                  <td className="p-4">
                    <CapacityBadge current={asg.InstanceCount} desired={asg.DesiredCapacity} />
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
          {data.map((asg, idx) => (
            <div key={`${asg.AutoScalingGroupName}-${idx}`} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{asg.Region}</span>
                <CapacityBadge current={asg.InstanceCount} desired={asg.DesiredCapacity} />
              </div>
              
              <div className="text-lg font-bold text-gray-800 mb-4 truncate">{asg.AutoScalingGroupName}</div>
              
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Min</div>
                  <div className="font-mono font-bold text-gray-700">{asg.MinSize}</div>
                </div>
                <div className="text-center border-x border-gray-200">
                  <div className="text-[10px] uppercase font-bold text-blue-500">Desired</div>
                  <div className="font-mono font-bold text-blue-700">{asg.DesiredCapacity}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Max</div>
                  <div className="font-mono font-bold text-gray-700">{asg.MaxSize}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!hasData && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-lg font-semibold text-gray-900">No ASGs Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Refresh to monitor your auto-scaling fleets across regions.</p>
        </div>
      )}
    </div>
  );
}

function CapacityBadge({ current, desired }) {
  const isHealthy = current === desired;
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
      isHealthy ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
    }`}>
      {isHealthy ? 'Healthy' : 'Scaling'} ({current}/{desired})
    </span>
  );
}