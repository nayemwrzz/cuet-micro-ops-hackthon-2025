import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function HealthStatus() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 10000, // Poll every 10s
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Health Status</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Health Status</h2>
        <div className="text-red-600">Failed to fetch health status</div>
      </div>
    );
  }

  const health = data?.data;
  const isHealthy = health?.status === "ok";
  const storageHealthy = health?.storage?.status === "ok";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Health Status</h2>
        <span className="text-sm text-gray-500">
          Last updated: {formatDate(new Date(dataUpdatedAt))}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              API Status
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                isHealthy ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isHealthy ? "Healthy" : "Unhealthy"}
          </p>
          {health?.timestamp && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(health.timestamp)}
            </p>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Storage Status
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                storageHealthy ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {storageHealthy ? "Connected" : "Disconnected"}
          </p>
          {health?.storage?.endpoint && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {health.storage.endpoint}
            </p>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Environment
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {import.meta.env.VITE_NODE_ENV || "development"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {health?.version || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
