# Download Jobs - Step-by-Step Guide

## 📋 What is Download Jobs?

The **Download Jobs** feature simulates downloading files from **MinIO S3 storage**. It's a long-running process that:

1. ✅ Checks if a file exists in MinIO S3 storage
2. ⏱️ Simulates processing delay (10-200 seconds) - demonstrates Challenge 2 (long-running operations)
3. 📥 Returns a download URL if the file exists
4. ❌ Returns an error if the file doesn't exist

---

## 🚀 Step-by-Step Instructions

### **Step 1: Ensure Services Are Running**

Make sure MinIO and the backend are running:

```bash
docker compose -f docker/compose.dev.yml ps
```

You should see:
- ✅ `minio` - Running
- ✅ `delineate-app` - Running

If not running, start them:

```bash
docker compose -f docker/compose.dev.yml up -d
```

Wait 30-60 seconds for services to start.

---

### **Step 2: Upload a Test File to MinIO (Optional but Recommended)**

**Option A: Using MinIO Console (Easiest)**

1. Open MinIO Console: http://localhost:9001
2. Login:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Click on `downloads` bucket
4. Click **"Upload"** button
5. Upload any file (e.g., `test.txt`, `image.jpg`)
6. **Important**: Rename the file to match the S3 key format:
   - File ID must be between **10,000** and **100,000,000**
   - **Format**: `{fileId}.zip` (e.g., `12345.zip`, `50000.zip`)
   - Example: If you want to download file ID `12345`, upload a file and rename it to `12345.zip`

**Option B: Using MinIO Client (mc)**

```bash
# Install mc (MinIO Client) if not installed
# Then configure and upload:

mc alias set local http://localhost:9000 minioadmin minioadmin
mc cp test-file.txt local/downloads/12345.zip
# Note: File must be named as {fileId}.zip
```

**Option C: Files Already Exist**

If you've already uploaded files, note their file IDs (the filename in MinIO).

---

### **Step 3: Open the Observability Dashboard**

1. Open: http://localhost:5173
2. Navigate to **"Download Jobs"** tab

---

### **Step 4: Start a Download Job**

1. In the **"Enter File ID"** input field, type a file ID:
   - Must be a number between **10,000** and **100,000,000**
   - Example: `12345` (if you uploaded a file named `12345` in MinIO)
   - Example: `50000` (if you uploaded a file named `50000` in MinIO)

2. Click **"Start Download"** button

3. You'll see:
   - Status changes to **"IN_PROGRESS"** (blue badge)
   - The job appears in the jobs list
   - Frontend automatically polls for status every 2 seconds

---

### **Step 5: Monitor Job Progress**

The frontend will automatically update the job status. You'll see:

**Status Badges:**
- 🟡 **PENDING** - Job just started
- 🔵 **IN_PROGRESS** - Processing (checking MinIO, simulating delay)
- 🟢 **COMPLETED** - File found, download URL ready
- 🔴 **FAILED** - File not found in MinIO

**Job Details:**
- **File ID**: The file you're downloading
- **Job ID**: Unique identifier for this job
- **Started**: When the job started
- **Completed**: When the job finished (if completed)
- **Duration**: How long it took (in seconds)
- **Error**: Error message (if failed)

---

### **Step 6: View Results**

**If Status = COMPLETED:**
- ✅ File exists in MinIO
- ✅ Download URL is generated (shown in backend response)
- ✅ You can use the download URL to download the file

**If Status = FAILED:**
- ❌ File doesn't exist in MinIO
- ❌ Error message: "File not found in storage"
- 💡 **Solution**: Upload the file to MinIO first (see Step 2)

---

## 🧪 Testing Examples

### **Example 1: Download Existing File**

1. Upload a file named `50000.zip` to MinIO `downloads` bucket
2. Enter File ID: `50000`
3. Click "Start Download"
4. Wait 10-200 seconds (random delay)
5. ✅ Status should be **COMPLETED**

### **Example 2: Download Non-Existent File**

