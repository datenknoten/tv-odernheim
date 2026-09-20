#!/usr/bin/env node
// Fetch the published Disibodenberglauf result lists from raceresult into
// src/data/disibodenberglauf-ergebnisse/<jahr>.json — one file per edition.
//
// raceresult serves a public result list through two endpoints: `results/config`
// hands out a per-event API key, the data server host, the contest names and the
// result lists the organiser published; `results/list` returns the rows.
//
// The list layout changed over the years, so nothing about it is hardcoded:
//   · The age-group list is picked by name ("Ergebnisliste AK"), otherwise the
//     first published list is used.
//   · Editions up to 2025 publish one list instance per contest, addressed by
//     the numeric contest id and grouped contest → age group. 2026 publishes a
//     single list over all contests that only answers with the *first* contest
//     unless the group filter `f` is set: three group levels (contest / sex /
//     age group) separated by form feeds (U+000C), empty = all.
//   · Columns are mapped by the list's field expressions (`list.Fields`), never
//     by position — 2026 has Netto and Brutto, the older lists a single "Zeit".
//     An unknown expression aborts the run instead of dropping data silently.
//
// Editions are registered below; ids and dates come from the raceresult event
// search (https://my.raceresult.com/RREvents/list?filter=Rund+um+den+Disibodenberg).
// Not registered: the cancelled 2020 edition (160310) and the virtual 2021 run
// (168689, "1. Lauf … virtuell"), which would collide with the real 2021 event.
//
// Usage: node scripts/fetch-disi-results.mjs [jahr …]   (default: all editions)

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const OUT_DIR = resolve(ROOT, "src/data/disibodenberglauf-ergebnisse");

const EVENTS = [
  { year: 2016, eventId: 60_472, eventDate: "2016-10-08" },
  { year: 2017, eventId: 82_722, eventDate: "2017-10-21" },
  { year: 2018, eventId: 108_531, eventDate: "2018-10-20" },
  { year: 2019, eventId: 136_471, eventDate: "2019-10-19" },
  { year: 2021, eventId: 181_342, eventDate: "2021-10-23" },
  { year: 2022, eventId: 223_304, eventDate: "2022-10-15" },
  { year: 2023, eventId: 258_444, eventDate: "2023-10-14" },
  { year: 2024, eventId: 307_331, eventDate: "2024-10-12" },
  { year: 2025, eventId: 325_942, eventDate: "2025-10-11" },
  { year: 2026, eventId: 405_238, eventDate: "2026-09-19" },
];

// raceresult prefixes every group key with its sort position, e.g. "#1_Männlich".
const GROUP_PREFIX = /^#\d+_/;
// Name of the per-age-group list; the alternative is a plain finish-order list.
const AGE_GROUP_LIST = /ergebnisliste ak/i;
// Row expression (lower case) → property of a result entry.
const FIELD_MAP = {
  bib: "startnr",
  anzeigename: "name",
  year: "jg",
  club: "verein",
};
// Time columns vary per edition and end up in `zeiten`, keyed like this.
const TIME_FIELDS = {
  "ziel.chip": "netto",
  "ziel.gun": "brutto",
  zieleinlauf: "zeit",
};
// Redundant in our output: the internal id, the flag (always DE) and the sex,
// which the age group name already carries.
const IGNORED_FIELDS = new Set(["id", "nation.flag", "geschlechtmw"]);
const PLACE_EXPRESSION = /akpl|autorank/;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Picks the result list to import and the contests it is published for. A list
 * bound to contest 0 covers all contests at once and needs the group filter.
 */
function pickList(config) {
  const published = config.TabConfig?.Lists ?? [];
  const ageGroupLists = published.filter((list) => AGE_GROUP_LIST.test(list.Name));
  const lists = ageGroupLists.length > 0 ? ageGroupLists : published;
  if (lists.length === 0) {
    throw new Error("Keine Ergebnisliste veröffentlicht");
  }
  const perContest = lists.some((list) => String(list.Contest) !== "0");
  const contestIds = perContest
    ? [...new Set(lists.map((list) => String(list.Contest)))]
    : Object.keys(config.contests);
  return {
    listName: lists[0].Name,
    perContest,
    contestIds: contestIds.sort((a, b) => Number(a) - Number(b)),
  };
}

/**
 * Maps the row layout to indices; throws on a column we do not know yet.
 * `DataFields` describes the row: the first two entries are the bib and the
 * internal participant id, then the list columns — minus the ones raceresult
 * already served in that prefix (older lists drop their "Startnr." column).
 * Labels come from the list definition, which uses the same expressions.
 */
