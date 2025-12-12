### *Challenge 2 Deliverables:*

1.  *Architecture Diagram*
    
2.  *Technical Approach*
    
    -   Choose ONE pattern (Polling / WS / Webhook / Hybrid)
        
3.  *Implementation Details*
    
    -   API changes
        
    -   New endpoints
        
    -   Database/cache schema
        
    -   Background job processing
        
    -   Error handling & retries
        
    -   Timeout configuration
        
4.  *Proxy Configuration*
    
    -   Cloudflare
        
    -   nginx
        
    -   Any other proxy
        
5.  *Frontend Integration*
    
    -   How frontend initiates
        
    -   How it shows progress
        
    -   How it handles completion/failure
        
    -   How it retries
        

Nothing else is required.  
No metrics, no observability, no extended scaling notes.

----------



# ARCHITECTURE.md

*Challenge 2 — Long-Running Download Architecture Design*

----------

## *1. Architecture Diagram*


Client (Browser/Frontend)
        │
        │ POST /v1/download/initiate
        ▼
API Server (Short Request)
        │
        │ Enqueue job into Queue + store job state
        ▼
Job Queue (Redis/BullMQ)
        │
        │ Worker processes job asynchronously (10–120s)
        ▼
Background Worker
        │
        │ Uploads file to S3 & updates job status
        ▼
S3-Compatible Storage (downloads bucket)
        │
        │ Client polls status
        ▼
Client GET /v1/download/status/:jobId
        │
        │ When done, frontend fetches presigned S3 URL
        ▼
Client Downloads File



----------

# *2. Technical Approach — Polling System*

The chosen design uses a *Polling-Based Asynchronous Download System*, which allows long-running downloads (10–120 seconds) to be processed safely in the background without keeping any HTTP request open. This prevents timeout issues and provides a smooth user experience.

----------

## *How the Polling System Works*

### *1. Client Initiates a Download*

The frontend sends a short request:


POST /v1/download/initiate



This endpoint:

-   Validates input
    
-   Creates a new jobId
    
-   Stores initial job status (pending)
    
-   Pushes the job into a background queue
    
-   Returns the jobId immediately
    

*Important:*  
This request never waits for the file to be generated.  
It simply starts the process and ends quickly.

----------

### *2. Background Worker Processes the Job*

A separate worker process picks up the job from the queue.  
It handles all long-running tasks:

-   Simulating or executing the long download (10–120s)
    
-   Generating the file
    
-   Uploading it to the S3-compatible storage
    
-   Creating a presigned URL for the final download
    
-   Updating the job status to "processing" → "done"
    

This ensures the long operation is completely isolated from HTTP timeouts.

----------

### *3. Client Polls the Status Periodically*

The frontend polls:


GET /v1/download/status/:jobId



This endpoint quickly returns:

-   pending
    
-   processing
    
-   done
    
-   error
    

and optionally a progress indicator.

Polling typically runs every *2–5 seconds* until the job is ready.

----------

### *4. Client Receives the Final Download URL*

When the worker completes the job, the status endpoint returns:

json
{
  "status": "done",
  "downloadUrl": "<presigned S3 URL>"
}



The client then:

-   Automatically downloads the file  
    *or*
-   Displays a “Download Ready” button
    

This gives the user clear visibility and a responsive experience.

----------

## *Why Polling Works Well*

-   The server never holds long requests; every request returns fast.
    
-   Proxies (Cloudflare/nginx) do not interrupt async processing.
    
-   The user always knows what is happening through status updates.
    
-   Downloading through S3 offloads heavy traffic from the API server.
    
-   The system remains simple and predictable.
    

----------

## *Key Components in the Polling Approach*

-   *API Server:* Handles initiation and status retrieval.
    
-   *Queue System:* Holds long-running jobs.
    
-   *Worker:* Performs actual download work.
    
-   *Redis:* Stores job states.
    
-   *S3 Storage:* Stores final downloadable content.
    
-   *Frontend Polling Loop:* Repeatedly checks job status.
    

----------

## *End-to-End Flow Summary*

1.  User initiates request → receives jobId.
    
2.  Worker processes job asynchronously.
    
