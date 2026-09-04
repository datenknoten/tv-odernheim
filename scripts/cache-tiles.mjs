#!/usr/bin/env node
// Cache OSM raster tiles for the Disibodenberglauf routes into public/tiles/.
//
// The bbox is the union of all route GPX files (Hauptlauf + Bambini/Kinder/
// Jugend). The kids' loops start/finish at the Turnhalle inside the main
// route's area, so they barely widen the bbox.
//
// OSM tile usage policy (https://operations.osmfoundation.org/policies/tiles/)
// forbids bulk downloading. The full routes cover ~125 tiles at z=13..16, plus
// ~65 z=17 tiles over the short kids' loops only — all "minor use".
// Re-runs skip existing files,
// so adding/updating a GPX only fetches the delta. If you ever need to refresh
// frequently or expand the zoom range, switch to a provider that permits it
// (Stadia Maps, MapTiler, OpenFreeMap) or host your own tileserver.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const GPX_DIR = resolve(ROOT, "public/disibodenberglauf");
const GPX_FILES = ["strecke.gpx", "bambini.gpx", "kinder.gpx", "kinder1km.gpx", "jugend.gpx"];
// Short kids' loops get an extra high-zoom level (z17) over their own tight
// bbox only — the wide main route at z17 would be ~250 tiles and push past the
// OSM "minor use" policy, whereas the loops add only a few dozen.
const SHORT_GPX_FILES = ["bambini.gpx", "kinder.gpx", "kinder1km.gpx", "jugend.gpx"];
const OUT_DIR = resolve(ROOT, "public/tiles");
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const USER_AGENT =
  "TVOdernheimWebsite/1.0 (+https://tv-odernheim.de; route map tile cache, ~200 tiles)";
const ZOOM_LEVELS = [13, 14, 15, 16];
const HIGH_ZOOM_LEVELS = [17];
// The map container is much wider than tall on desktop, but fitBounds scales
// to the route's bbox — so we cache a wide horizontal strip to fill the
// viewport instead of gray gutters. Lat padding stays small; the route
// already fills the container height.
const PADDING_LAT = 0.003;
const PADDING_LON = 0.025;
// Tighter padding for the high-zoom kids' bbox — no wide desktop strip needed.
const PADDING_LAT_SHORT = 0.0008;
const PADDING_LON_SHORT = 0.0015;
const RATE_LIMIT_MS = 1100;

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) =>
  Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const pointsByFile = {};
for (const file of GPX_FILES) {
  const filePath = resolve(GPX_DIR, file);
  if (!(await exists(filePath))) {
    console.log(`  · ${file} not found, skipping`);
    continue;
  }
  const gpx = await readFile(filePath, "utf8");
  const filePoints = [...gpx.matchAll(/<trkpt\s+lat="([\d.]+)"\s+lon="([\d.]+)"/g)].map((m) => ({
    lat: Number.parseFloat(m[1]),
    lon: Number.parseFloat(m[2]),
  }));
  console.log(`  ✓ ${file}: ${filePoints.length} trackpoints`);
  pointsByFile[file] = filePoints;
}
const allPoints = Object.values(pointsByFile).flat();
if (allPoints.length === 0) {
  console.error(`No trackpoints found in ${GPX_DIR}`);
  process.exit(1);
}
const shortPoints = SHORT_GPX_FILES.flatMap((f) => pointsByFile[f] ?? []);

const bbox = (pts, padLat, padLon) => {
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  return {
    minLat: Math.min(...lats) - padLat,
    maxLat: Math.max(...lats) + padLat,
    minLon: Math.min(...lons) - padLon,
    maxLon: Math.max(...lons) + padLon,
  };
};

const tiles = [];
const seen = new Set();
const addTiles = (box, zooms) => {
  for (const z of zooms) {
    const xMin = lon2x(box.minLon, z);
    const xMax = lon2x(box.maxLon, z);
    const yMin = lat2y(box.maxLat, z);
    const yMax = lat2y(box.minLat, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const key = `${z}/${x}/${y}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        tiles.push({ z, x, y });
      }
    }
  }
};

const baseBox = bbox(allPoints, PADDING_LAT, PADDING_LON);
addTiles(baseBox, ZOOM_LEVELS);
if (shortPoints.length > 0) {
  addTiles(bbox(shortPoints, PADDING_LAT_SHORT, PADDING_LON_SHORT), HIGH_ZOOM_LEVELS);
}

console.log(
  `Base bbox: ${baseBox.minLat.toFixed(5)},${baseBox.minLon.toFixed(5)} → ${baseBox.maxLat.toFixed(5)},${baseBox.maxLon.toFixed(5)}`,
);
console.log(
  `Zooms: ${ZOOM_LEVELS.join(", ")} (full) + ${HIGH_ZOOM_LEVELS.join(", ")} (kids)  |  Tiles: ${tiles.length}`,
);
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

console.log(`\nDone. downloaded=${downloaded}  skipped=${skipped}  failed=${failed}`);
if (failed > 0) {
  process.exit(1);
}
