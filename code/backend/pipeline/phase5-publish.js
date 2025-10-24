/**
 * Phase 5: Blog Post Assembly and Publishing
 *
 * Assembles all components into a blog post and publishes to the Astro site.
 * Creates a markdown file in the Astro content directory.
 *
 * Input: Results from all previous phases
 * Output: Published blog post URL
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format date for blog post
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Create slug from title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate frontmatter for Astro blog post
 */
function generateFrontmatter(allPhases) {
  const { phase1, phase2, phase3, phase4 } = allPhases;

  const frontmatter = {
    title: phase1.title,
    description: phase1.excerpt,
    pubDate: formatDate(new Date()),
    heroImage: phase4.imageUrl,
    tags: phase1.tags,
    // Custom fields for My Weird Prompts
    prompt: phase1.prompt_summary,
    audioUrl: phase3.audioUrl || null,
    audioDuration: phase3.durationFormatted || null,
    aiGenerated: true,
    transcript: phase1.transcript,
  };

  return frontmatter;
}

/**
 * Generate markdown content for blog post
 */
function generateMarkdown(allPhases) {
  const { phase1, phase2, phase3, phase4 } = allPhases;

  let markdown = '';

  // Add prompt summary section
  markdown += `## The Prompt\n\n`;
  markdown += `${phase1.prompt_summary}\n\n`;

  // Add context if provided
  if (phase1.context && phase1.context.trim().length > 0) {
    markdown += `### Context\n\n`;
    markdown += `${phase1.context}\n\n`;
  }

  // Add AI response
  markdown += `## Response\n\n`;
  markdown += `${phase2.response}\n\n`;

  // Add audio player if available
  if (phase3.audioUrl && !phase3.skipped) {
    markdown += `---\n\n`;
    markdown += `## Listen to This Post\n\n`;
    markdown += `<audio controls src="${phase3.audioUrl}">\n`;
    markdown += `  Your browser does not support the audio element.\n`;
    markdown += `</audio>\n\n`;
    markdown += `*Duration: ${phase3.durationFormatted}*\n\n`;
  }

  // Add disclaimer
  markdown += `---\n\n`;
  markdown += `*This content was generated with AI assistance. The prompt was voiced by a human and transcribed, then processed through Claude Sonnet 4.5 for the response.*\n\n`;

  return markdown;
}

/**
 * Create Astro blog post file
 */
async function createBlogPost(allPhases) {
  const frontmatter = generateFrontmatter(allPhases);
  const markdown = generateMarkdown(allPhases);

  // Create slug for filename
  const slug = createSlug(frontmatter.title);
  const timestamp = Date.now();
  const filename = `${timestamp}-${slug}.md`;

  // Determine content directory path
  const contentDir = path.join(__dirname, '../../frontend/src/content/blog');
  await fs.mkdir(contentDir, { recursive: true });

  const filePath = path.join(contentDir, filename);

  // Build full blog post content
  let content = '---\n';
  content += Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${JSON.stringify(value)}`;
      } else if (typeof value === 'string') {
        // Escape quotes in string values
        const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `${key}: "${escaped}"`;
      } else {
        return `${key}: ${JSON.stringify(value)}`;
      }
    })
    .join('\n');
  content += '\n---\n\n';
  content += markdown;

  // Write file
  await fs.writeFile(filePath, content, 'utf-8');

  console.log(`Blog post created: ${filePath}`);

  return {
    filePath,
    filename,
    slug,
  };
}

/**
 * Commit and push to Git (optional)
 */
async function commitAndPush(filePath) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Get relative path from repo root
    const repoRoot = path.join(__dirname, '../../../');
    const relativePath = path.relative(repoRoot, filePath);

    // Git add
    await execAsync(`git add "${relativePath}"`, { cwd: repoRoot });

    // Git commit
    const title = path.basename(filePath, '.md');
    await execAsync(
      `git commit -m "Add blog post: ${title}\n\n🤖 Generated with Claude Code"`,
      { cwd: repoRoot }
    );

    // Git push
    await execAsync('git push', { cwd: repoRoot });

    console.log('Changes committed and pushed to Git');

    return true;
  } catch (error) {
    console.error('Git operations failed:', error);
    return false;
  }
}

/**
 * Process Phase 5: Assemble and Publish
 *
 * @param {Object} allPhases - Results from all previous phases
 * @returns {Object} Publication result
 */
export async function assembleAndPublish(allPhases) {
  console.log('Phase 5: Starting blog post assembly and publishing');

  try {
    // Create blog post file
    const blogPost = await createBlogPost(allPhases);

    // Get site URL
    const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const postUrl = `${siteUrl}/blog/${blogPost.slug}`;

    console.log('Phase 5 complete:', {
      postUrl,
      filename: blogPost.filename,
    });

    // Optional: Auto-commit and push
    const autoCommit = process.env.AUTO_COMMIT === 'true';
    if (autoCommit) {
      console.log('Auto-commit enabled, committing changes...');
      await commitAndPush(blogPost.filePath);
    } else {
      console.log('Auto-commit disabled. To publish, manually commit and push changes.');
    }

    return {
      success: true,
      url: postUrl,
      filename: blogPost.filename,
      slug: blogPost.slug,
      filePath: blogPost.filePath,
      publishedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Phase 5 error:', error);
    throw new Error(`Phase 5 publishing failed: ${error.message}`);
  }
}

export default { assembleAndPublish };
