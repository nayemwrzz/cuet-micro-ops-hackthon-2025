# Project File Structure & Team Coordination Guide

## 🎯 Purpose

This document defines the **complete project file structure** for all hackathon challenges. It ensures:

- ✅ Clear boundaries between challenges
- ✅ No merge conflicts
- ✅ Consistent organization
- ✅ Easy maintenance and navigation

---

## 📁 Complete Project Structure

```
cuet-micro-ops-hackthon-2025/
│
├── 📄 Root Configuration Files
│   ├── package.json                    # Node.js dependencies & scripts
│   ├── package-lock.json              # Locked dependency versions
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── eslint.config.mjs              # ESLint configuration
│   ├── .gitignore                      # Git ignore rules
│   ├── LICENSE                         # License file
│   ├── README.md                       # Main project documentation
│   └── .env.example                    # Environment variables template
│
├── 📂 src/                             # Backend Source Code
│   └── index.ts                        # Main application entry point
│
├── 📂 scripts/                         # Utility Scripts
│   ├── e2e-test.ts                     # E2E test suite
│   └── run-e2e.ts                      # Test runner with server management
│
├── 📂 docker/                          # Docker Configuration
│   ├── Dockerfile.dev                   # Development Dockerfile
│   ├── Dockerfile.prod                  # Production Dockerfile
│   ├── compose.dev.yml                  # ⚠️ Challenge 1: Add MinIO service here
│   ├── compose.prod.yml                 # ⚠️ Challenge 1: Add MinIO service here
│   └── init-scripts/                    # ⚠️ Challenge 1: Bucket initialization scripts (NEW)
│       └── init-minio.sh               # Script to create 'downloads' bucket
│
├── 📂 .github/                          # GitHub Configuration
│   ├── workflows/
│   │   ├── ci.yml                       # ✅ Challenge 3: CI/CD pipeline (DONE)
│   │   └── security.yml                 # ✅ Challenge 3: Security scanning (DONE)
│   └── CODEOWNERS                       # (Optional) Code ownership rules
│
├── 📂 docs/                             # Documentation
│   ├── ARCHITECTURE.md                  # ⚠️ Challenge 2: Architecture design document (NEW)
│   ├── diagrams/                        # ⚠️ Challenge 2: Architecture diagrams (NEW)
│   │   ├── system-overview.png          # Main architecture diagram
│   │   ├── data-flow-fast.png           # Fast download flow
│   │   └── data-flow-slow.png           # Slow download flow
│   └── api/                             # (Optional) Additional API docs
│
├── 📂 frontend/                         # ⚠️ Challenge 4: React Dashboard (NEW)
│   ├── package.json                     # Frontend dependencies
│   ├── package-lock.json               # Frontend lock file
│   ├── vite.config.ts                  # Vite configuration
│   ├── tsconfig.json                    # Frontend TypeScript config
│   ├── index.html                       # HTML entry point
│   ├── .env.example                     # Frontend environment variables
│   │
│   ├── 📂 src/
│   │   ├── main.tsx                     # React entry point
│   │   ├── App.tsx                      # Main App component
│   │   │
│   │   ├── 📂 components/               # React components
│   │   │   ├── Dashboard.tsx            # Main dashboard
│   │   │   ├── HealthStatus.tsx         # Health status widget
│   │   │   ├── DownloadJobs.tsx         # Download jobs list
│   │   │   ├── ErrorLog.tsx             # Sentry error log
│   │   │   ├── TraceViewer.tsx          # OpenTelemetry trace viewer
│   │   │   └── PerformanceMetrics.tsx   # Performance charts
│   │   │
│   │   ├── 📂 hooks/                    # Custom React hooks
│   │   │   ├── useHealth.ts             # Health check hook
│   │   │   ├── useDownloadJobs.ts       # Download jobs hook
│   │   │   └── useSentryErrors.ts       # Sentry errors hook
│   │   │
│   │   ├── 📂 services/                 # API services
│   │   │   ├── api.ts                   # API client
│   │   │   └── sentry.ts                # Sentry integration
│   │   │
│   │   ├── 📂 utils/                    # Utility functions
│   │   │   ├── tracing.ts               # OpenTelemetry setup
│   │   │   └── constants.ts             # Constants
│   │   │
│   │   └── 📂 styles/                   # Styles
│   │       └── index.css                # Global styles
│   │
│   ├── 📂 public/                      # Static assets
│   │   └── favicon.ico                  # Favicon
│   │
│   └── 📂 docker/                      # Frontend Docker config (if needed)
│       └── Dockerfile                   # Frontend Dockerfile
│
├── 📂 .vscode/                          # (Optional) VS Code settings
│   └── settings.json                    # Editor settings
│
└── 📂 Strategy & Design Docs            # Planning Documents
    ├── WINNING_STRATEGY.md              # Overall hackathon strategy
    ├── CI_CD_DESIGN.md                  # CI/CD design decisions
    ├── CI_CD_IMPLEMENTATION_SUMMARY.md   # CI/CD implementation summary
    └── PROJECT_STRUCTURE.md              # This file
```

