import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
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
    tracerProvider = new WebTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "delineate-observability-dashboard",
      }),
    });

    tracerProvider.addSpanProcessor(
      new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      })
    );

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
    console.log("OpenTelemetry initialized successfully");
  } catch (error) {
    console.error("Failed to initialize OpenTelemetry:", error);
  }
}

export function shutdownOpenTelemetry() {
  if (tracerProvider) {
    tracerProvider.shutdown();
    tracerProvider = null;
  }
}
