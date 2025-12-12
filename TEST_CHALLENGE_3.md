# Testing Challenge 3: CI/CD Pipeline

This guide will help you test all aspects of Challenge 3 to ensure everything works correctly.

## 🧪 Test Plan

### Phase 1: Local Testing (Can do right now)

Test all components that will run in CI locally before pushing.

### Phase 2: GitHub Actions Testing

Push to GitHub and verify workflows run successfully.

---

## Phase 1: Local Testing

### Step 1: Test Linting

```bash
npm run lint
```

**Expected**: ✅ No linting errors

### Step 2: Test Code Formatting

```bash
npm run format:check
```

**Expected**: ✅ Code is properly formatted (no changes needed)

If formatting fails, fix it with:

```bash
npm run format
```

### Step 3: Test E2E Tests

```bash
npm run test:e2e
```

**Expected**: ✅ All tests pass

**Note**: This will start a local server and run tests. Make sure port 3000 is available.

### Step 4: Test Docker Build

```bash
docker build -f docker/Dockerfile.prod -t delineate-hackathon-challenge:test .
```

**Expected**: ✅ Docker image builds successfully

**Note**: Make sure Docker is running.

### Step 5: Verify Workflow Files Syntax

```bash
# Check YAML syntax (if you have yamllint or similar)
# Or use an online YAML validator
```

---

## Phase 2: GitHub Actions Testing

### Option A: Test with GitHub (Recommended)

1. **Commit your changes:**

   ```bash
   git add .
   git commit -m "[Challenge 3] Complete CI/CD pipeline implementation"
   git push origin your-branch-name
   ```

2. **Create a Pull Request:**
   - Go to GitHub repository
   - Create PR from your branch to `main`/`master`
   - This will trigger the CI pipeline

3. **Monitor the workflow:**
   - Go to "Actions" tab in GitHub
   - Watch the CI workflow run
   - Check each job: `lint`, `test`, `build`

4. **Verify all jobs pass:**
   - ✅ Lint job completes successfully
   - ✅ Test job completes successfully
   - ✅ Build job completes successfully
   - ✅ Deploy job shows placeholder (won't fail)

### Option B: Test Locally with Act (Advanced)

If you want to test GitHub Actions locally without pushing:

```bash
# Install act (GitHub Actions local runner)
# Windows: choco install act-cli
# Or download from: https://github.com/nektos/act

# Test the CI workflow
act push

# Test specific job
act -j lint
act -j test
act -j build
```

**Note**: Act requires Docker and may not support all GitHub Actions features.

---

## ✅ Verification Checklist

### Local Tests

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test:e2e` passes (all tests green)
- [ ] Docker image builds successfully

### GitHub Actions Tests

- [ ] Workflow triggers on push/PR
- [ ] Lint job completes successfully
- [ ] Test job completes successfully
- [ ] Build job completes successfully
- [ ] Deploy job shows placeholder (doesn't fail)
- [ ] Job summaries are visible in GitHub UI
- [ ] Security workflow runs (or is scheduled)

### Documentation

- [ ] README.md CI/CD section is complete
- [ ] Badge URL is correct (update if needed)
- [ ] All instructions are clear

---

## 🐛 Troubleshooting

### Linting Fails

```bash
# Fix auto-fixable issues
npm run lint:fix

# Then check again
npm run lint
```

### Formatting Fails

```bash
# Auto-format code
npm run format

# Then check again
npm run format:check
```

### E2E Tests Fail

1. Check if port 3000 is available
2. Check if server starts correctly
3. Review test output for specific failures

### Docker Build Fails

1. Check Docker is running
2. Check Dockerfile.prod exists
3. Review build logs for errors

### GitHub Actions Fail

1. Check workflow YAML syntax
2. Review workflow logs in GitHub Actions tab
3. Check if secrets are configured (if using any)
4. Verify environment variables are correct

---

## 📊 Expected Workflow Duration

- **Lint job**: ~30-60 seconds
- **Test job**: ~1-3 minutes (depends on test duration)
- **Build job**: ~2-5 minutes (faster with caching)
- **Deploy job**: ~10 seconds (placeholder)
- **Total**: ~4-9 minutes

---

## 🎯 Success Criteria

Challenge 3 is successfully tested when:

1. ✅ All local tests pass
2. ✅ GitHub Actions workflow runs successfully
3. ✅ All jobs complete without errors
4. ✅ Job summaries are visible
5. ✅ Documentation is accessible
6. ✅ Badge shows correct status

---

## 🚀 Next Steps After Testing

1. **If everything passes**: ✅ Challenge 3 is complete!
2. **If issues found**: Fix them and test again
3. **Once verified**: Move on to Challenge 4 (Observability Dashboard)

---

## 📝 Test Results Template

Fill this out as you test:

```
Date: ___________
Tester: ___________

Local Tests:
[ ] Lint: PASS / FAIL
[ ] Format: PASS / FAIL
[ ] E2E Tests: PASS / FAIL
[ ] Docker Build: PASS / FAIL

GitHub Actions Tests:
[ ] Workflow Triggers: YES / NO
[ ] Lint Job: PASS / FAIL
[ ] Test Job: PASS / FAIL
[ ] Build Job: PASS / FAIL
[ ] Deploy Job: PASS / FAIL (placeholder)

Issues Found:
-

Resolution:
-

Overall Status: ✅ COMPLETE / ⚠️ NEEDS FIXES
```
