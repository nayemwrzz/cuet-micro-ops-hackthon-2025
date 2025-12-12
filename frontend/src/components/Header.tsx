import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { trace } from "@opentelemetry/api";

export default function Header() {
  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 30000, // Poll every 30s
  });

  const handleTestError = () => {
    const tracer = trace.getTracer("delineate-frontend");
    tracer.startActiveSpan("user.click.test_error", async (span) => {
      try {
        span.setAttribute("action", "test_sentry_error");
        await apiClient.testError();
      } catch (error) {
        // Error will be captured by Sentry interceptor
        console.error("Test error triggered:", error);
      } finally {
        span.end();
      }
    });
  };

  const isHealthy = healthData?.data?.status === "ok";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Delineate Observability Dashboard
            </h1>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isHealthy ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {isHealthy ? "System Healthy" : "System Unhealthy"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {import.meta.env.VITE_SENTRY_DSN ? (
                <span className="text-green-600">✓ Sentry Active</span>
              ) : (
                <span className="text-yellow-600">⚠ Sentry Disabled</span>
              )}
              {" | "}
              {import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT ? (
                <span className="text-green-600">✓ OpenTelemetry Active</span>
              ) : (
                <span className="text-yellow-600">
                  ⚠ OpenTelemetry Disabled
                </span>
              )}
            </div>
            <button
              onClick={handleTestError}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Test Error (Sentry)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