---

## 🎯 Challenge-Specific File Assignments

### Challenge 1: S3 Storage Integration (MinIO)

**Team Member Responsibility**: Add MinIO to Docker Compose

**Files to Modify:**

- ✅ `docker/compose.dev.yml` - Add MinIO service
- ✅ `docker/compose.prod.yml` - Add MinIO service
- ✅ `.env.example` - Add S3/MinIO environment variables (if not already present)

**Files to Create:**

- ✅ `docker/init-scripts/init-minio.sh` - Bucket initialization script (optional but recommended)

**Files to NOT Touch:**

- ❌ `.github/workflows/*` - CI/CD files (Challenge 3)
- ❌ `docs/ARCHITECTURE.md` - Architecture docs (Challenge 2)
- ❌ `frontend/` - Frontend code (Challenge 4)
- ❌ `src/index.ts` - Backend code (unless needed for S3 connection)

**Guidelines:**

1. Use service name `minio` (or `brilliant-s3` if using that service) in Docker Compose
2. Expose MinIO on port `9000` (API) and `9001` (Console UI)
3. Create bucket `downloads` on startup (use init script or entrypoint)
4. Set environment variables:
   - `S3_ENDPOINT=http://minio:9000` (or your service name)
   - `S3_ACCESS_KEY_ID=minioadmin` (or your credentials)
   - `S3_SECRET_ACCESS_KEY=minioadmin` (or your credentials)
   - `S3_BUCKET_NAME=downloads`
   - `S3_FORCE_PATH_STYLE=true`
5. Ensure health endpoint returns `"storage": "ok"` when MinIO is connected

**Example MinIO Service Addition:**

```yaml
# In docker/compose.dev.yml and docker/compose.prod.yml
services:
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000" # API
      - "9001:9001" # Console UI
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - default

  # Add init container or entrypoint script to create bucket
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minioadmin minioadmin;
      mc mb myminio/downloads || true;
      mc anonymous set download myminio/downloads || true;
      exit 0;
      "
    networks:
      - default

volumes:
  minio-data:
```

---

### Challenge 2: Architecture Design

**Team Member Responsibility**: Create architecture documentation

**Files to Create:**

- ✅ `docs/ARCHITECTURE.md` - Main architecture document
- ✅ `docs/diagrams/` - Directory for architecture diagrams
  - `system-overview.png` (or `.svg`, `.md` with mermaid)
  - `data-flow-fast.png`
  - `data-flow-slow.png`
  - (Additional diagrams as needed)

**Files to NOT Touch:**

- ❌ `docker/compose.*.yml` - Docker files (Challenge 1)
- ❌ `.github/workflows/*` - CI/CD files (Challenge 3)
- ❌ `frontend/` - Frontend code (Challenge 4)
- ❌ `src/index.ts` - Backend implementation (unless documenting existing code)