function mapColumns(dataFields, fields) {
  const columns = { platz: -1, startnr: -1, name: -1, jg: -1, verein: -1, times: [] };
  dataFields.forEach((dataField, row) => {
    const expression = dataField.toLowerCase();
    if (IGNORED_FIELDS.has(expression)) {
      return;
    }
    const time = TIME_FIELDS[expression];
    if (time) {
      const label = fields.find((f) => f.Expression.toLowerCase() === expression)?.Label;
      columns.times.push({ key: time, label: label ?? "Zeit", row });
      return;
    }
    const property = PLACE_EXPRESSION.test(expression) ? "platz" : FIELD_MAP[expression];
    if (!property) {
      throw new Error(`Unbekannte Spalte "${dataField}"`);
    }
    // The bib shows up twice in newer lists; the prefix column wins.
    if (columns[property] === -1) {
      columns[property] = row;
    }
  });
  for (const [property, row] of Object.entries(columns)) {
    if (row === -1) {
      throw new Error(`Spalte für "${property}" fehlt in der Ergebnisliste`);
    }
  }
  if (columns.times.length === 0) {
    throw new Error("Ergebnisliste ohne Zeitspalte");
  }
  return columns;
}

/**
 * Walks the nested group objects down to the row arrays and returns one entry
 * per group, carrying the cleaned group keys from the outside in
 * (contest → [sex] → age group).
 */
function collectGroups(node, path = []) {
  if (Array.isArray(node)) {
    return [{ path, rows: node }];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    collectGroups(child, [...path, key.replace(GROUP_PREFIX, "")]),
  );
}

function toAgeGroups(data, columns) {
  return collectGroups(data).map(({ path, rows }) => ({
    name: path.at(-1),
    // Only the 2026 list groups by sex; otherwise the age group name carries it.
    ...(path.length > 2 ? { sex: path.at(-2) } : {}),
    results: rows.map((row) => ({
      platz: Number.parseInt(row[columns.platz], 10),
      startnr: Number(row[columns.startnr]),
      name: row[columns.name],
      jg: Number(row[columns.jg]),
      verein: row[columns.verein],
      zeiten: Object.fromEntries(columns.times.map(({ key, row: i }) => [key, row[i]])),
    })),
  }));
}

/** Builds the results/list URL for one contest of an edition. */
function listUrl(event, config, list, contestId) {
  const query = new URLSearchParams({
    key: config.key,
    listname: list.listName,
    page: "results",
    contest: list.perContest ? contestId : "0",
    r: "all",
    l: "0",
    openedGroups: "{}",
    term: "",
  });
  if (!list.perContest) {
    query.set("f", `${config.contests[contestId]}\f\f`);
  }
  return `https://${config.server}/${event.eventId}/results/list?${query}`;
}

async function fetchEvent(event) {
  const config = await fetchJson(
    `https://my.raceresult.com/${event.eventId}/results/config?lang=de&sanitize=true`,
  );
  const list = pickList(config);
  console.log(`${event.year} · ${config.eventname} · Liste "${list.listName}"`);

  const contests = [];
  let timeColumns = null;
  let total = 0;

  for (const contestId of list.contestIds) {
    const name = config.contests[contestId];
    const response = await fetchJson(listUrl(event, config, list, contestId));

    const columns = mapColumns(response.DataFields, response.list.Fields);
    const current = columns.times.map(({ key, label }) => ({ key, label }));
    if (timeColumns && JSON.stringify(timeColumns) !== JSON.stringify(current)) {
      throw new Error(`Uneinheitliche Zeitspalten in "${name}"`);
    }
    timeColumns = current;

    const ageGroups = toAgeGroups(response.data ?? {}, columns);
    const rows = ageGroups.reduce((sum, group) => sum + group.results.length, 0);
    total += rows;
    contests.push({ name, ageGroups });
    console.log(`  · ${name}: ${ageGroups.length} Altersklassen, ${rows} Ergebnisse`);
  }

  if (total === 0) {
    throw new Error(`Keine Ergebnisse für ${event.year} geladen`);
  }

  return {
    data: {
      year: event.year,
      eventName: config.eventname,
      eventDate: event.eventDate,
      sourceUrl: `https://my.raceresult.com/${event.eventId}/results`,
      timeColumns,
      contests,
    },
    total,
  };
}

const wanted = process.argv.slice(2).map(Number);
const selected = wanted.length > 0 ? EVENTS.filter((e) => wanted.includes(e.year)) : EVENTS;
if (selected.length === 0) {
  throw new Error(`Keine Austragung für ${wanted.join(", ")} registriert`);
}

await mkdir(OUT_DIR, { recursive: true });
let grandTotal = 0;
for (const event of selected) {
  const { data, total } = await fetchEvent(event);
  grandTotal += total;
  await writeFile(resolve(OUT_DIR, `${event.year}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  → ${total} Zeilen in src/data/disibodenberglauf-ergebnisse/${event.year}.json`);
}
console.log(`Fertig: ${grandTotal} Ergebnisse aus ${selected.length} Austragungen.`);
