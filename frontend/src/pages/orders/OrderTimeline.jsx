import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function OrderTimeline() {
  const { id } = useParams();
  const [timeline, setTimeline] = useState([]);
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    const fetchTimeline = axios.get(`/api/orders/${id}/timeline`, { withCredentials: true });
    const fetchOrder = axios.get(`/api/orders/${id}`, { withCredentials: true });

    Promise.all([fetchTimeline, fetchOrder])
      .then(([tRes, oRes]) => {
        if (!mounted) return;
        setTimeline(Array.isArray(tRes.data.data) ? tRes.data.data : []);
        setOrderInfo(oRes.data.data || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load timeline');
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6 text-gray-300">Loading timeline...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  const currentStatus = timeline.length ? timeline[timeline.length - 1] : null;

  return (
    <div className="p-6 max-w-4xl mx-auto text-gray-100">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Order Timeline</h1>
        <div className="text-sm text-gray-400 mt-1">
          {orderInfo ? (
            <>
              <span className="font-medium">{orderInfo.Restaurant?.name || orderInfo.restaurant_name || 'Restaurant'}</span>
              <span className="mx-2">•</span>
              <span>Total: ${orderInfo.total_amount}</span>
            </>
          ) : null}
        </div>
      </div>

      {currentStatus && (
        <div className="bg-indigo-700 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-200">Current status</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="font-bold text-lg">{currentStatus.status_name}</div>
            <div className="text-sm text-gray-200">{new Date(currentStatus.updated_at).toLocaleString()}</div>
          </div>
          {currentStatus.notes && <div className="text-sm text-gray-200 mt-2">{currentStatus.notes}</div>}
        </div>
      )}

      <div className="space-y-4">
        {timeline.map((step, idx) => (
          <div key={idx} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div className="w-3 h-3 rounded-full bg-gray-400 mt-1" />
              {idx < timeline.length - 1 && <div className="w-px h-full bg-gray-700 mt-1" style={{ minHeight: 20 }} />}
            </div>
            <div className="flex-1 bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-100">{step.status_name}</div>
                <div className="text-xs text-gray-400">{new Date(step.updated_at).toLocaleString()}</div>
              </div>
              {step.notes && <div className="text-sm text-gray-300 mt-1">{step.notes}</div>}
              <div className="text-xs text-gray-500 mt-2">Updated by: {step.actor_user_id ? `User #${step.actor_user_id}` : 'System'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
