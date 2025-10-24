# Deployment Guide - My Weird Prompts

## Overview

This project uses a **periodic deployment strategy** to avoid triggering endless Vercel builds:

1. Voice prompts are processed and blog posts are created locally (no immediate git commit)
2. Once per hour, a cron job checks for new content
3. If new content exists, it commits and pushes to GitHub
4. GitHub push triggers Vercel deployment automatically

## Architecture

### Backend (Webhook Receiver)
- Runs locally on your machine
- Receives voice prompts from Voicenotes app
- Processes through 5-phase pipeline
- Creates blog posts and images (stored locally, NOT committed immediately)

### Frontend (Astro Static Site)
- Deployed to Vercel
- Automatically rebuilds when changes are pushed to GitHub
- Serves blog posts, images, and audio files

### Periodic Deployment Script
- Location: `/deploy-periodic.sh`
- Runs: Every hour (via cron)
- Function: Commits new content and pushes to GitHub

## Setup Instructions

### 1. Vercel Deployment

1. **Push this repository to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Initial commit for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - **Root Directory**: Set to `code/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Configure Build Settings**:
   Vercel should auto-detect Astro. If not, manually set:
   - Framework Preset: `Astro`
   - Node Version: `18.x` or higher

4. **Deploy**:
   - Click "Deploy"
   - Wait for initial build to complete
   - Note your Vercel URL (e.g., `my-weird-prompts.vercel.app`)

5. **Update Site URL**:
   Edit `code/frontend/astro.config.mjs` and update the `site` field with your actual Vercel URL:
   ```javascript
   site: 'https://your-actual-url.vercel.app',
   ```

### 2. Webhook Receiver (Backend)

Keep the webhook receiver running locally:

```bash
cd code/backend
node webhook-receiver.js
```

**Recommended**: Run as a systemd service for automatic restart:

```bash
# Create service file
sudo nano /etc/systemd/system/my-weird-prompts-webhook.service
```

```ini
[Unit]
Description=My Weird Prompts Webhook Receiver
After=network.target

[Service]
Type=simple
User=daniel
WorkingDirectory=/home/daniel/repos/github/My-Weird-Prompts/code/backend
ExecStart=/usr/bin/node webhook-receiver.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable my-weird-prompts-webhook
sudo systemctl start my-weird-prompts-webhook
sudo systemctl status my-weird-prompts-webhook
```

### 3. Periodic Deployment (Already Configured)

The cron job is already set up to run hourly:

```bash
# View current cron jobs
crontab -l

# The deployment runs at minute 0 of every hour
# Logs are saved to: deploy.log
```

**View deployment logs**:
```bash
tail -f ~/repos/github/My-Weird-Prompts/deploy.log
```

**Test manual deployment**:
```bash
cd ~/repos/github/My-Weird-Prompts
./deploy-periodic.sh
```

## Deployment Flow

```
1. Voice Prompt → Voicenotes App
2. Webhook → Local Backend (webhook-receiver.js)
3. Pipeline Processing:
   - Phase 1: Gemini transcription
   - Phase 2: Claude response
   - Phase 3: Gemini TTS (audio)
   - Phase 4: Replicate (banner image)
   - Phase 5: Create blog post file
4. Files saved locally (NOT committed)
5. [Wait for hourly cron]
6. Cron runs deploy-periodic.sh
7. Script commits + pushes to GitHub
8. GitHub triggers Vercel deployment
9. Vercel builds and deploys static site
```

## Customization

### Change Deployment Frequency

Edit crontab to change from hourly:

```bash
crontab -e
```

**Examples**:
- Every 30 minutes: `*/30 * * * *`
- Every 2 hours: `0 */2 * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 3 AM: `0 3 * * *`

### Manual Deployment

To manually trigger a deployment anytime:

```bash
cd ~/repos/github/My-Weird-Prompts
./deploy-periodic.sh
```

## Monitoring

### Check if posts are queued for deployment:
```bash
cd ~/repos/github/My-Weird-Prompts
git status
```

### Check deployment logs:
```bash
tail -50 ~/repos/github/My-Weird-Prompts/deploy.log
```

### Check webhook receiver logs:
```bash
sudo journalctl -u my-weird-prompts-webhook -f
```

### Check Vercel deployment status:
- Visit your Vercel dashboard
- View deployment logs and build status

## Troubleshooting

### Deployments not triggering:
1. Check cron is running: `sudo systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Check deploy.log for errors
4. Manually run deploy script to test

### Vercel build failing:
1. Check Vercel dashboard for build logs
2. Ensure `code/frontend` is set as root directory
3. Verify Node.js version compatibility
4. Check for missing dependencies

### Images not showing:
1. Verify images are in `code/frontend/public/images/banners/`
2. Check image paths in blog post frontmatter
3. Ensure images were committed and pushed

## Notes

- **Auto-commit is disabled** (`AUTO_COMMIT=false` in `.env`)
- Blog posts are created immediately but deployed periodically
- You can always manually deploy anytime with `./deploy-periodic.sh`
- Vercel will only rebuild when changes are pushed to GitHub
- Each deployment includes all pending blog posts (batched)
