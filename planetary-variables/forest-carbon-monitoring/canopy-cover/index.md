---
title: Canopy Cover, Forest Carbon Monitoring
parent: Forest Carbon Monitoring
grand_parent: Planetary Variables
layout: script
nav_exclude: true
scripts:
  - [Visualization, script.js]
  - [EO Browser, eob.js]
  - [Raw Values, raw.js]
---

## Evaluate and visualize

As Forest Carbon Monitoring is commercial data, brought into Sentinel Hub as Bring Your Own Data, direct EO Browser links are not possible due to the personalized data credentials.

## General description

Canopy cover quantifies the percentage of area occupied by trees within a
pixel, where a tree is defined as vegetation 5 meters or taller. This metric will be most sensitive to tree clearing
events like timber harvest or deforestation, but is also sensitive to seasonal leaf-on variation and to drought.

The data layer has four bands:

- **Canopy Cover** quantifies the horizontal area occupied by tree canopies that are > 5m tall.
- **Lower prediction bound (5th percentile)** of the 90% prediction interval for model predictions at each pixel.
- **Upper prediction bound (95th percentile)** of the 90% prediction interval for model predictions at each pixel.

## Description of representative images

Canopy Cover in 2024-09-21 near Novo Progresso, Brazil.

![Canopy Cover Example](fig/canopycover.jpg)
