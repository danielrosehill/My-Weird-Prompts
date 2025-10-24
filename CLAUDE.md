# CLAUDE.md - My Weird Prompts Project Specification

## Project Overview

**My Weird Prompts** is an experimental blog/digital garden that transforms voice-captured AI prompts and their responses into a multimodal content platform. The project addresses the gap in AI tooling for storing and sharing LLM outputs by creating an automated pipeline from voice capture to published, multimedia blog posts.

### Core Concept

Random questions and prompts voiced throughout daily life � Automated processing through AI agents � Published blog posts with audio companions and visual elements � Public knowledge base for reference and sharing

## Project Goals

1. **Output Preservation**: Create a systematic way to capture, organize, and preserve interesting AI outputs
2. **Multimodal Publishing**: Transform text-based AI responses into rich multimedia content (text, audio, images)
3. **Public Knowledge Sharing**: Build a searchable, public-facing digital garden for AI-generated insights
4. **Automation**: Minimize manual intervention between voice capture and publication
5. **Open Source Transparency**: Document the entire workflow and make it publicly accessible

## Architecture Overview

### Technology Stack

**Frontend**
- **Framework**: Astro (static site generator)
- **Deployment**: Vercel
- **Content Management**: DatoCMS or Contentful (headless CMS) - if required
- **Media Hosting**: Cloudinary (for audio binaries)

**Backend/Processing Pipeline**
- **Orchestration**: Code-based workflows (transitioning from N8N)
- **Voice Capture**: Voicenotes app (Android) with webhook integration
- **AI Processing**: Multi-agent system with specialized responsibilities
- **Audio Processing**: TTS with normalization pipeline
- **Image Generation**: AI-powered banner creation

**AI Models**
- **Primary Response Generation**: Claude Sonnet 4.5
- **Audio Processing**: Gemini Pro 2.5 (transcription + cleanup)
- **Image Generation**: AI image generation models (TBD)

### Repository Structure

This repository serves dual purposes (transitional architecture):
1. Workflow code and automation scripts
2. Content deployment source

**Note**: Future iteration may migrate to headless architecture with separate content and code repositories.

## Workflow Pipeline

### Phase 1: Voice Capture & Initial Processing

**Input**: Voice recording via Voicenotes app

**Trigger**: Tag "Prompt For Blog" (or similar) creates webhook to processing pipeline

**Critical Requirements**:
1. **Store original audio file**: Save the raw voice recording for use in podcast episode
2. **Extract audio metadata**: Duration, format, quality specifications
3. **Process transcript**: Clean up and structure the spoken content

**Processing Agent**: Gemini Pro 2.5
- Combined workload: transcription + prompt cleanup + metadata generation
- Output: JSON schema with structured data

**JSON Schema Output**:
```json
{
  "prompt": "cleaned up version of user's prompt",
  "context": "contextual information provided by user",
  "prompt_summary": "synopsis for blog template",
  "title": "generated blog post title",
  "tags": ["category1", "category2"],
  "excerpt": "brief excerpt for preview",
  "response": "AI-generated response to the prompt",
  "audio_file_path": "path/to/original/voice/recording.mp3",
  "audio_duration": "duration in seconds"
}
```

**Key Design Decision**: Separation of `prompt` and `context` fields
- Voice prompting allows fluid capture of contextual information
- Context provides "memory" or background information for the model
- Prompt contains the actual question/task for the AI to address

**Audio Capture Strategy**:
- Original voice recording must be preserved and accessible for Phase 3
- Audio should be stored with unique identifier tied to the blog post/episode
- Consider storage location: local filesystem, cloud storage (Cloudinary), or temporary processing directory

### Phase 2: Response Generation

**Agent**: High-reasoning model (Claude Sonnet 4.5 preferred)

**Input**:
- Cleaned prompt from Phase 1
- Context data from Phase 1
- Project context (purpose, audience, style)

**Output**: Comprehensive response to the prompt
- May include MCP integrations for enhanced capabilities
- Response formatted for blog publication

### Phase 3: Audio Generation (Podcast Companion)

**Agent**: Audio Assembly Pipeline Agent

**Concept**: Generate podcast-style audio companion for each blog post
- Previous implementation: "Just Ask AI Podcast" (fully AI-generated)
- New implementation: "My Weird Prompts Podcast" (hybrid: real voice prompt + AI response)

**Key Innovation**: Include the original voice recording of the prompt in the final podcast episode for authenticity and personal touch

**Audio Components**:
1. **Jingle/Intro**: Pre-recorded intro music and project introduction
2. **User's Voice Prompt**: Original audio from Voicenotes (Daniel's actual voice asking the question)
3. **AI Response Audio**: TTS-generated response with character voice and personality
4. **Outro**: Disclaimer about AI-generated content

**Processing Steps**:
1. Capture and store original voice recording from Voicenotes webhook
2. Clean/normalize user's voice audio (noise reduction, volume leveling)
3. Generate speech markup language (SSML) for AI response
4. Apply character voice and personality to AI host response
5. Generate TTS audio for AI response
6. Concatenate audio segments in order:
   - Jingle/intro
   - User's voice prompt (original recording)
   - Transition/bridge (optional: "Here's what I found..." etc.)
   - AI response (TTS)
   - Outro/disclaimer
7. Normalize entire concatenated audio for consistent playback quality
8. Export final episode audio

**Technical Considerations**:
- Audio format consistency (all segments should be same sample rate, bit depth)
- Volume normalization across segments (user voice vs. TTS vs. jingle)
- Smooth transitions between segments (consider brief fade in/out or transition sounds)
- File size optimization for web delivery

**Metadata Generation**:
- Episode title
- Episode description
- Duration (calculated from final concatenated audio)
- Publish date
- Audio format specifications

