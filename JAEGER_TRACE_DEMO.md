# Jaeger Trace Demo Guide for Judges

## 🎯 Purpose
Demonstrate how Jaeger traces work by showing:
1. **Error Trace**: TCP connection error that appears in Jaeger
2. **Success Trace**: Normal successful operation trace

---

## 📋 Prerequisites

1. Ensure all services are running:
   ```bash
   docker compose -f docker/compose.dev.yml ps
   ```

2. Verify Jaeger is accessible:
   - Jaeger UI: http://localhost:16686
   - Backend API: http://localhost:3000

---

## 🔴 Error Trace Demo (TCP Connection Error)

### Command to Generate Error:

**Using curl:**
```bash
curl http://localhost:3000/v1/test/trace/error
```

**Using PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/v1/test/trace/error" -UseBasicParsing
```

**Using Browser:**
```
http://localhost:3000/v1/test/trace/error
```

### Expected Response:
```json
{
  "error": "Intentional Error for Tracing Demo",
  "message": "fetch failed",
  "type": "TypeError",
  "traceId": "abc123def456..."
}
```

### What You'll See in Jaeger:

1. **Open Jaeger UI**: http://localhost:16686
2. **Search for traces**:
   - Service: `delineate-hackathon-challenge`
   - Operation: `test.error.trace`
   - Look for traces with **ERROR** status (red indicator)

3. **Trace Details**:
   - **Span Name**: `test.error.trace`
   - **Status**: ❌ ERROR (red)
   - **Tags**:
     - `test.type`: `error_demo`
     - `error.scenario`: `tcp_connection_failure`
     - `error.name`: `TypeError` or `AbortError`
     - `error.message`: Connection error details
   - **Events**:
     - `Attempting connection to invalid URL`
   - **Error Details**: Shows the TCP connection failure

4. **What Judges Will See**:
   - The trace shows exactly where the error occurred
   - The error type (TCP connection failure)
   - The failed URL attempt
   - Full error stack trace
   - Trace ID for correlation

---

## ✅ Success Trace Demo (Normal Operation)

### Command to Generate Success:

**Using curl:**
```bash
curl http://localhost:3000/v1/test/trace/success
```

**Using PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/v1/test/trace/success" -UseBasicParsing
```

**Using Browser:**
```
http://localhost:3000/v1/test/trace/success
```

### Expected Response:
```json
{
  "message": "Successful trace demo",
  "status": "success",
  "health": "healthy",
  "traceId": "xyz789abc123..."
}
```

### What You'll See in Jaeger:

1. **Open Jaeger UI**: http://localhost:16686
2. **Search for traces**:
   - Service: `delineate-hackathon-challenge`
   - Operation: `test.success.trace`
   - Look for traces with **OK** status (green indicator)

3. **Trace Details**:
   - **Span Name**: `test.success.trace`
   - **Status**: ✅ OK (green)
   - **Tags**:
     - `test.type`: `success_demo`
     - `operation`: `health_check`
     - `health.status`: `healthy`
   - **Events**:
     - `Checking service health`
     - `Health check completed`
   - **Child Span**: `test.success.child_operation`
     - Shows trace hierarchy
     - Shows nested operations

4. **What Judges Will See**:
   - Clean, successful trace
   - Trace hierarchy (parent-child spans)
   - Operation timing
   - All attributes and events
   - No errors

---

## 🎬 Demo Script for Judges

### Step 1: Show Error Trace
1. **Execute error command**:
   ```bash
   curl http://localhost:3000/v1/test/trace/error
   ```

2. **Open Jaeger UI**: http://localhost:16686

3. **Search for the trace**:
   - Service: `delineate-hackathon-challenge`
   - Operation: `test.error.trace`
   - Time range: Last 5 minutes

4. **Explain to judges**:
   - "This trace shows a TCP connection error"
   - "You can see the exact error type, message, and where it occurred"
   - "The trace includes the failed URL and full error details"
   - "This helps developers debug issues quickly"

### Step 2: Show Success Trace
1. **Execute success command**:
   ```bash
   curl http://localhost:3000/v1/test/trace/success
   ```

2. **In Jaeger UI**, search for:
   - Service: `delineate-hackathon-challenge`
   - Operation: `test.success.trace`

3. **Explain to judges**:
   - "This is a successful operation trace"
   - "Notice the trace hierarchy with parent and child spans"
   - "All operations are timed and logged"
   - "This helps monitor system performance"

### Step 3: Compare Both Traces
- **Error trace**: Red, shows error details, helps debugging
- **Success trace**: Green, shows operation flow, helps monitoring

---

## 📊 Key Points to Highlight

1. **Error Tracing**:
   - ✅ Errors are automatically captured
   - ✅ Full context (URL, error type, message)
   - ✅ Trace ID for correlation
   - ✅ Helps identify root cause quickly

2. **Success Tracing**:
   - ✅ Operation flow visualization
   - ✅ Performance metrics (timing)
   - ✅ Trace hierarchy (parent-child spans)
   - ✅ Helps monitor system health

3. **Observability Benefits**:
   - ✅ Distributed tracing across services
   - ✅ Error correlation and debugging
   - ✅ Performance monitoring
   - ✅ Production issue diagnosis

---

## 🔍 Additional Test Scenarios

### Test Download Job Trace (Real Use Case)
```bash
# Start a download job
curl -X POST http://localhost:3000/v1/download/start \
  -H "Content-Type: application/json" \
  -d '{"file_id": 16000}'
```

**In Jaeger**, search for:
- Service: `delineate-hackathon-challenge`
- Operation: `POST /v1/download/start`
- Shows full download process trace

### Test Health Check Trace
```bash
curl http://localhost:3000/health
```

**In Jaeger**, search for:
- Service: `delineate-hackathon-challenge`
- Operation: `GET /health`
- Shows health check trace

---

## 🎯 Quick Reference Commands

### Error Trace (TCP Connection Error)
```bash
curl http://localhost:3000/v1/test/trace/error
```

### Success Trace (Normal Operation)
```bash
curl http://localhost:3000/v1/test/trace/success
```

### View in Jaeger
- URL: http://localhost:16686
- Service: `delineate-hackathon-challenge`
- Time Range: Last 5-15 minutes

---

## 💡 Tips for Demo

1. **Run error command first** - Shows problem scenario
2. **Open Jaeger immediately** - Traces appear within seconds
3. **Click on trace** - Show detailed view to judges
4. **Highlight error details** - Point out error type, message, stack trace
5. **Run success command** - Show normal operation
6. **Compare traces** - Side-by-side comparison
7. **Show trace ID** - Explain correlation across services

---

## ✅ Verification Checklist

- [ ] Error endpoint returns 500 error
- [ ] Error trace appears in Jaeger with ERROR status
- [ ] Error trace shows TCP connection failure details
- [ ] Success endpoint returns 200 success
- [ ] Success trace appears in Jaeger with OK status
- [ ] Success trace shows operation flow
- [ ] Both traces have trace IDs
- [ ] Traces are searchable in Jaeger UI

---

**Ready to demonstrate to judges!** 🎉

