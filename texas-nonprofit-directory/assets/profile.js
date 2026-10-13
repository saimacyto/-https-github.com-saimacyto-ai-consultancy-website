import {
  SUBSECTION, FOUNDATION, DEDUCTIBILITY, ORGANIZATION, AFFILIATION, STATUS, FILING_REQ, AMOUNT_CODE,
  nteeLabel, formatEIN, money, escapeHTML,
} from "./codes.js";
import { loadOrg, showSampleNotice } from "./data.js";

const root = document.getElementById("profile");
const ein = (new URLSearchParams(location.search).get("ein") ?? "").replace(/\D/g, "").padStart(9, "0");

const yyyymm = (s) => {
  if (!s || s.length < 6 || s === "000000") return "—";
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
};
const decode = (table, code) => (code ? table[code] ?? `Code ${code}` : "—");

function fact(label, value) {
  return `<dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value || "—")}</dd>`;
}

function render(o) {
  document.title = `${o.name} · Texas Nonprofit Directory`;
  const dashEIN = formatEIN(o.ein);
  const address = [o.street, `${o.city}, TX ${o.zip}`].filter(Boolean).join(", ");
  const mapsURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.name}, ${address}`)}`;
  const deductible = o.deductibility === "1";

  root.innerHTML = `
    <p><a href="./">← Back to search</a></p>
    <div class="profile-head">
      <div>
        <h1>${escapeHTML(o.name)}</h1>
        ${o.careOf ? `<div class="sub">In care of ${escapeHTML(o.careOf)}</div>` : ""}
        <div class="sub">${escapeHTML(address)}</div>
        <div class="chips" style="margin-top:10px">
          <span class="chip">EIN ${dashEIN}</span>
          <span class="chip">${escapeHTML(nteeLabel(o.ntee))}${o.ntee ? ` (${escapeHTML(o.ntee)})` : ""}</span>
          ${deductible ? `<span class="chip good">Donations tax-deductible</span>` : ""}
        </div>
      </div>
      <a class="btn" href="https://projects.propublica.org/nonprofits/organizations/${o.ein}" target="_blank" rel="noopener">View 990 filings ↗</a>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Revenue</div><div class="value">${money(o.revenue)}</div></div>
      <div class="kpi"><div class="label">Income</div><div class="value">${money(o.income)}</div></div>
      <div class="kpi"><div class="label">Total assets</div><div class="value">${money(o.assets)}</div></div>
      <div class="kpi"><div class="label">Exempt since</div><div class="value">${escapeHTML(o.ruling ? o.ruling.slice(0, 4) : "—")}</div></div>
    </div>

    <div class="grid-2">
      <section class="panel">
        <h2>Tax-exempt status</h2>
        <dl class="facts">
          ${fact("Exemption", decode(SUBSECTION, o.subsection))}
          ${fact("Foundation status", decode(FOUNDATION, o.foundation))}
          ${fact("Deductibility", decode(DEDUCTIBILITY, o.deductibility))}
          ${fact("IRS ruling date", yyyymm(o.ruling))}
          ${fact("Exempt status", decode(STATUS, o.status))}
          ${fact("Organization type", decode(ORGANIZATION, o.organization))}
          ${fact("Affiliation", decode(AFFILIATION, o.affiliation))}
          ${o.group && o.group !== "0000" ? fact("Group exemption #", o.group) : ""}
        </dl>
      </section>
      <section class="panel">
        <h2>Financial filing</h2>
        <dl class="facts">
          ${fact("Latest tax period", yyyymm(o.taxPeriod))}
          ${fact("Filing requirement", decode(FILING_REQ, o.filingReq))}
          ${fact("Private foundation return", o.pfFilingReq === "1" ? "Files Form 990-PF" : "Not required")}
          ${fact("Asset range", decode(AMOUNT_CODE, o.assetCode))}
          ${fact("Income range", decode(AMOUNT_CODE, o.incomeCode))}
          ${fact("Cause code (NTEE)", o.ntee ? `${o.ntee} — ${nteeLabel(o.ntee)}` : "")}
        </dl>
      </section>
    </div>

    <section class="panel" style="margin-top:16px">
      <h2>Verify &amp; learn more</h2>
      <div class="links">
        <a href="https://projects.propublica.org/nonprofits/organizations/${o.ein}" target="_blank" rel="noopener">ProPublica Nonprofit Explorer ↗<small>Form 990 filings, executive compensation and financial history</small></a>
        <a href="https://www.guidestar.org/profile/${dashEIN}" target="_blank" rel="noopener">Candid (GuideStar) profile ↗<small>Mission, programs and transparency seal, if claimed</small></a>
        <a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener">IRS Tax Exempt Organization Search ↗<small>Confirm current exemption and revocation status — search EIN ${dashEIN}</small></a>
        <a href="https://comptroller.texas.gov/taxes/franchise/account-status/search" target="_blank" rel="noopener">Texas Comptroller account status ↗<small>State franchise tax standing and registered agent</small></a>
        <a href="${mapsURL}" target="_blank" rel="noopener">Map this address ↗<small>${escapeHTML(address)}</small></a>
      </div>
    </section>
  `;
}

showSampleNotice();
const org = /^\d{9}$/.test(ein) ? await loadOrg(ein) : null;
if (org) render(org);
else root.innerHTML = `<div class="empty">No Texas organization found with EIN ${escapeHTML(formatEIN(ein))}. <a href="./">Back to search</a></div>`;
