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

It is **tool-neutral**: the file is named `AGENTS.md` so assistants that look for repository instructions
can pick it up, but nothing here is specific to any one assistant (Claude, Cursor, Copilot, Codex, and
others can all use it), and every checklist is equally useful for a manual contribution.

<details markdown="block">
  <summary>Table of contents</summary>
- TOC
{:toc}
</details>

## What a contribution is

A folder `<collection>/<slug>/` containing:

- `script.js` — the evalscript, whose **first line is `//VERSION=3`**.
- `README.md` — Jekyll front matter + a short description (see below).
- `fig/fig1.png` — a representative image (optional but expected for real scripts).

…plus **one link line** added to the collection's index page, `<collection>/<collection>.md`.

Copying the [example folder](/contribute/example) is the easiest starting point.

## 1. Gather the inputs

- **Collection / satellite folder** (`sentinel-2`, `sentinel-1`, `sentinel-3`, `sentinel-5p`,
  `landsat-8`, `dem`, …). **Choose it from the bands the script uses** — e.g. a Landsat thermal band
  `B10` ⇒ `landsat-8` (Landsat 8/9 OLI/TIRS).
- **Title** (human-readable) and **slug** (`snake_case`, used as the folder name).
- **One-line description** for the index link.
- **The evalscript** (must start with `//VERSION=3`).
- **At least one example**: `lat`, `lng`, `zoom`, `datasetId`, `fromTime`/`toTime` (an ISO day window
  over a real, mostly cloud-free acquisition), and `platform` (`EOB` and/or `CDSE`).
- **A representative image** at `fig/fig1.png`.

## 2. Scaffold the files

### `script.js`

The evalscript verbatim, first line `//VERSION=3`. Note evalscripts are **per-pixel**: they cannot
access neighbouring pixels, so they cannot measure neighbourhoods or cluster sizes — don't describe a
script as doing spatial filtering it can't do.

### `README.md`

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

Body, in this order:

```markdown
## General description

<What the script shows and why; the index/threshold logic or formula; which bands it uses.>

## Description of representative images

<One-line caption.>
![<alt text>](fig/fig1.png)

## References

<links: docs, papers, blog posts, related scripts>
```

### Index link line

Add to `<collection>/<collection>.md`, under an existing heading, matching the surrounding list style:

```markdown
- [<Title>](/<collection>/<slug>) - <one-line description>
```

## 3. The examples block and the CDSE lookup

The website turns the `examples` block into "open in browser" buttons, and the two platforms differ:

- **EO Browser** (`platform: EOB`) uses the raw `datasetId`.
- **Copernicus Browser** (`platform: CDSE`) maps the `datasetId` through a `cdse_lookup` table in the
  front matter of [`_layouts/script.html`](https://github.com/sentinel-hub/custom-scripts/blob/main/_layouts/script.html).

**Pitfall:** if a collection's token is **not** in `cdse_lookup`, the Copernicus Browser link is
silently broken (empty dataset id). To enable a CDSE example for a collection that is missing, add a
mapping line to `cdse_lookup` and **call out that change in your pull request** (it touches a shared
site file). You can read the real CDSE dataset id straight from a Copernicus Browser URL's
`&datasetId=` parameter.

Common tokens (always verify against the live `_layouts/script.html`, which is the source of truth):

| collection | parent / grand_parent | EO Browser token | CDSE dataset id |
|---|---|---|---|
| `sentinel-2`  | Sentinel-2 / Sentinel | `S2L2A`, `S2L1C` | `S2_L2A_CDAS`, `S2_L1C_CDAS` |
| `sentinel-1`  | Sentinel-1 / Sentinel | `S1_AWS_IW_VVVH`, `S1_AWS_EW_HHHV` | `S1_CDAS_IW_VVVH`, `S1_CDAS_EW_HHHV` |
| `sentinel-3`  | Sentinel-3 / Sentinel | `S3SLSTR`, `S3OLCI` | `S3SLSTR_CDAS`, `S3OLCI_CDAS` |
| `sentinel-5p` | Sentinel-5P / Sentinel | `S5_NO2`, `S5_O3`, … | `S5_NO2_CDAS`, `S5_O3_CDAS`, … |
| `landsat-8`   | Landsat 8 / Landsat | `AWS_LOTL1`, `AWS_LOTL2` | `CDAS_L8_L9_LOTL1` |
| `dem`         | DEM | `DEM_MAPZEN` | `DEM_COPERNICUS_30_CDAS` |

## 4. Validation checklist

- `script.js` first line is `//VERSION=3`; it is valid JavaScript; the main file is named `script.js`.
- Front matter has `layout: script` and `nav_exclude: true`.
- `permalink` is `/<collection>/<slug>/` **and** `evalscripturl` ends with
  `/<collection>/<slug>/script.js` — both match the real folder path.
- `slug` is `snake_case`; the folder is under the correct collection (band-driven).
- `examples` has at least one complete entry over a real, mostly cloud-free acquisition.
- If any example uses `platform: CDSE`, its `datasetId` token exists in `cdse_lookup` (add it if not).
- `fig/fig1.png` exists, is non-empty, and is referenced (watch for an accidental `fig1.png.png`).
- The index link line is added under an existing heading.
- Contributions inherit the repository's **CC BY-SA 4.0** license (credit authors in the index line).

## 5. Evalscript quality checklist

These keep scripts fast and cheap, especially across many or large requests:

- Request **only the bands actually used** in `setup` — each input band costs processing units.
- Use `dataMask` to skip no-data pixels on expensive scripts.
- Avoid `.map` / `.reduce` / `.filter` / `forEach` inside `evaluatePixel` — plain `for` loops are faster.
- Prefer a smaller `sampleType` (`UINT8` / `UINT16`) when full float precision isn't needed; digital
  numbers carry the same information as reflectance for normalized-difference indices.
- Compute indices/functions **conditionally** (only in the branch that needs them).
- Use `filterScenes` to drop unneeded scenes from a time range.
- Reuse `viz.process` / `viz.processList` and predefined products where available; delete unused code.

## 6. Advanced script types

- **Multi-temporal** — set `mosaicking` in `setup` (`SIMPLE` / `ORBIT` / `TILE`);
  `evaluatePixel(samples, …)` receives `samples` as an array of scenes; use
  `preProcessScenes` / `filterScenes` to select acquisitions.
- **Data fusion** — V3 only; `input` becomes a list of `{datasource, bands}`, and you access each source
  via `samples.<id>` (e.g. `samples.S2L2A[0].B04`). Standard datasource ids:
  `S2L1C, S2L2A, S1GRD, S3SLSTR, S3OLCI, S5PL2, L8L1C, DEM, MODIS`. These belong in the
  [`data-fusion`](/data-fusion) collection, and the example needs a data-fusion datasource setup rather
  than a single `datasetId`.

Further reading: Sentinel Hub's *Multi-temporal processing*, *Custom scripts: faster, cheaper, better*,
and *Data fusion: combine satellite datasets* articles.

## 7. Submitting a pull request

- **One script per pull request** keeps reviews small and independently mergeable.
- Fork the repository, create a branch (e.g. `add-<slug>`), and commit your `<collection>/<slug>/`
  folder, the index link line, and any `cdse_lookup` change.
- Open a **cross-fork** pull request — base `sentinel-hub:main`, head `<your-fork>:<branch>`. Confirm
  the header reads `into sentinel-hub:main`.
- **Do not self-merge.** Respond to review by pushing more commits to the **same branch** — the pull
  request updates automatically.

If a pull request feels overwhelming, you can also follow the manual options on the
[Contribute](/contribute) page.
