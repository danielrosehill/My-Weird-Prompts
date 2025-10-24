# My Weird Prompts - Quick Start Guide

Get up and running in 15 minutes!

## Prerequisites

- Node.js 18+ installed
- Python 3.9+ installed
- ffmpeg installed (`sudo apt install ffmpeg`)
- API keys ready (see below)

## Step 1: Clone & Install (5 min)

```bash
cd /home/daniel/repos/github/My-Weird-Prompts

# Install backend dependencies
cd code/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ../..
```

## Step 2: Configure API Keys (5 min)

```bash
# Copy example env file
cp .env.example .env

# Generate webhook secret
openssl rand -hex 32

# Edit .env and add your keys
nano .env
```

**Minimum required for testing:**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_AI_API_KEY=your-google-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
VOICENOTES_WEBHOOK_SECRET=<paste-generated-secret>
```

**Check what you already have:**
```bash
printenv | grep -E "(ANTHROPIC|GEMINI|OPENAI|CLOUDINARY)"
```

## Step 3: Start Services (2 min)

```bash
# Terminal 1: Start backend webhook receiver
cd code/backend
npm run dev

# Terminal 2: Start Astro frontend
cd code/frontend
npm run dev
```

**Services running:**
- Backend: http://localhost:3000
- Frontend: http://localhost:4321

## Step 4: Test the Pipeline (3 min)

### Option A: Test with curl (simpler)

```bash
# Test health check
curl http://localhost:3000/health

# Test webhook with sample audio
curl -X POST http://localhost:3000/webhook/voicenotes \
  -F "audio=@testing/voice-prompt/your-sample.mp3"

# Watch the backend terminal for processing logs
```

### Option B: Configure Voicenotes app webhook

1. Open Voicenotes app on your phone
2. Go to Settings → Integrations → Webhooks
3. Add webhook:
   - **URL**: `http://your-server-ip:3000/webhook/voicenotes`
   - **Tag filter**: "Prompt For Blog"
   - **Secret**: (paste your `VOICENOTES_WEBHOOK_SECRET`)
4. Record a voice note and tag it "Prompt For Blog"

## Step 5: View Your Blog Post

After processing completes (~1-3 minutes):

```bash
# Check that blog post was created
ls code/frontend/src/content/blog/

# View in browser
open http://localhost:4321/blog
```

## Troubleshooting

### "API key not found"
- Check `.env` file exists in project root
- Verify API keys are valid
- Try: `cat .env | grep -v "^#"`

### "ffmpeg not found"
```bash
sudo apt install ffmpeg
```

### "Webhook signature invalid"
- In development, webhook validation is skipped if no secret is set
- For production, make sure secret matches in both `.env` and Voicenotes app

### "Module not found"
```bash
cd code/backend && npm install
cd ../frontend && npm install
```

### "Port already in use"
```bash
# Change backend port
export PORT=3001

# Change frontend port (in astro.config.mjs)
```

## What Happens When You Send a Voice Prompt?

1. **Webhook receives audio** → Saves to temp-uploads/
2. **Phase 1 (Gemini)** → Transcribes + extracts metadata (~10 sec)
3. **Phase 2 (Claude)** → Generates response (~20 sec)
4. **Phase 3 (OpenAI TTS)** → Creates podcast audio (~40 sec)
5. **Phase 4 (Image Gen)** → Creates banner (~20 sec)
6. **Phase 5 (Astro)** → Publishes blog post (~2 sec)

**Watch the backend terminal** to see progress through each phase!

## Skip Optional Features for Faster Testing

In `.env`, comment out:
```env
# OPENAI_API_KEY=...        # Skips TTS, blog posts still created
# STABILITY_API_KEY=...     # Skips image gen, uses placeholder
```

This reduces processing time to ~30 seconds per post.

## Next Steps

### Development
- Customize blog post template (frontend/src/content/blog/)
- Add custom intro/outro jingles (backend/assets/)
- Adjust voice processing parameters (scripts/process_voice_prompt.py)
- Customize Astro theme (frontend/src/)

### Production
- Deploy backend to Vercel/Railway/Render
- Deploy frontend to Vercel
- Configure custom domain
- Set up analytics
- Enable auto-commit (set `AUTO_COMMIT=true` in .env)

### Advanced
- Add more AI agents for specialized content
- Create RSS podcast feed
- Add video generation (Phase 6)
- Build custom Voicenotes alternative

## Resources

- **Full Documentation**: See `CLAUDE.md` for detailed project spec
- **API Keys Guide**: See `API-KEYS-CHECKLIST.md`
- **Backend README**: See `code/backend/README.md`
- **Setup Guide**: See `SETUP.md`

## Get Help

- **Backend logs**: Check terminal running `npm run dev`
- **Frontend errors**: Check browser console at localhost:4321
- **Pipeline errors**: Look for stack traces in backend terminal
- **File locations**: All temp files in `code/backend/temp-uploads/`

---

**Enjoy creating your digital garden!** 🌱🤖

Every weird question you voice becomes a permanent part of your knowledge base.
