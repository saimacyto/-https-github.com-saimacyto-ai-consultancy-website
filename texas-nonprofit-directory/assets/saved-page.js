import { escapeHTML, avatar, nteeLabel } from "./codes.js";
import { savedOrgs, toggleOrg, savedSearches, removeSearch } from "./saved.js";

function render() {
  const orgs = savedOrgs();
  document.getElementById("saved-orgs").innerHTML = orgs.length
    ? orgs.map((o) => `<div class="row">${avatar(o.name, o.ntee, "sm")}<div><a class="name" href="org.html?ein=${escapeHTML(o.ein)}">${escapeHTML(o.name)}</a><span>${escapeHTML(o.city)}, TX · ${escapeHTML(nteeLabel(o.ntee))}</span></div>
        <button class="btn btn-ghost btn-small" data-unsave="${escapeHTML(o.ein)}">Remove</button></div>`).join("")
    : `<div class="empty"><b>No saved organizations yet.</b>Tap the heart on any organization to save it here. <a href="./">Start exploring →</a></div>`;
  const searches = savedSearches();
  document.getElementById("saved-searches").innerHTML = searches.length
    ? searches.map((s) => `<div class="row"><div><a class="name" href="./${escapeHTML(s.query)}#explore">${escapeHTML(s.label)}</a><span>Saved ${new Date(s.savedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span></div>
        <button class="btn btn-ghost btn-small" data-unsearch="${escapeHTML(s.query)}">Remove</button></div>`).join("")
    : `<div class="empty"><b>No saved searches yet.</b>Run a search and choose “Save search” to keep it here.</div>`;
}

document.addEventListener("click", (e) => {
  const ein = e.target.closest("[data-unsave]")?.dataset.unsave;
  if (ein) { toggleOrg(savedOrgs().find((o) => o.ein === ein)); render(); }
  const q = e.target.closest("[data-unsearch]")?.dataset.unsearch;
  if (q !== undefined) { removeSearch(q); render(); }
});
render();
