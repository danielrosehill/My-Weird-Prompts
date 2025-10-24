/**
 * Phase 3: Audio Processing
 *
 * Creates two separate audio files for blog post:
 * 1. User's original voice prompt (processed and normalized)
 * 2. AI response TTS audio
 *
 * Both files are saved to frontend public/audio directory.
 * The blog post will display them separately with avatars for each speaker.
 *
 * Input: Phase 1 and Phase 2 results
 * Output: Two audio URLs (user prompt + AI response) and metadata
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process and normalize audio file
 * Apply noise reduction and loudness normalization
 */
async function processAndNormalizeAudio(inputPath, outputFilename) {
  console.log(`Processing audio: ${path.basename(inputPath)}`);

  try {
    // Create temporary output path
    const tempOutput = path.join(__dirname, '../temp-uploads', `temp-${outputFilename}`);

    // Apply noise reduction and normalization in one pass
    const { stdout, stderr } = await execAsync(
      `ffmpeg -i "${inputPath}" -af "highpass=f=200,lowpass=f=3000,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -b:a 128k "${tempOutput}"`
    );

    if (stderr && !stderr.includes('audio.c')) {
      console.warn('ffmpeg warnings:', stderr);
    }

    console.log('Audio processed and normalized');

    return tempOutput;
  } catch (error) {
    console.error('Error processing audio:', error);
    throw new Error(`Failed to process audio: ${error.message}`);
  }
}

/**
 * Generate TTS for AI response
 * Uses Google Gemini Text-to-Speech with podcast host persona
 */
async function generateResponseTTS(responseText) {
  console.log('Generating TTS for AI response with Gemini...');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set - skipping TTS generation');
    return null;
  }

  try {
    // Import Google Generative AI SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.5 Flash Preview TTS model with audio generation capabilities
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
    });

    // Create prompt with stylistic instructions
    const ttsPrompt = `You are a knowledgeable, friendly AI assistant with a warm, engaging voice. Read the following response in a conversational, professional style. Use natural intonation, slight pauses for emphasis, and maintain an informative yet approachable tone throughout.

Response to read:
${responseText}`;

    console.log('Sending TTS request to Gemini...');
    console.log('Response length:', responseText.length, 'characters');

    // Generate audio with Gemini
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: ttsPrompt }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede' // Professional female voice
            }
          }
        }
      }
    });

    const response = await result.response;

    // Extract audio data
    let audioData = null;
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('audio/')) {
          audioData = part.inlineData.data;
          break;
        }
      }
      if (audioData) break;
    }

    if (!audioData) {
      throw new Error('No audio data received from Gemini');
    }

    // Save audio to temp file
    const buffer = Buffer.from(audioData, 'base64');
    const outputPath = path.join(__dirname, '../temp-uploads', `tts-gemini-${Date.now()}.wav`);
    await fs.writeFile(outputPath, buffer);

    console.log('Gemini TTS generated:', outputPath);
    console.log('Audio size:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');

    return outputPath;
  } catch (error) {
    console.error('Error generating TTS with Gemini:', error);
    console.warn('Falling back to text-only blog post (no audio)');
    return null; // Gracefully degrade - blog post will be created without audio
  }
}

/**
 * Save audio to frontend public directory
 */
async function saveAudioToPublic(audioPath, filename) {
  console.log(`Saving audio to public directory: ${filename}`);

  try {
    // Determine the public audio directory in frontend
    const publicAudioDir = path.join(__dirname, '../../frontend/public/audio');
    await fs.mkdir(publicAudioDir, { recursive: true });

    const destPath = path.join(publicAudioDir, filename);

    // Copy the audio file to public directory
    await fs.copyFile(audioPath, destPath);

    // Get file stats
    const stats = await fs.stat(destPath);

    console.log('Audio saved to public directory:', destPath);

    return {
      url: `/audio/${filename}`, // Relative URL for Astro
      localPath: destPath,
      size: stats.size,
    };
  } catch (error) {
    console.error('Error saving audio to public directory:', error);
    throw new Error(`Failed to save audio to public directory: ${error.message}`);
  }
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return 0;
  }
}

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Process Phase 3: Dual Audio Processing
 *
 * @param {Object} phase1Result - Results from Phase 1
 * @param {Object} phase2Result - Results from Phase 2
 * @returns {Object} Two audio URLs and metadata
 */
export async function processPhase3(phase1Result, phase2Result) {
  console.log('Phase 3: Starting audio processing (dual audio mode)');

  try {
    const timestamp = Date.now();
    const slug = phase1Result.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Step 1: Process user's voice prompt
    console.log('\n--- Processing user voice prompt ---');
    const userFilename = `prompt-${timestamp}-${slug}.mp3`;
    const processedUserVoice = await processAndNormalizeAudio(
      phase1Result.audioFilePath,
      userFilename
    );

    // Get user audio duration
    const userDuration = await getAudioDuration(processedUserVoice);

    // Save user audio to public directory
    const userAudioResult = await saveAudioToPublic(processedUserVoice, userFilename);

    // Step 2: Generate TTS for AI response
    console.log('\n--- Generating AI response audio ---');
    const responseTTS = await generateResponseTTS(phase2Result.response);

    // If TTS generation failed/skipped, return user audio only
    if (!responseTTS) {
      console.warn('Skipping AI response audio - TTS not available');

      // Clean up temp file
      await fs.unlink(processedUserVoice).catch(() => {});

      return {
        userAudioUrl: userAudioResult.url,
        userDuration: userDuration,
        userDurationFormatted: formatDuration(userDuration),
        aiAudioUrl: null,
        aiDuration: null,
        aiDurationFormatted: null,
        skipped: true,
        reason: 'TTS not available (GEMINI_API_KEY not configured)',
        generatedAt: new Date().toISOString(),
      };
    }

    // Step 3: Process AI response audio
    const aiFilename = `response-${timestamp}-${slug}.mp3`;
    const processedAIVoice = await processAndNormalizeAudio(responseTTS, aiFilename);

    // Get AI audio duration
    const aiDuration = await getAudioDuration(processedAIVoice);

    // Save AI audio to public directory
    const aiAudioResult = await saveAudioToPublic(processedAIVoice, aiFilename);

    // Step 4: Clean up temporary files
    await fs.unlink(processedUserVoice).catch(() => {});
    await fs.unlink(responseTTS).catch(() => {});
    await fs.unlink(processedAIVoice).catch(() => {});

    console.log('\nPhase 3 complete:', {
      userAudio: userAudioResult.url,
      userDuration: formatDuration(userDuration),
      aiAudio: aiAudioResult.url,
      aiDuration: formatDuration(aiDuration),
    });

    return {
      userAudioUrl: userAudioResult.url,
      userDuration: userDuration,
      userDurationFormatted: formatDuration(userDuration),
      aiAudioUrl: aiAudioResult.url,
      aiDuration: aiDuration,
      aiDurationFormatted: formatDuration(aiDuration),
      totalDuration: userDuration + aiDuration,
      totalDurationFormatted: formatDuration(userDuration + aiDuration),
      skipped: false,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Phase 3 error:', error);
    throw new Error(`Phase 3 audio processing failed: ${error.message}`);
  }
}

export default { processPhase3 };
