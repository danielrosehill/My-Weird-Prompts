# My Weird Prompts - Backend Pipeline

This is the backend processing pipeline for My Weird Prompts. It receives voice prompts via webhook, processes them through multiple AI agents, and publishes blog posts automatically.

## Architecture Overview

```
Voice Recording (Voicenotes App)
    ↓ webhook POST
Webhook Receiver
    ↓
Phase 1: Transcription & Metadata (Gemini 2.5 Pro)
    ↓
Phase 2: Response Generation (Claude Sonnet 4.5)
    ↓
Phase 3: Audio Assembly (TTS + Concatenation)
    ↓
Phase 4: Banner Image Generation (Stability AI / Replicate)
    ↓
Phase 5: Blog Post Assembly & Publishing (Astro)
```

## Pipeline Phases

### Phase 1: Audio Transcription & Metadata Extraction
- **Agent**: Gemini 2.5 Pro
- **Input**: Raw voice recording
- **Processing**:
  - Transcribe audio
  - Clean up transcript
  - Separate prompt from context
  - Generate metadata (title, tags, excerpt)
- **Output**: JSON with structured data

### Phase 2: AI Response Generation
- **Agent**: Claude Sonnet 4.5
- **Input**: Prompt + context from Phase 1
- **Processing**: Generate comprehensive, blog-ready response
- **Output**: Markdown-formatted response

### Phase 3: Audio Assembly
- **Components**: ffmpeg, OpenAI TTS, voice processing script
- **Input**: Original audio + AI response text
- **Processing**:
  1. Process user's voice (normalize, remove pauses)
  2. Generate TTS for AI response
  3. Concatenate: intro + user voice + AI response + outro
  4. Normalize final audio
  5. Upload to Cloudinary
- **Output**: Podcast episode URL

### Phase 4: Banner Image Generation
- **Agents**: Stability AI, Replicate, or local Stable Diffusion
- **Input**: Title, tags, response summary
- **Processing**: Generate eccentric banner image
- **Output**: Image URL (hosted on Cloudinary)

### Phase 5: Blog Post Assembly & Publishing
- **Framework**: Astro (static site)
- **Input**: All previous phase outputs
- **Processing**:
  - Create markdown file with frontmatter
  - Add audio embed
  - Add banner image
  - Write to Astro content directory
- **Output**: Published blog post

## Setup

### Prerequisites

- Node.js 18+ (nvm recommended)
- Python 3.9+ (for voice processing script)
- ffmpeg (for audio processing)
- Git

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp ../../.env.example ../../.env
nano ../../.env  # Add your API keys
```

### Required Environment Variables

See `../../API-KEYS-CHECKLIST.md` for full details.

**Critical:**
- `ANTHROPIC_API_KEY` - Claude Sonnet 4.5
- `GOOGLE_AI_API_KEY` or `GEMINI_SANDBOX` - Gemini 2.5 Pro
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VOICENOTES_WEBHOOK_SECRET` - Webhook authentication

**Optional (for full features):**
- `OPENAI_API_KEY` - TTS generation
- `STABILITY_API_KEY` or `REPLICATE_API_TOKEN` - Image generation

## Running the Server

### Development
```bash
npm run dev
```

Server runs on `http://localhost:3000` (or `PORT` env var)

### Production
```bash
npm start
```

## API Endpoints

### POST `/webhook/voicenotes`
Receives voice prompts from Voicenotes app.

**Headers:**
- `x-webhook-signature`: HMAC SHA256 signature (optional in dev)

**Body:** multipart/form-data
- `audio`: Audio file (MP3, WAV, M4A, etc.)
- Additional metadata fields from Voicenotes

**Response:**
```json
{
  "success": true,
  "message": "Voice prompt received and queued for processing",
  "id": "voice-prompt-1234567890"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T12:00:00.000Z",
  "service": "my-weird-prompts-webhook-receiver"
}
```

## Testing

### Test with curl

```bash
# Health check
curl http://localhost:3000/health

# Test webhook (with audio file)
curl -X POST http://localhost:3000/webhook/voicenotes \
  -F "audio=@/path/to/test-audio.mp3" \
  -H "x-webhook-signature: test-signature"
```

### Test with sample audio

```bash
# Use the test audio from testing directory
curl -X POST http://localhost:3000/webhook/voicenotes \
  -F "audio=@../../testing/voice-prompt/your-test-file.mp3"
```

