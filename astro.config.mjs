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
  // Nur der statische Zweig: der Keystatic-Admin im Netlify-Zweig ist unter
  // CSP undokumentiert und dient ausschliesslich der Redaktion.
  ...(isStatic
    ? {
        security: {
          csp: {
            directives: [
              "default-src 'self'",
              // data: fuer Leaflets emptyImageUrl — ein 1x1-GIF, das es als
              // src fuer nicht ladbare Kacheln einsetzt.
              "img-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ],
            styleDirective: {
              // Gesetzte resources ersetzen Astros Defaults, deshalb 'self'
              // explizit. style-src-attr deckt die Inline-Transforms, die
              // Leaflet zur Laufzeit auf Panes und Marker schreibt; ein
              // pauschales 'unsafe-inline' in style-src wuerde Astro dazu
              // bringen, alle Style-Hashes zu unterdruecken.
              resources: ["'self'", { resource: "'unsafe-inline'", kind: "attribute" }],
            },
          },
        },
      }
    : {}),
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
    // keystatic.config.ts wird auch im Browser ausgewertet (der Admin importiert
    // die Config), liest aber process.env. Ohne diese Ersetzung zur Bauzeit
    // bricht die Hydration des Admins mit "process is not defined" ab.
    define: {
      "process.env.KEYSTATIC_STORAGE_KIND": JSON.stringify(
        process.env.KEYSTATIC_STORAGE_KIND || "local",
      ),
    },
  },
});
