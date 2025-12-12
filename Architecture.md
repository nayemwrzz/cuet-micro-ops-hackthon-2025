### _Challenge 2 Deliverables:_

1.  _Architecture Diagram_
2.  _Technical Approach_
    - Choose ONE pattern (Polling / WS / Webhook / Hybrid)

3.  _Implementation Details_
    - API changes
    - New endpoints
    - Database/cache schema
    - Background job processing
    - Error handling & retries
    - Timeout configuration

4.  _Proxy Configuration_
    - Cloudflare
    - nginx
    - Any other proxy

5.  _Frontend Integration_
    - How frontend initiates
    - How it shows progress
    - How it handles completion/failure
    - How it retries

Nothing else is required.  
No metrics, no observability, no extended scaling notes.

---

# ARCHITECTURE.md

_Challenge 2 — Long-Running Download Architecture Design_

---

## _1. Architecture Diagram_

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

---

# _2. Technical Approach — Polling System_

The chosen design uses a _Polling-Based Asynchronous Download System_, which allows long-running downloads (10–120 seconds) to be processed safely in the background without keeping any HTTP request open. This prevents timeout issues and provides a smooth user experience.

---

## _How the Polling System Works_

### _1. Client Initiates a Download_

The frontend sends a short request:

POST /v1/download/initiate

This endpoint:

- Validates input
- Creates a new jobId
- Stores initial job status (pending)
- Pushes the job into a background queue
- Returns the jobId immediately

_Important:_  
This request never waits for the file to be generated.  
It simply starts the process and ends quickly.

---

### _2. Background Worker Processes the Job_

A separate worker process picks up the job from the queue.  
It handles all long-running tasks:

- Simulating or executing the long download (10–120s)
- Generating the file
- Uploading it to the S3-compatible storage
- Creating a presigned URL for the final download
- Updating the job status to "processing" → "done"

This ensures the long operation is completely isolated from HTTP timeouts.

---

### _3. Client Polls the Status Periodically_

The frontend polls:

GET /v1/download/status/:jobId

This endpoint quickly returns:

- pending
- processing
- done
- error

and optionally a progress indicator.

Polling typically runs every _2–5 seconds_ until the job is ready.

---

### _4. Client Receives the Final Download URL_

When the worker completes the job, the status endpoint returns:

json
{
"status": "done",
"downloadUrl": "<presigned S3 URL>"
}

The client then:

- Automatically downloads the file  
  _or_
- Displays a “Download Ready” button

This gives the user clear visibility and a responsive experience.

---

## _Why Polling Works Well_

- The server never holds long requests; every request returns fast.
- Proxies (Cloudflare/nginx) do not interrupt async processing.
- The user always knows what is happening through status updates.
- Downloading through S3 offloads heavy traffic from the API server.
- The system remains simple and predictable.

---

## _Key Components in the Polling Approach_

- _API Server:_ Handles initiation and status retrieval.
- _Queue System:_ Holds long-running jobs.
- _Worker:_ Performs actual download work.
- _Redis:_ Stores job states.
- _S3 Storage:_ Stores final downloadable content.
- _Frontend Polling Loop:_ Repeatedly checks job status.

---

## _End-to-End Flow Summary_

1.  User initiates request → receives jobId.
2.  Worker processes job asynchronously.
3.  Frontend polls for job updates.
4.  Job completes → download URL returned.
5.  User downloads file.

---

# _3. Implementation Details_

## _A. API Contract Changes (Existing Endpoints)_

The current POST /v1/download/start performs the download synchronously.  
To support long-running jobs:

- This endpoint will no longer execute the download directly.
- Instead, it will _validate input_ and then _enqueue a background job_.
- It returns a jobId immediately rather than waiting 10–120 seconds.

This keeps the behavior consistent while preventing proxy timeouts.

---

## _B. New Endpoints_

### _1. Initiate Download_

**POST /v1/download/initiate**

- Creates a new job
- Saves initial status (pending)
- Returns { jobId } immediately

### _2. Check Job Status_

**GET /v1/download/status/:jobId**

- Returns job state → pending, processing, done, error
- When done, includes a presigned S3 URL

### _3. Fetch Download Result_ (optional)

**GET /v1/download/:jobId**

- Redirects or returns the presigned URL
- Used when frontend wants a clean download endpoint

---

## _C. Database / Cache Schema (Redis)_

Each job is stored in Redis as:

job:<jobId> = {
jobId: string,
fileId: number,
status: "pending" | "processing" | "done" | "error",
progress: number, // optional
downloadUrl: string | null,
error: string | null,
createdAt: timestamp
}

This enables fast reads, easy polling, and expiry (TTL).

---

## _D. Background Job Processing Strategy_

_Queue System:_  
Redis-based queue such as _BullMQ_.

_Worker Responsibilities:_

