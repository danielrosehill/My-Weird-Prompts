/**
 * Phase 1: Audio Transcription and Metadata Extraction
 *
 * Uses Gemini 2.5 Pro to:
 * 1. Transcribe the voice prompt audio
 * 2. Clean up the transcript (remove filler words, etc.)
 * 3. Separate prompt from context
 * 4. Extract metadata (title, tags, excerpt)
 * 5. Generate prompt summary
 *
 * Input: Audio file path + metadata
 * Output: JSON schema with structured data
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Gemini client
 */
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_SANDBOX;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or GEMINI_SANDBOX environment variable not set');
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Convert audio file to base64 for Gemini API
 */
async function audioFileToBase64(filePath) {
  const audioBuffer = await fs.readFile(filePath);
  return audioBuffer.toString('base64');
}

/**
 * Get audio mime type from file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/x-m4a',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

/**
 * Process Phase 1: Transcription & Metadata Extraction
 *
 * @param {Object} metadata - Metadata from webhook receiver
 * @returns {Object} Structured data with prompt, context, and metadata
 */
export async function processPhase1(metadata) {
  console.log('Phase 1: Starting transcription and metadata extraction');

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Read audio file
    const audioFilePath = metadata.audioFilePath;
    const audioBase64 = await audioFileToBase64(audioFilePath);
    const mimeType = getMimeType(audioFilePath);

    console.log(`Processing audio file: ${audioFilePath}`);
    console.log(`MIME type: ${mimeType}`);

    // Construct prompt for Gemini
    const prompt = `You are processing a voice-recorded prompt for an AI blog called "My Weird Prompts."

The user has recorded a voice prompt that may contain:
1. A question or task for an AI to answer (the "prompt")
2. Contextual background information or "memory" (the "context")
3. Casual speech patterns, filler words, etc.

Your task is to:
1. Transcribe the audio accurately
2. Clean up the transcript (remove excessive filler words like "um", "uh", but keep natural speech flow)
3. Separate the PROMPT (the actual question/task) from the CONTEXT (background info)
4. Generate a catchy blog post title
5. Create a brief prompt summary (1-2 sentences)
6. Suggest 2-4 relevant tags/categories
7. Write a brief excerpt for preview (1 sentence)

IMPORTANT:
- The prompt should be the main question or task the user wants answered
- The context should be any background information, clarifications, or "memory" that helps answer the prompt
- If there's no clear separation, put everything in the prompt field and leave context empty

Return your response as valid JSON with this exact structure:
{
  "transcript": "full cleaned transcript",
  "prompt": "the actual question or task for AI",
  "context": "background information or context (if any)",
  "title": "catchy blog post title",
  "prompt_summary": "brief 1-2 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "excerpt": "brief preview excerpt"
}

Make sure to return ONLY valid JSON, no additional text or markdown formatting.`;

    // Call Gemini API with audio
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Gemini response received:', text.substring(0, 200) + '...');

    // Parse JSON response
    let parsedData;
    try {
      // Clean up response (remove markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      throw new Error(`Invalid JSON response from Gemini: ${parseError.message}`);
    }

    // Validate required fields
    const requiredFields = ['transcript', 'prompt', 'title', 'prompt_summary', 'tags', 'excerpt'];
    for (const field of requiredFields) {
      if (!parsedData[field]) {
        throw new Error(`Missing required field in Gemini response: ${field}`);
      }
    }

    // Prepare final result
    const result1 = {
      ...parsedData,
      // Add original metadata
      originalAudioPath: metadata.audioFilePath,
      originalAudioFileName: metadata.audioFileName,
      audioMimeType: metadata.audioMimeType,
      audioSize: metadata.audioSize,
      audioProcessedAt: new Date().toISOString(),
      // Ensure context is always present (empty string if not provided)
      context: parsedData.context || '',
    };

    console.log('Phase 1 complete:', {
      title: result1.title,
      promptLength: result1.prompt.length,
      contextLength: result1.context.length,
      tags: result1.tags,
    });

    return result1;

  } catch (error) {
    console.error('Phase 1 error:', error);
    throw new Error(`Phase 1 transcription failed: ${error.message}`);
  }
}

export default { processPhase1 };
