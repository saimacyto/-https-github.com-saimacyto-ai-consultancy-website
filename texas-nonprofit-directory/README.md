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
| `data/index.json` | Compact search index, one array per org: `[ein, name, city, zip, ntee, subsection, revenue, rulingYear, deductibility, sortName]` |
| `data/orgs/NN.json` | Full records keyed by EIN, sharded by the EIN's first two digits |
| `data/meta.json` | Build time, source and record count |
