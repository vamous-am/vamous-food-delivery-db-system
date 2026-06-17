import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

// colors for the pie chart slices
const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // fetch the restaurant report when the page loads
    axios
      .get("/api/orders/reports/restaurant", { withCredentials: true })
      .then((res) => {
        setData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h1>
      <p className="text-gray-400 mb-8">Overview for {data.restaurant}</p>

      {/* Revenue last 7 days */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue – Last 7 Days</h2>

        {data.revenueByDay.length === 0 ? (
          <p className="text-gray-400">No completed orders in the last 7 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.revenueByDay}>
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                labelStyle={{ color: "#f9fafb" }}
              />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* order status pie chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Orders by Status</h2>

          {data.statusBreakdown.length === 0 ? (
            <p className="text-gray-400">No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, pct }) => `${status} ${pct}%`}
                >
                  {data.statusBreakdown.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* top 5 menu items table */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Items This Month</h2>

          {data.topItems.length === 0 ? (
            <p className="text-gray-400">No sales data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-right pb-2">Sold</th>
                  <th className="text-right pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-700 text-gray-200">
                    <td className="py-2">{item.item_name}</td>
                    <td className="text-right py-2">{item.units_sold}</td>
                    <td className="text-right py-2">${item.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
