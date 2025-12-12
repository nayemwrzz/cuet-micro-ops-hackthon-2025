/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_OTEL_EXPORTER_OTLP_ENDPOINT: string;
  readonly VITE_JAEGER_UI_URL: string;
  readonly VITE_NODE_ENV: string;
  readonly VITE_PROMETHEUS_URL: string;
  readonly VITE_GRAFANA_URL: string;
  readonly VITE_ELASTICSEARCH_URL: string;
  readonly VITE_KIBANA_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
