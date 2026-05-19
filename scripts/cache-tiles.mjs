#!/usr/bin/env node
// Cache OSM raster tiles for the Disibodenberglauf route into public/tiles/.
//
// OSM tile usage policy (https://operations.osmfoundation.org/policies/tiles/)
// forbids bulk downloading. The route covers ~22 tiles at z=13..16, so this
// is a one-off small cache. Re-runs skip existing files, so updating the GPX
// only fetches the delta. If you ever need to refresh frequently or expand
// the zoom range, switch to a provider that permits it (Stadia Maps, MapTiler,
// OpenFreeMap) or host your own tileserver.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const GPX_PATH = resolve(ROOT, "public/disibodenberglauf/strecke.gpx");
const OUT_DIR = resolve(ROOT, "public/tiles");
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const USER_AGENT =
	"TVOdernheimWebsite/1.0 (+https://tv-odernheim.de; route map tile cache, ~22 tiles)";
const ZOOM_LEVELS = [13, 14, 15, 16];
const PADDING_DEG = 0.001;
const RATE_LIMIT_MS = 1100;

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * (1 << z));
const lat2y = (lat, z) =>
	Math.floor(
		((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * (1 << z),
	);

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

const gpx = await readFile(GPX_PATH, "utf8");
const points = [...gpx.matchAll(/<trkpt\s+lat="([\d.]+)"\s+lon="([\d.]+)"/g)].map(
	(m) => ({ lat: +m[1], lon: +m[2] }),
);
if (points.length === 0) {
	console.error(`No trackpoints found in ${GPX_PATH}`);
	process.exit(1);
}
const lats = points.map((p) => p.lat);
const lons = points.map((p) => p.lon);
const minLat = Math.min(...lats) - PADDING_DEG;
const maxLat = Math.max(...lats) + PADDING_DEG;
const minLon = Math.min(...lons) - PADDING_DEG;
const maxLon = Math.max(...lons) + PADDING_DEG;

const tiles = [];
for (const z of ZOOM_LEVELS) {
	const xMin = lon2x(minLon, z);
	const xMax = lon2x(maxLon, z);
	const yMin = lat2y(maxLat, z);
	const yMax = lat2y(minLat, z);
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			tiles.push({ z, x, y });
		}
	}
}

console.log(
	`Bbox: ${minLat.toFixed(5)},${minLon.toFixed(5)} → ${maxLat.toFixed(5)},${maxLon.toFixed(5)}`,
);
console.log(`Zooms: ${ZOOM_LEVELS.join(", ")}  |  Tiles: ${tiles.length}`);
console.log(`Target: ${OUT_DIR}\n`);

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const { z, x, y } of tiles) {
	const path = resolve(OUT_DIR, `${z}/${x}/${y}.png`);
	if (await exists(path)) {
		skipped++;
		continue;
	}
	const url = TILE_URL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
	try {
		const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
		if (!res.ok) {
			console.warn(`  ! ${z}/${x}/${y}  HTTP ${res.status}`);
			failed++;
			continue;
		}
		const buf = Buffer.from(await res.arrayBuffer());
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, buf);
		downloaded++;
		console.log(`  + ${z}/${x}/${y}  (${(buf.length / 1024).toFixed(1)} KB)`);
		await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
	} catch (e) {
		console.error(`  x ${z}/${x}/${y}  ${e.message}`);
		failed++;
	}
}

console.log(
	`\nDone. downloaded=${downloaded}  skipped=${skipped}  failed=${failed}`,
);
if (failed > 0) process.exit(1);
