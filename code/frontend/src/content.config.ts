import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			// Audio fields for podcast episodes
			audioUrl: z.string().url().optional().nullable(),
			audioDuration: z.number().optional().nullable(),
			// My Weird Prompts specific fields
			prompt: z.string().optional(),
			tags: z.array(z.string()).optional(),
			aiGenerated: z.boolean().optional(),
		}),
});

export const collections = { blog };
