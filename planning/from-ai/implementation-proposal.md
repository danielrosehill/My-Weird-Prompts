# Implementation Proposal: My Weird Prompts
**Version**: 1.0
**Date**: 2025-10-24
**Status**: Proposed

## Executive Summary

This document outlines a phased implementation approach for the My Weird Prompts project - an automated pipeline that transforms voice-captured AI prompts into multimodal blog posts with audio companions and visual elements.

**Key Innovation**: Hybrid podcast format combining the user's real voice (asking questions) with AI-generated responses, creating authentic and engaging content.

## Architecture Decision: Headless vs. Monolithic

### Recommended Architecture: **Hybrid Astro with Optional Headless CMS**

**Phase 1 (MVP)**: Astro Static Site with File-Based Content
- Content stored as markdown/MDX files in repository
- Frontmatter for metadata
- Git as the content management system
- Fastest path to deployment

**Phase 2 (Optional Enhancement)**: Add Headless CMS Layer
- Migrate to DatoCMS or Contentful only if manual curation becomes frequent
- Keep Astro frontend unchanged
- API-driven content delivery

### Why Not Fully Headless Initially?

**Reasons to Skip Headless CMS for MVP**:
1. **Automation First**: Pipeline generates content programmatically - no admin UI needed initially
2. **Version Control Benefits**: Git history tracks all content changes
3. **Simplicity**: Fewer moving parts, easier debugging
4. **Cost**: No CMS subscription fees during testing/validation phase
5. **Flexibility**: Easier to experiment with content structure

**When to Add Headless CMS**:
- Human curation becomes time-intensive
- Need non-technical collaborators to edit content
- Want advanced content scheduling/workflow features
- Require multi-channel content distribution

### Recommended Decision: Start Without Headless CMS

Build the entire pipeline writing directly to markdown files in the Astro repository. Re-evaluate after 50-100 posts are published.

## System Architecture

### High-Level Data Flow

```
Voice Recording (Voicenotes App)
    ↓ [Webhook Trigger: "Prompt For Blog" tag]
Processing Orchestrator (Python/TypeScript)
    ↓
Phase 1: Audio Capture & Transcription Agent (Gemini 2.5 Pro)
    ↓ [JSON output + original audio file]
Phase 2: Response Generation Agent (Claude Sonnet 4.5)
    ↓ [Structured response]
Phase 3: Audio Assembly Agent (TTS Pipeline)
    ↓ [Podcast episode MP3]
Phase 4: Image Generation Agent (AI Image Model)
    ↓ [Banner image]
Phase 5: Content Assembly & Publication
    ↓ [Markdown file + assets]
Astro Static Site Build (Vercel)
    ↓
Published Blog Post with Audio Embed
```

### Technology Stack Details

**Frontend**
- **Framework**: Astro 4.x
- **Styling**: Tailwind CSS (for rapid development)
- **Audio Player**: Custom web component or library (howler.js, plyr.js)
- **Search**: Pagefind or Fuse.js (client-side) or Algolia (if scaling)
- **Deployment**: Vercel (automatic deploys on git push)

**Backend/Orchestration**
- **Language**: Python (recommended) or TypeScript
- **Orchestration**: Custom Python script or workflow engine
- **API Integrations**: OpenRouter, Anthropic API, Google AI API
- **Storage**: Local filesystem (dev), Cloudinary (audio), Vercel Blob/S3 (images)

**AI Models**
- **Transcription/Cleanup**: Gemini 2.5 Pro (cost-effective, excellent multimodal)
- **Response Generation**: Claude Sonnet 4.5 via OpenRouter or direct API
- **Audio Generation**: ElevenLabs or Google Cloud TTS (character voices)
- **Image Generation**: Stable Diffusion (local), DALL-E 3, or Flux

**Audio Processing**
- **Normalization**: FFmpeg (CLI) or pydub (Python)
- **Format**: MP3 (web-optimized, ~128-192 kbps)
- **Hosting**: Cloudinary (CDN delivery, streaming support)

**Development Tools**
- **Version Control**: Git + GitHub
- **Environment**: Python venv or conda
- **Secrets Management**: Environment variables (.env file, gitignored)
- **Testing**: pytest (Python), local Astro dev server

## Phase 1: Audio Capture & Transcription

### Implementation Details

**Trigger Setup**
- Configure Voicenotes webhook to POST to processing endpoint
- Webhook payload includes:
  - Audio file (binary or URL)
  - Timestamp
  - Tag metadata
  - Voicenotes note ID

**Processing Endpoint**
- Simple HTTP endpoint (Flask/FastAPI or webhook receiver)
- Receives webhook POST from Voicenotes
- Downloads audio file to temporary storage
- Triggers transcription agent

