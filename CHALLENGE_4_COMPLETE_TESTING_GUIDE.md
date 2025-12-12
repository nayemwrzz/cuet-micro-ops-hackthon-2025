# Challenge 4: Complete Observability Testing Guide

## 🎯 Overview

This guide provides comprehensive testing methods for all Challenge 4 observability features, including Sentry, OpenTelemetry, Jaeger, Prometheus, Grafana, Elasticsearch, and Kibana.

---

## 📋 Prerequisites

1. **All services running**:
   ```powershell
   docker compose -f docker/compose.dev.yml up -d
   ```

2. **Verify services are up**:
   ```powershell
   docker compose -f docker/compose.dev.yml ps
   ```

---

## 🚀 Quick Test Script

Run the comprehensive test script:

```powershell
.\scripts\test-challenge4.ps1
```

For verbose output:

```powershell
.\scripts\test-challenge4.ps1 -Verbose
```

---

## 🔍 Manual Testing Guide

### 1. Service Availability Tests

#### Test Backend API
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET

# Expected: {"status":"healthy","checks":{"storage":"ok"}}
```

#### Test Frontend Dashboard
```powershell
# Check if frontend is accessible
Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing

# Expected: Status 200, HTML content
```

#### Test Jaeger UI
```powershell
# Check Jaeger services
Invoke-RestMethod -Uri "http://localhost:16686/api/services" -Method GET

# Expected: Array of services including "delineate-hackathon-challenge"
```

#### Test Prometheus
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing

# Query metrics
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=up" -Method GET

# Expected: {"status":"success","data":{"resultType":"vector","result":[...]}}
```

#### Test Grafana
```powershell
# Check Grafana health
Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing

# Expected: Status 200
# Login: admin / admin
```

#### Test Elasticsearch
```powershell
# Cluster health
Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Method GET

# Expected: {"cluster_name":"docker-cluster","status":"green" or "yellow",...}
```

#### Test Kibana
```powershell
# Check Kibana status
Invoke-WebRequest -Uri "http://localhost:5601/api/status" -UseBasicParsing

# Expected: Status 200, JSON with status information
```

---

### 2. Sentry Integration Tests

#### Test 1: Error Capture
```powershell
# Trigger test error
$body = @{file_id=70000} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3000/v1/download/check?sentry_test=true" `
        -Method POST -ContentType "application/json" -Body $body
} catch {
    Write-Host "Expected error: $($_.Exception.Message)"
}

# Verify in:
# 1. Frontend Error Log panel (http://localhost:5173)
# 2. Sentry dashboard (https://sentry.io)
```

#### Test 2: Frontend Error Boundary
1. Open http://localhost:5173
2. Click "Test Error (Sentry)" button in header
3. Verify error appears in Error Log panel
4. Check browser console for Sentry initialization message

#### Test 3: Sentry Status in Dashboard
1. Open http://localhost:5173
2. Check header for "✓ Sentry Active" (green) or "⚠ Sentry Disabled" (yellow)
3. Should show green if DSN is configured

---

### 3. OpenTelemetry & Trace Correlation Tests

#### Test 1: Generate Trace
```powershell
# Initiate download
$body = @{file_id=12345} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/v1/download/check" `
    -Method POST -ContentType "application/json" -Body $body

Write-Host "Download initiated. Check trace in Jaeger UI."
```

#### Test 2: Verify Trace in Jaeger
1. Open http://localhost:16686
2. Select service: `delineate-hackathon-challenge`
3. Click "Find Traces"
4. Verify traces appear with:
   - Frontend spans (if traceparent header was sent)
   - Backend API spans
   - S3 operation spans

#### Test 3: Trace Propagation
```powershell
# Check if traceparent header is sent
# Open browser DevTools (F12) → Network tab
# Start a download from dashboard
# Check request headers for "traceparent" header
# Format: 00-<trace-id>-<span-id>-<flags>
```

#### Test 4: Trace ID Display
1. Open http://localhost:5173
2. Start a download
3. Verify trace ID appears in job details
4. Click "View Trace in Jaeger" link
5. Verify Jaeger UI opens with correct trace

---

### 4. Prometheus Metrics Tests

#### Test 1: Metrics Endpoint
```powershell
# Check if metrics endpoint exists (if implemented)
Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing

