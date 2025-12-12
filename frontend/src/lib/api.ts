import axios, { AxiosError } from "axios";
import * as Sentry from "@sentry/react";
import { trace } from "@opentelemetry/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Add trace context
api.interceptors.request.use((config) => {
  try {
    const tracer = trace.getTracer("delineate-frontend");
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext.isValid && spanContext.traceId) {
        // Format as W3C Trace Context
        const traceFlags = spanContext.traceFlags || 0x01;
        const traceparent = `00-${spanContext.traceId}-${spanContext.spanId || "0000000000000000"}-0${traceFlags.toString(16)}`;
        config.headers["traceparent"] = traceparent;
      }
    } else {
      // Create a new span if no active span
      const span = tracer.startSpan("http.request");
      const spanContext = span.spanContext();
      if (spanContext.isValid && spanContext.traceId) {
        const traceFlags = spanContext.traceFlags || 0x01;
        const traceparent = `00-${spanContext.traceId}-${spanContext.spanId || "0000000000000000"}-0${traceFlags.toString(16)}`;
        config.headers["traceparent"] = traceparent;
      }
      span.end();
    }
  } catch (error) {
    console.warn("Failed to add trace context:", error);
  }

  return config;
});

// Response interceptor: Handle errors and capture to Sentry
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Capture to Sentry with context
    if (error.response) {
      const traceId = error.config?.headers?.["traceparent"]
        ?.toString()
        .split("-")[1];
      Sentry.captureException(error, {
        tags: {
          endpoint: error.config?.url,
          method: error.config?.method,
          status: error.response.status,
        },
        extra: {
          traceId,
          responseData: error.response.data,
        },
      });

      // Store error for ErrorLog component
      try {
        const errorEvent = {
          id: Date.now().toString(),
          message: error.message || "API Error",
          level: "error",
          timestamp: new Date().toISOString(),
          tags: {
            endpoint: error.config?.url || "",
            method: error.config?.method || "",
            status: error.response.status.toString(),
            traceId: traceId || "",
          },
          extra: {
            responseData: error.response.data,
          },
        };
        const storedErrors = localStorage.getItem("sentry_errors");
        const errors = storedErrors ? JSON.parse(storedErrors) : [];
        errors.unshift(errorEvent);
        localStorage.setItem(
          "sentry_errors",
          JSON.stringify(errors.slice(0, 50)),
        );
      } catch (e) {
        console.warn("Failed to store error in localStorage:", e);
      }
    } else if (error.request) {
      Sentry.captureException(error, {
        tags: {
          error_type: "network_error",
        },
      });

      // Store network error
      try {
        const errorEvent = {
          id: Date.now().toString(),
          message: "Network Error",
          level: "error",
          timestamp: new Date().toISOString(),
          tags: {
            error_type: "network_error",
          },
        };
        const storedErrors = localStorage.getItem("sentry_errors");
        const errors = storedErrors ? JSON.parse(storedErrors) : [];
        errors.unshift(errorEvent);
        localStorage.setItem(
          "sentry_errors",
          JSON.stringify(errors.slice(0, 50)),
        );
      } catch (e) {
        console.warn("Failed to store error in localStorage:", e);
      }
    }

    return Promise.reject(error);
  },
);

// API endpoints
export const apiClient = {
  // Health check
  getHealth: () => api.get("/health"),

  // Download endpoints
  initiateDownload: (fileId: number) =>
    api.post("/v1/download/check", { file_id: fileId }),

  getDownloadStatus: (fileId: number) =>
    api.get(`/v1/download/status/${fileId}`),

  // Test error endpoint
  testError: () =>
    api.post("/v1/download/check?sentry_test=true", { file_id: 70000 }),
};
