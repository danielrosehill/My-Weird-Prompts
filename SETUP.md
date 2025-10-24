# My Weird Prompts - Setup Guide

## Environment Variables Configuration

This guide explains which API keys you need and where to configure them.

### Required API Keys & Services

#### 1. **Anthropic API Key** (HIGH PRIORITY)
- **Purpose**: Claude Sonnet 4.5 for generating blog post responses (Phase 2)
- **Get it from**: https://console.anthropic.com/
- **Where to add**:
  - Local: `.env` file as `ANTHROPIC_API_KEY`
  - Vercel: Add as environment variable in project settings
  - GitHub: Not needed as repo secret (processing happens server-side)

#### 2. **Google AI API Key** (HIGH PRIORITY)
- **Purpose**: Gemini 2.5 Pro for audio transcription and metadata extraction (Phase 1)
- **Get it from**: https://ai.google.dev/
- **Where to add**:
  - Local: `.env` file as `GOOGLE_AI_API_KEY`
  - Vercel: Add as environment variable
  - GitHub: Not needed as repo secret

#### 3. **Cloudinary Account** (HIGH PRIORITY)
- **Purpose**: Host audio files and generated images
- **Get it from**: https://cloudinary.com/ (free tier available)
- **Where to add**:
  - Local: `.env` file as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Vercel: Add all three as environment variables
  - GitHub: Not needed as repo secret

#### 4. **OpenAI API Key** (MEDIUM PRIORITY)
- **Purpose**: TTS generation for AI response audio (Phase 3)
- **Get it from**: https://platform.openai.com/
- **Alternative**: ElevenLabs, Google Cloud TTS, or local TTS
- **Where to add**:
  - Local: `.env` file as `OPENAI_API_KEY`
  - Vercel: Add as environment variable
  - GitHub: Not needed as repo secret

#### 5. **Image Generation API** (MEDIUM PRIORITY)
- **Purpose**: Generate banner images for blog posts (Phase 4)
- **Options**:
  - **Stability AI**: https://platform.stability.ai/ → `STABILITY_API_KEY`
  - **Replicate**: https://replicate.com/ → `REPLICATE_API_TOKEN`
  - **Together AI**: https://api.together.xyz/ → `TOGETHER_API_KEY`
- **Where to add**:
  - Local: `.env` file
  - Vercel: Add as environment variable
  - GitHub: Not needed as repo secret

#### 6. **Voicenotes Webhook Secret** (HIGH PRIORITY)
- **Purpose**: Secure webhook endpoint authentication
- **Generate**: Run `openssl rand -hex 32` to create a random secret
- **Where to add**:
  - Local: `.env` file as `VOICENOTES_WEBHOOK_SECRET`
  - Vercel: Add as environment variable
  - Voicenotes app: Use the same secret when configuring webhook
  - GitHub: Not needed as repo secret

### Optional Services

#### 7. **Headless CMS** (OPTIONAL - Can skip initially)
- **Purpose**: Manage blog post content (alternative to direct file-based approach)
- **Options**:
  - **DatoCMS**: https://www.datocms.com/
  - **Contentful**: https://www.contentful.com/
- **Recommendation**: Skip this initially, use file-based content storage

#### 8. **Analytics** (OPTIONAL)
- **Google Analytics**: https://analytics.google.com/
- **Plausible**: https://plausible.io/ (privacy-focused alternative)

---

## Setup Steps

### Step 1: Check What You Already Have

Run these commands to check if you already have API keys configured:

```bash
# Check for Anthropic API key
printenv | grep ANTHROPIC

# Check for Google AI API key
printenv | grep GOOGLE_AI

# Check for OpenAI API key
printenv | grep OPENAI

# Check for Cloudinary
printenv | grep CLOUDINARY
```

If any are already set globally, you can reference them or copy them to the local `.env` file.

### Step 2: Create Local .env File

```bash
cd /home/daniel/repos/github/My-Weird-Prompts
cp .env.example .env
nano .env  # Fill in your actual API keys
```

### Step 3: Generate Webhook Secret

```bash
# Generate a secure random webhook secret
openssl rand -hex 32

# Add this to your .env file as VOICENOTES_WEBHOOK_SECRET
```

### Step 4: Verify .env is Gitignored

The `.env` file should already be gitignored by your global gitignore, but let's make sure:

```bash
# Check if .env is ignored
git check-ignore .env

# If it returns ".env", you're good
# If not, add it to .gitignore
```

### Step 5: Set Up Cloudinary

1. Create account at https://cloudinary.com/
2. Go to Dashboard
3. Copy:
   - Cloud Name
   - API Key
   - API Secret
4. Add to `.env` file

### Step 6: Configure Vercel Environment Variables (Later)

Once you're ready to deploy:

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Add environment variables:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   vercel env add GOOGLE_AI_API_KEY
   vercel env add CLOUDINARY_CLOUD_NAME
   vercel env add CLOUDINARY_API_KEY
   vercel env add CLOUDINARY_API_SECRET
   vercel env add VOICENOTES_WEBHOOK_SECRET
   # ... add others as needed
   ```

---

## Security Notes

### ✅ **DO Store in .env**
- All API keys and secrets
- Local development configuration

### ✅ **DO Add to Vercel Environment Variables**
- All API keys needed for production
- Mark sensitive values as "sensitive" in Vercel UI

### ❌ **DON'T Store in GitHub Secrets**
- GitHub secrets are for GitHub Actions workflows
- We're not using GitHub Actions for this project (using Vercel)
- Exception: Only if you add CI/CD workflows later

### ❌ **DON'T Commit to Git**
- Never commit `.env` file
- Never commit API keys in code
- Use `.env.example` for documentation only

---

## Priority Order for Setup

### Phase 1 (MVP - Voice Processing)
1. ✅ **ANTHROPIC_API_KEY** - Response generation
2. ✅ **GOOGLE_AI_API_KEY** - Transcription
3. ✅ **VOICENOTES_WEBHOOK_SECRET** - Webhook security
4. ✅ **CLOUDINARY_*** - Audio/image hosting

### Phase 2 (Audio Enhancement)
5. ⚠️ **OPENAI_API_KEY** - TTS generation (or alternative)

### Phase 3 (Visual Enhancement)
6. ⚠️ **Image generation API** - Banner images

### Phase 4 (Optional Polish)
7. 📊 Analytics (if desired)
8. 🗄️ CMS integration (if you outgrow file-based approach)

---

## Testing Your Setup

Once you've added keys to `.env`, test them:

```bash
# Test that .env is loaded
cd /home/daniel/repos/github/My-Weird-Prompts
cat .env | grep -v "^#" | grep -v "^$"

# Should show your actual API keys (keep this terminal private!)
```

---

## What's Next?

After configuring your environment variables:
1. I'll set up the Astro frontend structure
2. Create the webhook receiver for Voicenotes
3. Build the agent pipeline (Phase 1-4)
4. Test the end-to-end flow with a sample voice prompt

Let me know when you've got the essential API keys ready!
