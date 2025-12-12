# Challenge 4: Testing Guide

## Quick Test Commands

### 1. Start All Services

```bash
# Start everything
docker compose -f docker/compose.dev.yml up

# Or start in detached mode
docker compose -f docker/compose.dev.yml up -d
```

### 2. Access Services

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **Jaeger UI**: http://localhost:16686
- **MinIO Console**: http://localhost:9001

### 3. Test Health Status

```bash
# Should return healthy status
curl http://localhost:3000/health
```

**Expected Result**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "storage": {
    "status": "ok",
    "endpoint": "http://minio:9000"
  }
}
```

**Dashboard Check**: Health Status panel should show green indicators

---

## Test Scenarios

### Test 1: Initiate Download and Track Status

**Steps**:
1. Open dashboard: http://localhost:5173
2. In "Download Jobs" panel, enter file ID: `12345`
3. Click "Start Download"
4. Observe job status changing:
   - `PENDING` → `IN_PROGRESS` → `COMPLETED` (or `FAILED`)

**Expected Results**:
- Job appears in list immediately
- Status updates automatically every 2 seconds
- Trace ID link appears (if trace is available)
- Job details show timestamps and duration

**API Verification**:
```bash
# Check job status
curl http://localhost:3000/v1/download/status/12345
```

---

### Test 2: Error Tracking (Sentry)

**Steps**:
1. Open dashboard: http://localhost:5173
2. Click "Test Error (Sentry)" button in header
3. Check "Error Log" panel
4. (Optional) Check Sentry dashboard if DSN is configured

**Expected Results**:
- Error appears in Error Log panel immediately
- Error shows trace ID
- Error details modal shows full context when clicked
- If Sentry configured, error appears in Sentry dashboard

**API Verification**:
```bash
# Trigger test error
curl -X POST "http://localhost:3000/v1/download/check?sentry_test=true" \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'
```

**Expected Response**:
```json
{
  "error": "Internal Server Error",
  "message": "Sentry test error triggered for file_id=70000 - This should appear in Sentry!"
}
```

---

### Test 3: Trace Correlation

**Steps**:
1. Start a download (see Test 1)
2. Click "View Trace in Jaeger" link in job details
3. In Jaeger UI, verify:
   - Frontend span (user interaction)
   - API request span
   - Backend processing spans

**Expected Results**:
- Trace link appears in job details
- Jaeger UI opens with full trace
- All spans are linked by same trace ID
- Trace shows end-to-end flow

**Manual Trace Check**:
1. Open Jaeger UI: http://localhost:16686
2. Search for service: `delineate-hackathon-challenge`
3. Find recent traces
4. Click on a trace to see full span details

---

### Test 4: Performance Metrics

**Steps**:
1. Make several API calls:
   - Start multiple downloads
   - Check health status
   - Trigger test errors
2. View "Performance Metrics" panel
3. Observe charts updating

**Expected Results**:
- Total Requests counter increases
- Success Rate shows percentage
- Average Response Time calculated
- P95 Response Time calculated
- Charts show data points

---

### Test 5: Trace Viewer

**Steps**:
1. Open "Trace Viewer" tab in dashboard
2. Click "Create Test Trace" button
3. Click "View in Jaeger" button
4. Or paste a trace ID from Download Jobs panel

**Expected Results**:
- Trace ID generated and displayed
- "View in Jaeger" opens Jaeger UI
- Trace appears in recent traces list
- Correlation flow diagram visible

---

## Integration Tests

### Frontend-Backend Integration

```bash
# 1. Check if backend is responding
curl http://localhost:3000/health

# 2. Start a download from API
curl -X POST http://localhost:3000/v1/download/check \
  -H "Content-Type: application/json" \
  -d '{"file_id": 99999}'

# 3. Check job status
curl http://localhost:3000/v1/download/status/99999

# 4. Verify trace is created (check Jaeger UI)
# Open http://localhost:16686 and search for recent traces
```

### Sentry Integration Test

```bash
# Trigger error
curl -X POST "http://localhost:3000/v1/download/check?sentry_test=true" \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'