**Transcription Agent (Gemini 2.5 Pro)**

**Input**:
- Audio file (MP3, M4A, WAV)
- System prompt with instructions

**System Prompt Template**:
```
You are processing a voice-recorded prompt for a blog project called "My Weird Prompts."

The user has recorded a question or prompt they want answered. The recording may contain:
1. The actual prompt/question (what they want you to answer)
2. Contextual information (background, previous knowledge, situational details)

Your task:
1. Transcribe the audio accurately
2. Identify and separate the PROMPT from the CONTEXT
3. Clean up the transcript (remove filler words, fix grammar while preserving meaning)
4. Generate metadata for the blog post
5. Generate a 2-3 sentence synopsis suitable for a blog introduction

Output as JSON with this exact structure:
{
  "prompt": "The cleaned-up question/task the user wants answered",
  "context": "Any background information or contextual details provided",
  "title": "Engaging blog post title (8-12 words)",
  "tags": ["tag1", "tag2", "tag3"],
  "excerpt": "Brief preview sentence for the post (140 chars max)",
  "prompt_summary": "2-3 sentence synopsis introducing the blog post topic",
  "audio_metadata": {
    "duration_seconds": 0,
    "format": "mp3",
    "sample_rate": 44100
  }
}

Guidelines:
- Title should be engaging and descriptive
- Tags should be relevant categories (e.g., "technology", "philosophy", "AI", "productivity")
- Excerpt should entice readers without spoiling the answer
- Preserve the user's intent while making text readable
```

**Output**:
- JSON file saved to processing directory
- Original audio file saved with unique identifier
- Audio metadata extracted using FFmpeg or pydub

**File Naming Convention**:
```
{YYYYMMDD}-{unique-slug}/
  ├── source-audio.mp3          # Original voice recording
  ├── metadata.json             # Gemini output
  └── processing-status.json    # Tracks pipeline progress
```

**Error Handling**:
- Retry logic for API failures (exponential backoff)
- Audio validation (check format, duration, file size)
- Fallback: save raw audio + metadata for manual processing

### Storage Strategy

**Audio Files**:
- Original voice recordings: Local storage initially
- Migration path: Upload to Cloudinary after validation
- Keep local copy until post is published successfully

**Metadata**:
- JSON files in processing directory
- One directory per blog post (organized by date + slug)

## Phase 2: Response Generation

### Implementation Details

**Response Generation Agent (Claude Sonnet 4.5)**

**Input**:
- `metadata.json` from Phase 1
- Project context (blog purpose, audience, style)
- Optional: MCP integrations for enhanced capabilities

**System Prompt Template**:
```
You are contributing to "My Weird Prompts," a blog that answers interesting questions and prompts voiced by the author throughout daily life.

You will receive:
1. A cleaned-up PROMPT (the question/task to address)
2. CONTEXT (background information that may inform your response)
3. A PROMPT_SUMMARY (the introduction that will appear on the blog)

Your task: Provide a comprehensive, engaging, and accurate response to the prompt.

Guidelines:
- Write in a conversational but informative tone
- Use markdown formatting (headers, lists, code blocks as appropriate)
- Include subheadings (H2/H3) to structure longer responses
- Be thorough but concise - aim for 500-1500 words
- Cite sources or acknowledge uncertainty when appropriate
- Make it interesting and useful for a public audience
- Assume the reader has the context from the prompt summary

Output format:
- Pure markdown text
- Start directly with content (no meta-commentary)
- Use ## for section headers, ### for subsections
- Include code examples in fenced code blocks when relevant

Remember: This will become public blog content, so be accurate, ethical, and engaging.
```

**Enhanced Capabilities (Optional MCP Integrations)**:
- **Web Search MCP**: Fetch current information for time-sensitive topics
- **Database MCP**: Query structured data if relevant
- **Code Execution MCP**: Run code examples for technical prompts

**Output**:
- `response.md` file saved to post processing directory
- Markdown formatted content ready for blog integration

**Quality Assurance**:
- Length validation (minimum 300 words, maximum 3000 words)
- Markdown syntax validation
- Profanity/content filter (optional)
- Save generation metadata (model version, timestamp, token count)

## Phase 3: Audio Assembly Pipeline

### Implementation Details

This is the most complex phase, involving multiple audio processing steps.

**Audio Components Required**:

1. **Intro Jingle** (pre-recorded, reusable)
   - 5-10 second musical intro
   - Project branding/identity
   - Stored as: `assets/audio/podcast-intro.mp3`

2. **User's Voice Prompt** (from Phase 1)
   - Original voice recording
   - Needs normalization and cleanup