**Guidelines:**

1. Create `docs/` directory if it doesn't exist
2. Use `ARCHITECTURE.md` as the main document (required by challenge)
3. Include all sections from Challenge 2 requirements:
   - Architecture diagram
   - Technical approach (justify your choice)
   - Implementation details
   - Proxy configuration examples
   - Frontend integration guide
4. Use diagrams in `docs/diagrams/` and reference them in `ARCHITECTURE.md`
5. Use markdown format, optionally with mermaid.js for diagrams
6. Keep diagrams in separate files for version control clarity

**ARCHITECTURE.md Structure:**

```markdown
# Architecture Design

## 1. Architecture Diagram

[Include or link to diagram]

## 2. Technical Approach

[Your chosen approach and justification]

## 3. Implementation Details

[API contracts, schemas, etc.]

## 4. Proxy Configuration

[Cloudflare, nginx examples]

## 5. Frontend Integration

[React/Next.js integration guide]
```

---

### Challenge 3: CI/CD Pipeline

**Team Member Responsibility**: ✅ **COMPLETED**

**Files Modified:**

- ✅ `.github/workflows/ci.yml` - Enhanced CI pipeline
- ✅ `.github/workflows/security.yml` - Security scanning (new)
- ✅ `README.md` - Added CI/CD section

**Files to NOT Touch:**

- ❌ `docker/compose.*.yml` - Docker files (Challenge 1)
- ❌ `docs/ARCHITECTURE.md` - Architecture docs (Challenge 2)
- ❌ `frontend/` - Frontend code (Challenge 4)

**Status**: ✅ Complete - No further changes needed unless Challenge 4 requires frontend build steps

---

### Challenge 4: Observability Dashboard

**Team Member Responsibility**: Create React dashboard with Sentry + OpenTelemetry

**Files to Create:**

- ✅ `frontend/` - Complete React application directory
  - `frontend/package.json`
  - `frontend/vite.config.ts` (or Next.js config)
  - `frontend/src/` - All React source code
  - `frontend/public/` - Static assets
  - `frontend/.env.example` - Frontend environment variables

**Files to Modify:**

- ✅ `docker/compose.dev.yml` - Add frontend service
- ✅ `docker/compose.prod.yml` - Add frontend service (optional)
- ✅ `README.md` - Add frontend setup instructions (in Challenge 4 section)

**Files to NOT Touch:**

- ❌ `src/index.ts` - Backend code (unless adding new endpoints for dashboard)
- ❌ `.github/workflows/ci.yml` - CI/CD (unless adding frontend build steps)
- ❌ `docs/ARCHITECTURE.md` - Architecture docs (Challenge 2)

**Guidelines:**

1. Create `frontend/` directory at project root
2. Use Vite + React (recommended) or Next.js
3. Install dependencies:
   - `@sentry/react` - Sentry integration
   - `@opentelemetry/api` - OpenTelemetry
   - React Query or similar for API state management
   - Tailwind CSS or similar for styling
4. Add frontend service to Docker Compose:
   ```yaml
   frontend:
     build:
       context: ./frontend
       dockerfile: Dockerfile
     ports:
       - "5173:5173" # Vite dev server
     environment:
       - VITE_API_URL=http://delineate-app:3000
       - VITE_SENTRY_DSN=${SENTRY_DSN}
     depends_on:
       - delineate-app
   ```
5. Ensure Jaeger UI is accessible (already in compose.dev.yml)
6. Implement all required features:
   - Health status widget
   - Download jobs list
   - Sentry error log
   - Trace viewer
   - Performance metrics

---

## 🚫 Conflict Prevention Rules

### General Rules for All Team Members

1. **Work in Your Assigned Files Only**
   - Challenge 1: Only `docker/` files
   - Challenge 2: Only `docs/` files
   - Challenge 3: Already done ✅
   - Challenge 4: Only `frontend/` files

