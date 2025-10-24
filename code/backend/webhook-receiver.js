/**
 * Webhook Receiver for Voicenotes App
 *
 * Receives voice prompt recordings from Voicenotes app and triggers
 * the processing pipeline.
 *
 * Flow:
 * 1. Receive webhook POST from Voicenotes with audio file
 * 2. Validate webhook signature/secret
 * 3. Save audio file temporarily
 * 4. Trigger Phase 1: Gemini transcription & metadata extraction
 * 5. Return 200 OK to Voicenotes
 * 6. Continue processing in background
 */

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for handling audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'temp-uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueName = `voice-prompt-${timestamp}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
      'application/octet-stream', // Sometimes MIME type isn't detected properly
    ];

    // Also check file extension as fallback
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype} (${file.originalname}). Only audio files are allowed.`));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Validate webhook signature
 * Compares provided signature with computed HMAC of request body
 */
function validateWebhookSignature(req, signature) {
  const webhookSecret = process.env.VOICENOTES_WEBHOOK_SECRET;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Skip validation in development mode
  if (isDevelopment) {
    console.log('Development mode - skipping webhook signature validation');
    return true;
  }

  if (!webhookSecret) {
    console.warn('VOICENOTES_WEBHOOK_SECRET not configured - skipping signature validation');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(payload);
  const computedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'my-weird-prompts-webhook-receiver'
  });
});

/**
 * Main webhook endpoint
 * Receives voice prompts from Voicenotes app
 */
app.post('/webhook/voicenotes', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received webhook from Voicenotes');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Validate webhook signature
    const signature = req.headers['x-webhook-signature'];
    const isValid = validateWebhookSignature(req, signature);
    console.log('Signature validation result:', isValid, '(NODE_ENV:', process.env.NODE_ENV, ')');
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if audio file was uploaded
    if (!req.file) {
      console.error('No audio file in request');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Audio file received:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Extract metadata from request body
    const metadata = {
      receivedAt: new Date().toISOString(),
      audioFilePath: req.file.path,
      audioFileName: req.file.filename,
      audioMimeType: req.file.mimetype,
      audioSize: req.file.size,
      voicenotesData: req.body // Any additional data from Voicenotes
    };

    // Respond immediately to Voicenotes (don't make them wait)
    res.status(200).json({
      success: true,
      message: 'Voice prompt received and queued for processing',
      id: path.basename(req.file.filename, path.extname(req.file.filename))
    });

    // Process in background (don't await)
    processVoicePrompt(metadata).catch(err => {
      console.error('Error processing voice prompt:', err);
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Process voice prompt through the pipeline
 * This runs asynchronously after webhook response is sent
 */
async function processVoicePrompt(metadata) {
  console.log('Starting voice prompt processing pipeline...');
  console.log('Metadata:', metadata);

  try {
    // Import pipeline modules
    const { processPhase1 } = await import('./pipeline/phase1-transcription.js');
    const { processPhase2 } = await import('./pipeline/phase2-response.js');
    const { processPhase3 } = await import('./pipeline/phase3-audio.js');
    const { processPhase4 } = await import('./pipeline/phase4-images.js');
    const { assembleAndPublish } = await import('./pipeline/phase5-publish.js');

    // Phase 1: Transcription & Metadata Extraction (Gemini)
    console.log('Phase 1: Transcribing audio and extracting metadata...');
    const phase1Result = await processPhase1(metadata);
    console.log('Phase 1 complete:', phase1Result);

    // Phase 2: Response Generation (Claude)
    console.log('Phase 2: Generating AI response...');
    const phase2Result = await processPhase2(phase1Result);
    console.log('Phase 2 complete');

    // Phase 3: Audio Assembly (TTS + Concatenation)
    console.log('Phase 3: Assembling podcast audio...');
    const phase3Result = await processPhase3(phase1Result, phase2Result);
    console.log('Phase 3 complete');

    // Phase 4: Banner Image Generation
    console.log('Phase 4: Generating banner image...');
    const phase4Result = await processPhase4(phase1Result, phase2Result);
    console.log('Phase 4 complete');

    // Phase 5: Assemble Blog Post & Publish
    console.log('Phase 5: Assembling blog post and publishing...');
    const publishResult = await assembleAndPublish({
      phase1: phase1Result,
      phase2: phase2Result,
      phase3: phase3Result,
      phase4: phase4Result
    });
    console.log('Phase 5 complete');

    console.log('Pipeline complete! Blog post published:', publishResult.url);

    // Clean up temporary audio file
    await fs.unlink(metadata.audioFilePath);
    console.log('Cleaned up temporary audio file');

  } catch (error) {
    console.error('Pipeline error:', error);
    // TODO: Implement error handling/retry logic
    // For now, just log the error
  }
}

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('Express error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Audio file must be less than 50MB'
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Webhook receiver listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/voicenotes`);

  // Warn if webhook secret not configured
  if (!process.env.VOICENOTES_WEBHOOK_SECRET) {
    console.warn('⚠️  VOICENOTES_WEBHOOK_SECRET not configured - webhook validation disabled');
  }
});

export default app;
