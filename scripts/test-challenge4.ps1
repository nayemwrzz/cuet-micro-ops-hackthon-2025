# Challenge 4: Comprehensive Observability Testing Script
# This script tests all observability features

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$host.UI.RawUI.WindowTitle = "Challenge 4 Observability Tests"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Challenge 4: Observability Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()
$baseUrl = "http://localhost:3000"
$frontendUrl = "http://localhost:5173"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -ErrorAction Stop
        } else {
            $jsonBody = if ($Body) { $Body | ConvertTo-Json } else { $null }
            $response = Invoke-WebRequest -Uri $Url -Method $Method -ContentType "application/json" -Body $jsonBody -UseBasicParsing -ErrorAction Stop
        }
        
        $success = $response.StatusCode -eq $ExpectedStatus
        $result = @{
            Name = $Name
            Status = if ($success) { "✅ PASS" } else { "❌ FAIL" }
            StatusCode = $response.StatusCode
            Expected = $ExpectedStatus
            Message = if ($success) { "OK" } else { "Status code mismatch" }
        }
        
        if ($Verbose) {
            Write-Host "  Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))" -ForegroundColor Gray
        }
        
        return $result
    } catch {
        $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $result = @{
            Name = $Name
            Status = if ($statusCode -eq $ExpectedStatus) { "✅ PASS (Expected Error)" } else { "❌ FAIL" }
            StatusCode = $statusCode
            Expected = $ExpectedStatus
            Message = $_.Exception.Message
        }
        return $result
    }
}

function Test-Service {
    param([string]$Name, [string]$Url)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return @{ Name = $Name; Status = "✅ RUNNING"; Url = $Url }
    } catch {
        return @{ Name = $Name; Status = "❌ NOT RUNNING"; Url = $Url; Error = $_.Exception.Message }
    }
}

# Test 1: Service Availability
Write-Host "Test 1: Service Availability" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$services = @(
    @{ Name = "Backend API"; Url = "$baseUrl/health" },
    @{ Name = "Frontend Dashboard"; Url = $frontendUrl },
    @{ Name = "Jaeger UI"; Url = "http://localhost:16686" },
    @{ Name = "Prometheus"; Url = "http://localhost:9090" },
    @{ Name = "Grafana"; Url = "http://localhost:3001" },
    @{ Name = "Elasticsearch"; Url = "http://localhost:9200" },
    @{ Name = "Kibana"; Url = "http://localhost:5601" },
    @{ Name = "MinIO Console"; Url = "http://localhost:9001" }
)

foreach ($service in $services) {
    $result = Test-Service -Name $service.Name -Url $service.Url
    Write-Host "  $($result.Status) $($result.Name)" -ForegroundColor $(if ($result.Status -like "*RUNNING*") { "Green" } else { "Red" })
    if ($result.Error) {
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
    }
    $testResults += $result
}
Write-Host ""

# Test 2: Backend API Endpoints
Write-Host "Test 2: Backend API Endpoints" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

$apiTests = @(
    @{ Name = "Health Check"; Url = "$baseUrl/health"; Method = "GET"; Expected = 200 },
    @{ Name = "Root Endpoint"; Url = $baseUrl; Method = "GET"; Expected = 200 },
    @{ Name = "Download Check (Valid)"; Url = "$baseUrl/v1/download/check"; Method = "POST"; Body = @{file_id=12345}; Expected = 200 },
    @{ Name = "Download Check (Sentry Test)"; Url = "$baseUrl/v1/download/check?sentry_test=true"; Method = "POST"; Body = @{file_id=70000}; Expected = 500 }
)

foreach ($test in $apiTests) {
    $result = Test-Endpoint -Name $test.Name -Url $test.Url -Method $test.Method -Body $test.Body -ExpectedStatus $test.Expected
    Write-Host "  $($result.Status) $($result.Name) (Status: $($result.StatusCode))" -ForegroundColor $(if ($result.Status -like "*PASS*") { "Green" } else { "Red" })
    $testResults += $result
}
Write-Host ""

# Test 3: Observability Features
Write-Host "Test 3: Observability Features" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

# Test OpenTelemetry (check if traces are being sent)
Write-Host "  Testing OpenTelemetry..." -ForegroundColor Gray
try {
    $jaegerHealth = Invoke-WebRequest -Uri "http://localhost:16686/api/services" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ PASS Jaeger is accessible" -ForegroundColor Green
    $testResults += @{ Name = "Jaeger Accessibility"; Status = "✅ PASS" }
} catch {
    Write-Host "  ❌ FAIL Jaeger not accessible" -ForegroundColor Red
    $testResults += @{ Name = "Jaeger Accessibility"; Status = "❌ FAIL"; Error = $_.Exception.Message }
}

