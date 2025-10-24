# API Keys Checklist for My Weird Prompts

## What You Need to Gather

### ✅ Already Configured on System
- **GEMINI_SANDBOX** - Found in environment (can use for Gemini API)

### 🔑 Need to Add to `.env` File

#### Critical (Must Have for MVP)
- [ ] **ANTHROPIC_API_KEY** - Claude Sonnet 4.5 for response generation
  - Get from: https://console.anthropic.com/
  - Check if you have one: `printenv | grep ANTHROPIC`

- [ ] **GOOGLE_AI_API_KEY** (or use GEMINI_SANDBOX)
  - Get from: https://ai.google.dev/
  - Note: You already have GEMINI_SANDBOX, we can test if that works

- [ ] **CLOUDINARY_CLOUD_NAME**
- [ ] **CLOUDINARY_API_KEY**
- [ ] **CLOUDINARY_API_SECRET**
  - Get from: https://cloudinary.com/ (free tier)
  - Needed for: Audio and image hosting

- [ ] **VOICENOTES_WEBHOOK_SECRET**
  - Generate with: `openssl rand -hex 32`
  - This is just a random string you create

#### Important (Can Add Later)
- [ ] **OPENAI_API_KEY** - TTS generation (or use alternative like ElevenLabs)
  - Get from: https://platform.openai.com/

- [ ] **STABILITY_API_KEY** or **REPLICATE_API_TOKEN** - Image generation
  - Stability: https://platform.stability.ai/
  - Replicate: https://replicate.com/

---

## Quick Setup Commands

```bash
# Navigate to project
cd /home/daniel/repos/github/My-Weird-Prompts

# Copy example .env file
cp .env.example .env

# Generate webhook secret
echo "Generated webhook secret:"
openssl rand -hex 32

# Open .env for editing
nano .env
```

---

## Where to Store Them

### Local Development (RIGHT NOW)
→ Add to `/home/daniel/repos/github/My-Weird-Prompts/.env`

### Production Deployment (LATER)
→ Add to Vercel project environment variables via web UI or CLI

### GitHub Secrets (NOT NEEDED)
→ We're not using GitHub Actions, so skip this

---

## What I'll Do While You Gather Keys

While you're fishing out API keys, I can:
1. Set up the basic Astro frontend structure
2. Create the webhook receiver scaffolding
3. Build the agent pipeline structure (with placeholder API keys)
4. Create the blog post templates
5. Set up the development environment

Then once you have keys, we can test the full pipeline end-to-end.

**Sound good?** Let me know when you want me to proceed with setup, or if you want to add keys to `.env` first!