1. Enter File ID: `99999` (assuming this file doesn't exist)
2. Click "Start Download"
3. Wait 10-200 seconds
4. ❌ Status should be **FAILED** with error "File not found in storage"

### **Example 3: Invalid File ID**

1. Enter File ID: `123` (too small, must be ≥ 10,000)
2. Click "Start Download"
3. ❌ Should show error: "Please enter a valid file ID"

---

## 🔍 How It Works (Technical Details)

### **Backend Process:**

1. **POST `/v1/download/start`** - Initiates download
   - Creates a job with unique `jobId`
   - Simulates processing delay (10-200 seconds)
   - Checks MinIO S3 for file existence

2. **GET `/v1/download/status/{fileId}`** - Get job status
   - Returns current job status
   - Includes download URL if completed
   - Includes error if failed

### **Frontend Process:**

1. User enters File ID and clicks "Start Download"
2. Frontend calls `POST /v1/download/start` with `{ file_id: 12345 }`
3. Backend responds immediately with job status
4. Frontend starts polling `GET /v1/download/status/12345` every 2 seconds
5. When status is `completed` or `failed`, polling stops

### **MinIO Integration:**

- Backend uses AWS SDK to check if file exists in MinIO
- File key format: `downloads/{fileId}.zip` (e.g., `downloads/12345.zip`)
- Bucket: `downloads` (configured in `docker/compose.dev.yml`)
- **Important**: The file must be named `{fileId}.zip` in the `downloads` bucket

---

## 📊 Observability Features

### **Trace Viewing:**

- Each download job creates a trace in Jaeger
- Click **"View Trace in Jaeger →"** link to see the full trace
- Traces show:
  - API request/response
  - S3/MinIO operations
  - Processing time
  - Errors (if any)

### **Sentry Integration:**

- Errors are automatically captured in Sentry
- Check Sentry dashboard for error details

---

## ❓ Troubleshooting

### **Problem: Job stays in "IN_PROGRESS" forever**

**Solution:**
- Check backend logs: `docker compose -f docker/compose.dev.yml logs delineate-app`
- The delay is random (10-200 seconds), so wait longer
- Check if MinIO is accessible: `curl http://localhost:3000/health`

### **Problem: All jobs show "FAILED"**

**Solution:**
- Files don't exist in MinIO
- Upload files to MinIO first (see Step 2)
- Check MinIO console: http://localhost:9001
- Verify bucket name is `downloads`

### **Problem: "Please enter a valid file ID" error**

**Solution:**
- File ID must be a number
- Must be between 10,000 and 100,000,000
- Example valid IDs: `10000`, `50000`, `123456`, `99999999`

### **Problem: Can't access MinIO Console**

**Solution:**
- Check if MinIO container is running: `docker ps | grep minio`
- MinIO Console URL: http://localhost:9001
- Default credentials: `minioadmin` / `minioadmin`

---

## 🎯 Quick Test Checklist

- [ ] MinIO is running (`docker ps | grep minio`)
- [ ] Backend is running (`docker ps | grep delineate-app`)
- [ ] Frontend is accessible (http://localhost:5173)
- [ ] At least one test file uploaded to MinIO `downloads` bucket
- [ ] File ID matches uploaded filename (e.g., file `12345.zip` → File ID `12345`)
- [ ] File ID is between 10,000 and 100,000,000
- [ ] Job status updates automatically (polls every 2 seconds)
- [ ] Trace appears in Jaeger (click "View Trace in Jaeger →")

---

## 📝 Summary

**Download Jobs** is a demonstration of:
- ✅ **Challenge 1**: MinIO S3 storage integration
- ✅ **Challenge 2**: Long-running operations with status polling
- ✅ **Challenge 4**: Observability (traces in Jaeger, errors in Sentry)

The feature simulates a real-world scenario where:
1. User requests a file download
2. System processes the request (takes time)
3. System checks if file exists in storage
4. System returns download URL or error
5. User can track progress via status polling

---

**Need Help?** Check:
- `CHALLENGE_1_QUICK_TEST.md` - MinIO setup
- `CHALLENGE_2_TESTING.md` - Long-running operations
- `CHALLENGE_4_TESTING.md` - Observability features

