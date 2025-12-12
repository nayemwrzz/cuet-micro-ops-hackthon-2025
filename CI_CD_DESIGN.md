# CI/CD Pipeline Design Document

## Current State Analysis

### Existing CI Workflow (`.github/workflows/ci.yml`)

**What it currently does:**

- ✅ Triggers on push/PR to main/master
- ✅ Has 3 jobs: `lint`, `test`, `build`
- ✅ Uses Node.js 24 (matches package.json engines)
- ✅ Runs ESLint and format check
- ✅ Runs E2E tests with basic environment variables
- ✅ Builds Docker image with Buildx and caching

**What's missing (requirements from Challenge 3):**

- ❌ No npm dependency caching (only Docker layer caching exists)
- ❌ No proper Node.js setup with version detection
- ❌ No deployment job (bonus points)
- ❌ No security scanning (bonus points)
- ❌ No notifications (bonus points)
- ❌ No enhanced test result reporting
- ❌ No CI/CD documentation in README
- ❌ No status badge

**What's missing (best practices):**

- ❌ Using older action versions (should use latest)
- ❌ No job summaries/annotations
- ❌ No proper grouping of logs
- ❌ E2E tests may need S3/MinIO setup (from Challenge 1) - but tests are resilient to storage being unavailable

## Design Decisions

### 1. Job Structure & Dependencies

```
lint (standalone)
  ↓
test (depends on lint)
  ↓
build (depends on test)
  ↓
deploy (depends on build, only on main branch)
```

**Rationale:**

- Sequential dependency ensures fail-fast behavior
- Deploy only on main (not PRs) prevents unauthorized deployments
- Separate jobs allow parallel execution where possible (though we use dependencies)

### 2. Caching Strategy

**npm dependencies:**

- Cache key: `${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}`
- Restore keys: `${{ runner.os }}-node-` (for fallback)
- Cache path: `~/.npm`

**Docker layers:**

- Already implemented via `cache-from` and `cache-to` with GHA cache
- Keep existing implementation

**Rationale:**

- npm cache significantly speeds up lint/test jobs
- Docker layer caching already works well

### 3. E2E Test Environment

**Current approach (in existing CI):**

- Tests run with environment variables in `env:` block
- No S3/MinIO setup required (tests accept both "ok" and "error" for storage)

**Future-proofing for Challenge 1:**

- When MinIO is added, tests will automatically pass if MinIO is in compose.dev.yml
- If tests need MinIO, we can update the test job later to use Docker Compose
- For now, keep the current approach (resilient to storage being unavailable)

**Rationale:**

- Current tests are resilient (accept storage errors)
- Don't over-engineer for Challenge 1 changes
- Can easily adapt later if needed

### 4. Deployment Strategy

**Design approach:**