1.  Pull job from queue
2.  Set status → "processing"
3.  Perform the long-running download (10–120s simulation)
4.  Upload file to S3-compatible storage
5.  Generate a presigned URL
6.  Update job record to "done"

This fully decouples long work from HTTP requests.

---

## _E. Error Handling & Retry Logic_

- Worker automatically retries failed jobs (e.g., 3 retries).
- Use _exponential backoff_ to avoid rapid retry loops.
- If all retries fail:
  - status = "error"
  - error field stores error message

- Frontend detects this state and can choose to re-initiate the job.

This ensures resilience without duplicating work.

---

## _F. Timeout Configuration_

### _API Layer_

- API requests must return fast (< 1s).
- No long-running operations inside HTTP routes.

### _Worker Layer_

- Worker has no strict timeout; it can run 120s+ safely.

### _Proxy Layer_

- Cloudflare idle timeout ≈100s → avoided because no endpoint keeps a long connection open.
- nginx recommended values:

  proxy_connect_timeout 5s
  proxy_read_timeout 60s
  proxy_send_timeout 60s

### _Frontend Layer_

- Poll status endpoint every 2–5 seconds.
- Add a maximum wait timeout (e.g., 5 minutes) depending on requirements.

---

Below is a _clean, professional, and concise_ version of _Section 4 (Proxy Configuration)_ and _Section 5 (Frontend Integration)_ — formatted exactly to match Challenge 2 expectations.

---

# _4. Proxy Configuration_

Long-running operations are moved to background workers, so reverse proxies only handle short-lived API calls. This makes configuration simpler and prevents 504 timeouts. Below are recommended settings to ensure smooth behavior through Cloudflare, nginx, and similar proxies.

---

## _A. Cloudflare_

Cloudflare enforces a hard timeout (typically ~100 seconds) for all HTTP requests.  
To avoid hitting this limit:

### _Key Principle:_

_No endpoint should keep the connection open longer than 1 second._

### What works automatically:

- /v1/download/initiate returns immediately → ✔
- /v1/download/status/:jobId is fast → ✔
- /v1/download/:jobId returns a presigned S3 URL → ✔

### Optional Cloudflare considerations:

- _WebSockets:_  
  If switching to WebSockets or SSE in the future, enable:
  - "WebSockets: ON"
  - "Proxying: Full"

- _Caching:_  
  Add rules to bypass caching for API routes:
  - /v1/\*
  - /health

No special timeout changes are needed because the system no longer relies on long-lived responses.

---

## _B. nginx Reverse Proxy_

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

- No long-lived requests → no need for 120s read_timeout
- Small JSON responses → can be fully buffered
- Reliable and efficient on a low-spec VM

---

## _C. Other Reverse Proxies (ALB, Traefik, Caddy)_

Common principle across all:

- Short API calls → default timeouts are safe
- No streaming or chunked uploads required
- S3 presigned URLs bypass the proxy for actual download, reducing load

You may apply minimal tuning, e.g.,:

- Request timeout = 30–60s
- Header timeout = 5–10s
- Buffering enabled for JSON responses

This makes the solution very portable.

---

# _5. Frontend Integration (React / Next.js)_

Below is a clear, clean workflow showing how the frontend initiates jobs, polls progress, and handles final download actions.

---

## _A. Initiating a Download_

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

_UI Behavior:_

- Disable the button
- Show “Preparing download…” message

---

## _B. Showing Progress (Polling)_

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

_UI Examples_

- pending → “Waiting for job to start…”
- processing → progress bar
- done → show download button
- error → show retry option

---

## _C. Handling Completion_

When the job reaches "done":

ts
if (status === 'done') {
window.location.href = downloadUrl; // triggers file download
}

Because the backend provides a _presigned S3 URL_, the browser downloads the file directly from storage (not through the API).

---

## _D. Handling Failure States_

If a job reaches "error":

- Show user-friendly message: “Something went wrong.”
- Enable a “Retry” button
- Retry simply calls /v1/download/initiate again

Example:

ts
const retry = () => {
setJobId(null);
initiate(fileId).then(setJobId);
};

---

## _E. Implementing Retry Logic (Smart UX)_

### _Soft Retry (Automatic)_

If the status endpoint fails (network issue), retry after a delay.

### _Hard Retry (User Triggered)_

If worker sets status = "error":

- Show error message
- Allow user to try again

### _Browser Close / Refresh_

Store jobId in localStorage:

ts
localStorage.setItem('lastJobId', jobId);

When page loads:

ts
const saved = localStorage.getItem('lastJobId');
if (saved) setJobId(saved);

User can resume monitoring without restarting the job.

---

# ✔ Summary for Sections 4 & 5

_Proxy configuration:_

- Keep all API responses short
- Cloudflare works without modification
- nginx needs only basic timeouts
- S3 handles heavy download traffic, not your API

_Frontend integration:_

- Start job → get jobId
- Poll for status every few seconds
- Show progress UI
- Download file via S3 URL when ready
- Retry automatically or via user click

---
