---
layout: default
title: Contributing with AI assistants
parent: Contribute
nav_order: 1
permalink: /contribute/agents/
---

# Contributing custom scripts with an AI assistant
{: .no_toc }

This page helps you use an AI coding assistant — or work by hand — to add a custom script to this
repository quickly and correctly. It complements the [Contribute](/contribute) page by spelling out the
conventions and pitfalls that are easy to miss.

It is **tool-neutral**. `AGENTS.md` is an [open, cross-vendor format](https://agents.md/) that most
coding assistants read automatically from the repository root. Two need pointing at it, and this
repository ships a shim for each: `CLAUDE.md` imports this file with `@AGENTS.md` for Claude Code, and
`.gemini/settings.json` sets `context.fileName` for Gemini CLI. Aider users add `read: AGENTS.md` to
their own `.aider.conf.yml`. Nothing below is assistant-specific — every checklist works by hand too.

**Writing evalscripts outside this repository?** This file is useful on its own. Copy it into the root
of your own project as `AGENTS.md` and your assistant will pick it up there the same way (for Claude
Code, add a `CLAUDE.md` containing `@AGENTS.md` alongside it, exactly as above). §2 and §6 are the
parts that apply to any evalscript; the rest describes how contributions to *this* repository are laid
out.

<details markdown="block">
  <summary>Table of contents</summary>
- TOC
{:toc}
</details>

## What a contribution is

A folder `<collection>/<slug>/` containing:

- `script.js` — the evalscript. It must be a real V3 script, not just a file starting with
  `//VERSION=3`; see §2.
- `README.md` **or** `index.md` — the page: Jekyll front matter + a short description (see below).
  Both names work; the `permalink` in the front matter decides the URL, not the filename. Most scripts
  use `README.md`; the templates below and the `planet` / `dem` collections use `index.md`.
- `fig/fig1.<ext>` — a representative image (optional but expected for real scripts). Keep whatever
  format you already have; `.png`, `.jpg`, `.jpeg` and `.gif` are all in use. Don't convert an image
  just to make the filename read `fig1.png`.

…plus **one link line** added to the collection's index page, `<collection>/<collection>.md`.

Copying the [example folder](/contribute/example) is the easiest starting point. One script with
several outputs (§2) covers almost every case; only when a folder holds genuinely different products
does it need [example-multiple-scripts](/contribute/example-multiple-scripts) and the `scripts:` field
in §3.

## 1. Gather the inputs

- **Collection / satellite folder** (`sentinel-2`, `sentinel-1`, `sentinel-3`, `sentinel-5p`,
  `landsat-8`, `dem`, …). **Choose it from the bands the script uses** — e.g. a Landsat thermal band
  `B10` ⇒ `landsat-8` (Landsat 8/9 OLI/TIRS).
- **Title** (human-readable) and **slug** (`snake_case`, used as the folder name).
- **One-line description** for the index link.
- **The evalscript**, and whether it needs one page or several script variants on one page.
- **At least one example**: `lat`, `lng`, `zoom`, `datasetId`, `fromTime`/`toTime` (an ISO day window
  over a real, mostly cloud-free acquisition), and `platform` (`EOB` and/or `CDSE`).
- **A representative image** at `fig/fig1.<ext>`, in its original format.

## 2. Anatomy of an evalscript

Every script has the same shape. Start from this skeleton — one file, several outputs, which is the
form to prefer:

```javascript
//VERSION=3

function setup() {
  return {
    input: ["B04", "B08", "dataMask"],   // only the bands you actually use
    output: [
      { id: "default", bands: 4 },                              // R, G, B, alpha
      { id: "index", bands: 1, sampleType: "FLOAT32" },         // histogram
      { id: "browserStats", bands: 1, sampleType: "FLOAT32" },  // time series
      { id: "dataMask", bands: 1 },                             // 1 = valid pixel
    ],
    // mosaicking: "ORBIT",              // multi-temporal scripts only
  };
}

function evaluatePixel(sample) {
  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return {
    default: [ndvi, ndvi, ndvi, sample.dataMask],
    index: [ndvi],
    browserStats: [ndvi],
    dataMask: [sample.dataMask],
  };
}
```

A visualization-only script can drop everything but `default` and return a plain array instead of an
object. Everything else stays the same.

- **`setup()`** declares which bands you request and the shape of the result.
- **`evaluatePixel()`** holds the actual formula and runs once per pixel. Bands arrive as
  `sample.<band>` (`sample.B04`); with `mosaicking` set they become `samples[i].<band>`.
- **`mosaicking`** — `"SIMPLE"` (the default, one scene), `"ORBIT"` or `"TILE"` — is what makes a
  script [multi-temporal](https://docs.sentinel-hub.com/api/latest/evalscript/v3/#mosaicking). The
  string form is the repo convention (69 scripts) over the `Mosaicking.ORBIT` enum (19).

### Outputs

**Prefer one script with several outputs over several script files.** The four names are exact:

| output id | bands | sampleType | purpose |
|---|---|---|---|
| `default` | 3 or 4 | `AUTO` | R, G, B (+ alpha) shown on the map |
| `index` | 1 | `FLOAT32` | raw value — drives the histogram |
| `browserStats` | 1 | `FLOAT32` | raw value — drives the time series (`NaN` where masked) |
| `dataMask` | 1 | | 1 = valid pixel, 0 = no data |

`default` is what gets drawn on the map. With the default `sampleType: "AUTO"` its values are 0–1,
mapped onto 0–255 and clamped outside that range. The other three feed the Copernicus Browser
**Statistical Analysis** panel — one script then serves the map, the histogram and the time series,
with no duplicated copy of the formula to keep in sync.

Use **`browserStats`** in new scripts. The older `eobrowserStats` still works and is what the 46
existing scripts in this repository use — the name dates from EO Browser, which has been discontinued
in favour of Copernicus Browser. There is no need to go back and rename working scripts.

### `evaluatePixel` parameters

The full signature is `evaluatePixel(samples, scenes, inputMetadata, customData, outputMetadata)`.
Most scripts only ever need the first. The rest are
[documented here](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Functions.html#parameters):

| parameter | contains | use it for |
|---|---|---|
| `samples` | band values — an object under `SIMPLE`, an **array** under `ORBIT`/`TILE` | everything |
| `scenes` | per-scene metadata: `scenes.tiles[i].cloudCoverage`, `.date`, `scenes.orbits[i].dateFrom` | skipping or weighting cloudy scenes |
| `inputMetadata` | `serviceVersion`, `normalizationFactor` (`REFLECTANCE = DN × factor`) | converting DN to reflectance |
| `customData` | reserved for future use | nothing today |
| `outputMetadata` | write `.userData` to return JSON beside the raster | recording which acquisitions contributed |

### Colour helpers

`new ColorRampVisualizer(ramp)` interpolates between stops; `new ColorMapVisualizer(pairs)` is a
discrete step lookup with no blending. Both are **classes** — construct once at the top of the script,
then call `.process(value)` per pixel, which returns a normalized RGB triplet. Colours are hex
(`0xff0000`) or 0–1 triplets, never 0–255. Stock ramps come from the static factories
(`ColorRampVisualizer.createBlueRed(min, max)` and friends). Full list of
[utilities and visualizers](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Utilities.html).

### Through OGC services (WMS/WCS/WMTS)

If the script will be served through an OGC layer rather than the Processing API,
[three things change](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Functions.html#ogc-services-specifics):
only the `default` output comes back (no extra outputs, no JSON metadata); `TRANSPARENCY` and
`BGCOLOR` are ignored, so handle transparency with `dataMask`; and the bit depth in `FORMAT` is
ignored, so `sampleType` decides it.

### Going further

| Topic | Reference |
|---|---|
| V3 reference — `setup`, outputs, mosaicking | [docs.sentinel-hub.com](https://docs.sentinel-hub.com/api/latest/evalscript/v3/) |
| `preProcessScenes` — drop scenes before processing | [Functions](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Functions.html#preprocessscenes) |
| `updateOutput` — band count decided at runtime | [Functions](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Functions.html#updateoutput) |
| Multi-temporal `for` loop over `samples` (mean NDVI) | [Examples](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Examples.html#calculating-the-mean-ndvi-value-during-a-given-time-period) |

## 3. Scaffold the files

### `script.js`

The evalscript verbatim (§2). One thing worth stating outright: evalscripts are **per-pixel** — they
cannot access neighbouring pixels, so they cannot measure neighbourhoods or cluster sizes. Don't
describe a script as doing spatial filtering it can't do.

### `README.md` (or `index.md`)

Front matter (keep the quoting style):

```yaml
---
title: <Title>
parent: <Collection display name>      # e.g. Landsat 8
grand_parent: <Grandparent>            # e.g. Landsat; omit if the collection has none
layout: script
permalink: /<collection>/<slug>/
nav_exclude: true
examples:
- zoom: '<zoom>'
  lat: '<lat>'
  lng: '<lng>'
  datasetId: <TOKEN>
  fromTime: '<YYYY-MM-DDT00:00:00.000Z>'
  toTime: '<YYYY-MM-DDT23:59:59.999Z>'
  platform:
  - CDSE
  - EOB
  evalscripturl: https://custom-scripts.sentinel-hub.com/custom-scripts/<collection>/<slug>/script.js
---
```

**Several scripts on one page.** Reach for this only when the folder holds genuinely *different
products* — different source datasets, or different temporal aggregations. Do **not** split a script
into separate visualization / raw-value / per-browser files: use the multiple outputs in §2 instead,
so there is one formula to maintain rather than three copies that drift apart. Many older pages carry
an `eob.js` alongside `script.js` because EO Browser and Copernicus Browser needed different cloud
masking (s2cloudless vs `SCL`); that is history, not a pattern to copy.

When you do need it, list the files with a `scripts:` field before `examples:`, and the page renders
one tab per entry:

```yaml
scripts:
  - [Copernicus DEM, script.js]
  - [Mapzen DEM, mapzen.js]
```

Each entry is `[<label>, <filename>]`, the first tab is the one shown by default, and every file must
sit in the same folder as the page. The equivalent block form (`- - Copernicus DEM` on its own line)
is used by many existing pages and is equally valid. Without a `scripts:` field the layout falls back
to including a file named exactly `script.js`. The "Evaluate and Visualize" links are built separately
from `evalscripturl` in `examples`, so point that at whichever variant the browser should open. See
[example-multiple-scripts](/contribute/example-multiple-scripts) for a working page.

Body, in this order:

```markdown
## General description

<What the script shows and why; the index/threshold logic or formula; which bands it uses.>

## Description of representative images

<One-line caption.>
![<alt text>](fig/fig1.<ext>)

## References

<links: docs, papers, blog posts, related scripts>
```

### Index link line

Add to `<collection>/<collection>.md`, under an existing heading, matching the surrounding list style:

```markdown
- [<Title>](/<collection>/<slug>) - <one-line description>
```

## 4. The examples block and the CDSE lookup

The website turns the `examples` block into "open in browser" buttons, and the two platforms differ:

- **EO Browser** (`platform: EOB`) uses the raw `datasetId`.
- **Copernicus Browser** (`platform: CDSE`) maps the `datasetId` through a `cdse_lookup` table in the
  front matter of [`_layouts/script.html`](https://github.com/sentinel-hub/custom-scripts/blob/main/_layouts/script.html).

**Pitfall:** if a collection's token is **not** in `cdse_lookup`, the Copernicus Browser link is
silently broken (empty dataset id). To enable a CDSE example for a collection that is missing, add a
mapping line to `cdse_lookup` and **call out that change in your pull request** (it touches a shared
site file). You can read the real CDSE dataset id straight from a Copernicus Browser URL's
`&datasetId=` parameter.

No token list is reproduced here, because it would rot: read the tokens from `cdse_lookup` in that
file, and take the `parent` / `grand_parent` values from a sibling script in the same collection.

## 5. Validation checklist

- Every evalscript in the folder is a real V3 script — first line `//VERSION=3`, a `setup()` returning
  `{ input, output }`, and an `evaluatePixel()` — and is valid JavaScript. Adding the `//VERSION=3`
  line to a V1/V2 script does not satisfy this.
- The main evalscript is named `script.js`, unless the page lists its files explicitly in `scripts:`.
- Raw values and statistics come from extra outputs on one script (§2), not from a separate `raw.js`
  or a per-browser variant.
- The page file (`README.md` or `index.md`) has `layout: script` and `nav_exclude: true` in its front
  matter.
- `permalink` is `/<collection>/<slug>/` **and** `evalscripturl` ends with
  `/<collection>/<slug>/script.js` — both match the real folder path.
- `slug` is `snake_case`; the folder is under the correct collection (band-driven).
- `examples` has at least one complete entry over a real, mostly cloud-free acquisition.
- If any example uses `platform: CDSE`, its `datasetId` token exists in `cdse_lookup` (add it if not).
- If the page lists several evalscripts, each filename in `scripts:` exists in the folder.
- `fig/fig1.<ext>` exists in its original format, is non-empty, and is referenced by the page with a
  matching extension (watch for an accidental doubled extension such as `fig1.png.png`).
- The index link line is added under an existing heading.
- Contributions inherit the repository's **CC BY-SA 4.0** license (credit authors in the index line).

## 6. Evalscript quality checklist

These keep scripts fast and cheap, especially across many or large requests:

- Request **only the bands actually used** in `setup` — each input band costs processing units.
- Use `dataMask` to skip no-data pixels on expensive scripts.
- Avoid `.map` / `.reduce` / `.filter` / `forEach` inside `evaluatePixel` — plain `for` loops are faster.
- Prefer a smaller `sampleType` (`UINT8` / `UINT16`) when full float precision isn't needed; digital
  numbers carry the same information as reflectance for normalized-difference indices.
- Compute indices/functions **conditionally** (only in the branch that needs them).
- Use `preProcessScenes` to drop unneeded scenes from a time range before they cost anything.
- Reuse `viz.process` / `viz.processList` and predefined products where available; delete unused code.

## 7. Advanced script types

- **Multi-temporal** — set `mosaicking` in `setup` and loop over the `samples` array in
  `evaluatePixel`; see §2 for both, and use `preProcessScenes` to drop unwanted acquisitions before
  they cost anything.
- **Data fusion** — V3 only; `input` becomes a list of `{datasource, bands}`, and you access each source
  via `samples.<id>` (e.g. `samples.S2L2A[0].B04`). Standard datasource ids:
  `S2L1C, S2L2A, S1GRD, S3SLSTR, S3OLCI, S5PL2, L8L1C, DEM`. These belong in the
  [`data-fusion`](/data-fusion) collection, and the example needs a data-fusion datasource setup rather
  than a single `datasetId`.
- **Data fusion with BYOC collections** — anything outside that list, most CLMS products included, is
  served as **BYOC** and needs its Collection ID (a UUID) plus type `BYOC` in the datasource setup; it
  will not appear in the Copernicus Browser dataset list until you add it. The evalscript itself still
  refers to the alias you give the source (`samples.MY_ALIAS`), never the UUID. Collection IDs live on
  each product's own page under
  [Sentinel Hub data collections](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data.html)
  — the index page carries none, so navigate down to the leaf product page.

## 8. Submitting a pull request

- **One script per pull request** keeps reviews small and independently mergeable.
- Fork the repository, create a branch (e.g. `add-<slug>`), and commit your `<collection>/<slug>/`
  folder, the index link line, and any `cdse_lookup` change.
- Open a **cross-fork** pull request — base `sentinel-hub:main`, head `<your-fork>:<branch>`. Confirm
  the header reads `into sentinel-hub:main`.
- **Do not self-merge.** Respond to review by pushing more commits to the **same branch** — the pull
  request updates automatically.

If a pull request feels overwhelming, you can also follow the manual options on the
[Contribute](/contribute) page.
