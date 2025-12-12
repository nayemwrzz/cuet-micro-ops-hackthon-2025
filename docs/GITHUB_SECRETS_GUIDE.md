# GitHub Secrets Configuration Guide

This guide explains which GitHub Secrets you need to set up for the CI/CD pipeline and what values to use.

---

## 🔍 Quick Answer

**You don't need any secrets to run the CI pipeline!** All secrets are **optional**. The pipeline will work without any secrets configured.

However, if you want to:

- ✅ Test with real S3 storage (Challenge 1)
- ✅ Get Slack/Discord notifications
- ✅ Deploy to a container registry
- ✅ Enable Sentry error tracking

Then you'll need to configure the relevant secrets.

---

## 📋 Secrets Overview

| Secret Name              | Required?   | Purpose                     | Default Behavior        |
| ------------------------ | ----------- | --------------------------- | ----------------------- |
| **S3_ENDPOINT**          | ❌ Optional | S3/MinIO endpoint for tests | Tests run without S3    |
| **S3_ACCESS_KEY_ID**     | ❌ Optional | S3 access key               | Tests run without S3    |
| **S3_SECRET_ACCESS_KEY** | ❌ Optional | S3 secret key               | Tests run without S3    |
| **S3_BUCKET_NAME**       | ❌ Optional | S3 bucket name              | Tests run without S3    |
| **SLACK_WEBHOOK_URL**    | ❌ Optional | Slack notifications         | No notifications        |
| **DISCORD_WEBHOOK_URL**  | ❌ Optional | Discord notifications       | No notifications        |
| **DOCKER_USERNAME**      | ❌ Optional | Docker Hub login            | Deployment disabled     |
| **DOCKER_PASSWORD**      | ❌ Optional | Docker Hub password         | Deployment disabled     |
| **SENTRY_DSN**           | ❌ Optional | Sentry error tracking       | Error tracking disabled |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions - you don't need to set it.

---

## 🎯 Required Secrets: **NONE**

The CI pipeline works without any secrets! The workflow is designed to:

- ✅ Run linting (no secrets needed)
- ✅ Run tests (works with or without S3)
- ✅ Build Docker images (no secrets needed)
- ✅ Skip deployment (unless configured)
- ✅ Skip notifications (unless configured)

---

## 🔧 Optional Secrets Setup

### 1. S3 Secrets (For Challenge 1 Testing)

If you want CI tests to use a real S3/MinIO endpoint:

#### Steps:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name            | Example Value                | Description                |
| ---------------------- | ---------------------------- | -------------------------- |
| `S3_ENDPOINT`          | `http://s3.example.com:9000` | Your MinIO/S3 endpoint URL |
| `S3_ACCESS_KEY_ID`     | `minioadmin`                 | Your S3 access key         |
| `S3_SECRET_ACCESS_KEY` | `minioadmin123`              | Your S3 secret key         |
| `S3_BUCKET_NAME`       | `downloads`                  | Your S3 bucket name        |

**Note**: For local testing with MinIO (via Docker Compose), these aren't needed in GitHub since the tests can run without S3.

**When to set**: Only if you have a remote S3/MinIO instance you want CI to test against.

---

### 2. Notification Secrets (For CI Notifications)

#### Slack Notification

1. Create a Slack webhook:
   - Go to https://api.slack.com/apps
   - Create a new app or use existing
   - Go to **Incoming Webhooks** → **Activate Incoming Webhooks**
   - Click **Add New Webhook to Workspace**
   - Copy the webhook URL

2. Add to GitHub Secrets:
   - Secret name: `SLACK_WEBHOOK_URL`
   - Value: Your Slack webhook URL (e.g., `https://hooks.slack.com/services/XXX/YYY/ZZZ`)

#### Discord Notification

1. Create a Discord webhook:
   - Go to your Discord server
   - Server Settings → Integrations → Webhooks → New Webhook
   - Copy the webhook URL

2. Add to GitHub Secrets:
   - Secret name: `DISCORD_WEBHOOK_URL`
   - Value: Your Discord webhook URL (e.g., `https://discord.com/api/webhooks/XXX/YYY`)

**When to set**: If you want to receive notifications when CI runs complete.

---

### 3. Deployment Secrets (For Container Registry)

Only needed if you want to push Docker images to a registry.

#### Docker Hub

1. Create Docker Hub account (if you don't have one)
2. Add to GitHub Secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password or access token

3. Update `.github/workflows/ci.yml`:
   - Set `if: false` to `if: true` in the deployment steps
   - Uncomment the registry configuration

#### GitHub Container Registry (GHCR)

1. Use automatically provided `GITHUB_TOKEN` (no setup needed)
2. Update workflow to use:
   ```yaml
   registry: ghcr.io
   username: ${{ github.actor }}
   password: ${{ secrets.GITHUB_TOKEN }}
   ```

**When to set**: Only if you want to push Docker images to a registry for deployment.

---

### 4. Sentry DSN (For Error Tracking)

1. Create a Sentry account at https://sentry.io
2. Create a new project
3. Copy the DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)
4. Add to GitHub Secrets:
   - Secret name: `SENTRY_DSN`
   - Value: Your Sentry DSN

**When to set**: Only if you want error tracking in production deployments.

---

## 📝 How to Add Secrets in GitHub

### Step-by-Step:

1. **Go to your repository on GitHub**
2. **Click "Settings"** (in the repository menu)
3. **Click "Secrets and variables"** → **"Actions"** (in the left sidebar)
4. **Click "New repository secret"**
5. **Enter the secret name** (e.g., `S3_ENDPOINT`)
6. **Enter the secret value**
7. **Click "Add secret"**

**Security Note**: Once added, secret values cannot be viewed again. Only updated or deleted.

---

## ✅ Verification

### Test Without Secrets (Default)

1. Push code to GitHub
2. Check **Actions** tab
3. Workflow should run successfully ✅

### Test With Secrets (Optional)

1. Add secrets as described above
2. Push code again
3. Workflow will use the secrets
4. Check notifications (if configured)

---

## 🔒 Security Best Practices

1. **Never commit secrets** to the repository
2. **Use GitHub Secrets** for all sensitive values
3. **Rotate secrets** periodically
4. **Use environment-specific secrets** (if using environments)
5. **Limit secret access** to specific workflows (using environments)

---

## 🎯 For the Hackathon

**Minimum Setup**: No secrets needed! Just push your code.

**Recommended Setup** (for bonus points):

- ✅ Add `SLACK_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL` for notifications
- ✅ Add `SENTRY_DSN` if you've set up Sentry

**Optional Setup**:

- S3 secrets (only if testing with remote S3)
- Docker registry secrets (only if deploying)

---

## 📚 Reference

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Environment Variables in CI](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## ❓ Troubleshooting

### "Secret not found" warning

- **Not a problem!** Secrets are optional. The workflow uses empty strings as defaults.

### Tests failing without S3

- **Expected behavior!** Tests are designed to work with or without S3. Check test logic.

### Notifications not working

- Verify webhook URL is correct
- Check Slack/Discord webhook is active
- Verify secret name matches exactly (case-sensitive)

### Deployment not working

- Ensure secrets are set correctly
- Check workflow file has `if: true` (not `if: false`)
- Verify registry credentials are valid

---

**Summary**: You can run the entire CI pipeline without any secrets! They're all optional enhancements.
