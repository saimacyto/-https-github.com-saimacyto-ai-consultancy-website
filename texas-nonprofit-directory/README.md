# Texas Nonprofit Directory

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

`.github/workflows/nonprofit-directory.yml` downloads fresh IRS data and publishes to GitHub Pages on every push to
`main`, monthly, and on demand. Enable it under **Settings → Pages → Source: GitHub Actions**.

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

Prices, discounts, payment links and where claim applications go are all set in `assets/config.js`.

### Approving a claim

1. An organization submits `claim.html`. The application goes to `claimEndpoint` (for example, a Formspree form) or opens an email to `contactEmail`.
2. Check the EIN and the applicant. An email at the organization's website domain is the strongest signal.
3. Add the organization to `data/verified.json`, keyed by its 9-digit EIN, then commit. The next deploy shows its Star and details.

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
