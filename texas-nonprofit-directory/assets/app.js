import { NTEE_MAJOR, SUBSECTION_SHORT, nteeLabel, formatEIN, compactMoney, escapeHTML, avatar, causeHue } from "./codes.js";
import { F, loadIndex, showSampleNotice } from "./data.js";
import { STARS, STAR_ORDER, starBadge, starIcon, loadVerified } from "./tiers.js";
import { saveButton, toggleOrg, saveSearch } from "./saved.js";

const PAGE_SIZE = 20;
const COMMON_TYPES = new Set(["03", "04", "05", "06", "07", "08", "19"]);
const SIZE_LABELS = { "0-0": "No revenue reported", "1-99999": "Under $100K", "100000-999999": "$100K – $1M", "1000000-9999999": "$1M – $10M", "10000000-": "$10M+" };
const TYPE_LABELS = { "03": "501(c)(3)", "04": "501(c)(4)", "05": "501(c)(5)", "06": "501(c)(6)", "07": "501(c)(7)", "08": "501(c)(8)", "19": "501(c)(19)", other: "Other types" };

const $ = (sel) => document.querySelector(sel);
const searchForm = $("#search");
const filterForm = $("#filters");
const sortSelect = $("#sort");

let rows = [];
let haystack = []; // lowercase searchable text per row, aligned with rows
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
  history.replaceState(null, "", (qs ? `?${qs}` : location.pathname) + location.hash);
}

function syncForms() {
  searchForm.q.value = state.q;
  searchForm.city.value = state.city;
  for (const k of ["cause", "type", "size", "from", "to"]) filterForm[k].value = state[k];
  filterForm.deductible.checked = state.deductible;
  filterForm.starred.checked = state.starred;
  sortSelect.value = state.sort;
}

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ");
const starRank = (ein) => STARS[verified[ein]?.level]?.rank ?? 0;

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
  // Earned Stars give a small boost; membership plans never affect ranking.
  return s + starRank(rows[i][F.EIN]) * 8 + Math.log10(rows[i][F.REV] + 1);
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
    if (state.type && (state.type === "other" ? COMMON_TYPES.has(r[F.SUB]) : r[F.SUB] !== state.type)) continue;
    if (state.size && (r[F.REV] < minRev || r[F.REV] > maxRev)) continue;
    if ((state.from || state.to) && (r[F.YEAR] < from || r[F.YEAR] > to)) continue;
    if (state.deductible && r[F.DED] !== "1") continue;
    if (state.starred && !starRank(r[F.EIN])) continue;

    let s = 1;
    if (isEIN) {
      if (!r[F.EIN].startsWith(einQuery)) continue;
    } else if (tokens.length) {
      s = score(i, query, tokens);
      if (!s) continue;
    }
    out.push([i, s]);
  }

  const rev = (a, b) => rows[b[0]][F.REV] - rows[a[0]][F.REV];
  const by = {
    relevance: tokens.length || isEIN
      ? (a, b) => b[1] - a[1]
      : (a, b) => starRank(rows[b[0]][F.EIN]) - starRank(rows[a[0]][F.EIN]) || rev(a, b),
    name: (a, b) => rows[a[0]][F.NAME].localeCompare(rows[b[0]][F.NAME]),
    revenue: rev,
    newest: (a, b) => rows[b[0]][F.YEAR] - rows[a[0]][F.YEAR],
    oldest: (a, b) => (rows[a[0]][F.YEAR] || 9999) - (rows[b[0]][F.YEAR] || 9999),
  }[state.sort] ?? (() => 0);
  out.sort(by);
  return out.map(([i]) => rows[i]);
}

