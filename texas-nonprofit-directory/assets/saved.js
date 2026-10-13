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

const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.4 3.8 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.5 0 5.8 3.4 4.6 6.9-1.8 5-9.3 9.6-9.3 9.6z"/></svg>';
export const saveButton = (ein, extraClass = "") =>
  `<button type="button" class="save-btn ${extraClass}" data-save="${ein}" aria-pressed="${isSaved(ein)}" aria-label="${isSaved(ein) ? "Remove from saved" : "Save organization"}">${HEART}</button>`;
