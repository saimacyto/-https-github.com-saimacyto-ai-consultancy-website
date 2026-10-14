import { NTEE_MAJOR, SUBSECTION_SHORT, nteeLabel, formatEIN, compactMoney, escapeHTML, avatar } from "./codes.js";
import { F, loadIndex, showSampleNotice } from "./data.js";
import { STARS, starBadge, loadVerified } from "./tiers.js";
import { saveButton, toggleOrg, saveSearch, savedReady } from "./saved.js";

const PAGE_SIZE = 20;
const COMMON_TYPES = new Set(["03", "04", "05", "06", "07", "08", "19"]);
const SIZE_LABELS = { "0-0": "No revenue reported", "1-99999": "Under $100K", "100000-999999": "$100K – $1M", "1000000-9999999": "$1M – $10M", "10000000-": "$10M+" };
const TYPE_LABELS = { "03": "501(c)(3)", "04": "501(c)(4)", "05": "501(c)(5)", "06": "501(c)(6)", "07": "501(c)(7)", "08": "501(c)(8)", "19": "501(c)(19)", other: "Other types" };
const SORT_LABELS = { relevance: "Relevance", name: "Name", revenue: "Largest revenue", assets: "Largest assets", newest: "Newest", oldest: "Oldest" };
const SUB_TYPE = { "03": "Public charity", "04": "Social welfare org", "05": "Labor / agricultural org", "06": "Business league", "07": "Social club", "08": "Fraternal society", "19": "Veterans org" };

const $ = (sel) => document.querySelector(sel);
const searchForm = $("#search");
const filterForm = $("#filters");
const sortSelect = $("#sort");

let rows = [];
let haystack = []; // normalized searchable text per row, aligned with rows
let verified = {}; // EIN -> approved profile (data/verified.json)
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
    starred: p.get("starred") === "1",
    tab: p.get("tab") ?? "all",
    view: p.get("view") ?? "list",
    sort: p.get("sort") ?? "relevance",
    page: Math.max(1, Number(p.get("page")) || 1),
  };
}

const DEFAULTS = { page: 1, sort: "relevance", tab: "all", view: "list" };
function writeState() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v === "" || v === false || DEFAULTS[k] === v) continue;
    p.set(k, v === true ? "1" : v);
  }
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function syncForms() {
  searchForm.q.value = state.q;
  searchForm.city.value = state.city;
  for (const k of ["cause", "type", "size", "from", "to"]) filterForm[k].value = state[k];
  filterForm.deductible.checked = state.deductible;
  filterForm.starred.checked = state.starred;
  sortSelect.value = state.sort;
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === state.tab));
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === state.view));
}

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const starRank = (ein) => STARS[verified[ein]?.level]?.rank ?? 0;

// Parses the query: "quoted text" must appear as an exact phrase; other words must all appear.
function parseQuery(q) {
  const phrases = [];
  const rest = q.replace(/"([^"]+)"/g, (_, p) => { const n = normalize(p); if (n) phrases.push(n); return " "; });
  return { phrases, tokens: normalize(rest).split(" ").filter(Boolean) };
}

function score(i, query, tokens, phrases) {
  const name = haystack[i];
  for (const p of phrases) if (!(` ${name} `).includes(` ${p} `)) return 0;
  if (phrases.length === 1 && !tokens.length && name === phrases[0]) return 2000;
  if (name === query) return 1000;
  let s = phrases.length ? 300 : 0;
  if (query && name.startsWith(query)) s += 400;
  else if (query && name.includes(` ${query}`)) s += 200;
  else if (query && name.includes(query)) s += 100;
  for (const t of tokens) {
    if (!name.includes(t)) return 0;
    s += name.includes(` ${t}`) || name.startsWith(t) ? 20 : 5;
  }
  // Earned Stars give a small boost; membership plans never affect ranking.
  return s + starRank(rows[i][F.EIN]) * 8 + Math.log10(rows[i][F.REV] + 1);
}

