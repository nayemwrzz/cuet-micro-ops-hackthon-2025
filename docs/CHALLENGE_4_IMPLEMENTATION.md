# Challenge 4: Observability Dashboard - Implementation Guide

## Overview

This document provides comprehensive instructions for setting up and using the Observability Dashboard for the Delineate download microservice.

---

## Quick Start

### 1. Set Up Sentry (Optional but Recommended)

1. Create a Sentry account at [https://sentry.io](https://sentry.io)
2. Create a new project and select **React** as the platform
3. Copy your **DSN** (Data Source Name)
4. Add it to your `.env` file:

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Note**: The dashboard works without Sentry, but error tracking will be limited.

### 2. Start All Services

```bash
# Start all services including frontend
docker compose -f docker/compose.dev.yml up
```

Or start services individually:

```bash
# Start backend services
docker compose -f docker/compose.dev.yml up minio minio-init delineate-app delineate-jaeger

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

### 3. Access the Dashboard

- **Observability Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Jaeger UI**: http://localhost:16686
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

---

## Detailed Setup

### Prerequisites

- Node.js >= 18
- Docker and Docker Compose
- Sentry account (optional)

### Frontend Setup

#### Option 1: Using Docker Compose (Recommended)

The frontend service is included in `docker/compose.dev.yml`:

```bash
docker compose -f docker/compose.dev.yml up frontend
```

The dashboard will be available at `http://localhost:5173`

#### Option 2: Local Development

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set:
# VITE_API_URL=http://localhost:3000
# VITE_SENTRY_DSN=your_sentry_dsn
# VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# VITE_JAEGER_UI_URL=http://localhost:16686

# Start dev server
npm run dev
```

### Environment Variables

#### Backend (.env in project root)

```env
# Sentry (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# OpenTelemetry (already configured)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### Frontend (frontend/.env)

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Sentry Configuration (optional)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# OpenTelemetry Configuration
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Jaeger UI URL
VITE_JAEGER_UI_URL=http://localhost:16686

# Environment
VITE_NODE_ENV=development
```

---

## Using the Dashboard

### Health Status Panel

- **API Status**: Shows if the backend API is healthy
- **Storage Status**: Shows if S3/MinIO is connected
- **Environment**: Displays current environment
- **Auto-refresh**: Updates every 10 seconds

### Download Jobs Panel

1. **Start a Download**:
   - Enter a file ID (e.g., `12345`)
   - Click "Start Download"
   - The job will appear in the list with status `PENDING` → `IN_PROGRESS` → `COMPLETED`

2. **Track Job Status**:
   - Jobs are automatically polled every 2 seconds
   - Status colors:
     - 🟢 Green: `COMPLETED`
     - 🔴 Red: `FAILED`, `TIMEOUT`
     - 🔵 Blue: `IN_PROGRESS`
     - 🟡 Yellow: `PENDING`

3. **View Traces**:
   - Click "View Trace in Jaeger" link (if trace ID is available)
   - Opens Jaeger UI showing the full request trace

### Error Log Panel

- **Automatic Error Capture**: Errors from API calls are automatically captured
- **Error Details**: Click on an error to see full details
- **Trace Correlation**: Each error shows associated trace ID
- **Sentry Integration**: Errors are also sent to Sentry (if configured)

**Testing Error Capture**:

1. Click "Test Error (Sentry)" button in the header
2. An intentional error is triggered
3. The error appears in:
   - Error Log panel
   - Sentry dashboard (if configured)

### Performance Metrics Panel

- **Total Requests**: Number of API requests made
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Mean response time
- **P95 Response Time**: 95th percentile response time
- **Charts**: Visual representation of response times and success/error rates

### Trace Viewer Panel

1. **View Existing Traces**:
   - Copy a trace ID from the Download Jobs panel
   - Paste it in the Trace ID input
   - Click "View in Jaeger"

2. **Create Test Trace**:
   - Click "Create Test Trace" button
   - A new trace is created
   - Click "View in Jaeger" to see it

3. **Trace Correlation Flow**:
   - See the correlation flow diagram in the panel
   - Understand how traces flow from frontend → backend → storage

---

## Testing the Implementation

### Test 1: Health Status

```bash
# Should show healthy status
curl http://localhost:3000/health
```

**Expected**: Dashboard shows green status indicators

### Test 2: Initiate Download

1. Open dashboard: http://localhost:5173
2. Enter file ID: `12345`
3. Click "Start Download"
4. Observe job status changing in real-time

**Expected**: Job appears in list, status updates automatically

### Test 3: Error Tracking

1. Click "Test Error (Sentry)" button
2. Check Error Log panel
3. (If Sentry configured) Check Sentry dashboard

**Expected**: Error appears in Error Log, optionally in Sentry

### Test 4: Trace Correlation

1. Start a download
2. Click "View Trace in Jaeger" link
3. In Jaeger UI, see the full trace:
   - Frontend span (user click)
   - API request span
   - Backend processing spans

**Expected**: Full trace visible in Jaeger with all spans linked

### Test 5: Performance Metrics

1. Make several API calls (start downloads, check health)
2. View Performance Metrics panel
3. See charts updating

**Expected**: Metrics and charts show request statistics

---

## Troubleshooting

### Frontend won't start

```bash
# Check if port 5173 is already in use
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to backend

- Ensure backend is running: `docker compose -f docker/compose.dev.yml up delineate-app`
- Check `VITE_API_URL` in `frontend/.env`
- Check browser console for CORS errors

### Sentry not capturing errors

- Verify `VITE_SENTRY_DSN` is set correctly
- Check Sentry dashboard for project settings
- Check browser console for Sentry initialization messages

### Traces not appearing in Jaeger

- Ensure Jaeger is running: `docker compose -f docker/compose.dev.yml up delineate-jaeger`
- Check `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` in `frontend/.env`
- Verify `OTEL_EXPORTER_OTLP_ENDPOINT` in backend `.env`
- Check Jaeger UI: http://localhost:16686

### Performance metrics not showing

- Metrics are collected from actual API calls
- Make some API calls (start downloads, check health)
- Metrics are stored in browser localStorage

---

## Architecture Details

### Trace Correlation Flow

```
User clicks "Download" button (Frontend)
    │
    ▼
OpenTelemetry SDK creates span
    │ traceId: abc123...
    ▼
API request includes traceparent header
    │ Header: traceparent: 00-abc123-def456-01
    ▼
Backend extracts trace context
    │
    ▼
Backend creates child spans
    │ - api.download.initiate
    │ - s3.check_object
    │ - job.process
    ▼
All spans linked by traceId: abc123
    │
    ▼
View in Jaeger UI
    │ Full end-to-end trace visible
```

### Error Capture Flow

```
API call fails (Frontend)
    │
    ▼
Axios interceptor catches error
    │
    ▼
Sentry.captureException() called
    │ - Includes traceId
    │ - Includes request context
    │ - Includes response data
    ▼
Error displayed in Error Log panel
    │
    ▼
(If Sentry configured) Error sent to Sentry
```

### Metrics Collection

- Metrics are collected by intercepting `window.fetch`
- Stored in browser localStorage
- Displayed in Performance Metrics panel
- Can be extended to send to Prometheus/backend

---

## Advanced Configuration

### Custom Sentry Configuration

Edit `frontend/src/main.tsx`:

```typescript
Sentry.init({
  dsn: sentryDsn,
  environment: import.meta.env.VITE_NODE_ENV,
  tracesSampleRate: 1.0, // Adjust sampling rate
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Add custom integrations
});
```

### Custom OpenTelemetry Configuration

Edit `frontend/src/lib/telemetry.ts`:

```typescript
sdk = new WebSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "delineate-observability-dashboard",
    // Add custom resource attributes
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
    // Add custom exporter options
  }),
  // Add more instrumentations
});
```

### Production Build

```bash
cd frontend
npm run build

# Output in dist/ directory
# Serve with any static file server:
# - nginx
# - Apache
# - CDN
# - Docker with nginx
```

---

## Integration Checklist

- [x] React application created in `frontend/` directory
- [x] Sentry error boundary and error capture
- [x] OpenTelemetry SDK integration
- [x] Trace propagation via `traceparent` header
- [x] Health status monitoring
- [x] Download jobs management
- [x] Error log display
- [x] Performance metrics visualization
- [x] Trace viewer with Jaeger integration
- [x] Docker Compose integration
- [x] Comprehensive documentation

---

## Next Steps (Optional Enhancements)

1. **Prometheus Integration**: Add Prometheus metrics endpoint and Grafana dashboards
2. **Elasticsearch/Kibana**: Ship logs to Elasticsearch for advanced log analysis
3. **WebSocket Updates**: Real-time job status updates via WebSocket instead of polling
4. **Advanced Filtering**: Filter jobs by status, date, file ID
5. **Export Features**: Export metrics and error logs
6. **Alerting**: Set up alerts for error rates, slow response times

---

## Resources

- [Sentry React SDK Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org/)

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review browser console for errors
3. Check Docker logs: `docker compose -f docker/compose.dev.yml logs frontend`
4. Verify all environment variables are set correctly
