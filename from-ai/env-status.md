# Environment Variables Status

**Last updated**: 2025-10-24

## ✅ Configured

These API keys are already set in your `.env` file:

- ✅ **ANTHROPIC_API_KEY** - Claude Sonnet 4.5
- ✅ **GEMINI_API_KEY** - Gemini 2.5 Pro (updated variable name)
- ✅ **OPENAI_API_KEY** - OpenAI TTS
- ✅ **VOICENOTES_WEBHOOK_SECRET** - Pre-generated secure secret

## 🔧 Still Need to Add

Fill in these values in your `.env` file:

### Cloudinary (Required for media hosting)

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Get from**: https://cloudinary.com/
- Sign up for free tier (25GB storage, 25GB bandwidth/month)
- Go to Dashboard
- Copy: Cloud Name, API Key, API Secret

### Image Generation (Optional - can skip initially)

```env
STABILITY_API_KEY=
```

**Or use Replicate**:
```env
REPLICATE_API_TOKEN=
```

**Note**: If neither is set, blog posts will use placeholder images

---

## What You Can Do Now

### With Current Keys (Anthropic + Gemini + OpenAI)

✅ Test Phase 1 (transcription) - works!
✅ Test Phase 2 (response generation) - works!
✅ Test Phase 3 (audio assembly) - works!
❌ Phase 3 will fail at upload (needs Cloudinary)
❌ Phase 4 will use placeholder images (no image gen API)

### After Adding Cloudinary

✅ Full pipeline will work end-to-end
✅ Audio files will be hosted properly
✅ Images will be hosted properly
✅ Blog posts will have proper media URLs

---

## Testing Commands

### Test without Cloudinary (local testing only)

You can test the first 2-3 phases locally, they'll just fail at the upload step:

```bash
cd code/backend
npm run dev

# In another terminal, test webhook:
curl -X POST http://localhost:3000/webhook/voicenotes \
  -F "audio=@../../testing/voice-prompt/rtsp-or-rtc.mp3"

# Watch the logs - Phase 1 & 2 should complete successfully
```

### Test with Cloudinary (full pipeline)

Once you add Cloudinary credentials:

```bash
# Same as above, but all 5 phases will complete
# Blog post will be created with hosted audio and images
```

---

## Quick Cloudinary Setup

1. Go to https://cloudinary.com/users/register_free
2. Create free account
3. Verify email
4. Go to Dashboard (https://console.cloudinary.com/)
5. Copy these values to `.env`:
   - Cloud name (top left)
   - API Key (under "Account Details")
   - API Secret (click "Show" next to API Key)

Free tier is plenty for testing and initial use!

---

## Optional: Image Generation

If you want AI-generated banner images instead of placeholders:

**Option 1: Stability AI**
- Sign up: https://platform.stability.ai/
- Get API key
- Add to `.env` as `STABILITY_API_KEY`
- Cost: ~$0.01 per image

**Option 2: Replicate**
- Sign up: https://replicate.com/
- Get API token
- Add to `.env` as `REPLICATE_API_TOKEN`
- Cost: ~$0.01 per image

**Option 3: Local Stable Diffusion**
- Use your existing ComfyUI setup
- TODO: Integration not yet implemented
- Will add this in future update

---

## Summary

**Ready to test**: Phases 1-2 (transcription + response generation)
**Need Cloudinary for**: Full pipeline including media hosting
**Optional**: Image generation API for custom banners

**Next step**: Add Cloudinary credentials and test full pipeline!