3.  Frontend polls for job updates.
    
4.  Job completes → download URL returned.
    
5.  User downloads file.
    

----------
# *3. Implementation Details*

## *A. API Contract Changes (Existing Endpoints)*

The current POST /v1/download/start performs the download synchronously.  
To support long-running jobs:

-   This endpoint will no longer execute the download directly.
    
-   Instead, it will *validate input* and then *enqueue a background job*.
    
-   It returns a jobId immediately rather than waiting 10–120 seconds.
    

This keeps the behavior consistent while preventing proxy timeouts.

----------

## *B. New Endpoints*

### *1. Initiate Download*

**POST /v1/download/initiate**

-   Creates a new job
    
-   Saves initial status (pending)
    
-   Returns { jobId } immediately
    

### *2. Check Job Status*

**GET /v1/download/status/:jobId**

-   Returns job state → pending, processing, done, error
    
-   When done, includes a presigned S3 URL
    

### *3. Fetch Download Result* (optional)

**GET /v1/download/:jobId**

-   Redirects or returns the presigned URL
    
-   Used when frontend wants a clean download endpoint
    

----------

## *C. Database / Cache Schema (Redis)*

Each job is stored in Redis as:


job:<jobId> = {
  jobId: string,
  fileId: number,
  status: "pending" | "processing" | "done" | "error",
  progress: number,     // optional
  downloadUrl: string | null,
  error: string | null,
  createdAt: timestamp
}



This enables fast reads, easy polling, and expiry (TTL).

----------

## *D. Background Job Processing Strategy*

*Queue System:*  
Redis-based queue such as *BullMQ*.

*Worker Responsibilities:*

1.  Pull job from queue
    
2.  Set status → "processing"
    
3.  Perform the long-running download (10–120s simulation)
    
4.  Upload file to S3-compatible storage
    
5.  Generate a presigned URL
    
6.  Update job record to "done"
    

This fully decouples long work from HTTP requests.

----------

## *E. Error Handling & Retry Logic*

-   Worker automatically retries failed jobs (e.g., 3 retries).
    
-   Use *exponential backoff* to avoid rapid retry loops.
    
-   If all retries fail:
    
    -   status = "error"
        
    -   error field stores error message
        
-   Frontend detects this state and can choose to re-initiate the job.
    

This ensures resilience without duplicating work.

----------

## *F. Timeout Configuration*

### *API Layer*

-   API requests must return fast (< 1s).
    
-   No long-running operations inside HTTP routes.
    

### *Worker Layer*

-   Worker has no strict timeout; it can run 120s+ safely.
    

### *Proxy Layer*

-   Cloudflare idle timeout ≈100s → avoided because no endpoint keeps a long connection open.
    
-   nginx recommended values:
    
    
    proxy_connect_timeout 5s
    proxy_read_timeout 60s
    proxy_send_timeout 60s
    
    
    

### *Frontend Layer*

-   Poll status endpoint every 2–5 seconds.
    
-   Add a maximum wait timeout (e.g., 5 minutes) depending on requirements.
    

----------




Below is a *clean, professional, and concise* version of *Section 4 (Proxy Configuration)* and *Section 5 (Frontend Integration)* — formatted exactly to match Challenge 2 expectations.

----------

# *4. Proxy Configuration*

Long-running operations are moved to background workers, so reverse proxies only handle short-lived API calls. This makes configuration simpler and prevents 504 timeouts. Below are recommended settings to ensure smooth behavior through Cloudflare, nginx, and similar proxies.

----------

## *A. Cloudflare*

Cloudflare enforces a hard timeout (typically ~100 seconds) for all HTTP requests.  
To avoid hitting this limit:

### *Key Principle:*

*No endpoint should keep the connection open longer than 1 second.*

### What works automatically:

-   /v1/download/initiate returns immediately → ✔
    
-   /v1/download/status/:jobId is fast → ✔
    
-   /v1/download/:jobId returns a presigned S3 URL → ✔
    

### Optional Cloudflare considerations:

-   *WebSockets:*  
    If switching to WebSockets or SSE in the future, enable:
    
    -   "WebSockets: ON"
        
    -   "Proxying: Full"
        
