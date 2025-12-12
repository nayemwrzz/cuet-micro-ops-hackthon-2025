import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Metric {
  timestamp: string;
  responseTime: number;
  status: "success" | "error";
}

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
  });

  // Simulate collecting metrics from API calls
  useEffect(() => {
    const storedMetrics = localStorage.getItem("performance_metrics");
    if (storedMetrics) {
      try {
        const parsed = JSON.parse(storedMetrics);
        setMetrics(parsed);
        calculateStats(parsed);
      } catch (e) {
        console.error("Failed to parse metrics:", e);
      }
    }

    // Intercept fetch/axios calls to collect metrics
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const startTime = Date.now();
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const metric: Metric = {
          timestamp: new Date().toISOString(),
          responseTime: duration,
          status: response.ok ? "success" : "error",
        };

        const newMetrics = [metric, ...metrics].slice(0, 100); // Keep last 100
        setMetrics(newMetrics);
        localStorage.setItem("performance_metrics", JSON.stringify(newMetrics));
        calculateStats(newMetrics);

        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const metric: Metric = {
          timestamp: new Date().toISOString(),
          responseTime: duration,
          status: "error",
        };

        const newMetrics = [metric, ...metrics].slice(0, 100);
        setMetrics(newMetrics);
        localStorage.setItem("performance_metrics", JSON.stringify(newMetrics));
        calculateStats(newMetrics);

        throw error;
      }
    };
  }, []);

  const calculateStats = (data: Metric[]) => {
    if (data.length === 0) return;

    const total = data.length;
    const successful = data.filter((m) => m.status === "success").length;
    const successRate = (successful / total) * 100;

    const responseTimes = data.map((m) => m.responseTime).sort((a, b) => a - b);
    const avgResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;

    setStats({
      totalRequests: total,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
    });
  };

  // Format data for charts
  const chartData = metrics.slice(-20).map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    responseTime: m.responseTime,
    status: m.status,
  }));

  const statusData = [
    {
      name: "Success",
      count: metrics.filter((m) => m.status === "success").length,
    },
    {
      name: "Error",
      count: metrics.filter((m) => m.status === "error").length,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalRequests}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.successRate}%
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.avgResponseTime}ms
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600 mb-1">P95 Response Time</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.p95ResponseTime}ms
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Response Time Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#0ea5e9"
                name="Response Time (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Success vs Error</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0ea5e9" name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {metrics.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No metrics collected yet. Make some API calls to see metrics here.
        </p>
      )}
    </div>
  );
}
