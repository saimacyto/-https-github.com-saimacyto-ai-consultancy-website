import { formatEIN, compactMoney, escapeHTML, avatar } from "./codes.js";
import { F, loadIndex, loadOrg, showSampleNotice } from "./data.js";
import { PLANS, STARS, STAR_ORDER, priceFor, starIcon, loadVerified } from "./tiers.js";
import { CONFIG } from "./config.js";
import { supabase, currentUser, loginURL } from "./auth.js";

const root = document.getElementById("claim");
const params = new URLSearchParams(location.search);
const ein = (params.get("ein") ?? "").replace(/\D/g, "");
const isUpdate = params.get("update") === "1";

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const domainOf = (s) => {
  const v = (s ?? "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("@")) return v.split("@").pop();
  try { return new URL(/^https?:/.test(v) ? v : `https://${v}`).hostname.replace(/^www\./, ""); } catch { return ""; }
};
const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "live.com", "msn.com", "proton.me", "protonmail.com"]);

function steps(active) {
  return `<ol class="steps">${["Find your organization", "Your details", "Submitted"].map((s, i) =>
    `<li class="${i <= active ? "on" : ""}">${s}</li>`).join("")}</ol>`;
}

// Step 1: search for the organization.
async function renderFinder() {
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.5rem);margin:0 0 8px">Claim your nonprofit's profile</h1>
    <p style="color:var(--muted);margin:0 0 24px">Free for every Texas organization. Claiming takes about 5 minutes; our team reviews each request before the profile shows as Verified.</p>
    ${steps(0)}
    <section class="panel">
      <label class="lbl" for="find" style="font-weight:600;display:block;margin-bottom:8px">Search by organization name or EIN</label>
      <input id="find" class="field-input" type="search" placeholder="e.g. Hill Country Food Pantry or 74-1234567" autocomplete="off">
      <div class="org-pick" id="picks"><p style="color:var(--muted);margin:6px 0 0">Start typing to find your organization.</p></div>
    </section>`;
  const input = document.getElementById("find");
  input.focus();
  const rows = await loadIndex();
  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = input.value.trim();
      const digits = q.replace(/[\s-]/g, "");
      const tokens = normalize(q).split(" ").filter(Boolean);
      const picks = document.getElementById("picks");
      if (!tokens.length) { picks.innerHTML = ""; return; }
      const found = [];
      for (const r of rows) {
        const hit = /^\d{3,9}$/.test(digits) ? r[F.EIN].startsWith(digits) : tokens.every((tok) => normalize(r[F.NAME]).includes(tok));
        if (hit) found.push(r);
        if (found.length >= 400) break;
      }
      found.sort((a, b) => b[F.REV] - a[F.REV]);
      picks.innerHTML = found.length
        ? found.slice(0, 8).map((r) => `<button type="button" data-ein="${r[F.EIN]}">${avatar(r[F.NAME], r[F.NTEE], "sm")}<span><b>${escapeHTML(r[F.NAME])}</b><span>${escapeHTML(r[F.CITY])}, TX · EIN ${formatEIN(r[F.EIN])} · ${compactMoney(r[F.REV])} revenue</span></span></button>`).join("")
        : `<p style="color:var(--muted);margin:6px 0 0">No match. Only organizations with a Texas address in the IRS master file are listed — newly recognized organizations appear after the IRS's monthly update.</p>`;
    }, 150);
  });
  document.getElementById("picks").addEventListener("click", (e) => {
    const pick = e.target.closest("[data-ein]")?.dataset.ein;
    if (pick) location.search = `?ein=${pick}`;
  });
}

