# Audio Queue System

Simple folder-based queue for processing voice prompts into blog posts.

## Quick Start

1. **Drop your voice recording** (MP3, WAV, M4A, etc.) into `audio-queue/incoming/`
2. **Run the processor**:
   ```bash
   node process-queue.js
   ```
3. **Wait for completion** - your blog post will be published automatically!

## Directory Structure

```
audio-queue/
├── incoming/     👈 Drop audio files here
├── processing/   ⚙️  Currently being processed
├── processed/    ✅ Successfully completed
└── failed/       ❌ Processing failures (with error logs)
```

## Usage

### Process Queue Once

Process all files in the incoming directory once and exit:

```bash
node process-queue.js
```

### Watch Mode (Auto-process)

Continuously watch for new files and process them automatically:

```bash
node process-queue.js --watch
```

Press `Ctrl+C` to stop watching.

## Supported Audio Formats

- MP3 (`.mp3`)
- WAV (`.wav`)
- M4A (`.m4a`)
- OGG (`.ogg`)
- WebM (`.webm`)
- FLAC (`.flac`)

## Processing Pipeline

When you drop an audio file into `incoming/`, it goes through these phases:

1. **Phase 1: Transcription** - Gemini Pro 2.5 transcribes and extracts metadata
2. **Phase 2: Response** - Claude Sonnet 4.5 generates AI response
3. **Phase 3: Audio Assembly** - Creates podcast episode with TTS
4. **Phase 4: Banner Image** - Generates cover image
5. **Phase 5: Publishing** - Creates and saves blog post

## Output

After successful processing:

- ✅ Blog post created in `code/frontend/src/content/blog/`
- ✅ Audio episode saved to `code/frontend/public/audio/`
- ✅ Original audio moved to `processed/`

## Error Handling

If processing fails:

- ❌ Audio file moved to `failed/`
- 📄 Error log created (`.log` file with details)
- Check the log file to see which phase failed and why

## Tips

- **Speak clearly**: Better transcription = better blog post
- **Include context**: Mention background info in your voice prompt
- **Be specific**: Clear questions get better AI responses
- **Check failures**: Review error logs in `failed/` directory

## Security

This queue system is:
- ✅ Local-only (no webhooks, no external services)
- ✅ Manual trigger (you control when processing happens)
- ✅ Simple folder watching (no complex authentication needed)

Perfect for MVP testing before implementing webhook authentication!

## Troubleshooting

**"Queue is empty"**
- Make sure audio file is in `incoming/` directory
- Check that file has a supported audio extension

**"Phase 1 failed"**
- Check that `GEMINI_API_KEY` is set in `.env`
- Verify audio file is not corrupted

**"Phase 2 failed"**
- Check that `ANTHROPIC_API_KEY` is set in `.env`
- Verify you have API credits remaining

**"Phase 3 skipped"**
- TTS generation requires API keys
- Blog post will still be created, just without audio

**"Phase 4 skipped"**
- Image generation requires API configuration
- Blog post will still be created, just without banner image

## Next Steps

Once this queue system is working reliably, you can:
- Re-enable the webhook implementation for true automation
- Add proper authentication to the webhook
- Deploy the webhook receiver to a server
- Configure Voicenotes app to POST to your webhook

For now, enjoy the simplicity of dropping files in a folder! 🎉