2. **Coordinate Shared Files**
   - `README.md` - Add your section, don't modify others' sections
   - `docker/compose.*.yml` - Challenge 1 and 4 both modify (coordinate!)
   - `.env.example` - Challenge 1 and 4 both modify (coordinate!)

3. **Communication Protocol**
   - Before modifying shared files, announce in team chat
   - Use clear commit messages: `[Challenge 1] Add MinIO service`
   - Pull latest changes before pushing
   - Resolve conflicts immediately, don't let them accumulate

4. **File Naming Conventions**
   - Use kebab-case for files: `init-minio.sh`, `ARCHITECTURE.md`
   - Use PascalCase for React components: `Dashboard.tsx`
   - Use camelCase for TypeScript files: `apiClient.ts`

5. **Git Workflow**
   - Create feature branches: `challenge-1/minio-setup`, `challenge-2/architecture`, `challenge-4/dashboard`
   - Merge to main only after testing locally
   - Use descriptive commit messages

---

## 📋 File Modification Matrix

| File/Directory                   | Challenge 1 | Challenge 2 | Challenge 3 | Challenge 4 | Notes                         |
| -------------------------------- | ----------- | ----------- | ----------- | ----------- | ----------------------------- |
| `docker/compose.dev.yml`         | ✅ Modify   | ❌          | ❌          | ✅ Modify   | **Coordinate!**               |
| `docker/compose.prod.yml`        | ✅ Modify   | ❌          | ❌          | ✅ Modify   | **Coordinate!**               |
| `docker/init-scripts/`           | ✅ Create   | ❌          | ❌          | ❌          | New directory                 |
| `docs/ARCHITECTURE.md`           | ❌          | ✅ Create   | ❌          | ❌          | New file                      |
| `docs/diagrams/`                 | ❌          | ✅ Create   | ❌          | ❌          | New directory                 |
| `.github/workflows/ci.yml`       | ❌          | ❌          | ✅ Done     | ⚠️ Maybe    | Only if frontend build needed |
| `.github/workflows/security.yml` | ❌          | ❌          | ✅ Done     | ❌          | Complete                      |
| `frontend/`                      | ❌          | ❌          | ❌          | ✅ Create   | New directory                 |
| `README.md`                      | ⚠️ Maybe    | ⚠️ Maybe    | ✅ Done     | ⚠️ Maybe    | Add sections, don't delete    |
| `.env.example`                   | ✅ Modify   | ❌          | ❌          | ✅ Modify   | **Coordinate!**               |
| `src/index.ts`                   | ❌          | ❌          | ❌          | ❌          | Don't modify backend          |

**Legend:**

- ✅ = Can modify/create
- ❌ = Do NOT touch
- ⚠️ = Coordinate with team
- **Bold** = High conflict risk - communicate first!

---

## 🔄 Merge Conflict Prevention Strategy

### High-Risk Files (Require Coordination)

1. **`docker/compose.dev.yml` and `docker/compose.prod.yml`**
   - **Challenge 1**: Adds MinIO service
   - **Challenge 4**: Adds frontend service
   - **Strategy**:
     - Challenge 1 completes first
     - Challenge 4 adds frontend service after Challenge 1 is merged
     - Or: Challenge 1 adds MinIO, Challenge 4 adds frontend in separate PRs, merge sequentially

2. **`.env.example`**
   - **Challenge 1**: Adds S3/MinIO variables
   - **Challenge 4**: Adds frontend variables (VITE_API_URL, VITE_SENTRY_DSN)
   - **Strategy**:
     - Add variables in separate sections
     - Use clear comments: `# Challenge 1: S3 Configuration`, `# Challenge 4: Frontend Configuration`

3. **`README.md`**
   - **Challenge 3**: Added CI/CD section
   - **Challenge 1**: May add S3 setup instructions
   - **Challenge 2**: May reference architecture doc
   - **Challenge 4**: Will add frontend setup instructions
   - **Strategy**:
     - Each challenge adds its own section
     - Don't modify others' sections
     - Use clear section headers

### Low-Risk Files (Safe to Modify Independently)

