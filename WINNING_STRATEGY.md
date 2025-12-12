# Winning Strategy: CUET Micro-Ops Hackathon 2025

## Executive Summary

This document outlines a comprehensive strategy to maximize points (target: 50/50) and stand out in the hackathon. The strategy prioritizes:

1. **Completeness**: Addressing all 4 challenges thoroughly
2. **Production-readiness**: Solutions that reflect real-world best practices
3. **Documentation**: Clear, professional documentation that demonstrates understanding
4. **Innovation**: Going beyond minimum requirements where bonus points are available

---

## Challenge Breakdown & Strategy

### Challenge 1: S3 Storage Integration (15 points - Medium)

**Goal**: Add self-hosted S3 storage to Docker Compose and connect the API

**Strategic Approach**:

1. **Choose MinIO over RustFS** (even though RustFS is recommended)
   - **Reasoning**: MinIO has better documentation, more examples, and is widely recognized in hackathons
   - Has a console UI for debugging (port 9001)
   - More predictable behavior with AWS SDK
   - Easy bucket initialization via `mc` (MinIO Client) or init scripts

2. **Implementation Strategy**:
   - Add MinIO service to both `compose.dev.yml` and `compose.prod.yml`
   - Use an init container or entrypoint script to auto-create the `downloads` bucket
   - Configure proper networking: API should connect to `http://minio:9000`
   - Update `.env.example` with proper S3 credentials
   - Test health endpoint immediately after startup

3. **Winning Points**:
   - ✅ Make it work in both dev and prod compose files
   - ✅ Add health checks and dependency ordering
   - ✅ Document the setup clearly in README
   - ⭐ Bonus: Add MinIO console access for debugging

**Technical Notes**:

- MinIO default credentials: `minioadmin/minioadmin`
- Bucket creation can be done via:
  - Entrypoint script using `mc` CLI
  - Docker init container
  - Or simple curl/API call to MinIO admin API

---

### Challenge 2: Architecture Design (15 points - Hard)

**Goal**: Design a complete solution for handling long-running downloads

**Strategic Decision: Hybrid Approach (Option D)**

**Why Hybrid Wins**:

- Demonstrates deep understanding of trade-offs
- Shows production-ready thinking
- Handles different use cases appropriately
- **Impression on judges**: "This team understands real-world constraints"

**Architecture Components**:

1. **Job Queue System**: Use Redis + BullMQ
   - Why Redis/BullMQ:
     - Lightweight, fast, perfect for job queuing
     - Built-in retry logic and job prioritization
     - Easy to add to Docker Compose
     - Better than database polling (less load)
     - More hackathon-friendly than AWS SQS (no cloud setup needed)

2. **API Pattern: Async Jobs with Multiple Client Options**

   ```
   POST /v1/download/initiate
   → Returns: { jobId, status: "queued", estimatedTime: 60 }

   GET /v1/download/status/:jobId
   → Returns: { status, progress, fileUrl, error }

   GET /v1/download/:jobId/stream (SSE for real-time)
   → Server-Sent Events for progress updates

   Webhook option (for backend integrations):
   POST /v1/download/initiate { callbackUrl: "..." }
   ```

3. **Data Flow Design**:

   **Fast Downloads (< 15s)**:

   ```
   Client → POST /download/initiate
   → Job queued (Redis)
   → Worker picks up immediately
   → Processing (10-15s)
   → Result stored in Redis (TTL: 1 hour)
   → Client polls GET /status/:jobId
   → Returns presigned S3 URL immediately
   ```

   **Slow Downloads (60-120s)**:

   ```
   Client → POST /download/initiate
   → Job queued (Redis)
   → Worker processes asynchronously
   → Progress updates published to Redis (Pub/Sub)
   → Client can:
     a) Poll GET /status/:jobId every 5s (simple)
     b) Connect to SSE endpoint for real-time updates (premium)
   → When complete: presigned S3 URL returned
   ```

4. **Database Schema** (Redis or PostgreSQL):

   ```typescript
   JobStatus {
     jobId: string (UUID)
     fileId: number
     userId?: string (for multi-tenant)
     status: "queued" | "processing" | "completed" | "failed"
     progress: number (0-100)
     s3Key?: string
     presignedUrl?: string (TTL: 1 hour)
     error?: string
     createdAt: timestamp
     completedAt?: timestamp
     estimatedCompletion?: timestamp
   }
   ```

5. **Worker Process Strategy**:
   - Separate worker service (can run in same container with PM2/cluster)
   - Processes jobs from Redis queue
   - Handles retries with exponential backoff
   - Publishes progress updates

6. **Frontend Integration (React/Next.js)**:

   ```typescript
   // Initiate download
   const { jobId } = await api.post("/v1/download/initiate", { file_id });

   // Option 1: Polling (default)
   const pollStatus = setInterval(async () => {
     const status = await api.get(`/v1/download/status/${jobId}`);
     updateProgress(status.progress);
     if (status.status === "completed") {
       window.open(status.presignedUrl);
       clearInterval(pollStatus);
     }
   }, 5000);

   // Option 2: SSE (premium feature)
   const eventSource = new EventSource(`/v1/download/${jobId}/stream`);
   eventSource.onmessage = (e) => {
     const status = JSON.parse(e.data);
     updateProgress(status.progress);
   };
   ```

