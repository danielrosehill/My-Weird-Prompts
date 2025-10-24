/**
 * Phase 4: Banner Image Generation
 *
 * Generates a banner/cover image for the blog post.
 * Supports multiple image generation services.
 *
 * Input: Phase 1 and Phase 2 results
 * Output: Image URL and metadata
 */

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Generate image using Replicate
 */
async function generateWithReplicate(prompt) {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    return null;
  }

  try {
    const { default: Replicate } = await import('replicate');
    const replicate = new Replicate({ auth: apiToken });

    console.log('Generating image with Replicate...');

    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: prompt,
          width: 1216,
          height: 832,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }
    );

    // Handle FileOutput object from Replicate SDK
    const firstOutput = Array.isArray(output) ? output[0] : output;
    if (firstOutput && typeof firstOutput.url === 'function') {
      // Extract URL from FileOutput object
      const urlObj = firstOutput.url();
      return urlObj.href || urlObj.toString();
    }

    // Fallback for older SDK versions or direct URL strings
    return firstOutput;

  } catch (error) {
    console.error('Replicate error:', error);
    return null;
  }
}

/**
 * Generate image using Stability AI
 */
async function generateWithStability(prompt) {
  const apiKey = process.env.STABILITY_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1,
            },
          ],
          cfg_scale: 7,
          height: 832,
          width: 1216,
          steps: 30,
          samples: 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Stability API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageBase64 = data.artifacts[0].base64;

    // Save to temporary file
    const buffer = Buffer.from(imageBase64, 'base64');
    const tempPath = path.join(__dirname, '../temp-uploads', `banner-${Date.now()}.png`);
    await fs.writeFile(tempPath, buffer);

    return tempPath;

  } catch (error) {
    console.error('Stability AI error:', error);
    return null;
  }
}

/**
 * Use local Stable Diffusion (placeholder for ComfyUI integration)
 */
async function generateWithLocalSD(prompt) {
  // TODO: Integrate with ComfyUI when ready
  console.log('Local SD generation not yet implemented');
  return null;
}

/**
 * Create image prompt based on blog content
 */
function createImagePrompt(phase1Result, phase2Result) {
  const title = phase1Result.title;
  const tags = phase1Result.tags.join(', ');

  // Create a concise, vivid prompt for image generation
  const prompt = `Create an eye-catching, eccentric blog banner image for a post titled "${title}".
Style: Modern, vibrant, slightly surreal, digital art aesthetic.
Themes: ${tags}.
The image should be visually interesting, abstract yet relatable, suitable for a tech/AI blog.
High quality, 16:9 aspect ratio, professional but playful.`;

  return prompt;
}

/**
 * Upload generated image to Cloudinary
 */
async function uploadImageToCloudinary(imagePath, publicId) {
  console.log('Uploading image to Cloudinary...');

  configureCloudinary();

  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      public_id: publicId,
      folder: 'my-weird-prompts/banners',
      transformation: [
        { width: 1200, height: 630, crop: 'fill', gravity: 'auto' }, // OG image size
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    console.log('Image uploaded to Cloudinary:', result.secure_url);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
}

/**
 * Generate placeholder image (fallback when no image gen available)
 */
async function generatePlaceholder(title, tags) {
  console.log('Using external placeholder service...');

  // Use placehold.co as a simple fallback
  const encodedTitle = encodeURIComponent(title.substring(0, 50));
  const placeholderUrl = `https://placehold.co/1216x832/6366f1/white?text=${encodedTitle}`;

  return {
    imageUrl: placeholderUrl,
    isPlaceholder: true,
    width: 1216,
    height: 832,
  };
}

/**
 * Process Phase 4: Banner Image Generation
 *
 * @param {Object} phase1Result - Results from Phase 1
 * @param {Object} phase2Result - Results from Phase 2
 * @returns {Object} Image URL and metadata
 */
export async function processPhase4(phase1Result, phase2Result) {
  console.log('Phase 4: Starting banner image generation');

  try {
    // Create image generation prompt
    const imagePrompt = createImagePrompt(phase1Result, phase2Result);
    console.log('Image prompt:', imagePrompt);

    // Try different image generation services in order of preference
    let imagePath = null;

    // 1. Try Replicate
    if (process.env.REPLICATE_API_TOKEN) {
      console.log('Attempting image generation with Replicate...');
      imagePath = await generateWithReplicate(imagePrompt);
    }

    // 2. Try Stability AI
    if (!imagePath && process.env.STABILITY_API_KEY) {
      console.log('Attempting image generation with Stability AI...');
      imagePath = await generateWithStability(imagePrompt);
    }

    // 3. Try local Stable Diffusion
    if (!imagePath) {
      console.log('Attempting local Stable Diffusion...');
      imagePath = await generateWithLocalSD(imagePrompt);
    }

    // 4. Fallback to placeholder
    if (!imagePath) {
      console.log('No image generation service available, using placeholder...');
      const placeholder = await generatePlaceholder(phase1Result.title, phase1Result.tags);

      return {
        ...placeholder,
        generatedAt: new Date().toISOString(),
      };
    }

    // Save image locally to frontend public directory
    const timestamp = Date.now();
    const slug = phase1Result.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = `banner-${timestamp}-${slug}.png`;

    // Path to frontend public/images directory
    const publicImagesDir = path.join(__dirname, '../../frontend/public/images/banners');
    await fs.mkdir(publicImagesDir, { recursive: true });
    const localImagePath = path.join(publicImagesDir, filename);

    let savedImagePath;
    let fileSize;

    // If imagePath is a URL (from Replicate), download it
    if (imagePath.startsWith('http')) {
      console.log('Downloading image from Replicate...');
      const response = await fetch(imagePath);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(localImagePath, Buffer.from(buffer));
      savedImagePath = localImagePath;
      fileSize = buffer.byteLength;
      console.log(`Image saved locally: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      // Local file path - copy to public directory
      console.log('Copying local image to public directory...');
      await fs.copyFile(imagePath, localImagePath);
      const stats = await fs.stat(localImagePath);
      fileSize = stats.size;
      savedImagePath = localImagePath;
      // Clean up temp file
      await fs.unlink(imagePath).catch(() => {});
      console.log(`Image saved locally: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Return web-accessible path (relative to frontend public directory)
    const webPath = `/images/banners/${filename}`;

    console.log('Phase 4 complete:', {
      imageUrl: webPath,
    });

    return {
      imageUrl: webPath,
      localPath: savedImagePath,
      filename: filename,
      fileSize: fileSize,
      generatedAt: new Date().toISOString(),
      prompt: imagePrompt,
    };

  } catch (error) {
    console.error('Phase 4 error:', error);

    // Return placeholder on error
    console.log('Falling back to placeholder due to error...');
    const placeholder = await generatePlaceholder(phase1Result.title, phase1Result.tags);

    return {
      ...placeholder,
      generatedAt: new Date().toISOString(),
      error: error.message,
    };
  }
}

export default { processPhase4 };
