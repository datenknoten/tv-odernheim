import 'dotenv/config';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import netlify from '@astrojs/netlify';

const { ASTRO_USE_NETLIFY_ADAPTER } = process.env;

const isNetlify = ASTRO_USE_NETLIFY_ADAPTER === 'true';
const isStatic = !isNetlify;

export default defineConfig({
  site: 'https://www.tv-odernheim.de',
  output: isNetlify ? 'server' : 'static',
  adapter: isNetlify ? netlify() : undefined,
  integrations: [
    ...(isStatic ? [] : [react()]),
    markdoc(),
    ...(isStatic ? [] : [keystatic()]),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
    define: {
      'process.env.KEYSTATIC_STORAGE_KIND': JSON.stringify(process.env.KEYSTATIC_STORAGE_KIND || 'local'),
    },
    optimizeDeps: {
      exclude: ['lightningcss'],
    },
    ssr: {
      external: ['lightningcss'],
    },
  },
});
