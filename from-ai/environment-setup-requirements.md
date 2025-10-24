# Environment Setup Requirements for My Weird Prompts

**Generated**: 2025-10-24
**Purpose**: API keys and environment variables needed to run the project

---

## Quick Reference: What You Need

### Critical for MVP (Phase 1-2)

#### 1. Anthropic API Key
- **Variable**: `ANTHROPIC_API_KEY`
- **Purpose**: Claude Sonnet 4.5 for generating blog post responses
- **Get from**: https://console.anthropic.com/
- **Check if you have**: `printenv | grep ANTHROPIC`

#### 2. Google AI / Gemini API Key
- **Variable**: `GOOGLE_AI_API_KEY`
- **Purpose**: Gemini 2.5 Pro for audio transcription and metadata extraction
- **Get from**: https://ai.google.dev/
- **Note**: You already have `GEMINI_SANDBOX` env var - test if this works first
- **Check if you have**: `printenv | grep GEMINI`

#### 3. Cloudinary Credentials (3 values)
- **Variables**:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **Purpose**: Host audio files and generated banner images
- **Get from**: https://cloudinary.com/ (free tier available)
- **Why needed**: Stores processed voice prompts and final podcast audio

#### 4. Voicenotes Webhook Secret
- **Variable**: `VOICENOTES_WEBHOOK_SECRET`
- **Purpose**: Secure the webhook endpoint from unauthorized requests
- **Generate**: `openssl rand -hex 32`
- **Note**: This is just a random string you create and configure in both the webhook receiver and Voicenotes app

---

### Optional (Can Add Later)

#### 5. OpenAI API Key (Phase 3 - Audio)
- **Variable**: `OPENAI_API_KEY`
- **Purpose**: TTS generation for AI response audio
- **Get from**: https://platform.openai.com/
- **Alternative options**: ElevenLabs, Google Cloud TTS, Coqui TTS (local)
- **Check if you have**: `printenv | grep OPENAI`

#### 6. Image Generation API (Phase 4 - Visuals)
- **Options**:
  - Stability AI: `STABILITY_API_KEY` from https://platform.stability.ai/
  - Replicate: `REPLICATE_API_TOKEN` from https://replicate.com/
  - Together AI: `TOGETHER_API_KEY` from https://api.together.xyz/
- **Purpose**: Generate banner images for blog posts
- **Alternative**: Use Stable Diffusion locally via ComfyUI (you have this installed)

---

## Setup Instructions

### Step 1: Create .env File

```bash
cd /home/daniel/repos/github/My-Weird-Prompts
cp .env.example .env
```

### Step 2: Generate Webhook Secret

```bash
openssl rand -hex 32
# Copy the output to your .env file as VOICENOTES_WEBHOOK_SECRET
```

### Step 3: Check Existing Keys

```bash
# Check what's already configured on your system
printenv | grep -E "(ANTHROPIC|GEMINI|GOOGLE_AI|OPENAI|CLOUDINARY)"
```

### Step 4: Add Keys to .env

Edit the `.env` file and fill in your actual API keys:

```bash
nano .env
```

Minimum required for testing:
```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...  # or reuse GEMINI_SANDBOX value
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123
VOICENOTES_WEBHOOK_SECRET=<output from openssl command>
```

### Step 5: Verify .env is Ignored

```bash
# Confirm .env won't be committed to git
git check-ignore .env
# Should return: .env
```

---

## Where to Store Secrets

### ✅ Local Development
→ **`.env` file** in project root (gitignored)

### ✅ Production (Vercel)
→ **Vercel Environment Variables** via dashboard or CLI:
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add GOOGLE_AI_API_KEY
# ... etc
```

### ❌ GitHub Secrets
→ **NOT needed** (we're not using GitHub Actions)

---

## System Check: What You Already Have

Based on environment scan:
- ✅ `GEMINI_SANDBOX` - Already configured (can potentially use for Gemini API)
- 🔍 Need to check: Anthropic, OpenAI, Cloudinary

---

## Priority Order

### Start Building Now (Placeholders OK)
1. Set up project structure
2. Create webhook scaffolding
3. Build agent pipeline code

### Before First Test
1. ✅ ANTHROPIC_API_KEY
2. ✅ GOOGLE_AI_API_KEY (or GEMINI_SANDBOX)
3. ✅ VOICENOTES_WEBHOOK_SECRET
4. ✅ CLOUDINARY_* credentials

### Before Full Production
5. ⚠️ OPENAI_API_KEY (TTS)
6. ⚠️ Image generation API

---

## Cost Estimates

- **Anthropic Claude API**: ~$0.015 per 1K output tokens (very cheap for blog posts)
- **Google Gemini API**: Free tier available, then ~$0.00025 per 1K tokens
- **Cloudinary**: Free tier = 25GB storage, 25GB bandwidth/month (plenty for start)
- **OpenAI TTS**: ~$0.015 per 1K characters (about $0.30 per 20min podcast episode)
- **Stability AI**: ~$0.01 per image
- **Total per post**: Roughly $0.05-$0.50 depending on length and features

---

## Next Steps

1. **Gather API keys** (see checklist above)
2. **Create `.env` file** with actual values
3. **Test webhook receiver** with dummy Voicenotes payload
4. **Process first voice prompt** end-to-end
5. **Deploy to Vercel** when ready

---

## Files Reference

- **`.env.example`** - Template with all variables
- **`SETUP.md`** - Detailed setup guide
- **`API-KEYS-CHECKLIST.md`** - Quick checklist

---

## Alternative: Local-First Approach

If you want to minimize API costs initially, consider:
- **Gemini**: Use existing GEMINI_SANDBOX (free/cheap)
- **Claude**: Continue using (worth the cost for quality)
- **TTS**: Use local Coqui TTS or piper instead of OpenAI
- **Images**: Use local Stable Diffusion via ComfyUI
- **Storage**: Start with local filesystem, migrate to Cloudinary later

This approach means more setup complexity but lower ongoing costs.

---

**Status**: Ready to build once you've added keys to `.env` file
**Blockers**: None - can build with placeholders and test later
**Recommendation**: Add at least Anthropic + Gemini keys to test core pipeline
