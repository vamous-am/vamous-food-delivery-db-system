import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function DriverDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    axios
      .get('/api/orders/reports/driver', { withCredentials: true })
      .then((res) => {
        if (!mounted) return;
        setData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load driver report');
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6 text-gray-300">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!data) return <div className="p-6 text-gray-300">No data available</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto text-gray-100">
      <h1 className="text-3xl font-bold mb-8">Driver Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Deliveries */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm">Total Deliveries</div>
          <div className="text-4xl font-bold mt-2">{data.totalDeliveries}</div>
        </div>

        {/* Average Delivery Time */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm">Avg Delivery Time</div>
          <div className="text-4xl font-bold mt-2">
            {data.avgDeliveryMinutes ? `${data.avgDeliveryMinutes} min` : 'N/A'}
          </div>
        </div>

        {/* Total Fees Earned */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm">Total Fees Earned</div>
          <div className="text-4xl font-bold mt-2">${data.totalFeesEarned?.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Last 5 Deliveries</h2>
        {data.lastFive && data.lastFive.length > 0 ? (
          <div className="space-y-3">
            {data.lastFive.map((delivery, idx) => (
              <div key={idx} className="bg-gray-700 rounded p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-100">{delivery.restaurant_name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Order #{delivery.order_id} • {new Date(delivery.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-lg font-semibold text-right">${delivery.total_amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No completed deliveries yet</p>
        )}
      </div>
    </div>
  );
}