# Test Prometheus
Write-Host "  Testing Prometheus..." -ForegroundColor Gray
try {
    $promHealth = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ PASS Prometheus is accessible" -ForegroundColor Green
    $testResults += @{ Name = "Prometheus Accessibility"; Status = "✅ PASS" }
} catch {
    Write-Host "  ❌ FAIL Prometheus not accessible" -ForegroundColor Red
    $testResults += @{ Name = "Prometheus Accessibility"; Status = "❌ FAIL"; Error = $_.Exception.Message }
}

# Test Elasticsearch
Write-Host "  Testing Elasticsearch..." -ForegroundColor Gray
try {
    $esHealth = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -Method GET -ErrorAction Stop
    if ($esHealth.status -eq "green" -or $esHealth.status -eq "yellow") {
        Write-Host "  ✅ PASS Elasticsearch is healthy (Status: $($esHealth.status))" -ForegroundColor Green
        $testResults += @{ Name = "Elasticsearch Health"; Status = "✅ PASS"; Details = "Status: $($esHealth.status)" }
    } else {
        Write-Host "  ⚠️  WARN Elasticsearch status: $($esHealth.status)" -ForegroundColor Yellow
        $testResults += @{ Name = "Elasticsearch Health"; Status = "⚠️  WARN"; Details = "Status: $($esHealth.status)" }
    }
} catch {
    Write-Host "  ❌ FAIL Elasticsearch not accessible" -ForegroundColor Red
    $testResults += @{ Name = "Elasticsearch Health"; Status = "❌ FAIL"; Error = $_.Exception.Message }
}

Write-Host ""

# Test 4: Trace Correlation
Write-Host "Test 4: Trace Correlation" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

Write-Host "  Initiating download to generate trace..." -ForegroundColor Gray
try {
    $downloadResponse = Invoke-RestMethod -Uri "$baseUrl/v1/download/check" -Method POST -ContentType "application/json" -Body (@{file_id=99999} | ConvertTo-Json) -ErrorAction Stop
    Write-Host "  ✅ PASS Download initiated" -ForegroundColor Green
    Write-Host "  ℹ️  Check Jaeger UI at http://localhost:16686 for traces" -ForegroundColor Cyan
    $testResults += @{ Name = "Trace Generation"; Status = "✅ PASS" }
} catch {
    Write-Host "  ❌ FAIL Failed to initiate download" -ForegroundColor Red
    $testResults += @{ Name = "Trace Generation"; Status = "❌ FAIL"; Error = $_.Exception.Message }
}
Write-Host ""

# Test 5: Error Tracking
Write-Host "Test 5: Error Tracking (Sentry)" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Yellow

Write-Host "  Triggering test error..." -ForegroundColor Gray
try {
    $errorResponse = Invoke-RestMethod -Uri "$baseUrl/v1/download/check?sentry_test=true" -Method POST -ContentType "application/json" -Body (@{file_id=70000} | ConvertTo-Json) -ErrorAction Stop
    Write-Host "  ⚠️  WARN Unexpected success (should have errored)" -ForegroundColor Yellow
    $testResults += @{ Name = "Error Tracking"; Status = "⚠️  WARN"; Message = "Expected error but got success" }
} catch {
    $statusCode = 0
    if ($null -ne $_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -eq 500) {
        Write-Host "  ✅ PASS Error triggered successfully (Status: 500)" -ForegroundColor Green
        Write-Host "  ℹ️  Check Sentry dashboard and Error Log panel in frontend" -ForegroundColor Cyan
        $testResults += @{ Name = "Error Tracking"; Status = "✅ PASS" }
    } else {
        Write-Host "  ❌ FAIL Unexpected error status: $statusCode" -ForegroundColor Red
        $testResults += @{ Name = "Error Tracking"; Status = "❌ FAIL"; Error = "Status: $statusCode" }
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -like "*✅*" }).Count
$failed = ($testResults | Where-Object { $_.Status -like "*❌*" }).Count
$warned = ($testResults | Where-Object { $_.Status -like "*⚠️*" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings: $warned" -ForegroundColor $(if ($warned -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ All critical tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Please check the errors above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  - Frontend Dashboard: $frontendUrl" -ForegroundColor White
Write-Host "  - Jaeger UI: http://localhost:16686" -ForegroundColor White
Write-Host "  - Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor White
Write-Host "  - Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  - Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "  - Elasticsearch: http://localhost:9200" -ForegroundColor White