// Step 2: application form.
function renderForm(org, existing, user) {
  const disc = org.revenue < CONFIG.smallOrgRevenue;
  const planCard = (key) => {
    const price = priceFor(key, org.revenue);
    return `<label><input type="radio" name="plan" value="${key}" ${key === (existing?.plan ?? "community") ? "checked" : ""}>
      <b>${PLANS[key].label}</b><span>${price ? `$${price}/year` : "Free"}${disc && CONFIG.prices[key] ? " · small-org price" : ""}</span></label>`;
  };
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.5rem);margin:0 0 8px">${isUpdate ? "Update" : "Claim"} your profile</h1>
    <p style="color:var(--muted);margin:0 0 24px">Tell us who you are and add the basics. You can add programs, financials and results later to earn higher Stars.</p>
    ${steps(1)}
    <div class="org-summary">${avatar(org.name, org.ntee)}<div><b>${escapeHTML(org.name)}</b><span>${escapeHTML(org.city)}, TX · EIN ${formatEIN(org.ein)}</span></div>
      <a href="claim.html" style="margin-left:auto;font-size:.9rem">Not your organization?</a></div>
    <form class="panel" id="apply" novalidate>
      <h2 style="font-size:1.2rem">About you</h2>
      <div class="form-grid">
        <div><label for="name">Full name</label><input id="name" name="name" class="field-input" required autocomplete="name"></div>
        <div><label for="title">Title / role</label><input id="title" name="title" class="field-input" required placeholder="Executive Director"></div>
        <div><label for="email">Work email</label><input id="email" name="email" type="email" class="field-input" required autocomplete="email" value="${escapeHTML(user.email)}"><div class="hint">Use an address at your organization's website domain for the fastest review.</div></div>
        <div><label for="phone">Phone</label><input id="phone" name="phone" type="tel" class="field-input" autocomplete="tel"></div>
      </div>

      <h2 style="font-size:1.2rem;margin-top:28px">Your organization</h2>
      <div class="form-grid">
        <div class="full"><label for="website">Website</label><input id="website" name="website" class="field-input" placeholder="https://" value="${escapeHTML(existing?.website ?? "")}"></div>
        <div class="full" id="domain-check"></div>
        <div class="full"><label for="mission">Mission statement</label><textarea id="mission" name="mission" class="field-input" maxlength="600" placeholder="In one or two sentences, what does your organization do and for whom?">${escapeHTML(existing?.mission ?? "")}</textarea><div class="hint"><span id="mission-count">0</span>/600 characters</div></div>
      </div>

      <h2 style="font-size:1.2rem;margin-top:28px">Choose a membership plan</h2>
      <p style="color:var(--muted);margin:-4px 0 12px;font-size:.92rem">Your plan adds tools and features. It never changes your Star or your place in search results. <a href="membership.html#plans" target="_blank">Compare plans ↗</a></p>
      <div class="plan-pick">${["community", "plus", "premier"].map(planCard).join("")}</div>
      ${disc ? `<p class="callout ok" style="margin-top:12px">Organizations with under $${(CONFIG.smallOrgRevenue / 1000).toFixed(0)}K in revenue get ${Math.round(CONFIG.smallOrgDiscount * 100)}% off paid plans.</p>` : ""}

      <label class="check" style="margin-top:22px;align-items:flex-start"><input type="checkbox" name="authorized" required> <span>I am authorized to represent this organization, and the information I provide is accurate.</span></label>
      <div id="form-error" class="callout warn" style="margin-top:14px" hidden></div>
      <div class="form-actions">
        <span style="color:var(--muted);font-size:.88rem">We review requests within ${"5"} business days.</span>
        <button class="btn" type="submit">Submit for review</button>
      </div>
    </form>`;

  const form = document.getElementById("apply");
  const updateDomain = () => {
    const site = domainOf(form.website.value);
    const mail = domainOf(form.email.value);
    const box = document.getElementById("domain-check");
    if (!mail) { box.innerHTML = ""; return; }
    box.innerHTML = site && (mail === site || mail.endsWith(`.${site}`))
      ? `<div class="callout ok">✓ Your email matches your website domain — this speeds up verification.</div>`
      : FREE_MAIL.has(mail)
        ? `<div class="callout warn">Personal email addresses need extra checks. If you have one at your organization's domain, use that instead.</div>`
        : "";
  };
  form.email.addEventListener("input", updateDomain);
  form.website.addEventListener("input", updateDomain);
  form.mission.addEventListener("input", () => (document.getElementById("mission-count").textContent = form.mission.value.length));
  document.getElementById("mission-count").textContent = form.mission.value.length;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("form-error");
    const missing = [...form.querySelectorAll("[required]")].filter((el) => (el.type === "checkbox" ? !el.checked : !el.value.trim()));
    if (missing.length || !form.email.checkValidity()) {
      err.hidden = false;
      err.textContent = missing.length ? "Please fill in the highlighted fields and confirm you're authorized." : "Please enter a valid email address.";
      (missing[0] ?? form.email).focus();
      missing.forEach((el) => el.setAttribute("aria-invalid", "true"));
      return;
    }
    err.hidden = true;
    const plan = form.plan.value;
    const application = {
      type: isUpdate ? "profile-update" : "claim",
      ein: org.ein, organization: org.name, city: org.city,
      name: form.name.value.trim(), title: form.title.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
      website: form.website.value.trim(), mission: form.mission.value.trim(),
      plan, price: priceFor(plan, org.revenue),
      emailMatchesWebsite: domainOf(form.website.value) !== "" && domainOf(form.email.value) === domainOf(form.website.value),
      submittedAt: new Date().toISOString(),
    };
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await submit(application);
      renderDone(org, application);
    } catch (ex) {
      button.disabled = false;
      err.hidden = false;
      err.textContent = ex.message;
    }
  });
}