const SUB_TYPE = { "03": "Public charity", "04": "Social welfare org", "05": "Labor / agricultural org", "06": "Business league", "07": "Social club", "08": "Fraternal society", "19": "Veterans org" };

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
      <div class="meta">${escapeHTML(r[F.CITY])}, TX ${escapeHTML(r[F.ZIP])}</div>
    </div>
    <dl class="ids"><dt>EIN</dt><dd>${formatEIN(r[F.EIN])}</dd><dt>Type</dt><dd>${escapeHTML(SUBSECTION_SHORT(r[F.SUB]))} ${escapeHTML(SUB_TYPE[r[F.SUB]] ?? "")}</dd></dl>
    <dl class="money"><dt>Revenue</dt><dd>${compactMoney(r[F.REV])}</dd><dt>Assets</dt><dd>${compactMoney(r[F.ASSETS])}</dd></dl>
    ${v?.mission ? `<p class="mission">${escapeHTML(v.mission)}</p>` : ""}
    <div class="chips">${chips}${saveButton(r[F.EIN])}</div>
  </article>`;
}

function activeFilters() {
  const list = [];
  if (state.q) list.push(["q", `“${state.q}”`]);
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
  const results = search();
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const slice = results.slice(start, start + PAGE_SIZE);

  const filters = activeFilters();
  $("#results-title").textContent = state.q || state.city || state.cause ? "Search results" : "Organizations";
  $("#count").textContent = results.length
    ? `${results.length.toLocaleString()} found · showing ${start + 1}–${start + slice.length}`
    : "";
  $("#active-filters").innerHTML = filters
    .map(([k, label]) => `<button type="button" data-clear="${k}" aria-label="Remove filter ${escapeHTML(label)}">${escapeHTML(label)} <span aria-hidden="true">×</span></button>`)
    .join("");
  $("#save-search").hidden = !filters.length;
  const panelCount = filters.filter(([k]) => !["q", "city"].includes(k)).length;
  $("#filter-count").hidden = !panelCount;
  $("#filter-count").textContent = panelCount;

  $("#results").innerHTML = slice.length
    ? slice.map(card).join("")
    : `<div class="empty"><b>No organizations match.</b>Try a shorter name, check the spelling, or <button class="link-btn" data-clear="all">clear all filters</button>.</div>`;

  $("#pager").innerHTML = pages > 1
    ? `<button class="btn btn-ghost btn-small" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>← Previous</button>
       <span>Page ${state.page} of ${pages.toLocaleString()}</span>
       <button class="btn btn-ghost btn-small" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""}>Next →</button>`
    : "";
  writeState();
}

function renderBrowse() {
  const causeCounts = {};
  const cityCounts = {};
  let charities = 0;
  for (const r of rows) {
    const c = r[F.NTEE][0] || "Z";
    causeCounts[c] = (causeCounts[c] ?? 0) + 1;
    cityCounts[r[F.CITY]] = (cityCounts[r[F.CITY]] ?? 0) + 1;
    if (r[F.SUB] === "03") charities++;
  }
  const starred = rows.reduce((n, r) => n + (starRank(r[F.EIN]) ? 1 : 0), 0);
  const stats = [rows.length, charities, Object.keys(cityCounts).length, starred];
  document.querySelectorAll("#hero-stats b").forEach((b, i) => (b.textContent = stats[i].toLocaleString()));

  $("#browse-causes").innerHTML = Object.keys(NTEE_MAJOR)
    .filter((k) => causeCounts[k])
    .sort((a, b) => causeCounts[b] - causeCounts[a])
    .map((k) => `<a href="?cause=${k}#explore" style="--h:${causeHue(k)}"><span class="dot">${k}</span><span class="name">${escapeHTML(NTEE_MAJOR[k])}<span class="n">${causeCounts[k].toLocaleString()} organizations</span></span></a>`)
    .join("");
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
  $("#browse-cities").innerHTML = topCities.slice(0, 30)
    .map(([city, n]) => `<a href="?city=${encodeURIComponent(city)}#explore">${escapeHTML(city)}<b>${n.toLocaleString()}</b></a>`)
    .join("");
  $("#city-list").innerHTML = topCities.slice(0, 500)
    .map(([city]) => `<option value="${escapeHTML(city)}">`).join("");
}

function update(patch) {
  Object.assign(state, patch, { page: patch.page ?? 1 });
  render();
}

function scrollToResults() {
  document.getElementById("explore").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Static UI
$("#cause").insertAdjacentHTML("beforeend",
  Object.entries(NTEE_MAJOR).map(([k, v]) => `<option value="${k}">${escapeHTML(v)}</option>`).join(""));
$("#cta-ladder").innerHTML = STAR_ORDER.map((k) =>
  `<div>${starIcon(k, 26)}<span><b>${STARS[k].label}</b><span>${STARS[k].summary}</span></span></div>`).join("");

// Filters start collapsed on small screens.
const mq = matchMedia("(max-width: 900px)");
const syncPanel = () => ($("#filters-panel").open = !mq.matches);
syncPanel();
mq.addEventListener("change", syncPanel);
$("#filters-panel summary").addEventListener("click", (e) => { if (!mq.matches) e.preventDefault(); });

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  update({ q: searchForm.q.value, city: searchForm.city.value });
  scrollToResults();
});
let typing;
searchForm.q.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => update({ q: searchForm.q.value }), 180);
});
searchForm.city.addEventListener("change", () => update({ city: searchForm.city.value }));
filterForm.addEventListener("change", () => update({
  cause: filterForm.cause.value,
  type: filterForm.type.value,
  size: filterForm.size.value,
  from: filterForm.from.value,
  to: filterForm.to.value,
  deductible: filterForm.deductible.checked,
  starred: filterForm.starred.checked,
}));
const CLEAR_ALL = { q: "", city: "", cause: "", type: "", size: "", from: "", to: "", deductible: false, starred: false };
$("#reset").addEventListener("click", () => { update({ ...CLEAR_ALL, q: state.q, city: state.city }); syncForms(); });
document.addEventListener("click", (e) => {
  const key = e.target.closest("[data-clear]")?.dataset.clear;
  if (!key) return;
  update(key === "all" ? CLEAR_ALL : key === "years" ? { from: "", to: "" } : { [key]: CLEAR_ALL[key] });
  syncForms();
});
sortSelect.addEventListener("change", () => update({ sort: sortSelect.value }));
$("#results").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-save]");
  if (!btn) return;
  const r = rows.find((x) => x[F.EIN] === btn.dataset.save);
  const saved = toggleOrg({ ein: r[F.EIN], name: r[F.NAME], city: r[F.CITY], ntee: r[F.NTEE] });
  btn.setAttribute("aria-pressed", saved);
  btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save organization");
  toast(saved ? "Saved — see it under Saved" : "Removed from saved");
});
$("#save-search").addEventListener("click", () => {
  const label = activeFilters().map(([, l]) => l).join(" · ") || "All organizations";
  toast(saveSearch(label, location.search) ? "Search saved" : "Couldn't save in this browser");
});
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
}
$("#pager").addEventListener("click", (e) => {
  const page = Number(e.target.closest("[data-page]")?.dataset.page);
  if (!page) return;
  update({ page });
  $("#results-title").scrollIntoView({ behavior: "smooth", block: "start" });
});
// "/" jumps to the search box.
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    e.preventDefault();
    searchForm.q.focus();
  }
});

syncForms();
showSampleNotice();
try {
  [rows, verified] = await Promise.all([loadIndex(), loadVerified()]);
  haystack = rows.map((r) => normalize(`${r[F.NAME]} ${r[F.SORT] && r[F.SORT] !== r[F.NAME] ? r[F.SORT] : ""}`).trim());
  renderBrowse();
  render();
  if (location.hash === "#explore" && (state.q || state.city || state.cause)) scrollToResults();
} catch (err) {
  $("#results").innerHTML = `<div class="empty"><b>${escapeHTML(err.message)}</b>Build the data first with <code>node scripts/build-data.mjs</code>.</div>`;
}
