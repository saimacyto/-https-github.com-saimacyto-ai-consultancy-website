#!/usr/bin/env node
// Builds the directory's data files from the IRS Exempt Organizations
// Business Master File (EO BMF) extract for Texas.
//
//   node scripts/build-data.mjs                     # download eo_tx.csv from irs.gov
//   node scripts/build-data.mjs --input file.csv    # use a local copy
//   node scripts/build-data.mjs --input sample/eo_tx_sample.csv --sample
//
// Output (written to ./data):
//   index.json        compact search index, one row per organization
//   orgs/NN.json      full records, sharded by the first two digits of the EIN
//   meta.json         build date, source, record count

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const IRS_URL = "https://www.irs.gov/pub/irs-soi/eo_tx.csv";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data");

const args = process.argv.slice(2);
const inputIdx = args.indexOf("--input");
const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : null;
const isSample = args.includes("--sample");

// RFC 4180 CSV parser (handles quoted fields, embedded commas and quotes).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const titleCase = (s) =>
  s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Of|And|The|For|In|On|At|To|A|An)\b/g, (m, w, off) => (off === 0 ? m : m.toLowerCase()))
    .replace(/\b(Inc|Llc|Usa|Ymca|Ywca|Pta|Ptsa|Pto|Vfw|Ii|Iii|Iv)\b/gi, (m) =>
      ({ inc: "Inc", llc: "LLC" })[m.toLowerCase()] ?? m.toUpperCase());

const num = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

async function loadCSV() {
  if (inputPath) return readFile(inputPath, "utf8");
  console.log(`Downloading ${IRS_URL} ...`);
  // irs.gov sometimes rejects requests without a browser-like User-Agent; retry transient failures.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(IRS_URL, { headers: { "User-Agent": "Mozilla/5.0 (texas-nonprofit-directory data build)" } });
    if (res.ok) return res.text();
    if (attempt === 4) throw new Error(`IRS download failed: HTTP ${res.status}`);
    console.log(`HTTP ${res.status}, retrying in ${2 ** attempt}s ...`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
}

const text = await loadCSV();
const [header, ...records] = parseCSV(text);
const col = Object.fromEntries(header.map((h, i) => [h.trim().toUpperCase(), i]));
for (const required of ["EIN", "NAME", "CITY", "STATE", "ZIP", "SUBSECTION"]) {
  if (!(required in col)) throw new Error(`Missing column ${required} in input`);
}
const get = (r, k) => (k in col ? (r[col[k]] ?? "").trim() : "");

const index = [];
const shards = {};
for (const r of records) {
  if (get(r, "STATE") !== "TX") continue;
  const ein = get(r, "EIN").padStart(9, "0");
  const ruling = get(r, "RULING");
  const org = {
    ein,
    name: titleCase(get(r, "NAME")),
    careOf: get(r, "ICO") ? titleCase(get(r, "ICO").replace(/^%\s*/, "")) : "",
    street: titleCase(get(r, "STREET")),
    city: titleCase(get(r, "CITY")),
    state: "TX",
    zip: get(r, "ZIP"),
    group: get(r, "GROUP"),
    subsection: get(r, "SUBSECTION").padStart(2, "0"),
    affiliation: get(r, "AFFILIATION"),
    classification: get(r, "CLASSIFICATION"),
    ruling,
    deductibility: get(r, "DEDUCTIBILITY"),
    foundation: get(r, "FOUNDATION").padStart(2, "0"),
    organization: get(r, "ORGANIZATION"),
    status: get(r, "STATUS"),
    taxPeriod: get(r, "TAX_PERIOD"),
    assetCode: get(r, "ASSET_CD"),
    incomeCode: get(r, "INCOME_CD"),
    filingReq: get(r, "FILING_REQ_CD"),
    pfFilingReq: get(r, "PF_FILING_REQ_CD"),
    assets: num(get(r, "ASSET_AMT")),
    income: num(get(r, "INCOME_AMT")),
    revenue: num(get(r, "REVENUE_AMT")),
    ntee: get(r, "NTEE_CD"),
    sortName: titleCase(get(r, "SORT_NAME")),
  };
  // Compact index row: [ein, name, city, zip5, ntee, subsection, revenue, rulingYear, deductibility, sortName, assets]
  index.push([
    org.ein, org.name, org.city, org.zip.slice(0, 5), org.ntee, org.subsection,
    org.revenue, ruling ? Number(ruling.slice(0, 4)) || 0 : 0, org.deductibility, org.sortName, org.assets,
  ]);
  (shards[ein.slice(0, 2)] ??= {})[ein] = org;
}

index.sort((a, b) => a[1].localeCompare(b[1]));

await rm(join(OUT, "orgs"), { recursive: true, force: true });
await mkdir(join(OUT, "orgs"), { recursive: true });
await writeFile(join(OUT, "index.json"), JSON.stringify(index));
for (const [prefix, orgs] of Object.entries(shards)) {
  await writeFile(join(OUT, "orgs", `${prefix}.json`), JSON.stringify(orgs));
}
const meta = {
  generated: new Date().toISOString(),
  source: inputPath && !isSample ? `local file ${inputPath}` : isSample ? "sample" : IRS_URL,
  sample: isSample,
  count: index.length,
};
await writeFile(join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
console.log(`Wrote ${index.length} Texas organizations across ${Object.keys(shards).length} shards.`);