3. **Transition Audio** (optional)
   - Brief segue: "Here's what I found..." or "Let me explain..."
   - Can be TTS-generated or pre-recorded
   - Stored as: `assets/audio/transition-*.mp3`

4. **AI Response Audio** (TTS-generated)
   - Converted from `response.md` (Phase 2 output)
   - Character voice with personality

5. **Outro/Disclaimer** (pre-recorded, reusable)
   - "This content is AI-generated..."
   - Stored as: `assets/audio/podcast-outro.mp3`

**Audio Assembly Agent Workflow**:

```python
# Pseudocode for audio assembly

def assemble_podcast_episode(post_dir):
    # 1. Load audio components
    intro = load_audio("assets/audio/podcast-intro.mp3")
    user_voice = load_audio(f"{post_dir}/source-audio.mp3")
    outro = load_audio("assets/audio/podcast-outro.mp3")

    # 2. Normalize user's voice recording
    user_voice_normalized = normalize_audio(user_voice, target_db=-20)
    user_voice_cleaned = apply_noise_reduction(user_voice_normalized)

    # 3. Generate TTS for AI response
    response_text = read_file(f"{post_dir}/response.md")
    response_ssml = convert_markdown_to_ssml(response_text)
    ai_response_audio = generate_tts(
        text=response_ssml,
        voice="en-US-Studio-M",  # Character voice
        speaking_rate=1.05,
        pitch=0
    )

    # 4. Normalize TTS audio
    ai_response_normalized = normalize_audio(ai_response_audio, target_db=-20)

    # 5. Add optional transition
    transition = generate_tts(
        text="Here's what I found...",
        voice="en-US-Studio-M",
        speaking_rate=1.0
    )

    # 6. Concatenate all segments
    final_audio = concatenate_audio([
        intro,
        user_voice_cleaned,
        transition,
        ai_response_normalized,
        outro
    ])

    # 7. Final normalization pass
    final_audio_normalized = normalize_audio(final_audio, target_db=-16)

    # 8. Export
    export_audio(
        audio=final_audio_normalized,
        output_path=f"{post_dir}/podcast-episode.mp3",
        format="mp3",
        bitrate="192k"
    )

    # 9. Generate metadata
    duration = get_duration(final_audio_normalized)
    save_metadata(f"{post_dir}/audio-metadata.json", {
        "duration_seconds": duration,
        "format": "mp3",
        "bitrate": "192kbps",
        "sample_rate": 44100,
        "segments": [
            {"type": "intro", "duration": get_duration(intro)},
            {"type": "user_prompt", "duration": get_duration(user_voice_cleaned)},
            {"type": "transition", "duration": get_duration(transition)},
            {"type": "ai_response", "duration": get_duration(ai_response_normalized)},
            {"type": "outro", "duration": get_duration(outro)}
        ]
    })
```

**Technical Implementation Details**:

**TTS Generation**:
- **Service Options**:
  - ElevenLabs (high quality, character voices, expensive)
  - Google Cloud TTS (Studio voices, good quality, affordable)
  - Azure TTS (good quality, competitive pricing)
  - OpenAI TTS (simple, fast, good quality)

- **SSML Conversion**:
  ```python
  def markdown_to_ssml(markdown_text):
      # Convert markdown headers to pauses
      # Convert **bold** to <emphasis>
      # Convert code blocks to <say-as interpret-as="verbatim">
      # Add natural pauses at paragraph breaks
      # Return SSML string
  ```

**Audio Normalization Strategy**:
- **Target loudness**: -16 LUFS (podcast standard)
- **Peak limiting**: -1 dB true peak
- **Tools**: FFmpeg with loudnorm filter or pydub

**FFmpeg Command Example**:
```bash
ffmpeg -i input.mp3 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,highpass=f=80,lowpass=f=10000" \
  -ar 44100 -b:a 192k output.mp3
```

**Concatenation Strategy**:
- Use FFmpeg concat demuxer (for pre-encoded segments)
- Or use pydub AudioSegment (easier, Python-native)

**Error Handling**:
- TTS quota limits: implement retry with exponential backoff
- Audio file corruption: validate before concatenation
- Length validation: ensure total duration is reasonable (5-30 minutes)

**Upload to Cloudinary**:
```python
def upload_to_cloudinary(audio_file_path, post_slug):
    import cloudinary
    import cloudinary.uploader

    result = cloudinary.uploader.upload(
        audio_file_path,
        resource_type="video",  # Use "video" for audio files
        folder="my-weird-prompts/episodes",
        public_id=post_slug,
        format="mp3",
        quality="auto:good"
    )

    return result['secure_url']  # CDN URL for embedding
```

## Phase 4: Image Generation

