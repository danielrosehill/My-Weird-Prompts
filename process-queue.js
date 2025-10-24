#!/usr/bin/env node

/**
 * Audio Queue Processor
 *
 * Simple folder-based queue system for processing voice prompts.
 *
 * Usage:
 *   node process-queue.js           # Process all files in queue once
 *   node process-queue.js --watch   # Watch folder and process new files automatically
 *
 * Directory Structure:
 *   audio-queue/incoming/    - Drop MP3/audio files here
 *   audio-queue/processing/  - Files currently being processed
 *   audio-queue/processed/   - Successfully processed files
 *   audio-queue/failed/      - Failed processing attempts
 *
 * Workflow:
 *   1. Drop voice recording into audio-queue/incoming/
 *   2. Run this script (or it auto-detects if watching)
 *   3. Script processes through phases 1-5
 *   4. Blog post published, audio moved to processed/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'fs';

// Import pipeline phases
import { processPhase1 } from './code/backend/pipeline/phase1-transcription.js';
import { processPhase2 } from './code/backend/pipeline/phase2-response.js';
import { processPhase3 } from './code/backend/pipeline/phase3-audio.js';
import { processPhase4 } from './code/backend/pipeline/phase4-images.js';
import { processPhase5 } from './code/backend/pipeline/phase5-publish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_DIR = path.join(__dirname, 'audio-queue');
const INCOMING_DIR = path.join(QUEUE_DIR, 'incoming');
const PROCESSING_DIR = path.join(QUEUE_DIR, 'processing');
const PROCESSED_DIR = path.join(QUEUE_DIR, 'processed');
const FAILED_DIR = path.join(QUEUE_DIR, 'failed');

/**
 * Ensure queue directories exist
 */
async function ensureDirectories() {
  await fs.mkdir(INCOMING_DIR, { recursive: true });
  await fs.mkdir(PROCESSING_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(FAILED_DIR, { recursive: true });
}

/**
 * Get all audio files in incoming directory
 */
async function getIncomingFiles() {
  try {
    const files = await fs.readdir(INCOMING_DIR);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'].includes(ext);
    });
    return audioFiles;
  } catch (error) {
    console.error('Error reading incoming directory:', error);
    return [];
  }
}

/**
 * Move file between queue directories
 */
async function moveFile(filename, fromDir, toDir) {
  const sourcePath = path.join(fromDir, filename);
  const destPath = path.join(toDir, filename);

  try {
    await fs.rename(sourcePath, destPath);
    console.log(`Moved ${filename} from ${path.basename(fromDir)} to ${path.basename(toDir)}`);
    return destPath;
  } catch (error) {
    console.error(`Error moving file ${filename}:`, error);
    throw error;
  }
}

/**
 * Save error log for failed processing
 */
async function saveErrorLog(filename, error, phaseNumber) {
  const logFilename = `${path.parse(filename).name}-error.log`;
  const logPath = path.join(FAILED_DIR, logFilename);

  const errorLog = {
    filename,
    failedAt: new Date().toISOString(),
    phase: phaseNumber,
    error: {
      message: error.message,
      stack: error.stack,
    },
  };

  await fs.writeFile(logPath, JSON.stringify(errorLog, null, 2), 'utf-8');
  console.log(`Error log saved: ${logPath}`);
}

/**
 * Process a single audio file through the entire pipeline
 */
