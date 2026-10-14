// Saved organizations and saved searches, stored in the member's account.
// Pages await `savedReady` before rendering; the lists are then read synchronously.
import { supabase, currentUser, goToLogin } from "./auth.js";

let user = null;
let orgs = [];
let searches = [];

// Lists saved in this browser before accounts existed are moved into the account on first sign-in.
const LEGACY = { orgs: "tnd.savedOrgs", searches: "tnd.savedSearches" };
const readLegacy = (key) => { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } };
async function importLegacy() {
  const oldOrgs = readLegacy(LEGACY.orgs).filter((o) => /^\d{9}$/.test(o?.ein ?? ""));
  const oldSearches = readLegacy(LEGACY.searches).filter((s) => typeof s?.query === "string");
  if (oldOrgs.length) {
    const { error } = await supabase.from("saved_orgs").upsert(
      oldOrgs.map((o) => ({ ein: o.ein, name: o.name, city: o.city, ntee: o.ntee })), { onConflict: "user_id,ein", ignoreDuplicates: true });
    if (!error) localStorage.removeItem(LEGACY.orgs);
  }
  if (oldSearches.length) {
    const { error } = await supabase.from("saved_searches").upsert(
      oldSearches.map((s) => ({ name: String(s.label ?? "Saved search").slice(0, 200), query: s.query.slice(0, 2000) })), { onConflict: "user_id,query", ignoreDuplicates: true });
    if (!error) localStorage.removeItem(LEGACY.searches);
  }
}

export const savedReady = (async () => {
  user = await currentUser();
  if (!user) return;
  try { await importLegacy(); } catch { /* keep the browser copy for next time */ }
  const [o, s] = await Promise.all([
    supabase.from("saved_orgs").select("ein, name, city, ntee, created_at").order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("name, query, created_at").order("created_at", { ascending: false }),
  ]);
  orgs = (o.data ?? []).map((r) => ({ ein: r.ein, name: r.name, city: r.city, ntee: r.ntee, savedAt: Date.parse(r.created_at) }));
  searches = (s.data ?? []).map((r) => ({ label: r.name, query: r.query, savedAt: Date.parse(r.created_at) }));
})().catch(() => {});

export const signedIn = () => !!user;
export const savedOrgs = () => orgs;
export const isSaved = (ein) => orgs.some((o) => o.ein === ein);
export const savedSearches = () => searches;

// Each returns null after sending a signed-out visitor to the sign-in page, and throws if the save fails.
export async function toggleOrg(org) {
  if (!user) { goToLogin(); return null; }
  if (isSaved(org.ein)) {
    const { error } = await supabase.from("saved_orgs").delete().eq("ein", org.ein);
    if (error) throw new Error("Couldn't remove it. Please try again.");
    orgs = orgs.filter((o) => o.ein !== org.ein);
    return false;
  }
  const row = { ein: org.ein, name: org.name, city: org.city, ntee: org.ntee };
  const { error } = await supabase.from("saved_orgs").upsert(row, { onConflict: "user_id,ein" });
  if (error) throw new Error("Couldn't save it. Please try again.");
  orgs = [{ ...row, savedAt: Date.now() }, ...orgs];
  return true;
}

export async function saveSearch(label, query) {
  if (!user) { goToLogin(); return null; }
  const name = label.slice(0, 200);
  const { error } = await supabase.from("saved_searches").upsert({ name, query, created_at: new Date().toISOString() }, { onConflict: "user_id,query" });
  if (error) throw new Error("Couldn't save this search. Please try again.");
  searches = [{ label: name, query, savedAt: Date.now() }, ...searches.filter((s) => s.query !== query)];
  return true;
}

export async function removeSearch(query) {
  const { error } = await supabase.from("saved_searches").delete().eq("query", query);
  if (error) throw new Error("Couldn't remove it. Please try again.");
  searches = searches.filter((s) => s.query !== query);
}

const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
export const saveButton = (ein, extraClass = "") =>
  `<button type="button" class="save-btn ${extraClass}" data-save="${ein}" aria-pressed="${isSaved(ein)}" aria-label="${isSaved(ein) ? "Remove from saved" : "Save to My favorites"}">${HEART}</button>`;
