// Loading helpers for the generated data files (see scripts/build-data.mjs).

// Index row layout — keep in sync with build-data.mjs.
export const F = { EIN: 0, NAME: 1, CITY: 2, ZIP: 3, NTEE: 4, SUB: 5, REV: 6, YEAR: 7, DED: 8, SORT: 9 };

let indexPromise;
export function loadIndex() {
  indexPromise ??= fetch("data/index.json").then((r) => {
    if (!r.ok) throw new Error(`Could not load directory index (HTTP ${r.status})`);
    return r.json();
  });
  return indexPromise;
}

export async function loadMeta() {
  try {
    const r = await fetch("data/meta.json");
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

export async function loadOrg(ein) {
  const r = await fetch(`data/orgs/${ein.slice(0, 2)}.json`);
  if (!r.ok) return null;
  const shard = await r.json();
  return shard[ein] ?? null;
}

export async function showSampleNotice() {
  const meta = await loadMeta();
  const el = document.getElementById("notice");
  if (!el || !meta) return meta;
  if (meta.sample) {
    el.hidden = false;
    el.querySelector(".wrap").innerHTML =
      "<strong>Demo data.</strong> These are fictional sample records. Run <code>node scripts/build-data.mjs</code> " +
      "(or deploy with the included GitHub Action) to load every Texas organization from the IRS.";
  }
  return meta;
}
