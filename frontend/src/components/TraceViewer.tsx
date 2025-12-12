import { useState } from "react";
import { trace } from "@opentelemetry/api";
import { useQuery } from "@tanstack/react-query";

interface JaegerTrace {
  traceID: string;
  spans: Array<{
    traceID: string;
    spanID: string;
    operationName: string;
    startTime: number;
    duration: number;
    tags: Array<{ key: string; value: string }>;
  }>;
}

export default function TraceViewer() {
  const [traceId, setTraceId] = useState<string>("");
  const [activeTraces, setActiveTraces] = useState<string[]>([]);

  const jaegerUrl =
    import.meta.env.VITE_JAEGER_UI_URL || "http://localhost:16686";

  // Fetch recent traces from Jaeger via backend proxy (bypasses CORS)
  const {
    data: jaegerTraces,
    refetch: refetchTraces,
    isLoading: isLoadingTraces,
    error: tracesError,
  } = useQuery({
    queryKey: ["jaeger-traces"],
    queryFn: async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        console.log(
          "🔵 Fetching traces via backend proxy:",
          `${apiUrl}/v1/jaeger/traces`,
        );

        // Try multiple service names via backend proxy
        const services = [
          "delineate-observability-dashboard",
          "delineate-hackathon-challenge",
        ];

        let allTraces: JaegerTrace[] = [];

        for (const service of services) {
          try {
            const url = `${apiUrl}/v1/jaeger/traces?service=${service}&limit=20`;
            console.log("🔵 Trying service:", service);

            const response = await fetch(url);
            console.log("🔵 Response status:", response.status);

            if (!response.ok) {
              console.warn(
                `⚠️ Failed to fetch traces for ${service}:`,
                response.status,
              );
              continue;
            }

            const data = await response.json();
            console.log("🔵 Response data:", data);

            if (data.data && Array.isArray(data.data)) {
              allTraces = [...allTraces, ...data.data];
              console.log(`✅ Found ${data.data.length} traces for ${service}`);
            }
          } catch (serviceError) {
            console.warn(
              `⚠️ Error fetching traces for ${service}:`,
              serviceError,
            );
          }
        }

        // If no traces found, try without service filter via backend proxy
        if (allTraces.length === 0) {
          console.log(
            "🔵 Trying to fetch all traces (no service filter) via backend proxy",
          );
          try {
            const url = `${apiUrl}/v1/jaeger/traces?limit=20`;
            console.log("🔵 Fetching all traces from:", url);
            const response = await fetch(url);
            console.log("🔵 Response status:", response.status);
            if (response.ok) {
              const data = await response.json();
              console.log("🔵 Response data:", data);
              if (data.data && Array.isArray(data.data)) {
                allTraces = data.data;
                console.log(`✅ Found ${allTraces.length} total traces`);
              }
            } else {
              const errorText = await response.text();
              console.error(
                "❌ Backend proxy error:",
                response.status,
                errorText,
              );
            }
          } catch (error) {
            console.error("❌ Failed to fetch all traces:", error);
          }
        }

        console.log("✅ Total traces found:", allTraces.length);
        return allTraces;
      } catch (error) {
        console.error("❌ Failed to fetch traces from Jaeger:", error);
        return [];
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 2,
  });

  const handleCreateTrace = () => {
    console.log("🔵 Create Test Trace button clicked");

    try {
      // Check if OpenTelemetry is available
      const otelEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
      if (!otelEndpoint) {
        console.error("❌ OpenTelemetry endpoint not configured");
        alert(
          "OpenTelemetry is not configured. Please set VITE_OTEL_EXPORTER_OTLP_ENDPOINT environment variable.",
        );
        return;
      }

      console.log("🔵 OpenTelemetry endpoint:", otelEndpoint);

      // Get tracer
      const tracer = trace.getTracer("delineate-frontend");
      console.log("🔵 Tracer obtained:", tracer);

      if (!tracer) {
        console.error("❌ Failed to get tracer");
        alert("Failed to get OpenTelemetry tracer. Check console for details.");
        return;
      }

      // Create span
      tracer.startActiveSpan(
        "user.action.create_test_trace",
        {
          attributes: {
            action: "test_trace_creation",
            source: "trace_viewer",
            timestamp: new Date().toISOString(),
          },
        },
        (span) => {
          console.log("🔵 Span created:", span);

          const spanContext = span.spanContext();
          console.log("🔵 Span context:", spanContext);

          // Check if traceId exists (it should always exist for a valid span)
          if (spanContext.traceId) {
            const newTraceId = spanContext.traceId;
            console.log("✅ Trace created with ID:", newTraceId);
            setTraceId(newTraceId);
            if (!activeTraces.includes(newTraceId)) {
              setActiveTraces((prev) => [newTraceId, ...prev].slice(0, 10));
            }
          } else {
            console.warn("⚠️ Trace created but traceId is missing", {
              traceId: spanContext.traceId,
              spanId: spanContext.spanId,
              traceFlags: spanContext.traceFlags,
            });
          }

          // Simulate some work and add child span
          tracer.startActiveSpan(
            "test_work",
            {
              attributes: {
                work_type: "simulation",
              },
            },
            (childSpan) => {
              console.log("🔵 Child span created");
              setTimeout(async () => {
                childSpan.end();
                span.end();

                // Force flush traces to Jaeger immediately
                try {
                  const provider = (window as any).__OTEL_TRACER_PROVIDER__;
                  if (provider) {
                    // Try to get the span processor and flush it
                    const spanProcessors =
                      (provider as any).spanProcessors || [];
                    for (const processor of spanProcessors) {
                      if (
                        processor &&
                        typeof processor.forceFlush === "function"
                      ) {
                        await processor.forceFlush();
                        console.log("✅ Span processor flushed");
                      }
                    }

                    // Also try provider forceFlush
                    if (typeof provider.forceFlush === "function") {
                      await provider.forceFlush();
                      console.log("✅ Provider flushed");
                    }
                  }
                } catch (flushError) {
                  console.warn("⚠️ Could not flush traces:", flushError);
                }

                console.log("✅ Trace completed");
                console.log("🔵 Trace ID (from span):", spanContext.traceId);
                console.log("🔵 Span ID:", spanContext.spanId);

                // Wait a bit for export to complete, then check what was actually exported
                setTimeout(() => {
                  const exportedTraceIds = (window as any)
                    .__LAST_EXPORTED_TRACE_IDS__;
                  if (exportedTraceIds && exportedTraceIds.length > 0) {
                    const actualTraceId = exportedTraceIds[0]; // First trace ID that was exported
                    console.log(
                      "🔵 Trace ID (actually exported to Jaeger):",
                      actualTraceId,
                    );

                    // Update the displayed trace ID to match what's in Jaeger
                    if (
                      actualTraceId &&
                      actualTraceId !== spanContext.traceId
                    ) {
                      console.log(
                        "⚠️ Trace ID mismatch! Updating to match Jaeger...",
                      );
                      setTraceId(actualTraceId);
                    } else {
                      setTraceId(spanContext.traceId);
                    }
                  } else {
                    setTraceId(spanContext.traceId);
                  }
                }, 200);

                console.log(
                  "💡 Check browser Network tab for POST requests to http://localhost:4318/v1/traces",
                );
                console.log(
                  "💡 Wait 5-10 seconds, then search Jaeger UI for the trace ID shown above",
                );
              }, 100);
            },
          );
        },
      );
    } catch (error) {
      console.error("❌ Failed to create trace:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      alert(
        `Failed to create trace: ${error instanceof Error ? error.message : String(error)}\n\nCheck browser console for details.`,
      );
    }
  };

  const handleViewTrace = () => {
    if (traceId.trim()) {
      window.open(`${jaegerUrl}/trace/${traceId.trim()}`, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Trace ID Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Trace Viewer</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trace ID
            </label>
            <div className="flex gap-2">
              {/* <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="Enter trace ID (32 hex characters)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              /> */}
              <button
                onClick={handleViewTrace}
                disabled={!traceId.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                View in Jaeger
              </button>
              <button
                onClick={handleCreateTrace}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Test Trace
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Create a test trace by clicking "Create Test Trace"</li>
              <li>Or paste a trace ID from the Download Jobs panel</li>
              <li>Click "View in Jaeger" to open the trace in Jaeger UI</li>
              <li>
                Trace IDs are also automatically linked in the Download Jobs
                list
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Traces from Jaeger */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Traces from Jaeger</h3>
          <button
            onClick={() => refetchTraces()}
            disabled={isLoadingTraces}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isLoadingTraces ? "Loading..." : "Refresh"}
          </button>
        </div>
        {isLoadingTraces ? (
          <div className="text-center py-8 text-gray-500">
            <p>Loading traces from Jaeger...</p>
          </div>
        ) : tracesError ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading traces from Jaeger</p>
            <p className="text-xs mt-2">
              {tracesError instanceof Error
                ? tracesError.message
                : String(tracesError)}
            </p>
            <p className="text-xs mt-2">
              Check browser console (F12) for details
            </p>
          </div>
        ) : jaegerTraces && jaegerTraces.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {jaegerTraces.map((trace: JaegerTrace) => {
              const firstSpan = trace.spans?.[0];
              const operationName = firstSpan?.operationName || "Unknown";
              const duration = firstSpan?.duration
                ? `${(firstSpan.duration / 1000).toFixed(2)}ms`
                : "N/A";

              return (
                <div
                  key={trace.traceID}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-gray-700 truncate">
                        {trace.traceID}
                      </code>
                      <span className="text-xs text-gray-500">
                        ({trace.spans?.length || 0} spans)
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {operationName} • {duration}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTraceId(trace.traceID);
                      window.open(
                        `${jaegerUrl}/trace/${trace.traceID}`,
                        "_blank",
                      );
                    }}
                    className="px-4 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors ml-2 flex-shrink-0"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No traces found in Jaeger</p>
            <p className="text-xs mt-2">
              Tried services: delineate-observability-dashboard,
              delineate-hackathon-challenge
            </p>
            <p className="text-xs mt-1">
              Check browser console (F12) for API call details
            </p>
            <p className="text-xs mt-1">
              Make sure traces are being exported to Jaeger
            </p>
          </div>
        )}
      </div>

      {/* Active Traces (from frontend) */}
      {activeTraces.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Traces</h3>
          <div className="space-y-2">
            {activeTraces.map((tId) => (
              <div
                key={tId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <code className="text-sm font-mono text-gray-700">{tId}</code>
                <button
                  onClick={() => {
                    setTraceId(tId);
                    window.open(`${jaegerUrl}/trace/${tId}`, "_blank");
                  }}
                  className="px-4 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Trace Correlation Flow</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {`User Action (Frontend)
    │
    ▼
OpenTelemetry SDK creates trace
    │ traceId: abc123...
    ▼
API Request includes traceparent header
    │ Header: traceparent: 00-abc123-...
    ▼
Backend extracts trace context
    │
    ▼
Backend creates child spans
    │
    ▼
All spans linked by traceId
    │
    ▼
View in Jaeger UI
    │ Full end-to-end trace visible
`}
          </pre>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <strong>Jaeger UI:</strong>{" "}
            <a
              href={jaegerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              {jaegerUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