# Expected: Prometheus format metrics or 404 if not implemented
```

#### Test 2: Prometheus Targets
1. Open http://localhost:9090
2. Navigate to Status → Targets
3. Verify `delineate-backend` target is UP
4. Check scrape interval and last scrape time

#### Test 3: Query Metrics
```powershell
# Query up metric
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=up" -Method GET

# Query specific metric (if available)
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=http_requests_total" -Method GET
```

#### Test 4: Prometheus UI
1. Open http://localhost:9090
2. Go to Graph tab
3. Enter query: `up{job="delineate-backend"}`
4. Verify metric appears
5. Check time series graph

---

### 5. Grafana Dashboard Tests

#### Test 1: Access Grafana
1. Open http://localhost:3001
2. Login: `admin` / `admin`
3. Verify dashboard loads

#### Test 2: Data Source Configuration
1. Go to Configuration → Data Sources
2. Verify Prometheus data source is configured
3. Test connection (should show "Data source is working")
4. Verify Jaeger data source (if configured)

#### Test 3: Dashboard Visualization
1. Go to Dashboards → Browse
2. Open "Delineate Observability Overview" (if created)
3. Verify panels show data:
   - API Health Status
   - Request Rate
   - Response Time (P95)
   - Error Rate

#### Test 4: Create Custom Dashboard
1. Create new dashboard
2. Add panel with Prometheus query
3. Verify data visualization
4. Save dashboard

---

### 6. Elasticsearch & Kibana Tests

#### Test 1: Elasticsearch Index
```powershell
# List indices
Invoke-RestMethod -Uri "http://localhost:9200/_cat/indices?v" -Method GET

# Check cluster health
Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Method GET
```

#### Test 2: Index Logs (if log shipping configured)
```powershell
# Create test log entry
$logEntry = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    level = "info"
    message = "Test log entry"
    service = "delineate-backend"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9200/logs/_doc" `
    -Method POST -ContentType "application/json" -Body $logEntry
```

#### Test 3: Kibana Index Pattern
1. Open http://localhost:5601
2. Go to Management → Stack Management → Index Patterns
3. Create index pattern (e.g., `logs-*`)
4. Verify fields are discovered

#### Test 4: Kibana Discover
1. Go to Discover
2. Select index pattern
3. Verify logs appear
4. Test search and filters

#### Test 5: Kibana Visualizations
1. Create visualization
2. Use Elasticsearch data
3. Verify charts render
4. Save visualization

---

### 7. Frontend Dashboard Tests

#### Test 1: Health Status Panel
1. Open http://localhost:5173
2. Check "Health Status" panel
3. Verify:
   - API Status: Green "Healthy"
   - Storage Status: Green "Connected"
   - Last Updated: Recent timestamp
   - Auto-refreshes every 10 seconds

#### Test 2: Download Jobs Panel
1. Enter file ID: `12345`
2. Click "Start Download"
3. Verify:
   - Job appears in list immediately
   - Status updates: PENDING → IN_PROGRESS → COMPLETED
   - Status colors are correct
   - Trace ID appears (if available)
   - "View Trace in Jaeger" link works

#### Test 3: Error Log Panel
1. Click "Test Error (Sentry)" button
2. Verify:
   - Error appears in Error Log panel
   - Error shows message, timestamp, level
   - Click error to see details modal
   - Trace ID is visible (if available)
   - Errors persist after page refresh

#### Test 4: Performance Metrics Panel
1. Make several API calls (start downloads, check health)
2. Verify:
   - Total Requests counter increases
   - Success Rate shows percentage
   - Average Response Time calculated
   - P95 Response Time calculated
   - Charts update with data points

#### Test 5: Trace Viewer Panel
1. Go to "Trace Viewer" tab
2. Click "Create Test Trace"
3. Verify:
   - Trace ID generated and displayed
   - "View in Jaeger" button works
   - Trace appears in Jaeger UI

---

### 8. End-to-End Integration Tests

#### Test 1: Complete User Flow
1. Open dashboard: http://localhost:5173
2. Verify all panels load
3. Start download: File ID `12345`
4. Monitor job status updates
5. Click "View Trace in Jaeger" when available
6. Verify full trace in Jaeger UI
7. Trigger test error
8. Verify error in Error Log and Sentry
9. Check performance metrics update

#### Test 2: Trace Correlation Flow
1. Start download from dashboard
2. Check browser Network tab for `traceparent` header
3. Verify header format: `00-<trace-id>-<span-id>-<flags>`
4. Open Jaeger UI
5. Search for trace by trace ID
6. Verify:
   - Frontend span (user interaction)
   - API request span
   - Backend processing spans
   - All spans linked by same trace ID

#### Test 3: Error Correlation
1. Trigger error with trace context
2. Verify error in Sentry includes trace ID
3. Verify error in Error Log shows trace ID
4. Use trace ID to find trace in Jaeger
5. Verify error span in trace

---

## ✅ Verification Checklist

### Core Requirements
- [ ] React dashboard loads at http://localhost:5173
- [ ] Sentry is active and capturing errors
- [ ] OpenTelemetry traces are generated
- [ ] Traces appear in Jaeger UI
- [ ] Trace IDs are correlated frontend ↔ backend
- [ ] Error Log panel displays errors
- [ ] Performance metrics are collected

### Enhanced Observability (Bonus)
- [ ] Prometheus is running and scraping metrics
- [ ] Grafana dashboards are accessible
- [ ] Elasticsearch is healthy
- [ ] Kibana is accessible
- [ ] Logs can be indexed and searched

### Integration
- [ ] All services are running
- [ ] Services can communicate
- [ ] CORS is configured correctly
- [ ] Trace propagation works end-to-end
- [ ] Errors are captured in multiple systems

---

## 🐛 Troubleshooting

### Services Not Starting
```powershell
# Check logs
docker compose -f docker/compose.dev.yml logs [service-name]