## Directory Structure

```
backend/
├── webhook-receiver.js      # Main Express server
├── pipeline/                 # Processing pipeline
│   ├── phase1-transcription.js
│   ├── phase2-response.js
│   ├── phase3-audio.js
│   ├── phase4-images.js
│   └── phase5-publish.js
├── temp-uploads/            # Temporary file storage (gitignored)
└── package.json
```

## Deployment

### Option 1: Vercel Serverless Functions

The webhook receiver can be deployed as a Vercel serverless function.

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Add environment variables: `vercel env add <KEY>`
4. Deploy: `vercel --prod`

### Option 2: Traditional Server

Deploy to any Node.js hosting service (Railway, Render, DigitalOcean, etc.)

```bash
# Set environment variables
export ANTHROPIC_API_KEY=...
export GOOGLE_AI_API_KEY=...
# ... etc

# Run server
npm start
```

### Option 3: Docker (Coming Soon)

Docker support planned for easy containerized deployment.

## Webhook Configuration

### Voicenotes App Setup

1. Open Voicenotes app
2. Go to Settings → Integrations → Webhooks
3. Add webhook URL: `https://your-domain.com/webhook/voicenotes`
4. Add tag filter: "Prompt For Blog" (or your chosen tag)
5. Set webhook secret (same as `VOICENOTES_WEBHOOK_SECRET` env var)

## Error Handling

The pipeline includes error handling at each phase:

- **Phase 1 fails**: Returns 500, logs error, no blog post created
- **Phase 2 fails**: Logs error, may retry or skip
- **Phase 3 fails**: Blog post created without audio
- **Phase 4 fails**: Blog post created with placeholder image
- **Phase 5 fails**: Logs error, no blog post published

## Performance

Average processing time per voice prompt:
- Phase 1 (Transcription): 5-15 seconds
- Phase 2 (Response): 10-30 seconds
- Phase 3 (Audio): 30-60 seconds (depends on TTS and audio length)
- Phase 4 (Image): 10-30 seconds
- Phase 5 (Publishing): 1-2 seconds

**Total:** ~1-3 minutes from voice recording to published blog post

## Cost Estimates

Per blog post (approximate):
- Gemini API: $0.001 - $0.01
- Claude API: $0.01 - $0.05
- OpenAI TTS: $0.10 - $0.50
- Image generation: $0.01 - $0.10
- Cloudinary: $0.001 - $0.01

**Total per post:** $0.12 - $0.77 (varies by length and features)

## Monitoring

Logs are written to stdout/stderr. Recommended monitoring:
- Use PM2 for process management
- Add Sentry for error tracking (optional)
- Monitor webhook endpoint uptime

## Development Tips

### Skip TTS for Faster Testing

Set `OPENAI_API_KEY` to empty to skip audio generation during development:

```bash
# In .env
OPENAI_API_KEY=
```

Blog posts will still be created, just without audio companions.

### Skip Image Generation

Similarly, skip image generation by not setting image API keys. Placeholder images will be used instead.

### Manual Phase Testing

You can test individual phases:

```javascript
import { processPhase1 } from './pipeline/phase1-transcription.js';

const result = await processPhase1({
  audioFilePath: '/path/to/audio.mp3',
  audioFileName: 'test.mp3',
  audioMimeType: 'audio/mpeg',
  audioSize: 12345
});

console.log(result);
```

## Troubleshooting

### Webhook not receiving requests
- Check firewall settings
- Verify webhook URL is publicly accessible
- Check Voicenotes app webhook configuration
- Verify webhook secret matches

### Transcription fails
- Check `GOOGLE_AI_API_KEY` is valid
- Verify audio file format is supported
- Check API quota limits

### TTS fails
- Check `OPENAI_API_KEY` is valid
- Verify you have available credits
- Check audio length (very long responses may timeout)

### Image generation fails
- Check API keys for image services
- Verify you have available credits
- System will fallback to placeholder images

### Blog post not appearing
- Check Astro content directory path
- Verify file was written: `ls -la ../frontend/src/content/blog/`
- Restart Astro dev server to pick up new content

## Contributing

This is part of the My Weird Prompts open source project. Contributions welcome!

## License

ISC License - See LICENSE file for details

---

**Questions?** Open an issue at [github.com/danielrosehill/My-Weird-Prompts](https://github.com/danielrosehill/My-Weird-Prompts)
