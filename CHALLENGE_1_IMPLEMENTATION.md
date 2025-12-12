# Challenge 1: S3 Storage Integration - Implementation Guide

## 📋 Overview

This document explains how Challenge 1 (S3 Storage Integration) has been implemented using **MinIO** as a self-hosted S3-compatible storage service.

---

## ✅ Implementation Summary

### What Was Done

1. ✅ **Added MinIO service** to Docker Compose (dev and prod)
2. ✅ **Created bucket initialization** using MinIO Client (mc)
3. ✅ **Configured API connection** to MinIO via environment variables
4. ✅ **Set up proper networking** between services
5. ✅ **Automated bucket creation** on startup

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   MinIO      │         │   MinIO      │                 │
│  │   Service    │◄────────┤   Init       │                 │
│  │              │         │   Container  │                 │
│  │  Port: 9000  │         │  (one-time)  │                 │
│  │  Port: 9001  │         │              │                 │
│  └──────┬───────┘         └──────────────┘                 │
│         │                                                  │
│         │ Creates "downloads" bucket                       │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────┐                 │
│  │      Delineate API Service           │                 │
│  │                                      │                 │
│  │  Connects to: http://minio:9000     │                 │
│  │  Bucket: downloads                   │                 │
│  │  Health Check: /health               │                 │
│  └──────────────────────────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Modified/Created

### Modified Files

1. **`docker/compose.dev.yml`**
   - Added MinIO service
   - Added MinIO init container
   - Updated API service environment variables
   - Added service dependencies

2. **`docker/compose.prod.yml`**
   - Added MinIO service
   - Added MinIO init container
   - Updated API service environment variables
   - Added service dependencies

### No New Files Required

- Bucket initialization is handled inline in Docker Compose using MinIO Client (mc)
- No separate init scripts needed (handled by entrypoint in init container)

---

## 🔧 Configuration Details

### MinIO Service Configuration

**Service Name**: `minio`  
**Image**: `minio/minio:latest`  
**Ports**:

- `9000`: S3 API endpoint
- `9001`: MinIO Console UI (for management)

**Credentials** (default):

- Access Key: `minioadmin`
- Secret Key: `minioadmin`

**Volume**: `minio-data` (persistent storage)

### API Connection Configuration

The API connects to MinIO using these environment variables (set in Docker Compose):

```yaml
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=downloads
S3_FORCE_PATH_STYLE=true
S3_REGION=us-east-1
```

**Key Points**:

- `S3_ENDPOINT`: Uses Docker service name `minio` (not `localhost`)
- `S3_FORCE_PATH_STYLE=true`: Required for self-hosted S3
- Bucket name is `downloads` as required by the challenge

### Bucket Initialization

The `minio-init` container:

1. Waits for MinIO to be healthy
2. Connects using MinIO Client (mc)
3. Creates `downloads` bucket
4. Sets bucket policy for public read access
5. Exits successfully

This runs **automatically** on first startup.

---

## 🧪 How to Test

### Prerequisites

- Docker and Docker Compose installed
- Port 3000, 9000, and 9001 available

### Step 1: Start the Services

```bash
# Development mode (with hot reload)
npm run docker:dev

# OR Production mode
npm run docker:prod
```

**What happens**:

1. MinIO service starts
2. MinIO init container creates bucket
3. API service connects to MinIO
4. All services become ready

**Expected output**:

```
Creating network "delineate_default" ...
Creating volume "delineate_minio-data" ...
Creating minio ... done
Creating minio-init ... done
Creating delineate-jaeger ... done
Creating delineate-app ... done
```

### Step 2: Verify MinIO is Running

**Check MinIO Console UI**:

- Open: http://localhost:9001
- Login:
  - Username: `minioadmin`
  - Password: `minioadmin`
- You should see the `downloads` bucket created

**Or check via API**:

```bash
# Check if MinIO API is responding
curl http://localhost:9000/minio/health/live
# Expected: Empty response or 200 OK
```

### Step 3: Test API Health Endpoint

```bash
# Test health endpoint (should show storage: ok)
curl http://localhost:3000/health
```

**Expected Response**:

```json
{
  "status": "healthy",
  "checks": {
    "storage": "ok"
  }
}
```