# Restart service
docker compose -f docker/compose.dev.yml restart [service-name]

# Rebuild service
docker compose -f docker/compose.dev.yml up -d --build [service-name]
```

### Network Errors
- Verify backend is listening on `0.0.0.0:3000` (not `localhost`)
- Check CORS configuration
- Verify security headers aren't blocking requests

### Traces Not Appearing
- Check OpenTelemetry endpoint: `http://localhost:4318`
- Verify Jaeger is running
- Check backend logs for OpenTelemetry errors

### Metrics Not Scraping
- Verify Prometheus config: `docker/prometheus/prometheus.yml`
- Check Prometheus targets: http://localhost:9090/targets
- Verify metrics endpoint exists (if implemented)

---

## 📊 Expected Results Summary

| Component | Status Check | Expected Result |
|-----------|-------------|-----------------|
| Frontend Dashboard | http://localhost:5173 | Loads, all panels visible |
| Backend API | http://localhost:3000/health | `{"status":"healthy"}` |
| Jaeger UI | http://localhost:16686 | UI loads, traces visible |
| Prometheus | http://localhost:9090 | UI loads, targets UP |
| Grafana | http://localhost:3001 | Login works, dashboards visible |
| Elasticsearch | http://localhost:9200 | Cluster health: green/yellow |
| Kibana | http://localhost:5601 | UI loads, can create index patterns |
| Sentry | Dashboard | Errors appear with trace IDs |

---

## 🎯 Success Criteria

✅ **All core requirements met**
✅ **All services accessible**
✅ **Traces correlated end-to-end**
✅ **Errors captured in Sentry**
✅ **Metrics collected (if Prometheus configured)**
✅ **Logs searchable (if Elasticsearch configured)**
✅ **Dashboards functional**

---

## 📝 Notes

- Some services (Prometheus, Grafana, Elasticsearch, Kibana) are **bonus enhancements**
- Core Challenge 4 requirements are: React Dashboard + Sentry + OpenTelemetry + Jaeger
- Enhanced observability stack demonstrates production-ready setup
- All services are optional except core requirements

---

For detailed setup instructions, see:
- `docs/CHALLENGE_4_IMPLEMENTATION.md`
- `CHALLENGE_4_TESTING.md`
- `CHALLENGE_4_SUMMARY.md`

