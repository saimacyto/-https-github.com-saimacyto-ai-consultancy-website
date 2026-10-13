import { NTEE_MAJOR, SUBSECTION_SHORT, nteeLabel, formatEIN, compactMoney, escapeHTML } from "./codes.js";
import { F, loadIndex, showSampleNotice } from "./data.js";

const PAGE_SIZE = 25;
const COMMON_TYPES = new Set(["03", "04", "05", "06", "07", "08", "19"]);

const $ = (sel) => document.querySelector(sel);
const searchForm = $("#search");
const filterForm = $("#filters");
const sortSelect = $("#sort");

let rows = [];
let haystack = []; // lowercase searchable text per row, aligned with rows
let state = readState();

function readState() {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get("q") ?? "",
    city: p.get("city") ?? "",
    cause: p.get("cause") ?? "",
    type: p.get("type") ?? "",
    size: p.get("size") ?? "",
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    deductible: p.get("deductible") === "1",
    sort: p.get("sort") ?? "relevance",
    page: Math.max(1, Number(p.get("page")) || 1),
  };
}

function writeState() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v === "" || v === false || (k === "page" && v === 1) || (k === "sort" && v === "relevance")) continue;
    p.set(k, v === true ? "1" : v);
  }
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function syncForms() {
  searchForm.q.value = state.q;
  searchForm.city.value = state.city;
  filterForm.cause.value = state.cause;
  filterForm.type.value = state.type;
  filterForm.size.value = state.size;
  filterForm.from.value = state.from;
  filterForm.to.value = state.to;
  filterForm.deductible.checked = state.deductible;
  sortSelect.value = state.sort;
}

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ");

function score(i, query, tokens) {
  const name = haystack[i];
  if (name === query) return 1000;
  let s = 0;
  if (name.startsWith(query)) s += 400;
  else if (name.includes(` ${query}`)) s += 200;
  else if (name.includes(query)) s += 100;
  for (const t of tokens) {
    if (!name.includes(t)) return 0;
    s += name.includes(` ${t}`) || name.startsWith(t) ? 20 : 5;
  }
  return s + Math.log10(rows[i][F.REV] + 1); // tie-break toward larger orgs
}

function search() {
  const query = normalize(state.q).trim().replace(/\s+/g, " ");
  const einQuery = state.q.replace(/[\s-]/g, "");
  const isEIN = /^\d{2,9}$/.test(einQuery);
  const tokens = query.split(" ").filter(Boolean);

  const place = state.city.trim().toLowerCase();
  const isZip = /^\d{1,5}$/.test(place);
  const [minRev, maxRev] = state.size ? state.size.split("-").map((v) => (v === "" ? Infinity : Number(v))) : [];
  const from = Number(state.from) || 0;
  const to = Number(state.to) || 9999;

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (place && (isZip ? !r[F.ZIP].startsWith(place) : !r[F.CITY].toLowerCase().startsWith(place))) continue;
    if (state.cause && (r[F.NTEE][0] || "Z") !== state.cause) continue;
    if (state.type) {
      if (state.type === "other" ? COMMON_TYPES.has(r[F.SUB]) : r[F.SUB] !== state.type) continue;
    }
    if (state.size && (r[F.REV] < minRev || r[F.REV] > maxRev)) continue;
    if ((state.from || state.to) && (r[F.YEAR] < from || r[F.YEAR] > to)) continue;
    if (state.deductible && r[F.DED] !== "1") continue;

    let s = 1;
    if (isEIN) {
      if (!r[F.EIN].startsWith(einQuery)) continue;
    } else if (tokens.length) {
      s = score(i, query, tokens);
      if (!s) continue;
    }
    out.push([i, s]);
  }

  const by = {
    relevance: (a, b) => b[1] - a[1],
    name: (a, b) => rows[a[0]][F.NAME].localeCompare(rows[b[0]][F.NAME]),
    revenue: (a, b) => rows[b[0]][F.REV] - rows[a[0]][F.REV],
    newest: (a, b) => rows[b[0]][F.YEAR] - rows[a[0]][F.YEAR],
    oldest: (a, b) => (rows[a[0]][F.YEAR] || 9999) - (rows[b[0]][F.YEAR] || 9999),
  }[state.sort] ?? (() => 0);
  // With no search text, "relevance" falls back to largest organizations first.
  out.sort(state.sort === "relevance" && !tokens.length && !isEIN ? (a, b) => rows[b[0]][F.REV] - rows[a[0]][F.REV] : by);
  return out.map(([i]) => rows[i]);
}

