import { NTEE_MAJOR, escapeHTML, avatar, causeHue, nteeLabel } from "./codes.js";
import { F, loadIndex, showSampleNotice } from "./data.js";
import { STARS, STAR_ORDER, starIcon, loadVerified } from "./tiers.js";
import { badgeSVG } from "../scripts/badge-svg.mjs";
import { savedOrgs, savedSearches } from "./saved.js";

const $ = (s) => document.querySelector(s);
const fmtDate = (t) => new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const CLOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

// Stacked badges, like a seal collection.
$("#ladder-mini").innerHTML = ["bronze", "silver", "gold", "platinum"]
  .map((l, i) => `<div style="width:96px;margin-left:${i ? -34 : 0}px;margin-top:${i % 2 ? 26 : 0}px">${badgeSVG(l, new Date().getFullYear()).replace('width="200" height="104"', 'width="96" height="50"')}</div>`).join("");
$("#cta-ladder").innerHTML = STAR_ORDER.map((k) =>
  `<div>${starIcon(k, 26)}<span><b>${STARS[k].label}</b><span>${STARS[k].summary}</span></span></div>`).join("");

// Collections (saved organizations live in this browser).
const orgs = savedOrgs();
const newest = orgs[0]?.savedAt;
$("#collections").innerHTML = `
  <div style="color:var(--muted);font-size:.85rem;display:flex;gap:6px;align-items:center">${CLOCK} ${newest ? `Updated ${fmtDate(newest)}` : "Not used yet"}</div>
  <h3 style="font-size:1.25rem;font-weight:600;margin:10px 0 4px">My favorites</h3>
  <p style="margin:0 0 6px">A place to save and follow organizations that interest me. <span class="chip">${orgs.length} organization${orgs.length === 1 ? "" : "s"}</span></p>
  ${orgs.length ? `<div class="mini-list">${orgs.slice(0, 4).map((o) =>
    `<a href="org.html?ein=${escapeHTML(o.ein)}">${avatar(o.name, o.ntee, "sm")}<span><b>${escapeHTML(o.name)}</b><span>${escapeHTML(o.city)}, TX · ${escapeHTML(nteeLabel(o.ntee))}</span></span></a>`).join("")}</div>`
    : `<p style="margin:10px 0 0">Tap the bookmark on any organization in <a href="search.html">Search</a> to add it here.</p>`}
  <div style="text-align:center;border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><a href="saved.html">View all</a></div>`;

const searches = savedSearches();
$("#saved-searches").innerHTML = searches.length
  ? `<div class="mini-list">${searches.slice(0, 5).map((s) =>
      `<a href="search.html${escapeHTML(s.query)}"><span><b>${escapeHTML(s.label)}</b><span>Saved ${fmtDate(s.savedAt)}</span></span></a>`).join("")}</div>
     <div style="text-align:center;border-top:1px solid var(--line);margin-top:16px;padding-top:16px"><a href="saved.html">View all</a></div>`
  : `<div class="dash-empty"><span class="art"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span>
     <div><h3>No saved searches</h3><p>You can save any search from the search page and it will appear here.</p><a class="btn btn-ghost btn-small" href="search.html">Go to search page</a></div></div>`;

showSampleNotice();
try {
  const [rows, verified] = await Promise.all([loadIndex(), loadVerified()]);
  const causeCounts = {};
  const cityCounts = {};
  let charities = 0;
  let starred = 0;
  for (const r of rows) {
    const c = r[F.NTEE][0] || "Z";
    causeCounts[c] = (causeCounts[c] ?? 0) + 1;
    cityCounts[r[F.CITY]] = (cityCounts[r[F.CITY]] ?? 0) + 1;
    if (r[F.SUB] === "03") charities++;
    if (STARS[verified[r[F.EIN]]?.level]) starred++;
  }
  const stats = [rows.length, charities, Object.keys(cityCounts).length, starred];
  document.querySelectorAll("#hero-stats b").forEach((b, i) => (b.textContent = stats[i].toLocaleString()));
  $("#browse-causes").innerHTML = Object.keys(NTEE_MAJOR)
    .filter((k) => causeCounts[k])
    .sort((a, b) => causeCounts[b] - causeCounts[a])
    .map((k) => `<a href="search.html?cause=${k}" style="--h:${causeHue(k)}"><span class="dot">${k}</span><span class="name">${escapeHTML(NTEE_MAJOR[k])}<span class="n">${causeCounts[k].toLocaleString()} organizations</span></span></a>`)
    .join("");
  $("#browse-cities").innerHTML = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .map(([city, n]) => `<a href="search.html?city=${encodeURIComponent(city)}">${escapeHTML(city)}<b>${n.toLocaleString()}</b></a>`).join("");
} catch (err) {
  $("#browse-causes").innerHTML = `<div class="empty"><b>${escapeHTML(err.message)}</b></div>`;
}
