# Trace Viewer Guide

## What is Trace Viewer?

**Trace Viewer** is a component in the Observability Dashboard that allows you to:

1. **Create Test Traces** - Manually create traces to test OpenTelemetry integration
2. **View Traces in Jaeger** - Open traces in Jaeger UI by entering trace IDs
3. **Track Recent Traces** - See a list of recently created traces

### What are Traces?

**Distributed traces** show the complete journey of a request through your system:
- **Frontend** → User clicks button, creates trace
- **API Request** → Trace ID sent in `traceparent` header
- **Backend** → Extracts trace context, creates child spans
- **Services** → All operations linked by same trace ID

This allows you to see the **entire request flow** in one view, making debugging much easier!

---

## How to Use Trace Viewer

### 1. Create a Test Trace

1. Go to the **Trace Viewer** panel in the dashboard
2. Click **"Create Test Trace"** button
3. A trace will be created and the **Trace ID** will appear in the input field
4. The trace will be exported to Jaeger (may take a few seconds)

**What happens:**
- OpenTelemetry SDK creates a new trace
- Trace ID is generated (32 hex characters)
- Trace is exported to Jaeger via OTLP endpoint
- Trace ID is displayed in the input field

### 2. View Trace in Jaeger

1. Enter or paste a **Trace ID** in the input field
2. Click **"View in Jaeger"** button
3. Jaeger UI will open in a new tab showing the full trace

**Trace ID Format:**
- 32 hexadecimal characters (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
- Can be copied from:
  - Trace Viewer input field
  - Browser console logs
  - Download Jobs panel
  - Jaeger UI directly

### 3. Find Trace IDs

Trace IDs can be found in several places:

#### A. **Download Jobs Panel**
- After starting a download, trace IDs are automatically extracted from API requests
- Click the **"View Trace in Jaeger →"** link in each job card
- Trace ID is extracted from the `traceparent` header sent with API requests

#### B. **Browser Console**
- Open browser DevTools (F12)
- Look for console logs:
  ```
  ✅ Trace created with ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  ✅ Trace completed and exported to Jaeger
  ```

#### C. **Jaeger UI Directly**
- Go to http://localhost:16686
- Search for traces by service name:
  - `delineate-observability-dashboard` (frontend)
  - `delineate-hackathon-challenge` (backend)
- Click on any trace to see its ID

#### D. **Recent Traces Section**
- After creating traces, they appear in the "Recent Traces" section
- Click **"View"** button next to any trace ID to open it in Jaeger

---

## Why "Create Test Trace" Might Not Work

### Issue 1: OpenTelemetry Not Initialized

**Symptoms:**
- Clicking "Create Test Trace" does nothing
- No trace ID appears
- Console shows errors

**Solution:**
1. Check browser console for errors
2. Verify `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is set in environment
3. Check that OpenTelemetry is initialized in `main.tsx`

### Issue 2: Traces Not Appearing in Jaeger

**Symptoms:**
- Trace ID is created but not visible in Jaeger
- "View in Jaeger" shows "Trace not found"

**Solutions:**
1. **Wait a few seconds** - Traces need time to be exported
2. **Check Jaeger is running:**
   ```bash
   docker compose -f docker/compose.dev.yml ps delineate-jaeger
   ```
3. **Verify OTLP endpoint:**
   - Frontend: `VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
   - Backend: `OTEL_EXPORTER_OTLP_ENDPOINT=http://delineate-jaeger:4318`
4. **Check Jaeger UI:** http://localhost:16686
5. **Refresh Jaeger UI** - Click "Find Traces" button

### Issue 3: Trace ID Format Wrong

**Symptoms:**
- Trace ID looks wrong (not 32 hex characters)
- Jaeger shows "Invalid trace ID"

**Solution:**
- Trace IDs must be exactly 32 hexadecimal characters
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- Copy trace ID exactly as shown (no spaces or dashes)

---

## How Trace IDs Work

### Trace ID Extraction

When you start a download:
1. Frontend creates a trace with OpenTelemetry
2. Trace ID is included in `traceparent` header: `00-{traceId}-{spanId}-01`
3. Backend extracts trace ID from header
4. Backend creates child spans linked to same trace ID
5. All spans are exported to Jaeger with same trace ID

### Trace ID in Download Jobs

The Download Jobs panel extracts trace IDs from:
- API request headers (`traceparent`)
- Job responses
- OpenTelemetry context

**Note:** Currently, trace IDs are extracted from the `traceparent` header sent with API requests. If a download job doesn't show a trace ID, it means the trace context wasn't properly propagated.

---

## Accessing Jaeger UI

**URL:** http://localhost:16686

**Features:**
- Search traces by service, operation, or trace ID
- View trace timeline showing all spans
- See span details (attributes, logs, duration)
- Filter by time range, tags, or duration

**Services to Search:**
- `delineate-observability-dashboard` - Frontend traces
- `delineate-hackathon-challenge` - Backend traces

---

## Troubleshooting

### Trace Not Found in Jaeger

1. **Check Jaeger is running:**
   ```bash
   docker compose -f docker/compose.dev.yml ps
   ```

2. **Verify OTLP endpoint:**
   - Frontend: Check browser console for OpenTelemetry initialization
   - Backend: Check backend logs for OpenTelemetry errors

3. **Wait for export:**
   - Traces are batched and exported periodically
   - Wait 5-10 seconds after creating trace
   - Refresh Jaeger UI

4. **Check trace ID format:**
   - Must be 32 hex characters
   - No spaces, dashes, or special characters

### Trace ID Not Showing in Download Jobs

1. **Check API requests:**
   - Open browser DevTools → Network tab
   - Look for requests to `/v1/download/start`
   - Check if `traceparent` header is present

2. **Verify OpenTelemetry:**
   - Check browser console for initialization messages
   - Verify `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is set

3. **Check trace propagation:**
   - Backend must extract `traceparent` header
   - Backend must create child spans with same trace ID

---

## Quick Reference

| Action | Location | How |
|--------|---------|-----|
| Create trace | Trace Viewer | Click "Create Test Trace" |
| View trace | Trace Viewer | Enter trace ID, click "View in Jaeger" |
| Find trace ID | Download Jobs | Click "View Trace in Jaeger →" link |
| Find trace ID | Browser Console | Look for "Trace created with ID:" log |
| Find trace ID | Jaeger UI | Search for service, click trace |
| Access Jaeger | Browser | http://localhost:16686 |

---

## Example Workflow

1. **Start a download:**
   - Enter file ID: `12345`
   - Click "Start Download"
   - Wait for job to complete

2. **Find trace ID:**
   - Look in Download Jobs panel
   - Click "View Trace in Jaeger →" link
   - Or copy trace ID from console

3. **View in Jaeger:**
   - Paste trace ID in Trace Viewer
   - Click "View in Jaeger"
   - See full request flow: Frontend → API → S3 Check → Response

4. **Analyze trace:**
   - See timing for each operation
   - Check for errors or slow operations
   - Debug issues with full context

---

## Summary

**Trace Viewer** is your gateway to distributed tracing:
- ✅ Create test traces to verify OpenTelemetry works
- ✅ View traces in Jaeger to debug issues
- ✅ Track request flow across frontend and backend
- ✅ Find trace IDs from multiple sources

**Key Points:**
- Trace IDs are 32 hex characters
- Traces may take a few seconds to appear in Jaeger
- Trace IDs are automatically extracted from API requests
- Jaeger UI: http://localhost:16686

