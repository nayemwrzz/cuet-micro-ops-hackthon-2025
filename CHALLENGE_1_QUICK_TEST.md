# Challenge 1: Quick Testing Guide

## ⚡ Quick Start

### 1. Start Services

```bash
npm run docker:dev
```

### 2. Wait 30-60 seconds for services to start

### 3. Test Health Endpoint

```bash
curl http://localhost:3000/health
```

**✅ Success looks like:**

```json
{
  "status": "healthy",
  "checks": {
    "storage": "ok"
  }
}
```

### 4. Run E2E Tests

```bash
npm run test:e2e
```

**✅ Success:** All 29 tests pass

---

## ✅ Expected Results

### Health Endpoint Test

```bash
curl http://localhost:3000/health
```

**Expected:**

- HTTP Status: `200`
- Response: `{"status":"healthy","checks":{"storage":"ok"}}`

**❌ Failure looks like:**

- HTTP Status: `503`
- Response: `{"status":"unhealthy","checks":{"storage":"error"}}`

---

### E2E Test Output

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

---

## 🔍 Visual Verification

### MinIO Console (Optional but Recommended)

1. Open: http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. ✅ Should see `downloads` bucket

### Container Status

```bash
docker ps
```

✅ All containers should be running:

- `minio` (healthy)
- `delineate-app` (running)
- `delineate-jaeger` (running)

---

## 📋 Files Changed

- ✅ `docker/compose.dev.yml` - Added MinIO service
- ✅ `docker/compose.prod.yml` - Added MinIO service

**See `CHALLENGE_1_IMPLEMENTATION.md` for full details!**