// Claim requests are stored with the member's account and reviewed on admin.html.
async function submit(application) {
  const { error } = await supabase.from("claims").insert({ ein: application.ein, org_name: application.organization, details: application });
  if (error) throw new Error("We couldn't send your request. Please try again in a moment.");
}

function renderSignIn(org) {
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.5rem);margin:0 0 8px">Claim your profile</h1>
    ${steps(1)}
    <div class="org-summary">${avatar(org.name, org.ntee)}<div><b>${escapeHTML(org.name)}</b><span>${escapeHTML(org.city)}, TX · EIN ${formatEIN(org.ein)}</span></div>
      <a href="claim.html" style="margin-left:auto;font-size:.9rem">Not your organization?</a></div>
    <section class="panel" style="text-align:center;padding:36px 24px">
      <h2>Sign in to continue</h2>
      <p style="color:var(--muted);max-width:460px;margin:0 auto 20px">Claims are linked to a free account so you can check the status of your request and manage your profile later.</p>
      <a class="btn" href="${loginURL(`claim.html?ein=${org.ein}${isUpdate ? "&update=1" : ""}`)}">Sign in or create account</a>
    </section>`;
}

function renderDone(org, app) {
  const pay = CONFIG.paymentLinks[app.plan];
  root.innerHTML = `
    ${steps(2)}
    <section class="panel" style="text-align:center;padding:40px 24px">
      ${starIcon("verified", 56)}
      <h1 style="font-size:2rem;margin:12px 0 8px">Thanks, ${escapeHTML(app.name.split(" ")[0])}!</h1>
      <p style="color:var(--ink-2);max-width:520px;margin:0 auto 20px">We've received your request for <b>${escapeHTML(org.name)}</b>. We'll confirm your EIN and contact details and email you at <b>${escapeHTML(app.email)}</b> once your profile is Verified.</p>
      ${app.price && pay ? `<p><a class="btn" href="${escapeHTML(pay)}" target="_blank" rel="noopener">Complete ${PLANS[app.plan].label} payment — $${app.price}/year</a></p>` : ""}
      ${app.price && !pay ? `<p style="color:var(--muted)">We'll send payment details for your ${PLANS[app.plan].label} plan after approval.</p>` : ""}
      <p style="margin-top:24px"><a href="org.html?ein=${org.ein}">Back to your profile</a></p>
    </section>
    <section class="panel" style="margin-top:18px">
      <h2 style="font-size:1.15rem">What's next: earn your Stars</h2>
      <div class="ladder">${STAR_ORDER.map((k) => `<div>${starIcon(k, 24)}<span><b>${STARS[k].label}</b><span>${STARS[k].requires.slice(1).join(" · ") || STARS[k].summary}</span></span></div>`).join("")}</div>
    </section>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

showSampleNotice();
if (/^\d{9}$/.test(ein.padStart(9, "0")) && ein) {
  const padded = ein.padStart(9, "0");
  const [org, verified] = await Promise.all([loadOrg(padded), loadVerified()]);
  if (org) {
    document.title = `Claim ${org.name} · TX Nonprofits`;
    const user = await currentUser();
    if (user) renderForm(org, verified[padded], user);
    else renderSignIn(org);
  } else renderFinder();
} else {
  renderFinder();
}
