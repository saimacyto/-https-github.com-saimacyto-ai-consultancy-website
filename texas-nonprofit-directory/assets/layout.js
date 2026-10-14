// Shared header and footer, injected into every page.
import { CONFIG } from "./config.js";
import { myProfile, loginURL, signOut } from "./auth.js";

const page = location.pathname.split("/").pop() || "index.html";
const ICONS = {
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  saved: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
};
const link = (href, icon, label) =>
  `<a href="${href}"${page === href || (href === "./" && page === "index.html") ? ' aria-current="page"' : ""}>${ICONS[icon]}${label}</a>`;
export const brand = `<span class="mark"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill="currentColor"/></svg></span>
  <span><span class="name">TX<i>Nonprofits</i>.</span><small>Texas nonprofit directory</small></span>`;

document.getElementById("site-header").innerHTML = `
  <div class="wrap header-row">
    <a class="brand" href="./" aria-label="${CONFIG.siteName} home">${brand}</a>
    <nav class="main-nav" aria-label="Main">
      ${link("./", "home", "Dashboard")}
      ${link("search.html", "search", "Search")}
      ${link("saved.html", "saved", "Saved")}
      ${link("membership.html", "star", "Stars &amp; plans")}
      ${link("about.html", "info", "About")}
    </nav>
    <div class="account" id="account"><a class="btn btn-small" href="claim.html">Claim your nonprofit</a></div>
  </div>`;
document.querySelector("#site-header .mark").style.color = "var(--gold)";

// Account menu: "Sign in" for visitors, a name menu for members.
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
myProfile().then((me) => {
  const box = document.getElementById("account");
  if (!me) {
    if (page !== "login.html") box.insertAdjacentHTML("afterbegin", `<a class="sign-in" href="${loginURL()}">Sign in</a>`);
    return;
  }
  box.innerHTML = `<details class="account-menu">
    <summary aria-label="Account menu"><span class="initial" aria-hidden="true">${esc(me.display_name[0].toUpperCase())}</span><span class="who">${esc(me.display_name)}</span></summary>
    <div class="menu">
      <div class="menu-head"><b>${esc(me.display_name)}</b><span>${esc(me.email)}</span></div>
      <a href="./">My dashboard</a>
      <a href="saved.html">Saved &amp; claims</a>
      <a href="claim.html">Claim a nonprofit</a>
      ${me.is_admin ? '<a href="admin.html">Review claims (admin)</a>' : ""}
      <button type="button" id="sign-out">Sign out</button>
    </div></details>`;
  document.getElementById("sign-out").addEventListener("click", signOut);
});

document.getElementById("site-footer").innerHTML = `
  <div class="wrap footer-grid">
    <div>
      <a class="brand" href="./">${brand}</a>
      <p>Every IRS-recognized tax-exempt organization in Texas, searchable in one place. Home of the TXVerified Transparency Stars. Independent: not affiliated with the State of Texas or the IRS. Listing is not an endorsement.</p>
    </div>
    <div>
      <h4>Explore</h4>
      <a href="search.html">Search organizations</a>
      <a href="./#browse">Browse by cause</a>
      <a href="./#cities">Browse by city</a>
      <a href="saved.html">Saved organizations</a>
    </div>
    <div>
      <h4>For nonprofits</h4>
      <a href="claim.html">Claim your profile</a>
      <a href="membership.html#stars">Transparency Stars</a>
      <a href="membership.html#plans">Membership plans</a>
      <a href="membership.html#data-plans">Data plans for funders</a>
    </div>
    <div>
      <h4>Data</h4>
      <a href="about.html">About the data</a>
      <a href="https://apps.irs.gov/app/eos/" target="_blank" rel="noopener">IRS exempt org search ↗</a>
    </div>
  </div>
  <div class="wrap footer-base"><span>Source: IRS Exempt Organizations Business Master File</span><span>© ${new Date().getFullYear()} ${CONFIG.siteName}</span></div>`;
document.querySelector("#site-footer .mark").style.color = "var(--navy)";

// Point search engines at the main domain, whichever address this copy is served from.
const canonical = document.createElement("link");
canonical.rel = "canonical";
canonical.href = new URL(location.pathname.split("/").pop() + location.search, CONFIG.siteUrl).href;
document.head.append(canonical);