function card(r) {
  const ntee = r[F.NTEE];
  const chips = [
    `<span class="chip">${escapeHTML(SUBSECTION_SHORT(r[F.SUB]))}</span>`,
    `<span class="chip">${escapeHTML(nteeLabel(ntee))}</span>`,
    r[F.DED] === "1" ? `<span class="chip good">Tax-deductible</span>` : "",
    r[F.YEAR] ? `<span class="chip">Since ${r[F.YEAR]}</span>` : "",
  ].join("");
  return `<article class="card">
    <div>
      <h3><a href="org.html?ein=${r[F.EIN]}">${escapeHTML(r[F.NAME])}</a></h3>
      <div class="meta">${escapeHTML(r[F.CITY])}, TX ${escapeHTML(r[F.ZIP])} · EIN ${formatEIN(r[F.EIN])}</div>
    </div>
    <div class="rev">${compactMoney(r[F.REV])}<small>revenue</small></div>
    <div class="chips">${chips}</div>
  </article>`;
}

function render() {
  const results = search();
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const slice = results.slice(start, start + PAGE_SIZE);

  $("#count").textContent = results.length
    ? `${results.length.toLocaleString()} organizations · showing ${start + 1}–${start + slice.length}`
    : "";
  $("#results").innerHTML = slice.length
    ? slice.map(card).join("")
    : `<div class="empty">No organizations match your search. Try fewer words or clear some filters.</div>`;

  const pager = $("#pager");
  pager.innerHTML = pages > 1
    ? `<button class="ghost" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>← Previous</button>
       <span>Page ${state.page} of ${pages.toLocaleString()}</span>
       <button class="ghost" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""}>Next →</button>`
    : "";
  writeState();
}

function renderBrowse() {
  const causeCounts = {};
  const cityCounts = {};
  for (const r of rows) {
    const c = r[F.NTEE][0] || "Z";
    causeCounts[c] = (causeCounts[c] ?? 0) + 1;
    cityCounts[r[F.CITY]] = (cityCounts[r[F.CITY]] ?? 0) + 1;
  }
  $("#browse-causes").innerHTML = Object.keys(NTEE_MAJOR)
    .filter((k) => causeCounts[k])
    .map((k) => `<a href="?cause=${k}">${escapeHTML(NTEE_MAJOR[k])} <b>${causeCounts[k].toLocaleString()}</b></a>`)
    .join("");
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
  $("#browse-cities").innerHTML = topCities.slice(0, 24)
    .map(([city, n]) => `<a href="?city=${encodeURIComponent(city)}">${escapeHTML(city)} <b>${n.toLocaleString()}</b></a>`)
    .join("");
  $("#city-list").innerHTML = topCities.slice(0, 500)
    .map(([city]) => `<option value="${escapeHTML(city)}">`).join("");
}

function update(patch) {
  Object.assign(state, patch, { page: patch.page ?? 1 });
  render();
}

// Cause options
$("#cause").insertAdjacentHTML("beforeend",
  Object.entries(NTEE_MAJOR).map(([k, v]) => `<option value="${k}">${escapeHTML(v)}</option>`).join(""));

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  update({ q: searchForm.q.value, city: searchForm.city.value });
});
let typing;
searchForm.q.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => update({ q: searchForm.q.value }), 200);
});
searchForm.city.addEventListener("change", () => update({ city: searchForm.city.value }));
filterForm.addEventListener("change", () => update({
  cause: filterForm.cause.value,
  type: filterForm.type.value,
  size: filterForm.size.value,
  from: filterForm.from.value,
  to: filterForm.to.value,
  deductible: filterForm.deductible.checked,
}));
$("#reset").addEventListener("click", () => {
  update({ cause: "", type: "", size: "", from: "", to: "", deductible: false });
  syncForms();
});
sortSelect.addEventListener("change", () => update({ sort: sortSelect.value }));
$("#pager").addEventListener("click", (e) => {
  const page = Number(e.target.dataset?.page);
  if (!page) return;
  update({ page });
  $("#count").scrollIntoView({ behavior: "smooth", block: "start" });
});

syncForms();
showSampleNotice();
try {
  rows = await loadIndex();
  haystack = rows.map((r) => normalize(`${r[F.NAME]} ${r[F.SORT] && r[F.SORT] !== r[F.NAME] ? r[F.SORT] : ""}`).trim());
  $("#stats").textContent = `${rows.length.toLocaleString()} Texas organizations in the directory`;
  renderBrowse();
  render();
} catch (err) {
  $("#stats").textContent = "";
  $("#results").innerHTML = `<div class="empty">${escapeHTML(err.message)}. Build the data first with <code>node scripts/build-data.mjs</code>.</div>`;
}