**Note**: Not creating an actual podcast feed initially - just embedded audio in blog posts. Future expansion could include proper podcast RSS feed.

### Phase 4: Visual Generation

**Agent**: Image Generation Agent

**Task**: Create banner/cover image for blog post
- Style: Eccentric, visually interesting theme
- Consistent with project "vibe"

**Future Expansion**:
- Body text illustrations
- Inline diagrams
- Captioned images
- Visual explanations

### Phase 5: Content Assembly & Publication

**Programmatic Post Creation**

**Required Elements**:
- Prompt summary (header)
- AI response (main content, with optional subheadings)
- Metadata/metatags
- Category assignment
- Banner image reference
- Audio embed (Cloudinary URL)
- Disclaimer: "AI-generated content"
- Publish date (JavaScript-generated)

**Template Structure**:
```
[Banner Image]

## Prompt Summary
[prompt_summary from Phase 1]

## [Generated Header]
[AI response with optional subheadings]

[Embedded Audio Player]

---
Disclaimer: This content is AI-generated
```

**Deployment Trigger**:
- Automated push to Vercel
- Content appears in CMS (if using headless architecture)

### Phase 6: Human Curation (Manual)

**Post-Publication Tasks** (performed later, as needed):
- Delete low-quality entries
- Rewrite or correct AI responses
- Add or improve subheadings
- Recategorize posts
- Enhance searchability
- Add manual annotations

**Philosophy**: Publish first (with disclaimers), curate later

## Content Privacy & Filtering

**Publication Criteria**:
- Does not contain personal/sensitive information
- Could be useful or interesting to others
- Can be redacted if needed

**Default Stance**: Open source and publish unless there's a reason not to

**Git Strategy**: Use `.gitignore` selectively for sensitive workflow components

## Search & Discovery

**Priority Features**:
- Full-text search across all posts
- Tag-based navigation
- Category browsing
- Temporal navigation (by date)

**Use Cases**:
- Personal reference and recall
- Public discovery and learning
- Sharing specific insights with friends/family

## Future Expansion Ideas

### Near-Term
- Proper podcast RSS feed generation
- Enhanced categorization and taxonomy
- Multi-author support (if collaborators join)
- Analytics and engagement tracking

### Long-Term (Aspirational)
- **Text-to-Video**: Generate mini documentary episodes from content
- Video embedding in blog posts
- Public video channel (YouTube, etc.)
- Full multimodal experience: voice prompt � blog post � podcast � video

**Vision**: A single voice-captured prompt becomes a comprehensive multimedia knowledge artifact

## Technical Considerations

### Agent Architecture Principles

**Lesson Learned**: Don't cram everything into one agent workload

**Current Design**: Multi-agent system with clear responsibilities
- Agent 1: Transcription + cleanup + metadata (Gemini)
- Agent 2: Response generation (Claude)
- Agent 3: Audio generation + metadata (TTS pipeline)
- Agent 4: Image generation
- Agent 5: Content assembly + publication

### Voice Prompt Processing

**Key Insight**: Voice prompting is powerful for fluid context capture

**Template Structure** (for voice prompts):
```
[Prompt Section]
What I want the AI to provide/answer

[Context Section]
Background information
Previous relevant details
Situational context
```

**Why This Matters**: Voice transcripts often mix "the ask" with contextual padding that would be tedious to type. Splitting these helps AI agents parse and respond more effectively.

### Audio Chunking

**Concern**: Chunking audio is harder than it seems
**Current Solution**: Use Voicenotes app to handle chunking automatically
**Alternative**: Build custom voice capture frontend (lower priority due to authentication and chunking complexity)

## Development Approach

### Repository Strategy

**Visibility**: Public repository
- Planning documents included
- Workflow code included
- Open-sourced methodology

**Collaboration**: Extensive AI assistance expected
- Claude Code for workflow development
- AI agents for content generation
- Human curation and oversight

### Iterative Development

**Phase 1**: Get basic pipeline working (voice � text � blog)
**Phase 2**: Add audio generation
**Phase 3**: Add image generation
**Phase 4**: Enhance curation and search
**Phase 5**: Explore video generation (long-term)

### Flexibility

**Expected**: Architecture will evolve
- May migrate to fully headless CMS
- May split content and code repos
- May add new AI modalities as they become available

## Success Criteria

1. **Functional Pipeline**: Voice note � published blog post with minimal manual intervention
2. **Quality Output**: Posts are readable, interesting, and accurate
3. **Searchability**: Can easily find and reference past prompts/responses
4. **Shareability**: Can easily share individual posts with others
5. **Enjoyability**: Content is pleasant to read/consume for public audience
6. **Sustainability**: Workflow is maintainable and financially viable

## Open Questions

- [ ] Exact content assembly mechanism (direct to repo vs. CMS API)
- [ ] Optimal categorization taxonomy
- [ ] Audio storage costs at scale (Cloudinary pricing)
- [ ] Video generation cost/feasibility timeline
- [ ] Custom voice capture frontend (worth it?)
- [ ] Podcast feed generation priority
- [ ] Community engagement features (comments, etc.)

## Project Philosophy

**Lean Into AI**: Use AI extensively for development and content generation

**Transparency**: Be clear about AI involvement in both process and output

**Open Source**: Share the methodology and tools publicly

**Iteration Over Perfection**: Get something working, then improve

**Human Curation**: AI generates, humans curate and refine

**Multimodal Future**: Embrace new AI capabilities as they emerge

---

**Project Start Date**: 2025-10-24
**Primary Developer**: Daniel Rosehill (with extensive AI assistance)
**Repository**: My-Weird-Prompts (public)
**Status**: Planning/Early Development
