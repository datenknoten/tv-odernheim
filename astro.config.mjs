import "dotenv/config";
import markdoc from "@astrojs/markdoc";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

const { ASTRO_USE_NETLIFY_ADAPTER } = process.env;

const isNetlify = ASTRO_USE_NETLIFY_ADAPTER === "true";
const isStatic = !isNetlify;

export default defineConfig({
	site: "https://www.tv-odernheim.de",
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: "Inter",
			cssVariable: "--font-inter",
			weights: ["100 900"],
			styles: ["normal"],
			subsets: ["latin", "latin-ext"],
			fallbacks: ["system-ui", "sans-serif"],
		},
	],
	image: { layout: "constrained" },
	output: isNetlify ? "server" : "static",
	adapter: isNetlify ? netlify() : undefined,
	integrations: [
		...(isStatic ? [] : [react()]),
		markdoc(),
		sitemap(),
		...(isStatic ? [] : [keystatic()]),
	],
	vite: {
		plugins: [tailwindcss()],
		server: { allowedHosts: true },
		preview: { allowedHosts: true },
		define: {
			"process.env.KEYSTATIC_STORAGE_KIND": JSON.stringify(
				process.env.KEYSTATIC_STORAGE_KIND || "local",
			),
		},
	},
});