function search() {
  const { phrases, tokens } = parseQuery(state.q);
  const query = tokens.join(" ");
  const einQuery = state.q.replace(/[\s-"]/g, "");
  const isEIN = /^\d{2,9}$/.test(einQuery);
  const hasText = tokens.length || phrases.length;

  const place = state.city.trim().toLowerCase();
  const isZip = /^\d{1,5}$/.test(place);
  const [minRev, maxRev] = state.size ? state.size.split("-").map((v) => (v === "" ? Infinity : Number(v))) : [];
  const from = Number(state.from) || 0;
  const to = Number(state.to) || 9999;

  const out = [];
  const tabCounts = { all: 0, charities: 0, other: 0, starred: 0 };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (place && (isZip ? !r[F.ZIP].startsWith(place) : !r[F.CITY].toLowerCase().startsWith(place))) continue;
    if (state.cause && (r[F.NTEE][0] || "Z") !== state.cause) continue;
    if (state.type && (state.type === "other" ? COMMON_TYPES.has(r[F.SUB]) : r[F.SUB] !== state.type)) continue;
    if (state.size && (r[F.REV] < minRev || r[F.REV] > maxRev)) continue;
    if ((state.from || state.to) && (r[F.YEAR] < from || r[F.YEAR] > to)) continue;
    if (state.deductible && r[F.DED] !== "1") continue;
    const starred = starRank(r[F.EIN]) > 0;
    if (state.starred && !starred) continue;

    let s = 1;
    if (isEIN) {
      if (!r[F.EIN].startsWith(einQuery)) continue;
    } else if (hasText) {
      s = score(i, query, tokens, phrases);
      if (!s) continue;
    }
    const charity = r[F.SUB] === "03";
    tabCounts.all++;
    if (charity) tabCounts.charities++; else tabCounts.other++;
    if (starred) tabCounts.starred++;
    if (state.tab === "charities" && !charity) continue;
    if (state.tab === "other" && charity) continue;
    if (state.tab === "starred" && !starred) continue;
    out.push([i, s]);
  }

  const rev = (a, b) => rows[b[0]][F.REV] - rows[a[0]][F.REV];
  const by = {
    relevance: hasText || isEIN
      ? (a, b) => b[1] - a[1]
      : (a, b) => starRank(rows[b[0]][F.EIN]) - starRank(rows[a[0]][F.EIN]) || rev(a, b),
    name: (a, b) => rows[a[0]][F.NAME].localeCompare(rows[b[0]][F.NAME]),
    revenue: rev,
    assets: (a, b) => rows[b[0]][F.ASSETS] - rows[a[0]][F.ASSETS],
    newest: (a, b) => rows[b[0]][F.YEAR] - rows[a[0]][F.YEAR],
    oldest: (a, b) => (rows[a[0]][F.YEAR] || 9999) - (rows[b[0]][F.YEAR] || 9999),
  }[state.sort] ?? (() => 0);
  out.sort(by);
  return { results: out.map(([i]) => rows[i]), tabCounts };
}

function card(r) {
  const v = verified[r[F.EIN]];
  const aka = r[F.SORT] && normalize(r[F.SORT]) !== normalize(r[F.NAME]) ? r[F.SORT] : "";
  const chips = [
    `<span class="chip">${escapeHTML(nteeLabel(r[F.NTEE]))}</span>`,
    r[F.DED] === "1" ? `<span class="chip good">Tax-deductible</span>` : "",
    r[F.YEAR] ? `<span class="chip">Since ${r[F.YEAR]}</span>` : "",
  ].join("");
  return `<article class="card">
    ${avatar(r[F.NAME], r[F.NTEE])}
    <div class="who">
      <h3><a href="org.html?ein=${r[F.EIN]}">${escapeHTML(r[F.NAME])}</a>${v ? starBadge(v.level) : ""}</h3>
      ${aka ? `<div class="aka">aka ${escapeHTML(aka)}</div>` : ""}
      <div class="meta">${escapeHTML(r[F.CITY])}, TX</div>
    </div>
    <dl class="ids"><dt>EIN</dt><dd>EIN: ${formatEIN(r[F.EIN])}</dd><dt>Type</dt><dd>${escapeHTML(SUBSECTION_SHORT(r[F.SUB]))} ${escapeHTML(SUB_TYPE[r[F.SUB]] ?? "")}</dd></dl>
    <dl class="money"><dt>Total revenue:</dt><dd>${compactMoney(r[F.REV])}</dd><dt>Total assets:</dt><dd>${compactMoney(r[F.ASSETS])}</dd></dl>
    ${v?.mission ? `<p class="mission">${escapeHTML(v.mission)}</p>` : ""}
    <div class="chips">${chips}${saveButton(r[F.EIN])}</div>
  </article>`;
}

function table(slice) {
  return `<div class="table-scroll"><table class="results-table">
    <thead><tr><th>Organization</th><th>City</th><th>EIN</th><th>Type</th><th>Cause</th><th class="num">Revenue</th><th class="num">Assets</th><th>Star</th></tr></thead>
    <tbody>${slice.map((r) => {
      const v = verified[r[F.EIN]];
      return `<tr><td><a href="org.html?ein=${r[F.EIN]}">${escapeHTML(r[F.NAME])}</a></td><td>${escapeHTML(r[F.CITY])}</td><td>${formatEIN(r[F.EIN])}</td>
        <td>${escapeHTML(SUBSECTION_SHORT(r[F.SUB]))}</td><td>${escapeHTML(nteeLabel(r[F.NTEE]))}</td>
        <td class="num">${compactMoney(r[F.REV])}</td><td class="num">${compactMoney(r[F.ASSETS])}</td><td>${v ? starBadge(v.level) : ""}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}

function activeFilters() {
  const list = [];
  if (state.city) list.push(["city", state.city]);
  if (state.cause) list.push(["cause", NTEE_MAJOR[state.cause]]);
  if (state.type) list.push(["type", TYPE_LABELS[state.type]]);
  if (state.size) list.push(["size", SIZE_LABELS[state.size]]);
  if (state.from || state.to) list.push(["years", `Exempt ${state.from || "…"}–${state.to || "now"}`]);
  if (state.deductible) list.push(["deductible", "Tax-deductible"]);
  if (state.starred) list.push(["starred", "Has a Star"]);
  return list;
}

function render() {
  const { results, tabCounts } = search();
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const slice = results.slice(start, start + PAGE_SIZE);

  const filters = activeFilters();
  const sortText = SORT_LABELS[state.sort];
  $("#summary").innerHTML = state.q
    ? `Search results for “${escapeHTML(state.q)}”, sorted by ${sortText}`
    : `All Texas organizations${filters.length ? " matching your filters" : ""}, sorted by ${sortText}`;
  $("#clear-keywords").hidden = !state.q;
  $("#save-search").hidden = !state.q && !filters.length;
  $("#active-filters").innerHTML = filters
    .map(([k, label]) => `<button type="button" data-clear="${k}" aria-label="Remove filter ${escapeHTML(label)}">${escapeHTML(label)} <span aria-hidden="true">×</span></button>`)
    .join("");
  $("#filter-count").hidden = !filters.filter(([k]) => k !== "city").length;
  $("#filter-count").textContent = filters.filter(([k]) => k !== "city").length;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const n = tabCounts[b.dataset.tab];
    b.textContent = `${b.dataset.label} (${n >= 10000 ? `${Math.floor(n / 1000)}K+` : n.toLocaleString()})`;
  });
  $("#count").textContent = results.length
    ? `${results.length.toLocaleString()} results · showing ${start + 1}–${start + slice.length}`
    : "0 results";

  $("#results").innerHTML = !slice.length
    ? `<div class="empty" style="margin-top:20px"><b>No organizations match.</b>Try a shorter name, check the spelling, or <button class="link-btn" data-clear="all">clear all filters</button>.</div>`
    : state.view === "table" ? table(slice) : slice.map(card).join("");

  $("#pager").innerHTML = pages > 1
    ? `<button class="btn btn-ghost btn-small" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
       <span>Page ${state.page} of ${pages.toLocaleString()}</span>
       <button class="btn btn-ghost btn-small" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Next page">›</button>`
    : "";
  writeState();
}

