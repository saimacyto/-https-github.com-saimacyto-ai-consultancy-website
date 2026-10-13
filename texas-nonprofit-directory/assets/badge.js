import { formatEIN, escapeHTML, avatar } from "./codes.js";
import { loadOrg, showSampleNotice } from "./data.js";
import { STARS, loadVerified } from "./tiers.js";

const root = document.getElementById("badge");
const ein = (new URLSearchParams(location.search).get("ein") ?? "").replace(/\D/g, "").padStart(9, "0");
const base = new URL(".", location.href).href; // site root, wherever it's hosted

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function render(org, v) {
  const profileURL = `${base}org.html?ein=${org.ein}`;
  const imgURL = `${base}data/badges/${org.ein}.svg`;
  const alt = `${STARS[v.level].label} — Transparency on Texas Nonprofit Directory`;
  const snippet = `<a href="${profileURL}" target="_blank" rel="noopener"><img src="${imgURL}" width="200" height="104" alt="${alt}"></a>`;
  document.title = `${org.name} Star Badge · Texas Nonprofit Directory`;
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.5rem);margin:0 0 8px">Your Star badge</h1>
    <p style="color:var(--muted);margin:0 0 24px">Show donors your ${escapeHTML(STARS[v.level].label)} on your website, donation page and email signature. The badge links to your profile so anyone can check it.</p>
    <div class="org-summary">${avatar(org.name, org.ntee)}<div><b>${escapeHTML(org.name)}</b><span>${escapeHTML(org.city)}, TX · EIN ${formatEIN(org.ein)}</span></div></div>
    <section class="panel badge-preview">
      <div class="badge-stage"><img src="data/badges/${org.ein}.svg" width="200" height="104" alt="${escapeHTML(alt)}"></div>
      <div>
        <h2 style="font-size:1.15rem;margin:0 0 6px">Copy this code into your website</h2>
        <p style="color:var(--muted);font-size:.92rem;margin:0 0 12px">Paste it wherever your site accepts HTML (WordPress, Squarespace and Wix all have an "embed" or "code" block).</p>
        <textarea class="field-input code" id="snippet" readonly rows="4">${escapeHTML(snippet)}</textarea>
        <div class="form-actions" style="margin-top:12px">
          <a href="data/badges/${org.ein}.svg" download="${org.ein}-star-badge.svg">Download the image</a>
          <button class="btn btn-small" id="copy">Copy code</button>
        </div>
      </div>
    </section>
    <section class="panel" style="margin-top:18px">
      <h2 style="font-size:1.15rem">Good to know</h2>
      <ul class="list-clean">
        <li><b>It updates itself.</b><span>When you earn a higher Star or renew your review, the same code shows the new badge — no need to change your website.</span></li>
        <li><b>The year shows your last review.</b><span>Review your profile once a year to keep the badge current.</span></li>
        <li><b>Only you can show it.</b><span>The badge always links back to your profile, so donors can confirm it's genuine.</span></li>
      </ul>
    </section>`;
  document.getElementById("copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(snippet); toast("Code copied"); }
    catch { document.getElementById("snippet").select(); toast("Press Ctrl+C / ⌘C to copy"); }
  });
  document.getElementById("snippet").addEventListener("focus", (e) => e.target.select());
}

showSampleNotice();
const [org, verified] = /^\d{9}$/.test(ein) ? await Promise.all([loadOrg(ein), loadVerified()]) : [null, {}];
const v = verified[ein];
if (org && v && STARS[v.level]) render(org, v);
else root.innerHTML = `<div class="empty"><b>${org ? "This organization doesn't have a Star yet." : "Organization not found."}</b>
  Badges are available to every organization that has earned a Transparency Star — it's free.
  ${org ? `<a href="claim.html?ein=${org.ein}">Claim ${escapeHTML(org.name)} →</a>` : `<a href="claim.html">Find and claim your organization →</a>`}</div>`;
