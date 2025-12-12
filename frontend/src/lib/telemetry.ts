import { WebSDK } from '@opentelemetry/sdk-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

let sdk: WebSDK | null = null

export function initOpenTelemetry() {
  const otelEndpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT

  if (!otelEndpoint) {
    console.warn('OpenTelemetry endpoint not configured. Tracing is disabled.')
    return
  }

  try {
    sdk = new WebSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: 'delineate-observability-dashboard',
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      }),
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [
            /.*\/vite\/.*/,
            /.*\/@vite\/.*/,
            /.*\/@react-refresh\/.*/,
          ],
        }),
      ],
    })

    sdk.start()
    console.log('OpenTelemetry initialized successfully')
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error)
  }
}

export function shutdownOpenTelemetry() {
  if (sdk) {
    sdk.shutdown()
    sdk = null
  }
}

