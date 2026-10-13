import { STARS, STAR_ORDER, PLANS, starIcon, starBadge } from "./tiers.js";
import { CONFIG } from "./config.js";
import { avatar } from "./codes.js";
import { badgeSVG } from "../scripts/badge-svg.mjs";

const $ = (s) => document.querySelector(s);
const small = `$${(CONFIG.smallOrgRevenue / 1000).toFixed(0)}K`;
const pct = Math.round(CONFIG.smallOrgDiscount * 100);

$("#stars-grid").innerHTML = STAR_ORDER.map((k) => {
  const s = STARS[k];
  return `<article class="star-card" style="--c:${s.color}">
    <div class="head">${starIcon(k, 30)}<h3>${s.label}</h3></div>
    <p class="sum">${s.summary}</p>
    <ul>${s.requires.map((r) => `<li>${r}</li>`).join("")}</ul>
    <span class="free-tag">Free</span>
  </article>`;
}).join("");

$("#plans-grid").innerHTML = ["community", "plus", "premier"].map((k) => {
  const p = PLANS[k];
  const price = CONFIG.prices[k];
  return `<article class="plan ${k === "plus" ? "featured" : ""}">
    ${k === "plus" ? '<span class="ribbon">Most popular</span>' : ""}
    <h3>${p.label}</h3>
    <p class="tag">${p.tagline}</p>
    <div class="price">${price ? `$${price}` : "Free"}${price ? "<small> /year</small>" : ""}</div>
    <div class="discount">${price ? `$${Math.round(price * (1 - CONFIG.smallOrgDiscount))}/year for organizations under ${small}` : "Always free"}</div>
    <ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
    <a class="btn ${k === "plus" ? "" : "btn-ghost"}" href="claim.html">${price ? `Choose ${p.label}` : "Claim for free"}</a>
  </article>`;
}).join("");
$("#discount-note").textContent = `Organizations with under ${small} in annual revenue get ${pct}% off paid plans. Prices are per year.`;
$("#faq-discount").textContent = `Yes. Organizations reporting under ${small} in annual revenue to the IRS get ${pct}% off Plus and Premier, and every Star stays free.`;

const ROWS = [
  ["Claim and edit your profile", 1, 1, 1],
  ["Earn Transparency Stars (all five levels)", 1, 1, 1],
  ["Embeddable Star badge", 1, 1, 1],
  ["Donate & volunteer buttons", 0, 1, 1],
  ["Photo gallery and video", 0, 1, 1],
  ["Events and job postings", 0, 1, 1],
  ["Profile-view analytics", 0, 1, 1],
  ["Review time", "10 days", "5 days", "3 days"],
  ["Texas grant opportunity alerts", 0, 0, 1],
  ["Quarterly AI & tech workshops", 0, 0, 1],
  ["Sponsored Spotlight on cause & city pages", 0, 0, 1],
  ["Annual verification certificate", 0, 0, 1],
];
const cell = (v) => (v === 1 ? '<td class="yes" aria-label="Included">✓</td>' : v === 0 ? '<td class="no" aria-label="Not included">—</td>' : `<td>${v}</td>`);
$("#compare").innerHTML = `<thead><tr><th>Feature</th><th>Community</th><th>Plus</th><th>Premier</th></tr></thead>
  <tbody>${ROWS.map(([f, ...v]) => `<tr><td>${f}</td>${v.map(cell).join("")}</tr>`).join("")}</tbody>`;

// Fictional example to show what a starred profile looks like.
$("#example").innerHTML = `<article class="card" style="grid-template-columns:auto minmax(0,1fr);box-shadow:var(--shadow-lg)">
  ${avatar("Bluebonnet Community Pantry", "K30")}
  <div class="who"><h3><span>Bluebonnet Community Pantry</span>${starBadge("gold")}</h3><div class="meta">Example City, TX · EIN 00-0000000</div></div>
  <p class="mission">Provides fresh groceries and nutrition classes to families facing food insecurity across three rural counties.</p>
  <div class="chips"><span class="chip">Food, Agriculture &amp; Nutrition</span><span class="chip good">Tax-deductible</span><span class="chip">Since 2009</span></div>
  <div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">
    <div class="kpi" style="padding:10px"><div class="label">Families served</div><div class="value" style="font-size:1.2rem">4,120</div></div>
    <div class="kpi" style="padding:10px"><div class="label">Meals</div><div class="value" style="font-size:1.2rem">310K</div></div>
    <div class="kpi" style="padding:10px"><div class="label">Budget</div><div class="value" style="font-size:1.2rem">$1.2M</div></div>
  </div>
</article>`;

