/**
 * Test script for Replicate API integration
 * Verifies that the API key works and can generate images
 */

import Replicate from 'replicate';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '../../.env') });

async function testReplicate() {
  console.log('Testing Replicate API integration...\n');

  // Check if API token is configured
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    console.error('❌ REPLICATE_API_TOKEN not found in environment variables');
    process.exit(1);
  }

  console.log('✓ API token found');
  console.log(`  Token preview: ${apiToken.substring(0, 8)}...${apiToken.substring(apiToken.length - 4)}\n`);

  try {
    // Initialize Replicate client
    const replicate = new Replicate({ auth: apiToken });
    console.log('✓ Replicate client initialized\n');

    // Test image generation
    console.log('Generating test image with SDXL...');
    console.log('Prompt: "A surreal digital art banner for a tech blog, vibrant colors, modern aesthetic"\n');

    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: 'A surreal digital art banner for a tech blog, vibrant colors, modern aesthetic, professional quality, 16:9 aspect ratio',
          width: 1216,
          height: 832,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }
    );

    console.log('✓ Image generation complete!\n');
    console.log('Output type:', typeof output);
    console.log('Is iterable:', Symbol.iterator in Object(output) || Symbol.asyncIterator in Object(output));

    // The Replicate SDK returns a FileOutput object (ReadableStream with .url() method)
    console.log('Processing output...');

    let imageUrl;

    if (Array.isArray(output)) {
      const firstOutput = output[0];
      console.log('First output type:', typeof firstOutput, firstOutput?.constructor?.name);

      // Check if it has a .url() method (FileOutput object)
      if (firstOutput && typeof firstOutput.url === 'function') {
        const urlObj = firstOutput.url();
        imageUrl = urlObj.href || urlObj.toString();
        console.log('✓ Extracted URL using .url() method');
      } else if (typeof firstOutput === 'string') {
        imageUrl = firstOutput;
        console.log('✓ Output is already a string URL');
      }
    } else if (typeof output === 'string') {
      imageUrl = output;
      console.log('✓ Output is a string URL');
    } else if (output && typeof output.url === 'function') {
      const urlObj = output.url();
      imageUrl = urlObj.href || urlObj.toString();
      console.log('✓ Extracted URL using .url() method');
    }

    console.log('\nGenerated image URL:');
    console.log(imageUrl);
    console.log('\n✅ Replicate API integration test PASSED');

    return imageUrl;

  } catch (error) {
    console.error('\n❌ Replicate API test FAILED');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testReplicate()
  .then((imageUrl) => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
