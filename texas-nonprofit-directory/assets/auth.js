// Member accounts (Supabase Auth). Searching stays open to everyone; signing in
// unlocks saved lists, the personal dashboard and claiming a nonprofit.
import { createClient } from "./vendor/supabase.js";
import { CONFIG } from "./config.js";

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Resolves to the current session (or null) once, for every module on the page.
export const session = supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
export const currentUser = async () => (await session)?.user ?? null;

let profilePromise;
export function myProfile() {
  profilePromise ??= currentUser().then(async (user) => {
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("display_name, email, is_admin").eq("id", user.id).maybeSingle();
    return { display_name: data?.display_name || user.email.split("@")[0], email: user.email, is_admin: !!data?.is_admin };
  }).catch(() => null);
  return profilePromise;
}

// Only same-site pages may be used as the after-login destination.
export const safeNext = (next) => (/^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(next ?? "") ? next : "./");
const herePage = () => (location.pathname.split("/").pop() || "index.html") + location.search;
export const loginURL = (next = herePage()) => `login.html?next=${encodeURIComponent(safeNext(next))}`;
export const goToLogin = (next) => { location.href = loginURL(next); };

export async function signOut() {
  await supabase.auth.signOut();
  location.href = "./";
}
