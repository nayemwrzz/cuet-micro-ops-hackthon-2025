# 🚀 Quick Team Coordination Guide

## ⚡ Quick Reference: Who Does What

| Challenge       | Team Member | Files to Work On                                       | Status         |
| --------------- | ----------- | ------------------------------------------------------ | -------------- |
| **Challenge 1** | Friend 1    | `docker/compose.*.yml`, `docker/init-scripts/`         | 🟡 In Progress |
| **Challenge 2** | Friend 2    | `docs/ARCHITECTURE.md`, `docs/diagrams/`               | 🟡 In Progress |
| **Challenge 3** | You         | `.github/workflows/*`, `README.md`                     | ✅ **DONE**    |
| **Challenge 4** | You         | `frontend/`, `docker/compose.*.yml` (frontend service) | 🔴 Not Started |

---

## 🚨 Conflict Prevention - Quick Rules

### ⚠️ HIGH RISK - Coordinate First!

**`docker/compose.dev.yml` & `docker/compose.prod.yml`**

- Challenge 1: Adds MinIO service
- Challenge 4: Adds frontend service
- **Action**: Challenge 1 completes first, then Challenge 4 adds frontend

**`.env.example`**

- Challenge 1: Adds S3 variables
- Challenge 4: Adds frontend variables
- **Action**: Add in separate sections with clear comments

**`README.md`**

- All challenges may add sections
- **Action**: Add your own section, don't modify others'

### ✅ SAFE - Work Independently

- `docs/ARCHITECTURE.md` → Only Challenge 2
- `frontend/` → Only Challenge 4
- `.github/workflows/security.yml` → Challenge 3 (done)
- `docker/init-scripts/` → Only Challenge 1

---

## 📋 Before You Commit Checklist

### For Challenge 1 (S3/MinIO)

- [ ] MinIO in both `compose.dev.yml` and `compose.prod.yml`
- [ ] Bucket `downloads` auto-created
- [ ] Health endpoint returns `"storage": "ok"`
- [ ] Tests pass locally

### For Challenge 2 (Architecture)

- [ ] `docs/ARCHITECTURE.md` created
- [ ] All required sections included
- [ ] Diagrams in `docs/diagrams/`

### For Challenge 4 (Dashboard)

- [ ] `frontend/` directory created
- [ ] Sentry + OpenTelemetry integrated
- [ ] Frontend service in Docker Compose
- [ ] All dashboard features working

---

## 🔄 Git Workflow

```bash
# 1. Create feature branch
git checkout -b challenge-X/feature-name

# 2. Work on your files
# ... make changes ...

# 3. Pull latest before committing
git pull origin main

# 4. Commit with clear message
git commit -m "[Challenge X] Description"

# 5. Push and create PR
git push origin challenge-X/feature-name
```

---

## 📞 Communication Template

When modifying shared files:

```
[Challenge X] Modifying: <filename>
Adding: <what you're adding>
Affected: <which challenges>
Please review!
```

---

## 🎯 File Ownership Map

```
docker/compose.*.yml     → Challenge 1 (MinIO) + Challenge 4 (Frontend)
docs/ARCHITECTURE.md     → Challenge 2 only
.github/workflows/       → Challenge 3 (done) ✅
frontend/                → Challenge 4 only
docker/init-scripts/     → Challenge 1 only
```

---

## ⚡ Quick Commands

### Test Locally (All Challenges)

```bash
# Backend
npm run test:e2e

# Docker (with MinIO after Challenge 1)
npm run docker:dev

# Frontend (after Challenge 4)
cd frontend && npm run dev
```

### Check for Conflicts

```bash
# Before pushing
git pull origin main
git status

# If conflicts, resolve then:
git add .
git commit -m "Resolve conflicts"
```

---

**See `PROJECT_STRUCTURE.md` for complete details!**
