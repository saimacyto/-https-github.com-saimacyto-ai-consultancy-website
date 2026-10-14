// Sign in, create an account, and reset a forgotten password.
import { supabase, session, safeNext } from "./auth.js";
import { escapeHTML } from "./codes.js";

const root = document.getElementById("auth");
const params = new URLSearchParams(location.search);
const next = safeNext(params.get("next"));
const goNext = () => { location.href = next; };

const field = (id, label, type, extra = "") =>
  `<label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" class="field-input" required ${extra}>`;

function message(kind, text) {
  const box = document.getElementById("auth-msg");
  box.className = `callout ${kind}`;
  box.hidden = false;
  box.textContent = text;
}

function friendly(error) {
  const m = error?.message ?? "";
  if (/invalid login/i.test(m)) return "That email and password don't match. Try again, or reset your password.";
  if (/already registered/i.test(m)) return "There's already an account with that email. Sign in instead.";
  if (/email not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for the link we sent.";
  if (/rate limit/i.test(m)) return "Too many attempts. Please wait a few minutes and try again.";
  return m || "Something went wrong. Please try again.";
}

function render(mode) {
  const create = mode === "create";
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.4rem);margin:0 0 6px">${create ? "Create your free account" : "Welcome back"}</h1>
    <p style="color:var(--muted);margin:0 0 22px">${create ? "Save organizations and searches, and claim your nonprofit's profile." : "Sign in to see your dashboard, saved lists and claims."}</p>
    <div class="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${!create}" data-mode="signin">Sign in</button>
      <button type="button" role="tab" aria-selected="${create}" data-mode="create">Create account</button>
    </div>
    <form class="panel auth-form" id="auth-form" novalidate>
      ${create ? field("display_name", "Your name", "text", 'autocomplete="name" maxlength="80"') : ""}
      ${field("email", "Email", "email", 'autocomplete="email"')}
      ${field("password", "Password", "password", `autocomplete="${create ? "new-password" : "current-password"}" minlength="8"`)}
      ${create ? '<div class="hint">At least 8 characters.</div>' : '<p style="margin:10px 0 0"><button type="button" class="link-btn" id="forgot">Forgot your password?</button></p>'}
      <div id="auth-msg" hidden></div>
      <button class="btn" type="submit">${create ? "Create account" : "Sign in"}</button>
    </form>`;

  root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => render(b.dataset.mode)));
  const form = document.getElementById("auth-form");
  form.email.focus();

  document.getElementById("forgot")?.addEventListener("click", async () => {
    if (!form.email.value.trim() || !form.email.checkValidity()) { message("warn", "Enter your email above, then choose “Forgot your password?” again."); form.email.focus(); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.value.trim(), { redirectTo: new URL("login.html?reset=1", location.href).href });
    message(error ? "warn" : "ok", error ? friendly(error) : "If that email has an account, we've sent a link to reset your password.");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { message("warn", create ? "Please fill in every field. Passwords need at least 8 characters." : "Please enter your email and password."); return; }
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (create) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: form.display_name.value.trim() }, emailRedirectTo: new URL(next, location.href).href },
      });
      button.disabled = false;
      if (error) return message("warn", friendly(error));
      if (data.session) return goNext();
      return message("ok", `Almost done! We sent a confirmation link to ${email}. Open it to finish creating your account.`);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    button.disabled = false;
    if (error) return message("warn", friendly(error));
    goNext();
  });
}

function renderReset() {
  root.innerHTML = `
    <h1 style="font-size:clamp(1.8rem,4vw,2.4rem);margin:0 0 18px">Choose a new password</h1>
    <form class="panel auth-form" id="reset-form" novalidate>
      ${field("password", "New password", "password", 'autocomplete="new-password" minlength="8"')}
      <div class="hint">At least 8 characters.</div>
      <div id="auth-msg" hidden></div>
      <button class="btn" type="submit">Save new password</button>
    </form>`;
  const form = document.getElementById("reset-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) return message("warn", "Passwords need at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: form.password.value });
    if (error) return message("warn", friendly(error));
    message("ok", "Password updated. Taking you to your dashboard…");
    setTimeout(() => (location.href = "./"), 1200);
  });
}

supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") renderReset(); });
const current = await session;
if (params.get("reset") === "1" && current) renderReset();
else if (current) {
  root.innerHTML = `<section class="panel" style="text-align:center;padding:36px 24px"><h1 style="font-size:1.8rem;margin:0 0 8px">You're signed in</h1>
    <p style="color:var(--muted)">as ${escapeHTML(current.user.email)}</p><a class="btn" href="${escapeHTML(next)}">Continue</a></section>`;
} else render(params.get("mode") === "create" ? "create" : "signin");
