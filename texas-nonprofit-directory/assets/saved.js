// Saved organizations and saved searches, kept in this browser only (no account needed).
const ORGS = "tnd.savedOrgs";
const SEARCHES = "tnd.savedSearches";

const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

export const savedOrgs = () => read(ORGS);
export const isSaved = (ein) => savedOrgs().some((o) => o.ein === ein);
export function toggleOrg(org) {
  const list = savedOrgs();
  const i = list.findIndex((o) => o.ein === org.ein);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ ein: org.ein, name: org.name, city: org.city, ntee: org.ntee, savedAt: Date.now() });
  write(ORGS, list);
  return i < 0;
}

export const savedSearches = () => read(SEARCHES);
export function saveSearch(label, query) {
  const list = savedSearches().filter((s) => s.query !== query);
  list.unshift({ label, query, savedAt: Date.now() });
  return write(SEARCHES, list.slice(0, 50));
}
export function removeSearch(query) {
  write(SEARCHES, savedSearches().filter((s) => s.query !== query));
}

const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
export const saveButton = (ein, extraClass = "") =>
  `<button type="button" class="save-btn ${extraClass}" data-save="${ein}" aria-pressed="${isSaved(ein)}" aria-label="${isSaved(ein) ? "Remove from saved" : "Save to My favorites"}">${HEART}</button>`;