7. **Proxy Configuration**:

   **Cloudflare**:
   - Increase timeout: `proxy_read_timeout: 600s` (for SSE)
   - Enable WebSocket support for future WS upgrades
   - Use "Always Online" only for static assets

   **Nginx**:

   ```nginx
   proxy_read_timeout 600s;
   proxy_buffering off;  # Important for SSE
   proxy_cache off;      # Don't cache job status

   location /v1/download/*/stream {
     proxy_pass http://backend;
     proxy_http_version 1.1;
     proxy_set_header Connection '';
     proxy_buffering off;
     proxy_read_timeout 600s;
   }
   ```

8. **Edge Cases to Address**:
   - **User closes browser**: Job continues processing, can retrieve later
   - **Multiple concurrent downloads**: Queue with priority or parallel workers
   - **Rate limiting**: Per-user limits on job creation
   - **Presigned URL expiration**: Generate new presigned URLs on status check
   - **Failed jobs**: Retry with exponential backoff (max 3 attempts)

**Documentation Structure for ARCHITECTURE.md**:

1. Problem statement recap
2. Architecture diagram (ASCII or mermaid.js)
3. Chosen approach justification (why hybrid)
4. Component details (Redis, workers, API)
5. API contract changes
6. Database schema
7. Data flow diagrams (fast vs slow downloads)
8. Proxy configurations
9. Frontend integration guide
10. Error handling & retry logic
11. Timeout configurations at each layer
12. Cost implications and scaling considerations

---

### Challenge 3: CI/CD Pipeline (10 points - Medium)

**Goal**: Set up GitHub Actions pipeline for automated testing

**Strategic Approach**:

1. **Use GitHub Actions** (mentioned as reference)
   - Already has a basic `.github/workflows/ci.yml` mentioned
   - Most common, easy to demo
   - Free for public repos

2. **Pipeline Structure**:

   ```
   Lint → Test → Build → Deploy (bonus)
   ```

3. **Key Features to Include**:
   - ✅ Run on push to main/master
   - ✅ Run on pull requests
   - ✅ Parallel jobs where possible (lint + format check can run together)
   - ✅ Dependency caching (node_modules)
   - ✅ Docker layer caching
   - ✅ Clear test result reporting
   - ✅ Matrix testing (if multiple Node versions required)

4. **Bonus Points Strategy**:
   - ⭐ Add automatic deployment to Railway/Render (easy setup)
   - ⭐ Add security scanning (Snyk or Trivy for Docker)
   - ⭐ Add branch protection rules documentation
   - ⭐ Add Slack notifications (webhook)

5. **Pipeline Enhancement Ideas**:
   - Use `setup-node@v4` with caching
   - Use `docker/build-push-action@v5` with layer caching
   - Add a job summary showing test results
   - Add emoji badges for quick status checking
   - Separate jobs for different test types (unit, e2e)

**Implementation Priority**:

1. Core pipeline (lint, test, build) - REQUIRED
2. Caching - IMPACT
3. Deployment - BONUS
4. Security scanning - BONUS
5. Notifications - BONUS

---

### Challenge 4: Observability Dashboard (Bonus - 10 points, Hard)

**Goal**: React dashboard with Sentry + OpenTelemetry integration

**Strategic Approach**:

1. **Tech Stack Choice**:
   - **Vite + React** (faster setup than Next.js for hackathon)
   - **Tailwind CSS** (rapid UI development)
   - **React Query** (for API state management)
   - **Recharts** (for metrics visualization)

2. **Dashboard Features** (Prioritized):

   **Must-Have** (for points):
   - ✅ Health status widget
   - ✅ Download jobs list with status
   - ✅ Recent Sentry errors
   - ✅ Trace ID display
   - ✅ Link to Jaeger UI

   **Should-Have** (for wow factor):
   - ⭐ Real-time updates (polling or WebSocket)
   - ⭐ Error details modal
   - ⭐ Performance charts (response times)
   - ⭐ Success/failure rate metrics

3. **Sentry Integration**:
   - Error boundary for React errors
   - Capture API errors automatically
   - Custom context (user ID, job ID)
   - Performance monitoring for API calls
   - Breadcrumbs for user actions

4. **OpenTelemetry Integration**:
   - Frontend SDK initialization
   - Trace propagation via `traceparent` header
   - Custom spans for:
     - Button clicks ("User clicked Download")
     - API calls ("Download API Request")
     - Job status polling
   - Display trace IDs in UI (clickable link to Jaeger)

5. **Docker Integration**:
   - Add frontend service to `compose.dev.yml`
   - Ensure Jaeger UI is accessible
   - Frontend proxy to API (or use CORS)