- Create deployment job structure that's ready but guarded
- Support multiple deployment targets:
  - Docker registry (Docker Hub, GHCR, etc.)
  - Cloud platforms (Railway, Render, Fly.io)
  - VM via SSH (for user's VM)
- Use conditionals and secrets to enable/disable deployments
- Document all options clearly

**Rationale:**

- Flexible deployment options maximize bonus points
- Guards prevent accidental deployments
- Clear documentation shows production-ready thinking

### 5. Security Scanning

**Approach:**

- Use GitHub's built-in CodeQL (no external accounts needed)
- Use Trivy for Docker image scanning
- Run on push and weekly cron (for scheduled scans)

**Rationale:**

- CodeQL is free and powerful
- Trivy is industry-standard for container scanning
- Scheduled scans catch vulnerabilities in dependencies

### 6. Notifications

**Approach:**

- Optional job that sends Slack/Discord notifications
- Gracefully skips if webhook URL is not set
- Sends on failure and success (configurable)
- Clear documentation on setup

**Rationale:**

- Bonus points for notifications
- Optional means it doesn't break CI if not configured
- Professional touch for hackathon judges

### 7. Test Result Reporting

**Approach:**

- Use job summaries to show test results
- Group logs with meaningful names
- Add annotations for failed tests (if possible)
- Keep existing console output for detailed logs

**Rationale:**

- Better visibility in GitHub UI
- Judges can quickly see test status
- Detailed logs still available for debugging

## Implementation Plan

### Phase 1: Enhance Existing CI Workflow

1. Add Node.js setup with caching
2. Add npm dependency caching
3. Improve logging and job summaries
4. Update action versions to latest
5. Add deployment job (guarded/conditional)

### Phase 2: Security Scanning

1. Create `.github/workflows/security.yml`
2. Add CodeQL analysis
3. Add Trivy Docker scanning
4. Configure weekly cron schedule

### Phase 3: Notifications

1. Add optional notification job to main CI
2. Support Slack and Discord
3. Document webhook setup

### Phase 4: Documentation

1. Add CI/CD section to README
2. Include status badge
3. Document local testing steps
4. Document deployment setup
5. Document security scanning
6. Document notifications

## Merge Conflict Prevention Strategy

### Files I'll Modify:

- `.github/workflows/ci.yml` (enhance existing)
- `.github/workflows/security.yml` (new file - no conflicts)
- `README.md` (add new section at end)

### Coordination with Teammates:

**Challenge 1 (S3/MinIO):**

- They'll modify `docker/compose.dev.yml` and `docker/compose.prod.yml`
- They may add S3 environment variables to CI
- **My approach**: Use placeholder env vars that will work with or without MinIO
- **Strategy**: Leave S3 env vars flexible (can be empty strings)

**Challenge 2 (Architecture):**

- They'll create `ARCHITECTURE.md` (new file - no conflicts)
- They may modify API endpoints (but tests should still pass)
- **My approach**: CI should pass regardless of API changes (tests verify behavior)
- **Strategy**: CI doesn't depend on architecture implementation details

**Avoiding Conflicts:**

1. ✅ Work in separate files (security.yml is new)
2. ✅ Enhance existing CI rather than rewrite (smaller diff)
3. ✅ Add README section at the end (after existing content)
4. ✅ Use flexible env vars that work with/without Challenge 1 changes
5. ✅ Don't hard-code implementation details
6. ✅ Communicate: Let teammates know I'm enhancing CI, not changing Docker setup

## Potential Improvements (If Time Permits)

1. **Matrix Testing**: Test against multiple Node.js versions
2. **Parallel Jobs**: Run lint and format check in parallel
3. **Test Artifacts**: Save test reports as artifacts
4. **Performance Benchmarks**: Track API response times over time
5. **Dependency Updates**: Add Dependabot or Renovate
6. **Smoke Tests**: Quick health checks after deployment

## Trade-offs Made

1. **Simplified E2E Setup**: Not using Docker Compose for tests (yet) - keeps it simple and works with current tests
2. **Conditional Deployment**: Deployment is structured but guarded - shows intent without requiring secrets
3. **Separate Security Workflow**: Keeps main CI clean, allows independent scheduling
4. **Optional Notifications**: Won't fail CI if not configured - flexible for different setups

## Risks & Mitigations

1. **Risk**: E2E tests may need MinIO in the future (Challenge 1)
   - **Mitigation**: Tests are currently resilient. Can easily add Docker Compose step if needed.

2. **Risk**: Docker build may be slow
   - **Mitigation**: Already using layer caching. Added npm caching will help overall pipeline speed.

3. **Risk**: Security scanning may be slow
   - **Mitigation**: Run in separate workflow, doesn't block main CI

4. **Risk**: Merge conflicts with teammates
   - **Mitigation**: Work in separate files, communicate boundaries, use flexible configurations

---

## Final Structure

```
.github/
  workflows/
    ci.yml              (enhanced existing)
    security.yml        (new - CodeQL + Trivy)
README.md               (add CI/CD section at end)
```