### Implementation Details

**Image Generation Agent**

**Goal**: Create visually interesting banner images that match the "weird prompts" aesthetic

**Approach Options**:

1. **Stable Diffusion (Local/ROCm)**
   - Use Daniel's AMD GPU (RX 7700 XT with ROCm)
   - Free, fast, unlimited generation
   - Requires model setup and prompt engineering

2. **DALL-E 3 (OpenAI)**
   - High quality, simple API
   - Cost: ~$0.04-0.08 per image
   - Good prompt adherence

3. **Flux (via Replicate or local)**
   - Excellent quality, trending model
   - Cost: ~$0.03 per image (Replicate)
   - Can run locally on GPU

**Recommended**: Stable Diffusion (local) for MVP, with option to use DALL-E 3 for special posts

**Image Generation Workflow**:

```python
def generate_banner_image(post_metadata):
    # 1. Generate image prompt from blog title/tags
    image_prompt = generate_image_prompt(
        title=post_metadata['title'],
        tags=post_metadata['tags'],
        style="eccentric, colorful, abstract, digital art, high quality"
    )

    # 2. Generate image
    if USE_LOCAL_SD:
        image = generate_sd_image(
            prompt=image_prompt,
            model="stable-diffusion-xl",
            width=1200,
            height=630,  # Open Graph optimal dimensions
            steps=30,
            cfg_scale=7.5
        )
    else:
        image = generate_dalle_image(
            prompt=image_prompt,
            size="1792x1024",
            quality="hd"
        )

    # 3. Save image
    output_path = f"{post_dir}/banner.png"
    save_image(image, output_path)

    # 4. Optimize for web
    optimize_image(output_path, max_width=1200, quality=85)

    return output_path
```

**Image Prompt Generation (Claude)**:
```python
# Use Claude to convert blog title/topic into image prompt
def generate_image_prompt(title, tags, style):
    prompt = f"""
    Generate a detailed image generation prompt for an AI art model.

    Blog post title: {title}
    Tags: {', '.join(tags)}
    Style requirements: {style}

    Create a vivid, detailed prompt that will generate an interesting banner image
    for this blog post. The image should be abstract, colorful, and visually engaging.

    Output only the image generation prompt, nothing else.
    """

    return call_claude_api(prompt)
```

**Image Storage**:
- Save to post directory initially: `{post_dir}/banner.png`
- Copy to Astro public directory: `public/images/banners/{slug}.png`
- Or upload to CDN (Cloudinary, Vercel Blob) for better performance

**Optimization**:
- Resize to 1200px width (maintain aspect ratio)
- Compress to ~100-200KB (85% JPEG quality or optimized PNG)
- Generate WebP version for modern browsers

## Phase 5: Content Assembly & Publication

### Implementation Details

**Goal**: Create markdown file in Astro content collection with all assets

**Astro Content Collection Structure**:

```
src/content/prompts/
  ├── 2025-10-24-first-weird-prompt.md
  ├── 2025-10-25-another-interesting-question.md
  └── ...

public/audio/
  ├── first-weird-prompt.mp3  (or Cloudinary URL in frontmatter)
  └── ...

public/images/banners/
  ├── first-weird-prompt.png
  └── ...
```

**Markdown File Template**:

```markdown
---
title: "{{title}}"
publishDate: "{{date}}"
excerpt: "{{excerpt}}"
tags: [{{tags}}]
audioUrl: "{{cloudinary_url_or_local_path}}"
audioDuration: {{duration_seconds}}
bannerImage: "/images/banners/{{slug}}.png"
bannerAlt: "{{generated_alt_text}}"
prompt: "{{original_prompt}}"
aiDisclaimer: true
---

## {{prompt_summary}}

{{response_content}}

---

*This content is AI-generated. The prompt was voice-recorded and processed through an automated pipeline. Listen to the audio version above to hear the original question.*
```

**Content Assembly Script**:

