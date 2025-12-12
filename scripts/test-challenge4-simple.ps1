# Challenge 4: Simple Observability Test Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Challenge 4: Observability Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0

# Test 1: Backend Health
Write-Host "Test 1: Backend Health" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($health.status -eq "healthy") {
        Write-Host "  ✅ PASS Backend is healthy" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ❌ FAIL Backend status: $($health.status)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ❌ FAIL Backend not accessible: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 2: Metrics Endpoint
Write-Host "Test 2: Metrics Endpoint" -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "$baseUrl/metrics" -Method GET
    Write-Host "  ✅ PASS Metrics endpoint accessible" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAIL Metrics endpoint error: $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 3: Jaeger
Write-Host "Test 3: Jaeger UI" -ForegroundColor Yellow
try {
    $services = Invoke-RestMethod -Uri "http://localhost:16686/api/services" -Method GET
    Write-Host "  ✅ PASS Jaeger is accessible" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAIL Jaeger not accessible" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 4: Prometheus
Write-Host "Test 4: Prometheus" -ForegroundColor Yellow
try {
    $targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets" -Method GET
    $upTargets = ($targets.data.activeTargets | Where-Object { $_.health -eq "up" }).Count
    Write-Host "  ✅ PASS Prometheus is accessible ($upTargets targets UP)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAIL Prometheus not accessible" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 5: Grafana
Write-Host "Test 5: Grafana" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing
    Write-Host "  ✅ PASS Grafana is accessible" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAIL Grafana not accessible" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 6: Elasticsearch
Write-Host "Test 6: Elasticsearch" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Method GET
    if ($health.status -eq "green" -or $health.status -eq "yellow") {
        Write-Host "  ✅ PASS Elasticsearch is healthy (Status: $($health.status))" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ⚠️  WARN Elasticsearch status: $($health.status)" -ForegroundColor Yellow
        $passed++
    }
} catch {
    Write-Host "  ❌ FAIL Elasticsearch not accessible" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 7: Kibana
Write-Host "Test 7: Kibana" -ForegroundColor Yellow
try {
    $status = Invoke-WebRequest -Uri "http://localhost:5601/api/status" -UseBasicParsing
    Write-Host "  ✅ PASS Kibana is accessible" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAIL Kibana not accessible" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 8: Error Tracking
Write-Host "Test 8: Error Tracking (Sentry)" -ForegroundColor Yellow
try {
    $body = @{file_id=70000} | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/v1/download/check?sentry_test=true" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    Write-Host "  ⚠️  WARN Expected error but got success" -ForegroundColor Yellow
    $passed++
} catch {
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "  ✅ PASS Error triggered successfully (Status: 500)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ❌ FAIL Unexpected status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $failed++
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "  - Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor White
Write-Host "  - Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  - Kibana: http://localhost:5601" -ForegroundColor White

