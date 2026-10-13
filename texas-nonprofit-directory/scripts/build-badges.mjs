#!/usr/bin/env node
// Writes data/badges/<EIN>.svg for every approved profile in data/verified.json.
// The year on each badge is the year the profile was last reviewed (verifiedOn).
//
//   node scripts/build-badges.mjs        # also runs at the end of build-data.mjs

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { badgeSVG, BADGE_LEVELS } from "./badge-svg.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

export async function buildBadges() {
  let verified = {};
  try { verified = JSON.parse(await readFile(join(DATA, "verified.json"), "utf8")); }
  catch (err) { if (err.code !== "ENOENT") throw err; }

  const dir = join(DATA, "badges");
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  let n = 0;
  for (const [ein, profile] of Object.entries(verified)) {
    if (!/^\d{9}$/.test(ein)) { console.warn(`Skipping badge for invalid EIN "${ein}"`); continue; }
    if (!BADGE_LEVELS.includes(profile.level)) { console.warn(`Skipping badge for ${ein}: unknown level "${profile.level}"`); continue; }
    const year = Number(String(profile.verifiedOn ?? "").slice(0, 4)) || new Date().getFullYear();
    await writeFile(join(dir, `${ein}.svg`), badgeSVG(profile.level, year));
    n++;
  }
  console.log(`Wrote ${n} Star badge${n === 1 ? "" : "s"}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await buildBadges();
