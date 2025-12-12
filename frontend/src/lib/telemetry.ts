import { WebTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";

let tracerProvider: WebTracerProvider | null = null;

export function initOpenTelemetry() {
  const otelEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otelEndpoint) {
    console.warn("OpenTelemetry endpoint not configured. Tracing is disabled.");
    return;
  }

  try {
    // Create the exporter
    // Jaeger OTLP HTTP endpoint: http://localhost:4318/v1/traces
    // Note: Jaeger all-in-one accepts OTLP HTTP on port 4318
    const otlpUrl = `${otelEndpoint}/v1/traces`;
    console.log("🔵 OTLP URL:", otlpUrl);
    console.log("🔵 OTLP Endpoint (base):", otelEndpoint);
    
    const traceExporter = new OTLPTraceExporter({
      url: otlpUrl,
      headers: {
        'Content-Type': 'application/x-protobuf',
      },
    });
    
    // Wrap export to add logging and store trace IDs
    const originalExport = traceExporter.export.bind(traceExporter);
    traceExporter.export = function(spans: any, resultCallback: any) {
      console.log("🔵 Exporting", spans.length, "span(s) to Jaeger");
      
      // Extract trace IDs from all spans being exported
      const exportedTraceIds = spans.map((s: any) => {
        // Try multiple ways to get trace ID
        const traceId = s.spanContext?.traceId || 
                       s._spanContext?.traceId || 
                       s.context?.traceId ||
                       (s.name && console.log("Span name:", s.name));
        return traceId;
      }).filter(Boolean);
      
      console.log("🔵 Trace IDs being exported to Jaeger:", exportedTraceIds);
      
      // Store trace IDs globally so TraceViewer can access them
      if (exportedTraceIds.length > 0) {
        (window as any).__LAST_EXPORTED_TRACE_IDS__ = exportedTraceIds;
        console.log("💡 These are the trace IDs you should search for in Jaeger!");
      }
      
      return originalExport(spans, (result: any) => {
        if (result.code === 0) {
          console.log("✅ Traces exported successfully to Jaeger");
          console.log("🔵 Search Jaeger for these trace IDs:", exportedTraceIds);
        } else {
          console.error("❌ Failed to export traces:", result);
        }
        resultCallback(result);
      });
    };

    // Create the span processor
    // Use SimpleSpanProcessor for immediate export (better for testing)
    // BatchSpanProcessor batches traces which can cause delays
    const spanProcessor = new SimpleSpanProcessor(traceExporter as any);

    // Create tracer provider with span processor
    // WebTracerProvider accepts spanProcessors in constructor
    // Resource can be omitted or passed as attributes object
    tracerProvider = new WebTracerProvider({
      resource: {
        [ATTR_SERVICE_NAME]: "delineate-observability-dashboard",
      } as any,
      spanProcessors: [spanProcessor] as any,
    });

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [
            /.*\/vite\/.*/,
            /.*\/@vite\/.*/,
            /.*\/@react-refresh\/.*/,
          ],
        }),
      ],
    });

    tracerProvider.register();
    
    // Store provider globally for force flush
    (window as any).__OTEL_TRACER_PROVIDER__ = tracerProvider;
    
    console.log("✅ OpenTelemetry initialized successfully");
    console.log("✅ OTLP Endpoint:", `${otelEndpoint}/v1/traces`);
    console.log("✅ Service Name: delineate-observability-dashboard");
    console.log("✅ Using SimpleSpanProcessor for immediate trace export");
  } catch (error) {
    console.error("❌ Failed to initialize OpenTelemetry:", error);
    console.error("❌ Error details:", error instanceof Error ? error.stack : error);
  }
}

export function shutdownOpenTelemetry() {
  if (tracerProvider) {
    tracerProvider.shutdown();
    tracerProvider = null;
  }
}
