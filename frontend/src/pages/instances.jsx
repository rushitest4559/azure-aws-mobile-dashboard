// pages/instances/InstancesPage.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const API_URL = 'https://1at3htoh77.execute-api.ap-south-1.amazonaws.com/dev/list_inst';

export function InstancesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem('ec2Cache');
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('ec2Cache'); // corrupted cache
      }
    }
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json);
      localStorage.setItem('ec2Cache', JSON.stringify(json));
    } catch (e) {
      setError('Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  // SAFE DATE PARSER — never crashes
  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(0); // old epoch if missing
    const cleaned = dateStr.replace(/\s+(IST|UTC|GMT.*)$/i, '').trim();
    const date = new Date(cleaned);
    return isNaN(date) ? new Date(0) : date;
  };

  const instances = data?.Instances || [];
  const summary = data?.Summary || {};

  const sorted = [...instances].sort((a, b) => {
    return parseDate(b.CreatedAt) - parseDate(a.CreatedAt);
  });

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>My EC2 Instances</h1>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#666' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <p style={{ color: 'red', margin: '8px 0' }}>{error}</p>}

      {summary.AsOf && (
        <p style={{ margin: '8px 0', color: '#444', fontSize: '14px' }}>
          Last updated: {summary.AsOf?.split(' ')[1] || '—'} | 
          Total: {summary.TotalInstances || instances.length} | 
          Running: {summary.Running || 0} | 
          Stopped: {summary.Stopped || 0}
        </p>
      )}

      {!data && !loading && (
        <p style={{ textAlign: 'center', marginTop: '60px', color: '#666' }}>
          No data found. Click Refresh to load.
        </p>
      )}

      {data && instances.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '16px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Region</th>
                <th style={th}>Name</th>
                <th style={th}>ID</th>
                <th style={th}>State</th>
                <th style={th}>Type</th>
                <th style={th}>Public IP</th>
                <th style={th}>Private IP</th>
                <th style={th}>Created</th>
                <th style={th}>Last Change</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(inst => (
                <tr key={inst.InstanceId}>
                  <td style={td}>{inst.Region}</td>
                  <td style={td}>{inst.Tags?.Name || '-'}</td>
                  <td style={td}>{inst.InstanceId}</td>
                  <td style={td}>
                    <span style={{ color: inst.State === 'running' ? 'green' : 'red', fontWeight: 'bold' }}>
                      {inst.State}
                    </span>
                  </td>
                  <td style={td}>{inst.Type}</td>
                  <td style={td}>{inst.PublicIp === 'None' ? '-' : inst.PublicIp}</td>
                  <td style={td}>{inst.PrivateIp}</td>
                  <td style={td}>{format(parseDate(inst.CreatedAt), 'dd MMM yyyy HH:mm')}</td>
                  <td style={td}>{format(parseDate(inst.LastStateChange), 'dd MMM yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '12px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px', borderBottom: '2px solid #ddd' };
const td = { padding: '12px 8px', fontSize: '14px', borderBottom: '1px solid #eee' };