```python
def assemble_blog_post(post_dir):
    # 1. Load all metadata
    metadata = json.load(f"{post_dir}/metadata.json")
    response = read_file(f"{post_dir}/response.md")
    audio_meta = json.load(f"{post_dir}/audio-metadata.json")

    # 2. Upload audio to Cloudinary
    audio_url = upload_to_cloudinary(
        f"{post_dir}/podcast-episode.mp3",
        metadata['slug']
    )

    # 3. Generate slug from title
    slug = slugify(metadata['title'])
    date_prefix = datetime.now().strftime("%Y-%m-%d")
    filename = f"{date_prefix}-{slug}.md"

    # 4. Build frontmatter
    frontmatter = {
        "title": metadata['title'],
        "publishDate": datetime.now().isoformat(),
        "excerpt": metadata['excerpt'],
        "tags": metadata['tags'],
        "audioUrl": audio_url,
        "audioDuration": audio_meta['duration_seconds'],
        "bannerImage": f"/images/banners/{slug}.png",
        "bannerAlt": f"Banner image for {metadata['title']}",
        "prompt": metadata['prompt'],
        "aiDisclaimer": True
    }

    # 5. Build full markdown content
    content = build_markdown(frontmatter, metadata['prompt_summary'], response)

    # 6. Write to Astro content collection
    output_path = f"src/content/prompts/{filename}"
    write_file(output_path, content)

    # 7. Copy banner image to public directory
    copy_file(
        f"{post_dir}/banner.png",
        f"public/images/banners/{slug}.png"
    )

    # 8. Commit to git
    git_add_and_commit(
        files=[output_path, f"public/images/banners/{slug}.png"],
        message=f"Add blog post: {metadata['title']}"
    )

    # 9. Push to trigger Vercel deployment
    git_push()

    return {
        "status": "published",
        "url": f"https://myweirdprompts.com/prompts/{slug}",
        "audio_url": audio_url
    }
```

**Astro Site Configuration**:

**Content Collection Schema** (`src/content/config.ts`):
```typescript
import { defineCollection, z } from 'astro:content';

const promptsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publishDate: z.string(),
    excerpt: z.string(),
    tags: z.array(z.string()),
    audioUrl: z.string().url(),
    audioDuration: z.number(),
    bannerImage: z.string(),
    bannerAlt: z.string(),
    prompt: z.string(),
    aiDisclaimer: z.boolean().default(true),
  }),
});

export const collections = {
  prompts: promptsCollection,
};
```

**Automatic Deployment**:
- Vercel watches the `main` branch
- Any push triggers automatic build and deploy
- Build includes:
  - Astro static site generation
  - Image optimization
  - RSS feed generation (optional)

**Post-Publication Validation**:
- Check that Vercel deployment succeeded
- Validate that audio embeds work
- Verify images load correctly
- Test responsive design

## Orchestration & Automation

### Pipeline Orchestrator

**Recommended Implementation**: Single Python script with modular functions

**Project Structure**:
```
my-weird-prompts/
├── pipeline/
│   ├── __init__.py
│   ├── orchestrator.py          # Main pipeline controller
│   ├── agents/
│   │   ├── transcription.py     # Phase 1
│   │   ├── response_gen.py      # Phase 2
│   │   ├── audio_assembly.py    # Phase 3
│   │   ├── image_gen.py         # Phase 4
│   │   └── publisher.py         # Phase 5
│   ├── utils/
│   │   ├── audio_utils.py
│   │   ├── file_utils.py
│   │   └── api_clients.py
│   └── config.py                # Configuration
├── processing/                  # Temp storage for pipeline
│   └── {YYYYMMDD-slug}/
├── assets/
│   └── audio/
│       ├── podcast-intro.mp3
│       └── podcast-outro.mp3
├── src/                         # Astro site
│   ├── content/prompts/
│   └── ...
├── public/
│   ├── images/banners/
│   └── audio/                   # Optional local storage
├── .env                         # API keys (gitignored)
└── requirements.txt
```

**Main Orchestrator** (`pipeline/orchestrator.py`):

```python
import asyncio
from agents import (
    transcription,
    response_gen,
    audio_assembly,
    image_gen,
    publisher
)

async def process_voice_note(webhook_payload):
    """
    Main pipeline orchestrator
    Processes a voice note through all 5 phases
    """

    # Setup
    post_dir = create_post_directory(webhook_payload)

    try:
        # Phase 1: Transcription & Metadata
        print("Phase 1: Transcribing and extracting metadata...")
        metadata = await transcription.process_audio(
            audio_url=webhook_payload['audio_url'],
            output_dir=post_dir
        )

        # Phase 2: Generate Response
        print("Phase 2: Generating AI response...")
        response = await response_gen.generate_response(
            prompt=metadata['prompt'],
            context=metadata['context'],
            output_dir=post_dir
        )

        # Phase 3 & 4: Parallel execution (audio + image)
        print("Phase 3 & 4: Assembling audio and generating image...")
        audio_url, banner_path = await asyncio.gather(
            audio_assembly.create_podcast_episode(post_dir, metadata, response),
            image_gen.generate_banner(metadata)
        )

        # Phase 5: Assemble and Publish
        print("Phase 5: Publishing blog post...")
        publication_result = await publisher.publish_post(
            post_dir=post_dir,
            metadata=metadata,
            response=response,
            audio_url=audio_url,
            banner_path=banner_path
        )

        print(f"✅ Published: {publication_result['url']}")
        return publication_result

    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        # Log error, save state for manual recovery
        save_error_state(post_dir, e)
        raise

# Webhook endpoint (FastAPI or Flask)
@app.post("/webhook/voicenotes")
async def voicenotes_webhook(payload: dict):
    # Validate webhook signature
    # Extract audio URL and metadata
    # Trigger pipeline
    result = await process_voice_note(payload)
    return {"status": "success", "post_url": result['url']}
```

