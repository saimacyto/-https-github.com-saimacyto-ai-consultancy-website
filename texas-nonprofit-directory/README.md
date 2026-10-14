# TX Nonprofits (txnonprofit.com)

The Texas nonprofit directory, home of the TXVerified Transparency Stars.

A Candid/GuideStar-style directory limited to Texas tax-exempt organizations, built from the
IRS Exempt Organizations Business Master File (`eo_tx.csv`). Static site — no server, no build tooling, no dependencies.

**Features**
- Search by name, keyword or EIN; filter by city/ZIP, cause area (NTEE), exemption type, revenue and ruling year, tax-deductible only
- Sort by relevance, name, revenue or ruling date; shareable URLs for every search
- Browse by cause and by city
- Organization profiles with decoded IRS status, finances and links to ProPublica 990s, Candid, the IRS and the Texas Comptroller

## Run locally

```bash
cd texas-nonprofit-directory
node scripts/build-data.mjs          # downloads the latest Texas file from irs.gov (~130k orgs)
python3 -m http.server 8000          # then open http://localhost:8000
```

The repo ships with a 12-record **fictional** sample in `data/` so the site works before the real build;
a banner appears whenever sample data is loaded. To rebuild the sample: `node scripts/build-data.mjs --input sample/eo_tx_sample.csv --sample`.

## Deploy

**txnonprofit.com** is served by Cloudflare Workers Builds, connected to this repository. Every push to `main` rebuilds it with these project settings:

| Setting | Value |
| --- | --- |
| Root directory | `texas-nonprofit-directory` |
| Build command | `node scripts/build-data.mjs` |
| Deploy command | `npx wrangler deploy` |

`wrangler.jsonc` tells Cloudflare to publish this folder as a static site, and `.assetsignore` keeps scripts and sample data off the website.

`.github/workflows/nonprofit-directory.yml` also publishes a backup copy to GitHub Pages on every push and once a month.

## Data files

| File | Contents |
| --- | --- |
| `data/index.json` | Compact search index, one array per org: `[ein, name, city, zip, ntee, subsection, revenue, rulingYear, deductibility, sortName, assets]` |
| `data/orgs/NN.json` | Full records keyed by EIN, sharded by the EIN's first two digits |
| `data/meta.json` | Build time, source and record count |

## Transparency Stars & membership

Two separate ladders, modeled on Candid's Seals of Transparency:

- **Transparency Stars** (free, earned): Verified → Bronze → Silver → Gold → Platinum. Each level asks the organization to share more. Stars give a small boost in search ranking.
- **Membership plans** (paid, optional): Community (free), Plus, Premier. These add tools such as donate buttons, analytics and grant alerts. They never change a Star or search ranking.
- **Data plans** for funders and researchers: Funder Pro and Funder Compliance, shown as "Coming soon" until `funderPlansLive` is set in `assets/config.js`.

Prices, discounts, payment links and the Supabase connection are all set in `assets/config.js`.

### Member accounts

Searching and profiles are open to everyone. Signing in (`login.html`) unlocks saved organizations, saved searches, the personal dashboard and claiming a nonprofit. Accounts live in the Supabase project **txnonprofit** (`supabaseUrl` in `assets/config.js`):

- `profiles`: one row per member. Set `is_admin = true` to let a member review claims on `admin.html`.
- `saved_orgs` and `saved_searches`: each member's lists.
- `claims`: claim requests, with status `pending`, `approved` or `rejected`.

Row-level security limits members to their own rows; only admins can read and update every claim. The Supabase client is bundled in `assets/vendor/supabase.js` (supabase-js 2.45.4), so the site loads no third-party scripts.

### Approving a claim

1. A signed-in member submits `claim.html`, and the request is saved to the `claims` table.
2. An admin opens `admin.html` and checks the EIN and the applicant. An email at the organization's website domain is the strongest signal. Then the admin approves or rejects the request.
3. Add the organization to `data/verified.json`, keyed by its 9-digit EIN, then commit. The next deploy shows its Star and details, and creates its website badge at `data/badges/<EIN>.svg`.
4. Send the organization its badge page: `badge.html?ein=<EIN>`. It has a preview and copy-paste code. The badge year comes from `verifiedOn`, so update that date at each annual review.

To rebuild badges without re-downloading IRS data, run `node scripts/build-badges.mjs`.

```json
{
  "741234567": {
    "level": "gold",                    // verified | bronze | silver | gold | platinum
    "plan": "plus",                     // community | plus | premier
    "verifiedOn": "2026-10-13",
    "mission": "…", "website": "https://…", "email": "…", "phone": "…", "logo": "https://…",
    "donateUrl": "https://…", "serviceArea": "…",
    "leader": { "name": "…", "title": "Executive Director" }, "boardChair": "…", "board": ["…"],
    "programs": [{ "name": "…", "description": "…" }],
    "budget": 720000, "revenueSources": [{ "source": "Foundations", "pct": 31 }], "reportUrl": "https://…",
    "goals": "…", "strategies": "…",
    "results": [{ "metric": "Families served", "value": "4,120", "year": 2025 }]
  }
}
```
(Comments are for illustration only; JSON doesn't allow them.)

Links in this file are only shown if they start with `http://` or `https://`.