-   *Caching:*  
    Add rules to bypass caching for API routes:
    
    -   /v1/*
        
    -   /health
        

No special timeout changes are needed because the system no longer relies on long-lived responses.

----------

## *B. nginx Reverse Proxy*

nginx sits in front of the API server and handles routing, headers, and buffering.  
Since all endpoints are short, proxy timeouts can be modest.

### Example nginx configuration:

nginx
server {
    listen 80;
    server_name <your-domain>;

    location / {
        proxy_pass http://api:3000;

        # Connection settings
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Enable response buffering for small JSON replies
        proxy_buffering on;
        proxy_buffers 8 16k;
        proxy_buffer_size 16k;

        # Required headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}



### Why this works:

-   No long-lived requests → no need for 120s read_timeout
    
-   Small JSON responses → can be fully buffered
    
-   Reliable and efficient on a low-spec VM
    

----------

## *C. Other Reverse Proxies (ALB, Traefik, Caddy)*

Common principle across all:

-   Short API calls → default timeouts are safe
    
-   No streaming or chunked uploads required
    
-   S3 presigned URLs bypass the proxy for actual download, reducing load
    

You may apply minimal tuning, e.g.,:

-   Request timeout = 30–60s
    
-   Header timeout = 5–10s
    
-   Buffering enabled for JSON responses
    

This makes the solution very portable.

----------

# *5. Frontend Integration (React / Next.js)*

Below is a clear, clean workflow showing how the frontend initiates jobs, polls progress, and handles final download actions.

----------

## *A. Initiating a Download*

When user clicks “Download”:

ts
const initiate = async (fileId) => {
  const res = await fetch('/v1/download/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });

  const data = await res.json();
  return data.jobId;
};



*UI Behavior:*

-   Disable the button
    
-   Show “Preparing download…” message
    

----------

## *B. Showing Progress (Polling)*

Every 2–5 seconds, fetch job status:

ts
const pollStatus = async (jobId) => {
  const res = await fetch(`/v1/download/status/${jobId}`);
  return await res.json();
};



In React, you can use setInterval or a custom polling hook:

ts
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await pollStatus(jobId);
    setStatus(data.status);
    setProgress(data.progress || 0);
    if (data.status === 'done' || data.status === 'error') {
      clearInterval(interval);
      setDownloadUrl(data.downloadUrl);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [jobId]);



*UI Examples*

-   pending → “Waiting for job to start…”
    
-   processing → progress bar
    
-   done → show download button
    
-   error → show retry option
    

----------

## *C. Handling Completion*

When the job reaches "done":

ts
if (status === 'done') {
  window.location.href = downloadUrl; // triggers file download
}



Because the backend provides a *presigned S3 URL*, the browser downloads the file directly from storage (not through the API).

----------

## *D. Handling Failure States*

If a job reaches "error":

-   Show user-friendly message: “Something went wrong.”
    
-   Enable a “Retry” button
    
-   Retry simply calls /v1/download/initiate again
    

Example:

ts
const retry = () => {
  setJobId(null);
  initiate(fileId).then(setJobId);
};



----------

## *E. Implementing Retry Logic (Smart UX)*

### *Soft Retry (Automatic)*

If the status endpoint fails (network issue), retry after a delay.

### *Hard Retry (User Triggered)*

If worker sets status = "error":

-   Show error message
    
-   Allow user to try again
    

### *Browser Close / Refresh*

Store jobId in localStorage:

ts
localStorage.setItem('lastJobId', jobId);



When page loads:

ts
const saved = localStorage.getItem('lastJobId');
if (saved) setJobId(saved);



User can resume monitoring without restarting the job.

----------

# ✔ Summary for Sections 4 & 5

*Proxy configuration:*

-   Keep all API responses short
    
-   Cloudflare works without modification
    
-   nginx needs only basic timeouts
    
-   S3 handles heavy download traffic, not your API
    

*Frontend integration:*

-   Start job → get jobId
    
-   Poll for status every few seconds
    
-   Show progress UI
    
-   Download file via S3 URL when ready
    
-   Retry automatically or via user click
    

----------