- `docs/ARCHITECTURE.md` - Only Challenge 2 creates this
- `frontend/` - Only Challenge 4 creates this
- `.github/workflows/security.yml` - Only Challenge 3 (already done)
- `docker/init-scripts/` - Only Challenge 1 creates this

---

## 📝 Recommended Workflow

### Step 1: Initial Setup (All Team Members)

```bash
# Clone repository
git clone <repo-url>
cd cuet-micro-ops-hackthon-2025

# Create feature branch
git checkout -b challenge-X/your-feature-name

# Pull latest changes
git pull origin main
```

### Step 2: Development

```bash
# Work on your assigned files only
# Test locally before committing

# Commit with clear message
git add <your-files>
git commit -m "[Challenge X] Description of changes"
```

### Step 3: Before Pushing

```bash
# Pull latest changes
git pull origin main

# Resolve any conflicts
# Test again

# Push your branch
git push origin challenge-X/your-feature-name
```

### Step 4: Merge Coordination

- Create Pull Request with clear description
- Tag team members for review if touching shared files
- Merge after approval and CI passes

---

## ✅ Checklist Before Merging

### Challenge 1 Checklist

- [ ] MinIO service added to `compose.dev.yml`
- [ ] MinIO service added to `compose.prod.yml`
- [ ] Bucket `downloads` created on startup
- [ ] Health endpoint returns `"storage": "ok"`
- [ ] E2E tests pass
- [ ] `.env.example` updated with S3 variables
- [ ] README updated (if adding setup instructions)

### Challenge 2 Checklist

- [ ] `docs/ARCHITECTURE.md` created with all required sections
- [ ] Architecture diagrams created in `docs/diagrams/`
- [ ] All sections from challenge requirements included
- [ ] Diagrams referenced in ARCHITECTURE.md
- [ ] README updated to reference ARCHITECTURE.md (optional)

### Challenge 3 Checklist

- [x] CI/CD pipeline implemented ✅
- [x] Security scanning implemented ✅
- [x] README CI/CD section added ✅

### Challenge 4 Checklist

- [ ] `frontend/` directory created with React app
- [ ] Sentry integration implemented
- [ ] OpenTelemetry integration implemented
- [ ] All dashboard features implemented
- [ ] Frontend service added to Docker Compose
- [ ] README updated with frontend setup instructions
- [ ] Trace correlation working end-to-end

---

## 🎯 Final Structure After All Challenges

```
cuet-micro-ops-hackthon-2025/
├── src/                          # Backend (unchanged)
├── scripts/                      # Tests (unchanged)
├── docker/                       # ✅ Challenge 1: MinIO added
│   ├── compose.dev.yml          # ✅ Challenge 1 + 4: MinIO + Frontend
│   ├── compose.prod.yml         # ✅ Challenge 1 + 4: MinIO + Frontend
│   └── init-scripts/            # ✅ Challenge 1: Bucket init
├── .github/workflows/            # ✅ Challenge 3: CI/CD complete
├── docs/                         # ✅ Challenge 2: Architecture docs
│   ├── ARCHITECTURE.md
│   └── diagrams/
├── frontend/                     # ✅ Challenge 4: React dashboard
│   └── src/
└── README.md                     # ✅ All challenges documented
```

---

## 📞 Team Communication Template

When modifying shared files, use this template:

```
[Challenge X] Modifying shared file: <filename>

Changes:
- Adding: <what you're adding>
- Modifying: <what you're modifying>

Affected challenges: <list challenges that might be affected>

Please review before I merge.
```

---

## 🎉 Success Criteria

The project structure is successful when:

- ✅ All challenges can work independently
- ✅ No merge conflicts occur
- ✅ Each challenge's files are clearly separated
- ✅ Documentation is comprehensive and organized
- ✅ Team members can find files easily
- ✅ CI/CD passes for all challenges

---

**Last Updated**: After Challenge 3 completion
**Next Update**: After Challenge 1, 2, and 4 completion