**Environment Configuration** (`.env`):
```env
# API Keys
ANTHROPIC_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
ELEVENLABS_API_KEY=...
CLOUDINARY_URL=cloudinary://...

# Webhook Security
VOICENOTES_WEBHOOK_SECRET=...

# Deployment
VERCEL_TOKEN=...  # Optional for programmatic deployment
GITHUB_TOKEN=...  # For automated commits

# Model Configuration
TRANSCRIPTION_MODEL=gemini-2.5-pro
RESPONSE_MODEL=anthropic/claude-sonnet-4.5
TTS_PROVIDER=elevenlabs
IMAGE_MODEL=stable-diffusion-xl

# Feature Flags
USE_LOCAL_SD=true
UPLOAD_TO_CLOUDINARY=true
AUTO_PUBLISH=true
```

**Dependency Management** (`requirements.txt`):
```
anthropic>=0.40.0
openai>=1.58.0
google-generativeai>=0.8.3
elevenlabs>=1.10.0
cloudinary>=1.41.0
pydub>=0.25.1
requests>=2.32.0
python-slugify>=8.0.4
pyyaml>=6.0.2
python-dotenv>=1.0.1
fastapi>=0.115.0
uvicorn>=0.32.0
```

### Webhook Receiver Setup

**Option 1: Local Development with ngrok**
```bash
# Terminal 1: Start pipeline server
cd ~/repos/github/My-Weird-Prompts
python pipeline/server.py

# Terminal 2: Expose with ngrok
ngrok http 8000
# Use ngrok URL in Voicenotes webhook config
```

**Option 2: Cloud Deployment (Vercel Serverless Function)**
- Deploy webhook endpoint as serverless function
- Trigger pipeline processing
- Store processing state in temporary storage

**Option 3: Self-Hosted (Docker on VPS/Home Server)**
- Dockerize pipeline application
- Deploy to home server or VPS
- Use systemd for automatic restart

## Phased Rollout Plan

### Phase 1: MVP (Weeks 1-2)

**Goal**: Get basic pipeline working end-to-end

**Deliverables**:
1. ✅ Webhook receiver accepts Voicenotes payload
2. ✅ Phase 1: Transcription agent works (Gemini 2.5 Pro)
3. ✅ Phase 2: Response generation works (Claude Sonnet 4.5)
4. ✅ Phase 5: Manual content assembly (skip audio/image for now)
5. ✅ Astro site renders blog posts correctly
6. ✅ Deployed to Vercel

**Validation**: One voice note → published blog post (text only)

### Phase 2: Audio Integration (Week 3)

**Goal**: Add podcast audio companion

**Deliverables**:
1. ✅ Phase 3: Audio assembly pipeline works
2. ✅ Pre-record intro/outro jingles
3. ✅ TTS integration functional
4. ✅ Audio normalization working
5. ✅ Cloudinary upload integration
6. ✅ Audio player embedded in blog posts

**Validation**: Blog posts include playable audio

### Phase 3: Visual Enhancement (Week 4)

**Goal**: Add banner images

**Deliverables**:
1. ✅ Phase 4: Image generation agent works
2. ✅ Stable Diffusion setup (local GPU) or API integration
3. ✅ Image optimization pipeline
4. ✅ Banner images display in posts

**Validation**: Blog posts have attractive visuals

### Phase 4: Polish & Features (Week 5+)

**Goal**: Improve UX and add discovery features

**Deliverables**:
1. ✅ Search functionality (Pagefind or Fuse.js)
2. ✅ Tag browsing and filtering
3. ✅ RSS feed generation
4. ✅ Social sharing meta tags (Open Graph, Twitter Cards)
5. ✅ Analytics integration (Vercel Analytics or Plausible)
6. ✅ Performance optimization (image lazy loading, etc.)

### Phase 5: Scaling & Curation (Ongoing)

**Goal**: Handle growing content library

**Tasks**:
- Monitor costs (API usage, Cloudinary storage)
- Human curation workflow (edit/delete posts)
- Consider headless CMS if manual editing becomes frequent
- Explore video generation for select posts

## Cost Estimation

### MVP Phase (First 100 Posts)