async function processAudioFile(filename) {
  console.log('\n' + '='.repeat(60));
  console.log(`Starting to process: ${filename}`);
  console.log('='.repeat(60) + '\n');

  let currentPhase = 0;
  let processingPath = null;

  try {
    // Move to processing directory
    currentPhase = 0;
    processingPath = await moveFile(filename, INCOMING_DIR, PROCESSING_DIR);

    // Phase 1: Transcription and metadata extraction
    currentPhase = 1;
    console.log('\n--- Phase 1: Transcription & Metadata ---');
    const phase1Result = await processPhase1({
      audioFilePath: processingPath,
      audioFileName: filename,
    });
    console.log('Phase 1 complete:', {
      title: phase1Result.title,
      promptLength: phase1Result.prompt.length,
      tags: phase1Result.tags,
    });

    // Phase 2: Response generation
    currentPhase = 2;
    console.log('\n--- Phase 2: AI Response Generation ---');
    const phase2Result = await processPhase2(phase1Result);
    console.log('Phase 2 complete:', {
      responseLength: phase2Result.response.length,
      generatedBy: phase2Result.model,
    });

    // Phase 3: Audio assembly
    currentPhase = 3;
    console.log('\n--- Phase 3: Audio Assembly ---');
    const phase3Result = await processPhase3(phase1Result, phase2Result);
    console.log('Phase 3 complete:', {
      audioUrl: phase3Result.audioUrl,
      duration: phase3Result.durationFormatted,
      skipped: phase3Result.skipped || false,
    });

    // Phase 4: Image generation
    currentPhase = 4;
    console.log('\n--- Phase 4: Banner Image Generation ---');
    const phase4Result = await processPhase4(phase1Result, phase2Result);
    console.log('Phase 4 complete:', {
      imageUrl: phase4Result.imageUrl,
      skipped: phase4Result.skipped || false,
    });

    // Phase 5: Blog post assembly and publishing
    currentPhase = 5;
    console.log('\n--- Phase 5: Blog Post Publishing ---');
    const phase5Result = await processPhase5({
      phase1: phase1Result,
      phase2: phase2Result,
      phase3: phase3Result,
      phase4: phase4Result,
    });
    console.log('Phase 5 complete:', {
      filename: phase5Result.filename,
      slug: phase5Result.slug,
    });

    // Move to processed directory
    await moveFile(filename, PROCESSING_DIR, PROCESSED_DIR);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ SUCCESS: ${filename} processed completely!`);
    console.log(`Blog post: /blog/${phase5Result.slug}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      filename,
      slug: phase5Result.slug,
    };

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`❌ FAILED: ${filename} at phase ${currentPhase}`);
    console.error('Error:', error.message);
    console.error('='.repeat(60) + '\n');

    // Move to failed directory
    if (processingPath) {
      try {
        await moveFile(filename, PROCESSING_DIR, FAILED_DIR);
        await saveErrorLog(filename, error, currentPhase);
      } catch (moveError) {
        console.error('Error moving failed file:', moveError);
      }
    }

    return {
      success: false,
      filename,
      phase: currentPhase,
      error: error.message,
    };
  }
}

/**
 * Process all files in the incoming queue
 */
async function processQueue() {
  const files = await getIncomingFiles();

  if (files.length === 0) {
    console.log('📭 Queue is empty - no files to process');
    return;
  }

  console.log(`\n📬 Found ${files.length} file(s) in queue`);

  const results = [];

  for (const file of files) {
    const result = await processAudioFile(file);
    results.push(result);

    // Small delay between files to avoid rate limiting
    if (files.indexOf(file) < files.length - 1) {
      console.log('\nWaiting 5 seconds before next file...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('QUEUE PROCESSING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Watch mode: continuously monitor incoming directory
 */
async function watchQueue() {
  console.log('👀 Watching audio-queue/incoming/ for new files...');
  console.log('Press Ctrl+C to stop\n');

  let processing = false;

  const watcher = watch(INCOMING_DIR, async (eventType, filename) => {
    if (processing) return;
    if (!filename) return;

    const ext = path.extname(filename).toLowerCase();
    if (!['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'].includes(ext)) {
      return;
    }

    console.log(`\n🔔 New file detected: ${filename}`);

    // Wait a moment to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 2000));

    processing = true;
    await processQueue();
    processing = false;
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });
}

/**
 * Main entry point
 */
async function main() {
  console.log('🎙️  My Weird Prompts - Audio Queue Processor\n');

  // Ensure directories exist
  await ensureDirectories();

  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch') || args.includes('-w');

  if (watchMode) {
    await watchQueue();
  } else {
    await processQueue();
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
