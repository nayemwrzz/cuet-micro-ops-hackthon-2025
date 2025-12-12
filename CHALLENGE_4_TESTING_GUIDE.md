# Challenge 4: Complete Testing Guide

## 🚀 Quick Start - Test Challenge 4

### Step 1: Start All Services

```powershell
# Navigate to project root
cd "D:\CUET\cuet fest onsite"

# Start all services (including frontend)
docker compose -f docker/compose.dev.yml up -d

# Check all services are running
docker compose -f docker/compose.dev.yml ps
```

**Expected Output**: All services should show `Up` status:
- `minio` (MinIO storage)
- `minio-init` (Bucket initialization - will show as completed)
- `delineate-app` (Backend API)
- `delineate-jaeger` (Jaeger tracing)
- `frontend` (Observability Dashboard)

### Step 2: Verify Services Are Accessible

Open these URLs in your browser:

| Service | URL | What to Check |
|---------|-----|---------------|
| **Dashboard** | http://localhost:5173 | Frontend loads without errors |
| **Backend API** | http://localhost:3000/health | Returns `{"status":"ok",...}` |
| **Jaeger UI** | http://localhost:16686 | Jaeger interface loads |
| **MinIO Console** | http://localhost:9001 | Login: `minioadmin` / `minioadmin` |

---

## 📋 Test Scenarios

### ✅ Test 1: Dashboard Loads Successfully

**Steps:**
1. Open http://localhost:5173
2. Check browser console (F12) for errors
3. Verify dashboard shows:
   - Header with "Observability Dashboard"
   - Health Status panel
   - Download Jobs panel
   - Error Log panel
   - Performance Metrics panel
   - Trace Viewer panel

**Expected Result:**
- ✅ Dashboard loads without errors
- ✅ All panels are visible
- ✅ No console errors

**If it fails:**
```powershell
# Check frontend logs
docker compose -f docker/compose.dev.yml logs frontend

# Restart frontend
docker compose -f docker/compose.dev.yml restart frontend
```

---

### ✅ Test 2: Health Status Monitoring

**Steps:**
1. Open http://localhost:5173
2. Look at "Health Status" panel
3. Wait 10 seconds (auto-refresh interval)
4. Verify status indicators are green

**Expected Result:**
- ✅ API Status: Green "Healthy"
- ✅ Storage Status: Green "Connected"
- ✅ Last Updated: Shows recent timestamp
- ✅ Status updates automatically every 10 seconds

**API Verification:**
```powershell
# Test health endpoint directly
curl http://localhost:3000/health
```

**Expected Response:**
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

---

### ✅ Test 3: Download Job Initiation & Tracking

**Steps:**
1. Open http://localhost:5173
2. In "Download Jobs" panel, enter file ID: `12345`
3. Click "Start Download"
4. Observe job status changing:
   - `PENDING` → `IN_PROGRESS` → `COMPLETED` (or `FAILED`)

**Expected Result:**
- ✅ Job appears in list immediately
- ✅ Status updates automatically every 2 seconds
- ✅ Status colors:
  - 🟢 Green: `COMPLETED`
  - 🔴 Red: `FAILED`, `TIMEOUT`
  - 🔵 Blue: `IN_PROGRESS`
  - 🟡 Yellow: `PENDING`
- ✅ Job details show:
  - File ID
  - Status
  - Created timestamp
  - Duration (if completed)
  - Trace ID (if available)

**API Verification:**
```powershell
# Check job status via API
curl http://localhost:3000/v1/download/status/12345
```

**Expected Response:**
```json
{
  "jobId": "12345",
  "status": "COMPLETED",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:00:05.000Z",
  "duration": 5000,
  "traceId": "abc123..."
}
```

---

### ✅ Test 4: Error Tracking (Sentry Integration)

**Steps:**
1. Open http://localhost:5173
2. Click "Test Error (Sentry)" button in the header
3. Check "Error Log" panel
4. Click on an error to see details

**Expected Result:**
- ✅ Error appears in Error Log panel immediately
- ✅ Error shows:
  - Error message
  - Timestamp
  - Trace ID (if available)
  - Level (error/warning)
