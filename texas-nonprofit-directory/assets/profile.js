import {
  SUBSECTION, FOUNDATION, DEDUCTIBILITY, ORGANIZATION, AFFILIATION, STATUS, FILING_REQ, AMOUNT_CODE,
  nteeLabel, formatEIN, money, compactMoney, escapeHTML, avatar,
} from "./codes.js";
import { F, loadOrg, loadIndex, showSampleNotice } from "./data.js";
import { STARS, STAR_ORDER, starBadge, starIcon, loadVerified } from "./tiers.js";
import { saveButton, toggleOrg, savedReady } from "./saved.js";

const root = document.getElementById("profile");
const ein = (new URLSearchParams(location.search).get("ein") ?? "").replace(/\D/g, "").padStart(9, "0");

const yyyymm = (s) => {
  if (!s || s.length < 6 || s === "000000") return "—";
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
};
const decode = (table, code) => (code ? table[code] ?? `Code ${code}` : "—");
const fact = (label, value) => `<dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value || "—")}</dd>`;
// Only allow http(s) links from profile data.
const safeURL = (u) => (/^https?:\/\//i.test(u ?? "") ? u : "");
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

const icon = {
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
  mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};

function autoDescription(o) {
  const type = o.subsection === "03" ? "501(c)(3) tax-exempt organization" : `tax-exempt organization under ${decode(SUBSECTION, o.subsection).split(" ")[0]}`;
  const since = o.ruling && o.ruling !== "000000" ? ` recognized by the IRS since ${o.ruling.slice(0, 4)}` : "";
  const cause = o.ntee ? ` working in ${nteeLabel(o.ntee).toLowerCase()}` : "";
  return `${o.name} is a ${type} based in ${o.city}, Texas${cause}${since}.${o.deductibility === "1" ? " Donations to this organization are tax-deductible." : ""}`;
}

function trustCard(o, v) {
  const rank = STARS[v?.level]?.rank ?? 0;
  const current = v ? STARS[v.level] : null;
  const steps = STAR_ORDER.map((k) => `<li class="${STARS[k].rank <= rank ? "done" : ""}"><span class="tick">${STARS[k].rank <= rank ? "✓" : ""}</span>${starIcon(k, 16)} ${STARS[k].label}</li>`).join("");
  return `<section class="panel side-card">
    <h3>Transparency</h3>
    ${current
      ? `<div>${starBadge(v.level)}</div><p style="margin:10px 0 0;color:var(--muted);font-size:.9rem">${escapeHTML(current.summary)}${v.verifiedOn ? ` · reviewed ${escapeHTML(new Date(v.verifiedOn).toLocaleDateString("en-US", { month: "short", year: "numeric" }))}` : ""}</p>`
      : `<p style="margin:0;color:var(--muted);font-size:.92rem">This profile hasn't been claimed yet. The information shown comes from IRS records.</p>`}
    <div class="trust-meter" aria-label="${rank} of 5 transparency levels">${STAR_ORDER.map((_, i) => `<i class="${i < rank ? "on" : ""}"></i>`).join("")}</div>
    <ul class="trust-steps">${steps}</ul>
    <div style="margin-top:16px">
      ${v ? `<a class="btn btn-small" href="badge.html?ein=${o.ein}">Get your website badge</a>${rank < 5 ? ` <a class="btn btn-ghost btn-small" href="claim.html?ein=${o.ein}&update=1" style="margin-top:8px">Update this profile</a>` : ""}`
          : `<a class="btn btn-small" href="claim.html?ein=${o.ein}">Claim this profile — free</a>`}
    </div>
  </section>`;
}

function contactCard(o, v, address, mapsURL) {
  const site = safeURL(v?.website);
  return `<section class="panel side-card">
    <h3>Contact</h3>
    <div class="contact-list">
      <div>${icon.pin}<a href="${mapsURL}" target="_blank" rel="noopener">${escapeHTML(address)}</a></div>
      ${site ? `<div>${icon.globe}<a href="${escapeHTML(site)}" target="_blank" rel="noopener">${escapeHTML(hostOf(site))}</a></div>` : ""}
      ${v?.phone ? `<div>${icon.phone}<a href="tel:${escapeHTML(v.phone.replace(/[^\d+]/g, ""))}">${escapeHTML(v.phone)}</a></div>` : ""}
      ${v?.email ? `<div>${icon.mail}<a href="mailto:${escapeHTML(v.email)}">${escapeHTML(v.email)}</a></div>` : ""}
      ${o.careOf ? `<div>${icon.mail}<span>In care of ${escapeHTML(o.careOf)}</span></div>` : ""}
    </div>
  </section>`;
}

function linksCard(o, dashEIN) {
  return `<section class="panel side-card">
    <h3>Verify &amp; learn more</h3>
    <div class="ext-links">
      <a href="https://projects.propublica.org/nonprofits/organizations/${o.ein}" target="_blank" rel="noopener"><span>ProPublica Nonprofit Explorer<small>Form 990 filings and pay</small></span>↗</a>
      <a href="https://www.guidestar.org/profile/${dashEIN}" target="_blank" rel="noopener"><span>Candid profile<small>National nonprofit database</small></span>↗</a>
      <a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener"><span>IRS exempt organization search<small>Search EIN ${dashEIN}</small></span>↗</a>
      <a href="https://comptroller.texas.gov/taxes/franchise/account-status/search" target="_blank" rel="noopener"><span>Texas Comptroller<small>State franchise tax standing</small></span>↗</a>
    </div>
  </section>`;
}

function mainSections(o, v) {
  const out = [];
  const max = Math.max(o.revenue, o.income, o.assets, 1);
  const bar = (label, n) => `<div class="bar-row"><span>${label}</span><div class="track"><div class="fill" style="width:${Math.max(n ? 2 : 0, (n / max) * 100).toFixed(1)}%"></div></div><span class="amt">${compactMoney(n)}</span></div>`;

  out.push(`<div class="kpis">
    <div class="kpi"><div class="label">Revenue</div><div class="value">${compactMoney(o.revenue)}</div><div class="hint">${o.revenue ? money(o.revenue) : "Not reported"}</div></div>
    <div class="kpi"><div class="label">Total assets</div><div class="value">${compactMoney(o.assets)}</div><div class="hint">${o.assets ? money(o.assets) : "Not reported"}</div></div>
    <div class="kpi"><div class="label">${v?.budget ? "Annual budget" : "Income"}</div><div class="value">${compactMoney(v?.budget || o.income)}</div><div class="hint">${v?.budget ? "Reported by organization" : o.income ? money(o.income) : "Not reported"}</div></div>
    <div class="kpi"><div class="label">Exempt since</div><div class="value">${escapeHTML(o.ruling && o.ruling !== "000000" ? o.ruling.slice(0, 4) : "—")}</div><div class="hint">${escapeHTML(yyyymm(o.ruling))}</div></div>
  </div>`);

  out.push(`<section class="panel prose">
    <h2>About</h2>
    <p>${escapeHTML(v?.mission || autoDescription(o))}</p>
    ${v?.serviceArea ? `<p><b>Service area:</b> ${escapeHTML(v.serviceArea)}</p>` : ""}
    ${v ? "" : `<div class="unclaimed-note">${starIcon("verified", 22)}<span><b>Is this your organization?</b> Claim this profile for free to add your mission, programs and results — and earn a Transparency Star. <a href="claim.html?ein=${o.ein}">Claim it now →</a></span></div>`}
  </section>`);

  if (v?.programs?.length) {
    out.push(`<section class="panel"><h2>Programs</h2><ul class="list-clean">${v.programs.map((p) =>
      `<li><b>${escapeHTML(p.name)}</b><span>${escapeHTML(p.description ?? "")}</span></li>`).join("")}</ul></section>`);
  }
  if (v?.goals || v?.strategies) {
    out.push(`<section class="panel prose"><h2>Goals &amp; strategy</h2>
      ${v.goals ? `<p><b>Goals.</b> ${escapeHTML(v.goals)}</p>` : ""}
      ${v.strategies ? `<p><b>Strategies.</b> ${escapeHTML(v.strategies)}</p>` : ""}</section>`);
  }
  if (v?.results?.length) {
    out.push(`<section class="panel"><h2>Results</h2><div class="results-grid">${v.results.map((r) =>
      `<div><b>${escapeHTML(String(r.value))}</b><span>${escapeHTML(r.metric)}${r.year ? ` (${escapeHTML(String(r.year))})` : ""}</span></div>`).join("")}</div></section>`);
  }

  out.push(`<section class="panel"><h2>Financials</h2>
    <div class="bars">${bar("Revenue", o.revenue)}${bar("Income", o.income)}${bar("Assets", o.assets)}</div>
    ${v?.revenueSources?.length ? `<h3 style="font-family:var(--font);font-size:.95rem;margin:20px 0 10px">Revenue sources</h3><div class="bars">${v.revenueSources.map((s) =>
      `<div class="bar-row"><span>${escapeHTML(s.source)}</span><div class="track"><div class="fill" style="width:${Math.min(100, Number(s.pct) || 0)}%"></div></div><span class="amt">${Number(s.pct) || 0}%</span></div>`).join("")}</div>` : ""}
    <p style="color:var(--muted);font-size:.85rem;margin:16px 0 0">From the most recent return processed by the IRS (tax period ${escapeHTML(yyyymm(o.taxPeriod))}).
      ${safeURL(v?.reportUrl) ? ` <a href="${escapeHTML(v.reportUrl)}" target="_blank" rel="noopener">Latest annual report / audit ↗</a>` : ` <a href="https://projects.propublica.org/nonprofits/organizations/${o.ein}" target="_blank" rel="noopener">See full Form 990s ↗</a>`}</p>
  </section>`);

  if (v?.leader || v?.boardChair || v?.board?.length) {
    out.push(`<section class="panel"><h2>Leadership</h2><ul class="list-clean">
      ${v.leader ? `<li><b>${escapeHTML(v.leader.name)}</b><span>${escapeHTML(v.leader.title ?? "Executive Director")}</span></li>` : ""}
      ${v.boardChair ? `<li><b>${escapeHTML(v.boardChair)}</b><span>Board chair</span></li>` : ""}
      ${v.board?.length ? `<li><b>Board of directors</b><span>${v.board.map(escapeHTML).join(" · ")}</span></li>` : ""}
    </ul></section>`);
  }

  out.push(`<section class="panel"><h2>Tax-exempt status</h2><dl class="facts">
    ${fact("Exemption", decode(SUBSECTION, o.subsection))}
    ${fact("Foundation status", decode(FOUNDATION, o.foundation))}
    ${fact("Deductibility", decode(DEDUCTIBILITY, o.deductibility))}
    ${fact("IRS ruling date", yyyymm(o.ruling))}
    ${fact("Exempt status", decode(STATUS, o.status))}
    ${fact("Organization type", decode(ORGANIZATION, o.organization))}
    ${fact("Affiliation", decode(AFFILIATION, o.affiliation))}
    ${o.group && o.group !== "0000" ? fact("Group exemption #", o.group) : ""}
    ${fact("Filing requirement", decode(FILING_REQ, o.filingReq))}
    ${fact("Asset range", decode(AMOUNT_CODE, o.assetCode))}
    ${fact("Income range", decode(AMOUNT_CODE, o.incomeCode))}
    ${fact("Cause code (NTEE)", o.ntee ? `${o.ntee} — ${nteeLabel(o.ntee)}` : "")}
  </dl></section>`);
  return out.join("");
}

function render(o, v) {
  document.title = `${o.name} · TX Nonprofits`;
  const dashEIN = formatEIN(o.ein);
  const address = [o.street, `${o.city}, TX ${o.zip}`].filter(Boolean).join(", ");
  const mapsURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.name}, ${address}`)}`;
  const logo = safeURL(v?.logo);
  const site = safeURL(v?.website);
  const donate = safeURL(v?.donateUrl);
  const aka = o.sortName && o.sortName.toLowerCase() !== o.name.toLowerCase() ? o.sortName : "";

  root.innerHTML = `
    <section class="profile-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Dashboard</a> / <a href="search.html?city=${encodeURIComponent(o.city)}">${escapeHTML(o.city)}</a> / <span>${escapeHTML(o.name)}</span></nav>
        <div class="profile-head">
          ${logo ? `<span class="avatar lg" style="background:#fff"><img src="${escapeHTML(logo)}" alt=""></span>` : avatar(o.name, o.ntee, "lg")}
          <div class="who">
            <h1>${escapeHTML(o.name)}</h1>
            ${aka ? `<div class="sub" style="font-style:italic;margin:-4px 0 6px">aka ${escapeHTML(aka)}</div>` : ""}
            <div class="sub"><span>${escapeHTML(o.city)}, Texas</span><span>EIN ${dashEIN}</span><span>${escapeHTML(decode(SUBSECTION, o.subsection).split(" ")[0])}</span></div>
            <div class="chips">
              ${v ? starBadge(v.level) : ""}
              <span class="chip">${escapeHTML(nteeLabel(o.ntee))}</span>
              ${o.deductibility === "1" ? `<span class="chip good">Donations tax-deductible</span>` : ""}
            </div>
          </div>
          <div class="profile-actions">
            ${donate ? `<a class="btn donate" href="${escapeHTML(donate)}" target="_blank" rel="noopener">Donate</a>` : ""}
            ${site ? `<a class="btn btn-ghost" href="${escapeHTML(site)}" target="_blank" rel="noopener">Website ↗</a>` : ""}
            ${saveButton(o.ein, "on-dark")}
            <button class="btn btn-ghost" id="share">${icon.share} Share</button>
          </div>
        </div>
      </div>
    </section>
    <div class="wrap profile-body">
      <div class="stack">${mainSections(o, v)}</div>
      <aside class="stack">
        ${trustCard(o, v)}
        ${contactCard(o, v, address, mapsURL)}
        <section class="panel side-card similar" id="similar" hidden><h3>Similar organizations in ${escapeHTML(o.city)}</h3><div></div></section>
        ${linksCard(o, dashEIN)}
      </aside>
    </div>
    <div class="toast" id="toast" role="status"></div>`;

  root.querySelector("[data-save]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    let saved;
    try { saved = await toggleOrg(o); } catch (err) { toast(err.message); return; }
    if (saved === null) return;
    btn.setAttribute("aria-pressed", saved);
    btn.setAttribute("aria-label", saved ? "Remove from saved" : "Save organization");
    toast(saved ? "Saved — see it under Saved" : "Removed from saved");
  });
  document.getElementById("share").addEventListener("click", async () => {
    const data = { title: o.name, url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch { /* dismissed */ } return; }
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); } catch { toast("Copy the address bar to share"); }
  });
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

// Similar organizations: same cause group in the same city, largest first.
async function renderSimilar(o) {
  const rows = await loadIndex().catch(() => []);
  const cause = (o.ntee || "Z")[0];
  const matches = rows
    .filter((r) => r[F.EIN] !== o.ein && r[F.CITY] === o.city && (r[F.NTEE][0] || "Z") === cause)
    .sort((a, b) => b[F.REV] - a[F.REV])
    .slice(0, 5);
  if (!matches.length) return;
  const box = document.getElementById("similar");
  box.querySelector("div").innerHTML = matches.map((r) =>
    `<a href="org.html?ein=${r[F.EIN]}">${avatar(r[F.NAME], r[F.NTEE], "sm")}<span><b>${escapeHTML(r[F.NAME])}</b><span>${compactMoney(r[F.REV])} revenue</span></span></a>`).join("");
  box.hidden = false;
}

showSampleNotice();
const [org, verified] = /^\d{9}$/.test(ein) ? await Promise.all([loadOrg(ein), loadVerified(), savedReady]) : [null, {}];
if (org) {
  render(org, verified[ein]);
  renderSimilar(org);
} else {
  root.innerHTML = `<div class="wrap" style="padding-top:48px"><div class="empty"><b>No Texas organization found with EIN ${escapeHTML(formatEIN(ein))}.</b><a href="./">Back to search</a></div></div>`;
}