**Status Code**: `200 OK`

### Step 4: Test Download Check Endpoint

```bash
# Test file availability check
curl -X POST http://localhost:3000/v1/download/check \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'
```

**Expected Response**:

```json
{
  "file_id": 70000,
  "available": false,
  "s3Key": "files/70000",
  "size": null
}
```

**Note**: File will show `available: false` initially (file doesn't exist). This is expected behavior.

### Step 5: Run Full E2E Test Suite

```bash
# Run complete test suite
npm run test:e2e
```

**Expected Output**:

```
✓ PASS: Root returns welcome message
✓ PASS: Health returns valid status code (200 or 503)
✓ PASS: Health status matches response code
✓ PASS: Storage check returns valid status
... (all 29 tests should pass)
```

**Critical Test**: Health endpoint test should show:

- Status code: `200` (not 503)
- Storage status: `"ok"` (not "error")

### Step 6: Verify Storage Connection in Logs

```bash
# View API service logs
docker logs delineate-app

# Should show:
# - Server running
# - No S3 connection errors
# - Health checks passing
```

---

## ✅ Success Criteria

Challenge 1 is successful when:

- [x] ✅ MinIO service is running in Docker Compose
- [ ] ✅ Health endpoint returns `{"status": "healthy", "checks": {"storage": "ok"}}`
- [ ] ✅ Status code is `200` (not `503`)
- [ ] ✅ E2E tests pass (especially health check test)
- [ ] ✅ MinIO Console UI accessible at http://localhost:9001
- [ ] ✅ `downloads` bucket exists in MinIO
- [ ] ✅ No connection errors in API logs

---

## 🔍 Detailed Testing Guide

### Test 1: Manual Health Check

**Command**:

```bash
curl http://localhost:3000/health
```

**Expected Result**:

- **HTTP Status**: `200`
- **Response Body**:
  ```json
  {
    "status": "healthy",
    "checks": {
      "storage": "ok"
    }
  }
  ```

**If you see** `"storage": "error"` or status `503`:

- MinIO might not be running
- API might not be connecting to MinIO
- Check Docker logs: `docker logs minio` and `docker logs delineate-app`

---

### Test 2: E2E Test Suite

**Command**:

```bash
npm run test:e2e
```

**Expected Output**:

```
=== Health Endpoint ===
✓ PASS: Health returns valid status code (200 or 503)
✓ PASS: Health status matches response code
✓ PASS: Storage check returns valid status

==============================
        TEST SUMMARY
==============================
Total:  29
Passed: 29
Failed: 0

All tests passed!
```

**Key Points**:

- Health endpoint test should pass
- Storage check should return `"ok"` (not `"error"`)

---

### Test 3: MinIO Console Verification

**Steps**:

1. Open browser: http://localhost:9001
2. Login:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Verify:
   - `downloads` bucket exists
   - Can access bucket details
   - No errors in console

---

### Test 4: Container Status Check

**Command**:

```bash
docker ps
```

**Expected Output**:

```
CONTAINER ID   IMAGE                        STATUS
xxx            minio/minio:latest          Up X minutes (healthy)
xxx            minio/mc:latest             Exited (0)
xxx            delineate-app               Up X minutes
xxx            jaegertracing/all-in-one    Up X minutes
```

**Key Points**:

- `minio` should show `(healthy)`
- `minio-init` can show `Exited (0)` - that's normal (one-time init)
- `delineate-app` should be running

---

### Test 5: API Logs Check

**Command**:

```bash
docker logs delineate-app | grep -i "storage\|s3\|minio"
```

**Expected**:

- No error messages about S3 connection
- No "storage error" messages
- Health checks logging successfully

---

## 🐛 Troubleshooting

### Issue: Health endpoint returns `"storage": "error"`

**Possible Causes**:

1. MinIO not running
2. API can't connect to MinIO
3. Bucket doesn't exist

**Solutions**:

```bash
# Check if MinIO is running
docker ps | grep minio

# Check MinIO logs
docker logs minio

# Check if bucket exists (via MinIO console or API)
# Access http://localhost:9001 and verify bucket exists

# Restart services
docker compose -f docker/compose.dev.yml down
docker compose -f docker/compose.dev.yml up --build
```

---

### Issue: `minio-init` container fails

**Possible Causes**:

1. MinIO not ready when init runs
2. Bucket already exists (this is fine, init handles it)

**Solutions**:

- Check init logs: `docker logs <minio-init-container-id>`
- The init script handles "already exists" gracefully
- If init fails, MinIO still works, just create bucket manually via console

---

### Issue: Port conflicts

**Error**: `Bind for 0.0.0.0:9000 failed: port is already allocated`

**Solutions**:

```bash
# Check what's using the port
netstat -ano | findstr :9000  # Windows
lsof -i :9000                  # Mac/Linux

# Change ports in compose file if needed
# Update ports: "9002:9000" for MinIO API
```

---

### Issue: API can't connect to MinIO

**Symptoms**:

- Health returns `"storage": "error"`
- API logs show connection errors

**Solutions**:

```bash
# Verify MinIO is accessible from API container
docker exec -it delineate-app sh
# Inside container:
curl http://minio:9000/minio/health/live

# Check environment variables
docker exec delineate-app env | grep S3

# Verify network connectivity
docker network ls
docker network inspect delineate_default
```

---

## 📊 Expected Test Results

### Test Summary Table

| Test             | Command                                                     | Expected Status | Expected Response                                |
| ---------------- | ----------------------------------------------------------- | --------------- | ------------------------------------------------ |
| Health Check     | `curl http://localhost:3000/health`                         | 200 OK          | `{"status":"healthy","checks":{"storage":"ok"}}` |
| Download Check   | `curl -X POST .../v1/download/check -d '{"file_id":70000}'` | 200 OK          | `{"file_id":70000,"available":false,...}`        |
| E2E Tests        | `npm run test:e2e`                                          | Exit 0          | 29/29 tests passed                               |
| MinIO Console    | http://localhost:9001                                       | Accessible      | Login successful, bucket visible                 |
| Container Health | `docker ps`                                                 | All running     | MinIO shows (healthy)                            |

---

## 🎯 Quick Verification Checklist

Run these commands in order:

```bash
# 1. Start services
npm run docker:dev

# 2. Wait for services to start (30-60 seconds)

# 3. Check health endpoint
curl http://localhost:3000/health

# 4. Verify response shows "storage": "ok"

# 5. Run E2E tests
npm run test:e2e

# 6. Verify all tests pass (29/29)

# 7. Check MinIO console
# Open http://localhost:9001 in browser
# Login and verify "downloads" bucket exists
```

---

## 🔐 Security Notes

**Default Credentials**:

- MinIO uses default credentials: `minioadmin`/`minioadmin`
- **For production**: Change these credentials!
- Set via environment variables in Docker Compose

**Production Recommendations**:

1. Use strong passwords for MinIO
2. Don't expose MinIO ports publicly
3. Use secrets management for credentials
4. Enable SSL/TLS for MinIO

---

## 📝 Additional Notes

### MinIO vs Brilliant S3

The implementation uses **MinIO** as the self-hosted S3 service because:

- ✅ Well-documented and widely used
- ✅ Easy to set up in Docker
- ✅ Fully S3-compatible
- ✅ Has console UI for management

If you need to connect to **Brilliant S3** (external hosted service):

1. Update `S3_ENDPOINT` to your Brilliant S3 endpoint URL
2. Update credentials to your Brilliant S3 credentials
3. Remove MinIO service from Docker Compose
4. The API code will work the same way!

### Bucket Policy

The init script sets bucket policy to `download` (public read). This allows:

- Files to be downloaded publicly
- API to check file availability
- Can be customized via MinIO console

---

## ✅ Challenge 1 Complete!

When all tests pass and health endpoint returns `"storage": "ok"`, Challenge 1 is complete! 🎉

---

## 📚 References

- [MinIO Documentation](https://min.io/docs/)
- [MinIO Docker Quickstart](https://min.io/docs/minio/container/index.html)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

**Files Modified**: `docker/compose.dev.yml`, `docker/compose.prod.yml`  
**Files Created**: None (init handled inline)  
**Test Status**: Ready for testing
