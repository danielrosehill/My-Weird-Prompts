/**
 * Phase 3: Audio Assembly Pipeline
 *
 * Creates podcast-style audio companion for blog post by:
 * 1. Processing user's original voice prompt (normalize, clean)
 * 2. Generating TTS for AI response
 * 3. Concatenating segments: intro jingle + user voice + AI response + outro
 * 4. Normalizing final audio
 * 5. Uploading to Cloudinary
 *
 * Input: Phase 1 and Phase 2 results
 * Output: Final podcast audio URL and metadata
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure Cloudinary
 */
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Process user's voice prompt audio
 * Calls the existing voice processing script
 */
async function processUserVoice(originalAudioPath) {
  console.log('Processing user voice prompt...');

  const outputPath = originalAudioPath.replace(/\.[^.]+$/, '_processed.mp3');
  const scriptPath = path.join(__dirname, '../../../scripts/process_voice_prompt.py');

  try {
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}" "${originalAudioPath}" "${outputPath}"`
    );

    if (stderr) {
      console.warn('Voice processing warnings:', stderr);
    }

    console.log('User voice processed:', stdout);

    return outputPath;
  } catch (error) {
    console.error('Error processing user voice:', error);
    throw new Error(`Failed to process user voice: ${error.message}`);
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
    const ttsPrompt = `You are a knowledgeable, friendly podcast host with a warm, engaging voice. Read the following blog post response in a conversational, professional podcast style. Use natural intonation, slight pauses for emphasis, and maintain an informative yet approachable tone throughout.

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

    // Save audio to file
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
 * Concatenate audio segments
 * Uses ffmpeg to combine intro + user voice + AI response + outro
 */
async function concatenateAudio(segments) {
  console.log('Concatenating audio segments...');

  const outputPath = path.join(__dirname, '../temp-uploads', `podcast-${Date.now()}.mp3`);
  const listPath = path.join(__dirname, '../temp-uploads', `concat-list-${Date.now()}.txt`);

  // Create file list for ffmpeg concat
  const fileList = segments
    .filter(seg => seg !== null)
    .map(seg => `file '${path.resolve(seg)}'`)
    .join('\n');

  await fs.writeFile(listPath, fileList);

  try {
    // Concatenate with ffmpeg
    const { stdout, stderr } = await execAsync(
      `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`
    );

    if (stderr && !stderr.includes('audio.c')) {
      console.warn('ffmpeg warnings:', stderr);
    }

    console.log('Audio concatenated:', outputPath);

    // Clean up list file
    await fs.unlink(listPath);

    return outputPath;
  } catch (error) {
    console.error('Error concatenating audio:', error);
    throw new Error(`Failed to concatenate audio: ${error.message}`);
  }
}

/**
 * Normalize final audio
 * Apply loudness normalization for consistent playback
 */
async function normalizeAudio(inputPath) {
  console.log('Normalizing final audio...');

  const outputPath = inputPath.replace('.mp3', '_normalized.mp3');

  try {
    const { stdout, stderr } = await execAsync(
      `ffmpeg -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 -b:a 128k "${outputPath}"`
    );

    if (stderr && !stderr.includes('audio.c')) {
      console.warn('ffmpeg warnings:', stderr);
    }

    console.log('Audio normalized:', outputPath);

    return outputPath;
  } catch (error) {
    console.error('Error normalizing audio:', error);
    throw new Error(`Failed to normalize audio: ${error.message}`);
  }
}

/**
 * Upload audio to Cloudinary
 */
async function uploadToCloudinary(audioPath, publicId) {
  console.log('Uploading audio to Cloudinary...');

  configureCloudinary();

  try {
    const result = await cloudinary.uploader.upload(audioPath, {
      resource_type: 'video', // Cloudinary treats audio as video
      public_id: publicId,
      folder: 'my-weird-prompts/podcast-episodes',
      format: 'mp3',
    });

    console.log('Audio uploaded to Cloudinary:', result.secure_url);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      size: result.bytes,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
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
 * Process Phase 3: Audio Assembly
 *
 * @param {Object} phase1Result - Results from Phase 1
 * @param {Object} phase2Result - Results from Phase 2
 * @returns {Object} Final audio URL and metadata
 */
export async function processPhase3(phase1Result, phase2Result) {
  console.log('Phase 3: Starting audio assembly pipeline');

  try {
    // Step 1: Process user's voice prompt
    const processedUserVoice = await processUserVoice(phase1Result.originalAudioPath);

    // Step 2: Generate TTS for AI response
    const responseTTS = await generateResponseTTS(phase2Result.response);

    // If TTS generation failed/skipped, return minimal result
    if (!responseTTS) {
      console.warn('Skipping audio assembly - TTS not available');
      return {
        skipped: true,
        reason: 'TTS not available (OPENAI_API_KEY not configured)',
        userVoiceProcessed: processedUserVoice,
      };
    }

    // Step 3: Prepare audio segments
    // TODO: Add intro jingle and outro when ready
    const segments = [
      // path.join(__dirname, '../assets/intro-jingle.mp3'), // Intro (to be added)
      processedUserVoice, // User's voice prompt
      responseTTS, // AI response
      // path.join(__dirname, '../assets/outro.mp3'), // Outro (to be added)
    ];

    // Step 4: Concatenate segments
    const concatenatedAudio = await concatenateAudio(segments);

    // Step 5: Normalize final audio
    const finalAudio = await normalizeAudio(concatenatedAudio);

    // Step 6: Get audio metadata
    const duration = await getAudioDuration(finalAudio);

    // Step 7: Upload to Cloudinary
    const timestamp = Date.now();
    const slug = phase1Result.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const publicId = `episode-${timestamp}-${slug}`;

    const uploadResult = await uploadToCloudinary(finalAudio, publicId);

    // Step 8: Clean up temporary files
    await fs.unlink(processedUserVoice).catch(() => {});
    await fs.unlink(responseTTS).catch(() => {});
    await fs.unlink(concatenatedAudio).catch(() => {});
    await fs.unlink(finalAudio).catch(() => {});

    console.log('Phase 3 complete:', {
      audioUrl: uploadResult.url,
      duration: duration,
    });

    return {
      audioUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      duration: duration,
      durationFormatted: formatDuration(duration),
      fileSize: uploadResult.size,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Phase 3 error:', error);
    throw new Error(`Phase 3 audio assembly failed: ${error.message}`);
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

export default { processPhase3 };