- ✅ Error details modal shows full context when clicked
- ✅ Errors persist in localStorage (refresh page, errors still visible)

**API Verification:**
```powershell
# Trigger test error via API
curl -X POST "http://localhost:3000/v1/download/check?sentry_test=true" `
  -H "Content-Type: application/json" `
  -d '{\"file_id\": 70000}'
```

**Expected Response:**
```json
{
  "error": "Internal Server Error",
  "message": "Sentry test error triggered for file_id=70000 - This should appear in Sentry!"
}
```

**Note:** If `SENTRY_DSN` is configured in `.env`, errors will also appear in Sentry dashboard.

---

### ✅ Test 5: Trace Correlation (OpenTelemetry)

**Steps:**
1. Start a download (see Test 3)
2. Wait for job to complete
3. Look for "View Trace in Jaeger" link in job details
4. Click the link (opens Jaeger UI)
5. In Jaeger UI, verify:
   - Frontend span (user interaction)
   - API request span
   - Backend processing spans

**Expected Result:**
- ✅ Trace ID appears in job details
- ✅ "View Trace in Jaeger" link is clickable
- ✅ Jaeger UI opens with full trace
- ✅ All spans are linked by same trace ID
- ✅ Trace shows end-to-end flow:
  ```
  Frontend (user.click.download)
    └── API Request (POST /v1/download/check)
        └── Backend Processing (job.process)
            └── S3 Check (s3.check_object)
  ```

**Manual Trace Check:**
1. Open Jaeger UI: http://localhost:16686
2. Search for service: `delineate-hackathon-challenge`
3. Find recent traces
4. Click on a trace to see full span details

**Browser Verification:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Start a download
4. Check API request headers
5. Verify `traceparent` header exists:
   ```
   traceparent: 00-abc123def456-7890123456789012-01
   ```

---

### ✅ Test 6: Performance Metrics

**Steps:**
1. Make several API calls:
   - Start multiple downloads (file IDs: 100, 200, 300)
   - Check health status multiple times
   - Trigger test errors
2. View "Performance Metrics" panel
3. Observe charts updating

**Expected Result:**
- ✅ Total Requests counter increases
- ✅ Success Rate shows percentage (e.g., "85%")
- ✅ Average Response Time calculated (e.g., "245ms")
- ✅ P95 Response Time calculated (e.g., "512ms")
- ✅ Charts show data points:
  - Response Time Chart (line chart)
  - Success/Error Rate Chart (bar chart)

**Metrics Calculation:**
- Metrics are collected from actual API calls
- Stored in browser localStorage
- Persist across page refreshes

---

### ✅ Test 7: Trace Viewer

**Steps:**
1. Open "Trace Viewer" tab in dashboard
2. Click "Create Test Trace" button
3. Click "View in Jaeger" button
4. Or paste a trace ID from Download Jobs panel

**Expected Result:**
- ✅ Trace ID generated and displayed
- ✅ "View in Jaeger" opens Jaeger UI
- ✅ Trace appears in recent traces list
- ✅ Correlation flow diagram visible

---

## 🔍 Integration Tests

### Frontend-Backend Integration

```powershell
# 1. Check if backend is responding
curl http://localhost:3000/health

# 2. Start a download from API
curl -X POST http://localhost:3000/v1/download/check `
  -H "Content-Type: application/json" `
  -d '{\"file_id\": 99999}'

# 3. Check job status
curl http://localhost:3000/v1/download/status/99999

# 4. Verify trace is created (check Jaeger UI)
# Open http://localhost:16686 and search for recent traces
```

### OpenTelemetry Integration Test

1. Start a download from dashboard
2. Check browser Network tab for `traceparent` header in API requests
3. Verify header format: `00-<trace-id>-<span-id>-<flags>`
4. Check Jaeger UI for traces with matching trace ID

---

## 🐛 Troubleshooting

### Dashboard not loading