// ---------- Data plans for funders & researchers ----------
const DATA_PLANS = [
  { key: "free", label: "Free", tagline: "Search and save, no account needed.", features: [
    "Search all Texas organizations", "IRS status, finances and Stars on every profile", "Save organizations and searches in your browser", "Claim and update your own nonprofit's profile"] },
  { key: "pro", label: "Funder Pro", tagline: "For grantmakers, consultants and researchers.", features: [
    "Everything in Free", "Export any search to CSV / Excel", "Shared collections for your team", "Alerts when an organization earns a new Star or files a new 990", "Filter by Star level, budget trend and county", "Multi-year financial history on every profile"] },
  { key: "compliance", label: "Funder Compliance", tagline: "Due diligence before every grant.", recommended: true, features: [
    "Everything in Funder Pro", "IRS revocation and Publication 78 deductibility checks", "Texas Comptroller franchise tax standing", "Texas Secretary of State charter status", "Downloadable due-diligence reports (PDF)", "Status-change alerts for your grantee list"] },
];
let billing = "annual";
function renderDataPlans() {
  const live = CONFIG.funderPlansLive;
  $("#data-plans-grid").innerHTML = DATA_PLANS.map((p) => {
    const cfg = CONFIG.funderPlans[p.key];
    const per = cfg ? (billing === "annual" ? cfg.annualMonthly : cfg.monthly) : 0;
    const note = cfg ? (billing === "annual" ? `Billed annually at $${(cfg.annualMonthly * 12).toLocaleString()}` : "Billed monthly, cancel anytime") : "No payment required";
    const cta = p.key === "free"
      ? `<a class="btn btn-ghost" href="./">Start searching</a>`
      : live ? `<a class="btn ${p.recommended ? "" : "btn-ghost"}" href="${CONFIG.contactEmail ? `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(p.label + " subscription")}` : "#"}">Subscribe</a>`
        : CONFIG.contactEmail ? `<a class="btn ${p.recommended ? "" : "btn-ghost"}" href="mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(p.label + " waitlist")}">Join the waitlist</a>`
          : `<button class="btn btn-ghost" disabled>Coming soon</button>`;
    return `<article class="plan ${p.recommended ? "featured" : ""}">
      ${p.recommended ? '<span class="ribbon">Recommended</span>' : ""}
      ${cfg && !live ? '<span class="soon">Coming soon</span>' : ""}
      <h3>${p.label}</h3>
      <p class="tag">${p.tagline}</p>
      <div class="price">$${per}<small>${cfg ? " /month" : ""}</small></div>
      <div class="discount" style="color:var(--muted)">${note}</div>
      <ul>${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
      ${cta}
    </article>`;
  }).join("");
}
document.querySelectorAll("[data-billing]").forEach((b) => b.addEventListener("click", () => {
  billing = b.dataset.billing;
  document.querySelectorAll("[data-billing]").forEach((x) => x.setAttribute("aria-selected", x === b));
  renderDataPlans();
}));
$("#np-discount").textContent = `Texas nonprofits with a claimed profile get ${Math.round(CONFIG.nonprofitDataDiscount * 100)}% off.`;
renderDataPlans();

$("#badge-row").innerHTML = ["verified", "gold", "platinum"].map((l) => badgeSVG(l, new Date().getFullYear())).join("");

// Enterprise enquiries go to the contact email when one is configured.
if (CONFIG.contactEmail) $("#contact-sales").href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent("Enterprise data access")}`;
else { $("#contact-sales").removeAttribute("href"); $("#contact-sales").setAttribute("aria-disabled", "true"); $("#contact-sales").textContent = "Contact sales — coming soon"; }