function update(patch) {
  Object.assign(state, patch, { page: patch.page ?? 1 });
  render();
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
}

// Static UI
$("#cause").insertAdjacentHTML("beforeend",
  Object.entries(NTEE_MAJOR).map(([k, v]) => `<option value="${k}">${escapeHTML(v)}</option>`).join(""));
document.querySelectorAll("[data-tab]").forEach((b) => (b.dataset.label = b.textContent));

const drawer = $("#filters");
$("#filters-btn").addEventListener("click", () => {
  drawer.hidden = !drawer.hidden;
  $("#filters-btn").setAttribute("aria-expanded", !drawer.hidden);
});
if (activeFilters().some(([k]) => k !== "city")) { drawer.hidden = false; $("#filters-btn").setAttribute("aria-expanded", "true"); }

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  update({ q: searchForm.q.value.trim(), city: searchForm.city.value.trim() });
});
let typing;
searchForm.q.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => update({ q: searchForm.q.value.trim() }), 180);
});
searchForm.city.addEventListener("change", () => update({ city: searchForm.city.value.trim() }));
filterForm.addEventListener("change", () => update({
  cause: filterForm.cause.value,
  type: filterForm.type.value,
  size: filterForm.size.value,
  from: filterForm.from.value,
  to: filterForm.to.value,
  deductible: filterForm.deductible.checked,
  starred: filterForm.starred.checked,
}));
const CLEAR = { q: "", city: "", cause: "", type: "", size: "", from: "", to: "", deductible: false, starred: false };
$("#reset").addEventListener("click", () => { update({ ...CLEAR, q: state.q, city: state.city }); syncForms(); });
document.addEventListener("click", (e) => {
  const key = e.target.closest("[data-clear]")?.dataset.clear;
  if (!key) return;
  update(key === "all" ? { ...CLEAR, tab: "all" } : key === "years" ? { from: "", to: "" } : { [key]: CLEAR[key] });
  syncForms();
});
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { update({ tab: b.dataset.tab }); syncForms(); }));
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { update({ view: b.dataset.view, page: state.page }); syncForms(); }));
sortSelect.addEventListener("change", () => update({ sort: sortSelect.value }));
$("#pager").addEventListener("click", (e) => {
  const page = Number(e.target.closest("[data-page]")?.dataset.page);
  if (!page) return;
  update({ page });
  $("#results-top").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#results").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-save]");
  if (!btn) return;
  const r = rows.find((x) => x[F.EIN] === btn.dataset.save);
  let saved;
  try { saved = await toggleOrg({ ein: r[F.EIN], name: r[F.NAME], city: r[F.CITY], ntee: r[F.NTEE] }); } catch (err) { toast(err.message); return; }
  if (saved === null) return;
  btn.setAttribute("aria-pressed", saved);
  btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save organization");
  toast(saved ? "Added to My favorites" : "Removed from My favorites");
});
$("#save-search").addEventListener("click", async () => {
  const parts = [state.q && `“${state.q}”`, ...activeFilters().map(([, l]) => l)].filter(Boolean);
  try {
    if (await saveSearch(parts.join(" · ") || "All organizations", location.search)) toast("Search saved to your dashboard");
  } catch (err) { toast(err.message); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); searchForm.q.focus(); }
});

syncForms();
showSampleNotice();
try {
  [rows, verified] = await Promise.all([loadIndex(), loadVerified(), savedReady]);
  haystack = rows.map((r) => normalize(`${r[F.NAME]} ${r[F.SORT] && r[F.SORT] !== r[F.NAME] ? r[F.SORT] : ""}`));
  const cities = {};
  for (const r of rows) cities[r[F.CITY]] = (cities[r[F.CITY]] ?? 0) + 1;
  $("#city-list").innerHTML = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 500)
    .map(([c]) => `<option value="${escapeHTML(c)}">`).join("");
  render();
} catch (err) {
  $("#summary").textContent = "";
  $("#results").innerHTML = `<div class="empty"><b>${escapeHTML(err.message)}</b>Build the data first with <code>node scripts/build-data.mjs</code>.</div>`;
}