6. **Correlation Implementation**:

   ```typescript
   // Frontend: Generate trace ID
   const traceId = generateTraceId();

   // Include in API request
   headers: {
     'traceparent': `00-${traceId}-...`
   }

   // Backend: Extract and log
   // Errors in Sentry: Tag with trace_id
   ```

**Visual Design Strategy**:

- Clean, modern dashboard (inspiration: Vercel Analytics, Grafana)
- Color-coded statuses (green=healthy, red=error, yellow=processing)
- Responsive design (mobile-friendly)
- Dark mode optional (bonus points)

---

## Implementation Priority & Timeline

### Phase 1: Foundation (Day 1 Morning)

1. **Challenge 1** (S3 Storage) - 2-3 hours
   - Quick win, builds confidence
   - Tests pass early

### Phase 2: Core Architecture (Day 1 Afternoon - Day 2 Morning)

2. **Challenge 2** (Architecture Design) - 4-6 hours
   - Most points, most complex
   - Write ARCHITECTURE.md with diagrams
   - Can be done in parallel with implementation prep

### Phase 3: Automation (Day 2 Afternoon)

3. **Challenge 3** (CI/CD) - 2-3 hours
   - Straightforward, well-documented
   - Quick to implement

### Phase 4: Polish & Bonus (Day 2 Evening - Day 3)

4. **Challenge 4** (Observability) - 4-5 hours
   - Bonus points, impressive demo
   - Can cut scope if time runs short

---

## Key Success Factors

### 1. Documentation Quality

- Write as if for production team
- Include diagrams (mermaid.js is great)
- Explain "why" not just "what"
- Add troubleshooting sections

### 2. Code Quality

- Follow existing code style
- Add comments for complex logic
- Error handling everywhere
- Logging for debugging

### 3. Testing

- Make sure all E2E tests pass
- Add manual testing instructions
- Document edge cases handled

### 4. Demo Preparation

- Can spin up entire stack with `docker compose up`
- Health endpoints work
- Dashboard is visually impressive
- Clear demo script

### 5. Differentiators

- **Thinking ahead**: Address edge cases judges might ask about
- **Production-ready**: Not just "it works", but "it's production-ready"
- **Documentation**: Professional-grade docs
- **Visuals**: Good diagrams and dashboard design

---

## Risk Mitigation

### Risk 1: Time Management

- **Mitigation**: Start with Challenge 1 (quick win)
- Cut scope on Challenge 4 if needed (basic dashboard still gets points)

### Risk 2: Docker Issues

- **Mitigation**: Test Docker setup early
- Have fallback plan (local dev mode)

### Risk 3: Integration Complexity

- **Mitigation**: Start simple, add complexity
- Redis can be added incrementally

### Risk 4: Documentation Takes Too Long

- **Mitigation**: Write docs as you implement
- Use templates/structure provided

---

## Final Checklist Before Submission

### Challenge 1 ✅

- [ ] MinIO running in Docker Compose
- [ ] Bucket auto-created on startup
- [ ] Health endpoint returns `"storage": "ok"`
- [ ] E2E tests pass
- [ ] Works in both dev and prod compose files

### Challenge 2 ✅

- [ ] ARCHITECTURE.md created
- [ ] Architecture diagram included
- [ ] All sections completed (API, schema, flows, proxies, frontend)
- [ ] Justification for chosen approach
- [ ] Edge cases addressed

### Challenge 3 ✅

- [ ] CI pipeline configured
- [ ] Runs on push and PR
- [ ] All tests pass in CI
- [ ] Caching implemented
- [ ] Badge added to README
- [ ] Bonus: Deployment configured

### Challenge 4 ✅

- [ ] React app created
- [ ] Sentry integration working
- [ ] OpenTelemetry traces working
- [ ] Dashboard displays required features
- [ ] Trace correlation working
- [ ] Docker Compose includes frontend

### General ✅

- [ ] README updated with setup instructions
- [ ] All environment variables documented
- [ ] Clear demo instructions
- [ ] Code is clean and commented
- [ ] No linter errors

---

## Winning Mindset

1. **Think Like a Judge**: What would impress you?
   - Production-ready solutions
   - Thoughtful architecture decisions
   - Professional documentation
   - Attention to edge cases

2. **Show Your Work**: Document your thinking
   - Why did you choose Redis over SQS?
   - Why hybrid approach over pure polling?
   - What are the trade-offs?

3. **Polish Matters**:
   - Clean code > clever code
   - Good docs > undocumented code
   - Working demo > incomplete features

4. **Time Management**:
   - Don't over-engineer Challenge 4
   - Make sure Challenges 1-3 are perfect
   - Leave time for testing and polish

---

## Next Steps

1. **Read this strategy** thoroughly
2. **Set up development environment** (Docker, Node.js)
3. **Start with Challenge 1** (S3 Storage) - quick win
4. **Begin Challenge 2 architecture design** - think through the problem
5. **Implement systematically** following the priority order

**Remember**: The goal is to demonstrate production-ready thinking, not just working code. Document your decisions, show trade-offs, and build something impressive!

Good luck! 🚀
