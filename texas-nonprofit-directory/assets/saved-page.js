import { escapeHTML, avatar, nteeLabel, formatEIN } from "./codes.js";
import { savedOrgs, toggleOrg, savedSearches, removeSearch, savedReady, signedIn } from "./saved.js";
import { supabase, loginURL } from "./auth.js";

const STATUS = { pending: "In review", approved: "Approved", rejected: "Not approved" };

function render() {
  const orgs = savedOrgs();
  document.getElementById("saved-orgs").innerHTML = orgs.length
    ? orgs.map((o) => `<div class="row">${avatar(o.name, o.ntee, "sm")}<div><a class="name" href="org.html?ein=${escapeHTML(o.ein)}">${escapeHTML(o.name)}</a><span>${escapeHTML(o.city)}, TX · ${escapeHTML(nteeLabel(o.ntee))}</span></div>
        <button class="btn btn-ghost btn-small" data-unsave="${escapeHTML(o.ein)}">Remove</button></div>`).join("")
    : `<div class="empty"><b>No saved organizations yet.</b>Tap the bookmark on any organization to save it here. <a href="search.html">Start exploring →</a></div>`;
  const searches = savedSearches();
  document.getElementById("saved-searches").innerHTML = searches.length
    ? searches.map((s) => `<div class="row"><div><a class="name" href="search.html${escapeHTML(s.query)}">${escapeHTML(s.label)}</a><span>Saved ${new Date(s.savedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span></div>
        <button class="btn btn-ghost btn-small" data-unsearch="${escapeHTML(s.query)}">Remove</button></div>`).join("")
    : `<div class="empty"><b>No saved searches yet.</b>Run a search and choose “Save search” to keep it here.</div>`;
}

async function renderClaims() {
  const { data } = await supabase.from("claims").select("ein, org_name, status, created_at").order("created_at", { ascending: false });
  if (!data?.length) return;
  const box = document.getElementById("my-claims");
  box.hidden = false;
  box.querySelector(".saved-list").innerHTML = data.map((c) => `<div class="row"><div><a class="name" href="org.html?ein=${escapeHTML(c.ein)}">${escapeHTML(c.org_name ?? formatEIN(c.ein))}</a>
    <span>Requested ${new Date(c.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span></div><span class="chip">${STATUS[c.status] ?? escapeHTML(c.status)}</span></div>`).join("");
}

document.addEventListener("click", async (e) => {
  try {
    const ein = e.target.closest("[data-unsave]")?.dataset.unsave;
    if (ein) { await toggleOrg(savedOrgs().find((o) => o.ein === ein)); render(); }
    const q = e.target.closest("[data-unsearch]")?.dataset.unsearch;
    if (q !== undefined) { await removeSearch(q); render(); }
  } catch (err) { alert(err.message); }
});

await savedReady;
if (signedIn()) {
  render();
  renderClaims();
} else {
  document.getElementById("saved-main").innerHTML = `<section class="panel" style="text-align:center;padding:40px 24px">
    <h2>Sign in to see your saved organizations and searches</h2>
    <p style="color:var(--muted);max-width:480px;margin:0 auto 20px">A free account keeps your lists safe and available on every device.</p>
    <a class="btn" href="${loginURL("saved.html")}">Sign in or create account</a></section>`;
}