**AI API Costs**:
- Gemini 2.5 Pro (transcription): ~$0.02/post × 100 = $2
- Claude Sonnet 4.5 (response): ~$0.15/post × 100 = $15
- ElevenLabs TTS: ~$0.30/post × 100 = $30 (or $0 if using Google TTS)
- Image generation: ~$0.05/post × 100 = $5 (or $0 if local SD)

**Infrastructure Costs**:
- Cloudinary (audio hosting): Free tier ~$0 (25 GB storage, 25 GB bandwidth)
- Vercel (hosting): Free tier ~$0
- Domain: ~$12/year

**Total MVP Cost**: ~$50-70 for first 100 posts (or ~$20 with free TTS + local images)

### Scaling Costs (1000 Posts/Year)

- AI APIs: ~$500-700/year
- Cloudinary: ~$50-100/year (Pro plan if needed)
- Vercel: ~$0-20/year (likely stays in free tier)

**Estimated Total**: ~$600-850/year

### Cost Optimization Strategies

1. **Use local models where possible**: Stable Diffusion (images), Ollama (if response quality acceptable)
2. **Batch processing**: Process multiple posts together to reduce overhead
3. **Smart caching**: Cache common TTS phrases (intro, outro)
4. **Cloudinary optimization**: Aggressive compression, lazy loading
5. **Self-hosting option**: Host audio on home NAS (10.0.0.50) if Cloudinary becomes expensive

## Testing Strategy

### Unit Tests
- Audio processing functions (normalization, concatenation)
- Markdown generation
- API client wrappers
- Utility functions (slugify, file operations)

### Integration Tests
- End-to-end pipeline with test audio file
- Webhook receiver with mock payload
- Content assembly and file generation
- Deployment validation (staging environment)

### Manual Testing Checklist
- [ ] Voice note → webhook trigger works
- [ ] Transcription quality is acceptable
- [ ] Response quality is high
- [ ] Audio playback works on desktop/mobile
- [ ] Images load correctly
- [ ] Mobile responsiveness
- [ ] Search functionality works
- [ ] Social sharing meta tags work

## Monitoring & Maintenance

### Logging Strategy
- Pipeline execution logs (timestamps, durations)
- API call logs (models used, token counts, costs)
- Error logs (failures, retries, manual interventions needed)

### Monitoring Dashboards
- Processing queue status
- Success/failure rates
- API cost tracking
- Cloudinary usage/bandwidth
- Vercel deployment history

### Alerting
- Pipeline failures (email/SMS notification)
- API quota approaching limits
- Cloudinary storage/bandwidth nearing cap
- Deployment failures

### Backup Strategy
- Git tracks all content (built-in backup)
- Cloudinary has versioning enabled
- Periodic export of all content to Wasabi object storage
- Database/metadata export (if using headless CMS later)

## Open Questions & Future Considerations

### Architecture
- [ ] **Headless CMS timing**: Re-evaluate after 100 posts - is manual curation frequent enough to justify CMS?
- [ ] **Monorepo vs. multi-repo**: Keep content + code together or split?

### Content
- [ ] **Taxonomy**: How many tags? Hierarchical or flat?
- [ ] **Content moderation**: Automated filters for inappropriate content?
- [ ] **Privacy**: How to handle accidentally recorded sensitive info?

### Features
- [ ] **Comments**: Add commenting system (Giscus, Utterances)?
- [ ] **Newsletter**: Email subscription for new posts (Buttondown, ConvertKit)?
- [ ] **Podcast feed**: Create proper RSS podcast feed for podcast apps?
- [ ] **Video**: Timeline for text-to-video feature?

### Performance
- [ ] **Search**: Client-side (Pagefind) vs. hosted (Algolia)? Cost vs. performance tradeoff?
- [ ] **CDN**: Is Vercel's edge network sufficient or need additional CDN (Cloudflare)?

### Scaling
- [ ] **Processing queue**: Need queue system (Bull, Redis) if volume increases?
- [ ] **Parallel processing**: Run multiple pipeline instances simultaneously?
- [ ] **Cost monitoring**: Set up automated alerts when costs exceed thresholds?

## Success Metrics

### Technical Metrics
- **Pipeline reliability**: >95% success rate (voice note → published post)
- **Processing time**: <10 minutes per post (target: <5 minutes)
- **Uptime**: >99% (Vercel handles this)
- **Error rate**: <5% requiring manual intervention

### Content Metrics
- **Publication cadence**: Sustainable rate (aim for 2-5 posts/week initially)
- **Content quality**: Subjective - are responses useful and interesting?
- **Audio quality**: Listenable podcast episodes (good normalization, clear speech)

### User Metrics (Future)
- **Traffic**: Pageviews, unique visitors
- **Engagement**: Time on page, bounce rate
- **Discovery**: Search usage, tag navigation patterns
- **Sharing**: Social shares, backlinks

