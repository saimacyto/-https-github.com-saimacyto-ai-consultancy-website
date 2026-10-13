// Shared header and footer, injected into every page.
import { CONFIG } from "./config.js";

const page = location.pathname.split("/").pop() || "index.html";
const link = (href, label) =>
  `<a href="${href}"${page === href || (href === "./" && page === "index.html") ? ' aria-current="page"' : ""}>${label}</a>`;

document.getElementById("site-header").innerHTML = `
  <div class="wrap header-row">
    <a class="brand" href="./">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="var(--accent)"/></svg>
      <span>Texas<b>Nonprofit</b>Directory</span>
    </a>
    <nav class="main-nav" aria-label="Main">
      ${link("./", "Explore")}
      ${link("membership.html", "Stars &amp; Membership")}
      ${link("saved.html", "Saved")}
      ${link("about.html", "About the data")}
    </nav>
    <a class="btn btn-small" href="claim.html">Claim your nonprofit</a>
  </div>`;

document.getElementById("site-footer").innerHTML = `
  <div class="wrap footer-grid">
    <div>
      <div class="brand footer-brand"><span>Texas<b>Nonprofit</b>Directory</span></div>
      <p>Every IRS-recognized tax-exempt organization in Texas, searchable in one place. Listing is not an endorsement.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <a href="./">Search organizations</a>
      <a href="./#browse">Browse by cause</a>
      <a href="./#cities">Browse by city</a>
      <a href="saved.html">Saved organizations</a>
    </div>
    <div>
      <h4>For nonprofits</h4>
      <a href="claim.html">Claim your profile</a>
      <a href="membership.html">Transparency Stars</a>
      <a href="membership.html#plans">Membership plans</a>
    </div>
    <div>
      <h4>Data</h4>
      <a href="about.html">About the data</a>
      <a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener">IRS exempt org search ↗</a>
    </div>
  </div>
  <div class="wrap footer-base">Source: IRS Exempt Organizations Business Master File · © ${new Date().getFullYear()} ${CONFIG.siteName}</div>`;
