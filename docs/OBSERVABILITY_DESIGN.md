# Observability Design: Challenge 4

## Executive Summary

This document outlines the observability architecture for the download microservice, focusing on **Sentry for error tracking** and **OpenTelemetry for distributed tracing**, as required by Challenge 4.

---

## Design Decisions

### Chosen Tech Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Frontend** | Vite + React + TypeScript | Fast setup, great DX, TypeScript for type safety |
| **Styling** | Tailwind CSS | Rapid UI development, modern design |
| **State Management** | React Query (TanStack Query) | Perfect for API state, caching, polling |
| **Error Tracking** | Sentry React SDK | Required by Challenge 4, excellent error tracking |
| **Tracing** | OpenTelemetry JavaScript | Required by Challenge 4, W3C Trace Context |
| **Visualization** | Recharts | Lightweight charts for metrics |
| **Backend Tracing** | OpenTelemetry (already exists) | Already integrated in backend |
| **Trace Viewer** | Jaeger UI (already exists) | Already in Docker Compose |

### Why NOT Prometheus/Grafana/Elasticsearch?

**Reason**: Challenge 4 requirements focus on:
- ✅ Sentry (error tracking) - **Required**
- ✅ OpenTelemetry (tracing) - **Required**
- ✅ Jaeger UI (trace viewing) - **Required**

While Prometheus/Grafana would be valuable additions, they're **not explicitly required** by Challenge 4. We focus on:
1. **Meeting all requirements** perfectly
2. **Bonus features** that enhance without over-complicating
3. **Time efficiency** for hackathon constraints

**Note**: The architecture can easily accommodate Prometheus/Grafana later if needed.

---

## Observability Signals & Flow

### Signals We Capture

1. **Errors** → Sentry
   - Frontend React errors (error boundary)
   - API errors (failed requests)
   - Business logic errors (custom events)

2. **Traces** → OpenTelemetry → Jaeger
   - User interactions (button clicks)
   - API calls (request/response)
   - Backend operations (existing)

3. **Metrics** → Calculated from API responses
   - API response times
   - Success/failure rates
   - Job completion times
   - (Optional: Could add Prometheus later)

4. **Health Status** → Direct API polling
   - API health (`/health`)
   - Storage health (S3/MinIO)

5. **Logs** → Structured logging in backend
   - Backend already logs with request IDs
   - Frontend captures console logs for Sentry

### Correlation Flow

```
User clicks "Download" button
    │
    ▼
Frontend: Generate traceId (OpenTelemetry)
    │
    ▼
Frontend: Create span "user.click.download"
    │
    ▼
API Request: Include traceparent header
    │ Header: traceparent: 00-abc123-def456-01
    ▼
Backend: Extract trace context
    │
    ▼
Backend: Create child span "api.download.initiate"
    │
    ▼
Backend: Log with trace_id=abc123
    │
    ▼
Backend: Process job...
    │
    ▼
Error occurs (if any) → Sentry
    │ Tags: trace_id=abc123, job_id=xyz789
    ▼
Frontend: Display trace ID in UI
    │ Clickable link to Jaeger
    ▼
Jaeger UI: View full trace
```

---

## Dashboard Architecture

### Component Structure

```
Dashboard
├── Header (with Sentry/OpenTelemetry status)
├── Health Status Panel
│   ├── API Health
│   ├── Storage Health
│   └── Last Updated
├── Download Jobs Panel
│   ├── Job List
│   ├── Filter Controls
│   └── Job Details Modal
├── Error Log Panel
│   ├── Recent Errors (from Sentry API)
│   ├── Error Details
│   └── Trace ID links
├── Performance Metrics Panel
│   ├── Response Time Chart
│   ├── Success/Failure Rate
│   └── Job Duration Chart
└── Trace Viewer Panel
    ├── Trace ID Input
    ├── Trace Details
    └── Link to Jaeger UI
```

### Data Flow

```
Frontend Dashboard
    │
    ├──→ Poll /health endpoint (every 10s)
    ├──→ Poll /v1/download/status/:jobId (every 5s)
    ├──→ Fetch errors from Sentry API (every 30s)
    ├──→ Calculate metrics from API responses
    └──→ Display trace IDs (from API responses)
```

---

## Implementation Strategy

### Phase 1: Core Dashboard (Required)
- ✅ React app setup
- ✅ Health status display
- ✅ Download jobs list
- ✅ Basic error display

### Phase 2: Sentry Integration (Required)
- ✅ Error boundary
- ✅ API error capture
- ✅ Custom error logging
- ✅ Error log panel

### Phase 3: OpenTelemetry Integration (Required)
- ✅ Frontend SDK setup
- ✅ Trace propagation
- ✅ Custom spans
- ✅ Trace ID display

### Phase 4: Enhanced Features (Bonus)
- ⭐ Performance metrics visualization
- ⭐ Real-time updates
- ⭐ Trace viewer integration
- ⭐ Error details modal

---

## Integration Points

### Backend (Already Implemented)
- ✅ OpenTelemetry SDK initialized
- ✅ Sentry middleware configured
- ✅ Request ID tracking
- ✅ Trace context propagation (via headers)

### Frontend (To Implement)
- ✅ Sentry React SDK initialization
- ✅ OpenTelemetry JavaScript SDK
- ✅ Trace parent header injection
- ✅ Error boundary component
- ✅ API client with error handling

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
VITE_JAEGER_UI_URL=http://localhost:16686
```

---

## Docker Integration

### Frontend Service
- Runs on port 5173 (Vite dev server)
- Connects to API via service name
- Shares network with backend, Jaeger, MinIO

### Services in Compose
- ✅ delineate-app (backend)
- ✅ minio (storage)
- ✅ delineate-jaeger (traces)
- ✅ frontend (NEW - dashboard)

---

## Testing Strategy

### Manual Testing
1. Start all services
2. Open dashboard
3. Initiate download
4. Verify trace ID appears
5. Trigger error
6. Verify Sentry captures error
7. Check Jaeger for trace

### Automated Testing (Optional)
- Component tests for dashboard widgets
- Integration tests for Sentry capture
- E2E tests for trace propagation

---

This design focuses on **meeting Challenge 4 requirements** while providing a **production-ready observability dashboard** that demonstrates deep understanding of distributed tracing and error tracking.