```powershell
# Check if frontend is running
docker compose -f docker/compose.dev.yml ps frontend

# Check logs
docker compose -f docker/compose.dev.yml logs frontend

# Restart frontend
docker compose -f docker/compose.dev.yml restart frontend
```

### Can't connect to backend

```powershell
# Check if backend is running
docker compose -f docker/compose.dev.yml ps delineate-app

# Check backend logs
docker compose -f docker/compose.dev.yml logs delineate-app

# Test backend directly
curl http://localhost:3000/health
```

### Traces not appearing in Jaeger

```powershell
# Check if Jaeger is running
docker compose -f docker/compose.dev.yml ps delineate-jaeger

# Check Jaeger logs
docker compose -f docker/compose.dev.yml logs delineate-jaeger

# Verify OTEL endpoint
curl http://localhost:4318/v1/traces
```

### Errors not appearing in Sentry

1. Check `SENTRY_DSN` in `.env` file (optional, not required)
2. Check browser console for Sentry initialization messages
3. Verify Sentry project settings (if configured)
4. Check Sentry dashboard for project

**Note:** Sentry is optional. The dashboard works without it, but error tracking will be limited to local storage.

---

## ✅ Verification Checklist

Use this checklist to verify Challenge 4 completion:

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
- [ ] `traceparent` header is sent in API requests
- [ ] End-to-end trace correlation works

---

## 🎯 Success Criteria

✅ **All tests pass**
✅ **Dashboard is functional**
✅ **Sentry captures errors** (if configured, optional)
✅ **Traces appear in Jaeger**
✅ **Performance metrics are collected**
✅ **Trace correlation works end-to-end**

---

## 📊 Expected Test Results Summary

| Test | Dashboard | API | Jaeger | Sentry |
|------|-----------|-----|--------|--------|
| Health Status | ✅ Green indicators | ✅ 200 OK | - | - |
| Download Jobs | ✅ Job list updates | ✅ Status endpoint works | ✅ Traces appear | - |
| Error Tracking | ✅ Errors in log | ✅ Error response | ✅ Trace with error | ✅ Error captured (if configured) |
| Trace Correlation | ✅ Trace IDs visible | ✅ traceparent header | ✅ Full trace | ✅ Trace ID in tags |
| Performance Metrics | ✅ Charts update | - | - | - |

---

## 🚀 Quick Test Script

Create a PowerShell script `test-challenge4.ps1`:

```powershell
# Test Challenge 4 Implementation

Write-Host "Testing Challenge 4 Implementation..." -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`nTest 1: Health Check" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
if ($health.status -eq "ok") {
    Write-Host "✅ Health check passed" -ForegroundColor Green
} else {
    Write-Host "❌ Health check failed" -ForegroundColor Red
}

# Test 2: Start download
Write-Host "`nTest 2: Start Download" -ForegroundColor Yellow
$download = Invoke-RestMethod -Uri "http://localhost:3000/v1/download/check" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"file_id": 12345}'
Write-Host "Response: $($download | ConvertTo-Json)"

# Test 3: Error tracking
Write-Host "`nTest 3: Error Tracking" -ForegroundColor Yellow
try {
    $error = Invoke-RestMethod -Uri "http://localhost:3000/v1/download/check?sentry_test=true" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"file_id": 70000}'
    Write-Host "✅ Error test passed" -ForegroundColor Green
} catch {
    Write-Host "✅ Error test passed (error expected)" -ForegroundColor Green
}

Write-Host "`nTests complete!" -ForegroundColor Cyan
```

Run with:
```powershell
.\test-challenge4.ps1
```

---

## 📝 Notes

- **Sentry is optional**: The dashboard works without Sentry DSN, but error tracking will be limited to local storage
- **Trace correlation**: Requires both frontend and backend to have OpenTelemetry configured
- **Performance metrics**: Collected from actual API calls, stored in browser localStorage
- **Auto-refresh**: Health status refreshes every 10s, job status every 2s

---

For detailed implementation details, see:
- `docs/CHALLENGE_4_IMPLEMENTATION.md`
- `docs/OBSERVABILITY_DESIGN.md`
- `CHALLENGE_4_SUMMARY.md`

