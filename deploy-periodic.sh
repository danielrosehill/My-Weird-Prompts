#!/bin/bash

#
# Periodic Deployment Script for My Weird Prompts
#
# This script runs periodically (e.g., hourly via cron) to:
# 1. Check for new blog posts and images
# 2. Commit them to git
# 3. Push to GitHub (triggering Vercel deployment)
#

set -e

# Navigate to repository root
cd "$(dirname "$0")"

# Check if there are any changes to commit
if [[ -z $(git status --porcelain) ]]; then
  echo "$(date): No changes to deploy"
  exit 0
fi

echo "$(date): Changes detected, preparing deployment..."

# Count new blog posts
NEW_POSTS=$(git status --porcelain code/frontend/src/content/blog/ | wc -l)
NEW_IMAGES=$(git status --porcelain code/frontend/public/images/banners/ 2>/dev/null | wc -l || echo 0)

echo "New blog posts: $NEW_POSTS"
echo "New images: $NEW_IMAGES"

# Stage all changes in frontend content and images
git add code/frontend/src/content/blog/
git add code/frontend/public/images/banners/ 2>/dev/null || true

# Create commit message
COMMIT_MSG="Periodic deployment: $NEW_POSTS new post(s), $NEW_IMAGES new image(s)

Automated deployment at $(date -u +"%Y-%m-%d %H:%M:%S UTC")

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit changes
git commit -m "$COMMIT_MSG"

# Push to GitHub (triggers Vercel deployment)
echo "Pushing to GitHub..."
git push origin main

echo "$(date): Deployment triggered successfully!"
