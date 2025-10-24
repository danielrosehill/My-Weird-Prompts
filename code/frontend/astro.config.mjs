// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://my-weird-prompts.vercel.app', // Update this with your actual Vercel domain
	output: 'static',
	adapter: vercel(),
	integrations: [mdx(), sitemap()],
});