## Next Steps

### Immediate Actions (This Week)
1. ✅ Set up Astro project with Tailwind CSS
2. ✅ Configure Vercel deployment
3. ✅ Create pipeline project structure
4. ✅ Set up Python environment with dependencies
5. ✅ Configure API keys in `.env`
6. ✅ Test Voicenotes webhook (mock payload)

### Week 1 Development
1. Implement Phase 1: Transcription agent
2. Implement Phase 2: Response generation agent
3. Implement Phase 5: Content assembly (text only)
4. Create Astro templates for blog posts
5. Test end-to-end: voice note → published post

### Week 2 Development
1. Implement Phase 3: Audio assembly pipeline
2. Record intro/outro jingles
3. Integrate Cloudinary
4. Add audio player to Astro templates
5. Test podcast episode generation

### Week 3 Development
1. Implement Phase 4: Image generation
2. Set up Stable Diffusion or API integration
3. Test banner image generation and embedding
4. Polish Astro site design

### Week 4+
1. Add search functionality
2. Implement tag system
3. Add RSS feed
4. Analytics integration
5. Human curation workflow

---

## Appendix A: Alternative Architectures Considered

### Option 1: Fully Headless (DatoCMS + Astro)
**Pros**: Easy manual curation, API-driven, scalable
**Cons**: Additional cost, complexity, unnecessary for automation-first workflow
**Decision**: Deferred to Phase 5+ (if needed)

### Option 2: Traditional CMS (WordPress, Ghost)
**Pros**: Mature ecosystem, plugins, easy setup
**Cons**: Less flexible, heavier, not ideal for programmatic content creation
**Decision**: Rejected - not aligned with automation goals

### Option 3: Custom Backend (Next.js + Database)
**Pros**: Full control, API for everything, scalable
**Cons**: Significant development overhead, maintenance burden
**Decision**: Rejected - over-engineered for current needs

### Chosen Architecture: Astro + File-Based Content
**Rationale**: Simplest path to automation, git-based version control, easy to migrate later if needed

## Appendix B: Audio Technical Specifications

**Podcast Episode Format**:
- Container: MP3
- Bitrate: 192 kbps (high quality, reasonable file size)
- Sample Rate: 44.1 kHz
- Channels: Stereo (or mono if appropriate)
- Loudness: -16 LUFS (podcast standard)
- True Peak: -1 dB

**Voice Recording Requirements**:
- Minimum: 16 kHz sample rate, mono
- Preferred: 44.1 kHz, mono or stereo
- Format: MP3, M4A, WAV (converted to MP3 for delivery)

**TTS Settings** (ElevenLabs recommended):
- Voice: Decide on character (e.g., "Bella", "Adam", or custom voice clone)
- Stability: 0.5-0.7 (more expressive)
- Clarity: 0.7-0.8 (clear articulation)
- Style exaggeration: 0.3-0.5 (slightly animated)

## Appendix C: Sample Voicenotes Webhook Payload

```json
{
  "id": "note_abc123xyz",
  "created_at": "2025-10-24T14:30:00Z",
  "audio_url": "https://voicenotes.com/recordings/abc123.m4a",
  "duration_seconds": 45,
  "tags": ["Prompt For Blog"],
  "transcript": null,
  "user_id": "user_daniel",
  "metadata": {
    "app_version": "3.2.1",
    "device": "Android",
    "location": null
  }
}
```

## Appendix D: Astro Site File Structure

```
src/
├── components/
│   ├── AudioPlayer.astro       # Custom audio embed
│   ├── BlogPost.astro          # Post layout
│   ├── Header.astro
│   ├── Footer.astro
│   ├── SearchBar.astro
│   └── TagCloud.astro
├── content/
│   ├── config.ts               # Content collection schema
│   └── prompts/                # Blog posts (markdown)
│       ├── 2025-10-24-first-prompt.md
│       └── ...
├── layouts/
│   ├── BaseLayout.astro        # Base HTML structure
│   └── PostLayout.astro        # Blog post wrapper
├── pages/
│   ├── index.astro             # Homepage
│   ├── prompts/
│   │   └── [slug].astro        # Dynamic post pages
│   ├── tags/
│   │   └── [tag].astro         # Tag archive pages
│   ├── about.astro
│   └── 404.astro
└── styles/
    └── global.css              # Tailwind + custom CSS

public/
├── images/
│   └── banners/                # Generated banner images
├── audio/                      # Optional local audio storage
├── favicon.ico
└── robots.txt
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**Status**: Ready for Implementation
**Next Review**: After MVP completion (Phase 1)