# Verify error appears in:
# 1. Dashboard Error Log panel
# 2. Sentry dashboard (if DSN configured)
```

### OpenTelemetry Integration Test

1. Start a download from dashboard
2. Check browser Network tab for `traceparent` header in API requests
3. Verify header format: `00-<trace-id>-<span-id>-<flags>`
4. Check Jaeger UI for traces with matching trace ID

---

## Expected Results Summary

| Test | Dashboard | API | Jaeger | Sentry |
|------|-----------|-----|--------|--------|
| Health Status | ✅ Green indicators | ✅ 200 OK | - | - |
| Download Jobs | ✅ Job list updates | ✅ Status endpoint works | ✅ Traces appear | - |
| Error Tracking | ✅ Errors in log | ✅ Error response | ✅ Trace with error | ✅ Error captured |
| Trace Correlation | ✅ Trace IDs visible | ✅ traceparent header | ✅ Full trace | ✅ Trace ID in tags |
| Performance Metrics | ✅ Charts update | - | - | - |

---

## Troubleshooting Test Failures

### Dashboard not loading

```bash
# Check if frontend is running
docker compose -f docker/compose.dev.yml ps frontend

# Check logs
docker compose -f docker/compose.dev.yml logs frontend

# Restart frontend
docker compose -f docker/compose.dev.yml restart frontend
```

### Can't connect to backend

```bash
# Check if backend is running
docker compose -f docker/compose.dev.yml ps delineate-app

# Check backend logs
docker compose -f docker/compose.dev.yml logs delineate-app

# Test backend directly
curl http://localhost:3000/health
```

### Traces not appearing in Jaeger

```bash
# Check if Jaeger is running
docker compose -f docker/compose.dev.yml ps delineate-jaeger

# Check Jaeger logs
docker compose -f docker/compose.dev.yml logs delineate-jaeger

# Verify OTEL endpoint
curl http://localhost:4318/v1/traces
```

### Errors not appearing in Sentry

1. Check `VITE_SENTRY_DSN` in `frontend/.env`
2. Check browser console for Sentry initialization messages
3. Verify Sentry project settings
4. Check Sentry dashboard for project

---

## Automated Test Script

Create a test script `test-challenge4.sh`:

```bash
#!/bin/bash

echo "Testing Challenge 4 Implementation..."

# Test 1: Health check
echo "Test 1: Health Check"
curl -s http://localhost:3000/health | jq '.status' | grep -q "ok" && echo "✅ Health check passed" || echo "❌ Health check failed"

# Test 2: Start download
echo "Test 2: Start Download"
RESPONSE=$(curl -s -X POST http://localhost:3000/v1/download/check \
  -H "Content-Type: application/json" \
  -d '{"file_id": 12345}')
echo "Response: $RESPONSE"

# Test 3: Error tracking
echo "Test 3: Error Tracking"
ERROR_RESPONSE=$(curl -s -X POST "http://localhost:3000/v1/download/check?sentry_test=true" \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}')
echo "$ERROR_RESPONSE" | grep -q "Sentry test error" && echo "✅ Error test passed" || echo "❌ Error test failed"

echo "Tests complete!"
```

Run with:
```bash
chmod +x test-challenge4.sh
./test-challenge4.sh
```

---

## Verification Checklist

- [ ] Dashboard loads at http://localhost:5173
- [ ] Health status shows green indicators
- [ ] Can initiate downloads from dashboard
- [ ] Job status updates in real-time
- [ ] Errors appear in Error Log panel
- [ ] Trace IDs are visible in job details
- [ ] Traces appear in Jaeger UI
- [ ] Performance metrics update
- [ ] Trace Viewer can create and view traces
- [ ] All components render correctly
- [ ] No console errors in browser
- [ ] Docker services are healthy

---

## Success Criteria

✅ **All tests pass**
✅ **Dashboard is functional**
✅ **Sentry captures errors** (if configured)
✅ **Traces appear in Jaeger**
✅ **Performance metrics are collected**
✅ **Trace correlation works end-to-end**

---

For detailed troubleshooting, see `docs/CHALLENGE_4_IMPLEMENTATION.md`.

