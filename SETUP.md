# Setup Guide - Quick Start

This guide will help you get started with the project quickly.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 24.10.0
- **npm** >= 10.x
- **Docker** >= 24.x
- **Docker Compose** >= 2.x

### Check Your Versions

```bash
node --version   # Should be >= 24.10.0
npm --version    # Should be >= 10.x
docker --version # Should be >= 24.x
docker compose version # Should be >= 2.x
```

---

## Quick Setup (5 minutes)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd cuet-micro-ops-hackthon-2025
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all Node.js dependencies listed in `package.json`.

**Expected Output**:

```
added 320 packages, and audited 321 packages in 21s
```

### Step 3: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# OR create it manually (see below)
```

**Note**: If `.env.example` doesn't exist, create `.env` file with:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# S3 Configuration (MinIO)
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=downloads
S3_FORCE_PATH_STYLE=true

# Observability (optional)
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Rate Limiting
REQUEST_TIMEOUT_MS=30000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=*

# Download Delay Simulation
DOWNLOAD_DELAY_ENABLED=true
DOWNLOAD_DELAY_MIN_MS=10000
DOWNLOAD_DELAY_MAX_MS=200000
```

### Step 4: Verify Installation

```bash
# Check if dependencies are installed
npm list --depth=0

# Run linting to verify setup
npm run lint
```

---

## Development Setup

### Option A: Local Development (No Docker)

```bash
# Start the development server
npm run dev

# Server will run on http://localhost:3000
```

**Note**: For local development, you may need to set up MinIO separately or use mock mode (leave S3 config empty).

### Option B: Docker Development (Recommended)

```bash
# Start all services (API + MinIO + Jaeger)
npm run docker:dev

# Services will be available at:
# - API: http://localhost:3000
# - MinIO Console: http://localhost:9001
# - Jaeger UI: http://localhost:16686
```

**First time setup**: Docker will download images (~500MB), so first run may take a few minutes.

---

## Testing Your Setup

### Quick Health Check

```bash
# Check if server is running
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","checks":{"storage":"ok"}}
```

### Run Tests

```bash
# Run E2E tests
npm run test:e2e

# Expected: All 29 tests should pass
```

---

## Available Scripts

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start dev server (5-15s delays, hot reload) |
| `npm run start`        | Start production server (10-120s delays)    |
| `npm run lint`         | Run ESLint                                  |
| `npm run lint:fix`     | Fix linting issues automatically            |
| `npm run format`       | Format code with Prettier                   |
| `npm run format:check` | Check code formatting                       |
| `npm run test:e2e`     | Run end-to-end tests                        |
| `npm run docker:dev`   | Start Docker Compose (development)          |
| `npm run docker:prod`  | Start Docker Compose (production)           |

---

## Troubleshooting

### Issue: `npm install` fails

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port already in use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# OR change PORT in .env file
PORT=3001
```

### Issue: Docker not starting

**Solution**:

```bash
# Check if Docker is running
docker ps

# If not, start Docker Desktop
# Then try again:
docker compose -f docker/compose.dev.yml up --build
```

### Issue: MinIO connection errors

**Solution**:

```bash
# Check if MinIO is running
docker ps | grep minio

# Check MinIO logs
docker logs minio

# Restart services
npm run docker:dev
```

---

## Project Structure

```
.
├── src/                    # Source code
│   └── index.ts           # Main application
├── scripts/                # Utility scripts
│   ├── e2e-test.ts        # E2E tests
│   └── run-e2e.ts         # Test runner
├── docker/                 # Docker configuration
│   ├── compose.dev.yml    # Development Docker Compose
│   └── compose.prod.yml   # Production Docker Compose
├── docs/                   # Documentation
│   └── ARCHITECTURE.md    # Architecture design
├── .github/                # GitHub Actions
│   └── workflows/         # CI/CD pipelines
├── package.json           # Dependencies
└── README.md              # Main documentation
```

---

## Next Steps

1. ✅ **Verify setup** - Run `npm run test:e2e` to confirm everything works
2. 📖 **Read README.md** - Full project documentation
3. 🏗️ **Check ARCHITECTURE.md** - Understand the system design
4. 🚀 **Start developing** - Pick your challenge and begin!

---

## Getting Help

- **Documentation**: See `README.md` for full details
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Team Coordination**: See `TEAM_COORDINATION.md`
- **Testing**: See challenge-specific testing guides

---

## Environment Variables Reference

### Required Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `S3_ENDPOINT` - S3 storage endpoint
- `S3_ACCESS_KEY_ID` - S3 access key
- `S3_SECRET_ACCESS_KEY` - S3 secret key
- `S3_BUCKET_NAME` - S3 bucket name

### Optional Variables

- `SENTRY_DSN` - Sentry error tracking (optional)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint (optional)

See `.env` file or README.md for complete list.

---

**Setup Complete!** 🎉

If you encounter any issues, check the troubleshooting section or contact your team.
