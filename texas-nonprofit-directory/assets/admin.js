// Admin review of claim requests. Only accounts marked is_admin can read or change claims;
// the database enforces that, this page just shows the controls.
import { supabase, myProfile, loginURL } from "./auth.js";
import { escapeHTML, formatEIN } from "./codes.js";

const root = document.getElementById("admin");
const LABELS = { name: "Name", title: "Title", email: "Email", phone: "Phone", website: "Website", mission: "Mission", plan: "Plan", price: "Price ($/yr)", emailMatchesWebsite: "Email matches site", type: "Request type" };
let filter = "pending";

async function render() {
  const { data, error } = await supabase.from("claims").select("*").eq("status", filter).order("created_at", { ascending: filter === "pending" });
  const tabs = ["pending", "approved", "rejected"].map((s) =>
    `<button type="button" class="btn btn-small ${s === filter ? "" : "btn-ghost"}" data-filter="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join(" ");
  const list = error ? `<div class="callout warn">${escapeHTML(error.message)}</div>`
    : !data.length ? `<div class="empty"><b>No ${filter} claims.</b></div>`
    : data.map((c) => `<article class="admin-claim">
        <div><a class="name" href="org.html?ein=${escapeHTML(c.ein)}" target="_blank"><b>${escapeHTML(c.org_name ?? "")}</b></a> · EIN ${formatEIN(c.ein)}
          <span style="color:var(--muted)"> · ${new Date(c.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        <dl>${Object.entries(LABELS).filter(([k]) => c.details?.[k] !== undefined && c.details[k] !== "")
          .map(([k, l]) => `<dt>${l}</dt><dd>${escapeHTML(String(c.details[k]))}</dd>`).join("")}</dl>
        ${c.status === "pending" ? `<div class="actions"><button class="btn btn-small" data-set="approved" data-id="${c.id}">Approve</button>
          <button class="btn btn-small btn-ghost" data-set="rejected" data-id="${c.id}">Reject</button></div>` : ""}
      </article>`).join("");
  root.innerHTML = `<h1 style="font-size:clamp(1.8rem,4vw,2.4rem);margin:0 0 6px">Claim requests</h1>
    <p style="color:var(--muted);margin:0 0 18px">Check the person really represents the organization (email domain, website, a quick call) before approving.
    After approving, ask Claude to add the organization to <code>data/verified.json</code> so its profile shows as Verified.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${tabs}</div>
    <section class="panel">${list}</section>`;
}

root.addEventListener("click", async (e) => {
  const f = e.target.closest("[data-filter]")?.dataset.filter;
  if (f) { filter = f; return render(); }
  const btn = e.target.closest("[data-set]");
  if (!btn) return;
  btn.disabled = true;
  const { error } = await supabase.from("claims").update({ status: btn.dataset.set, reviewed_at: new Date().toISOString() }).eq("id", btn.dataset.id);
  if (error) { alert(error.message); btn.disabled = false; return; }
  render();
});

const me = await myProfile();
if (!me) location.href = loginURL("admin.html");
else if (!me.is_admin) root.innerHTML = `<section class="panel"><h1 style="font-size:1.6rem">Admins only</h1><p>This page is for the TX Nonprofits review team.</p></section>`;
else render();
