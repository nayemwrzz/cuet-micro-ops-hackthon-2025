import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initOpenTelemetry } from "./lib/telemetry.ts";

// Initialize OpenTelemetry
initOpenTelemetry();

// Initialize Sentry
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_NODE_ENV || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
} else {
  console.warn("Sentry DSN not configured. Error tracking is disabled.");
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Sentry.ErrorBoundary
        fallback={({ error }) => (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-700 mb-4">
                {error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
      >
        <App />
      </Sentry.ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
