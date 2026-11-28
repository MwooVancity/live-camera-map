# Catalogue audit (2026-11-28)

Read-only run of `node ops/audit/catalogue-audit.mjs` over data/camera-registry/cameras.json (24382 records). No data was changed. Country check uses rough boxes, not borders.

| Issue | Count |
|---|---|
| Duplicate id | 0 |
| Within 10 m of another camera | 3695 |
| Missing name | 0 |
| Missing coordinates | 0 |
| Missing official URL | 0 |
| Outside its country | 0 |

## Duplicate id (0)

None.

## Within 10 m of another camera (3695)

First 10 rows:

| id | source | name | lat, lon | note |
|---|---|---|---|---|
| austin-traffic-1305 | austin-traffic | FM 620 RD / 2222 RD [1305] | 30.403692, -97.854065 | 0.0 m from austin-traffic-273 (same source), same direction |
| austin-traffic-1443 | austin-traffic | US 183 HWY / BURLESON RD [1443] | 30.18288, -97.68763 | 0.0 m from austin-traffic-181 (same source), same direction |
| austin-traffic-1494 | austin-traffic | SH 71 SVRD / PRESIDENTIAL BLVD (CARDINAL LOOP) [14 | 30.21267, -97.65884 | 0.0 m from austin-traffic-538 (same source), same direction |
| austin-traffic-1495 | austin-traffic | 51ST ST / CAMERON RD [1495] | 30.309107, -97.709755 | 0.0 m from austin-traffic-335 (same source), same direction |
| austin-traffic-1510 | austin-traffic | RIVERSIDE DR / MANLOVE ST [1510] | 30.247469, -97.733571 | 1.1 m from austin-traffic-1511 (same source), same direction |
| brla-dotd-240-c1-1 | brla-dotd | DOTD camera 240.C1--1 | 30.460308420047, -90.934049393044 | 3.7 m from brla-dotd-240-c2-1 (same source), same direction |
| calgary-traffic-0 | calgary-traffic | Glenmore Trail / Macleod Trail S | 50.993989, -114.0715855 | 8.3 m from calgary-traffic-27 (same source), same direction |
| caltrans-d01-1 | caltrans | SR-20 : At SR-1 - Looking East (C020) | 39.42001, -123.807828 | 1.0 m from caltrans-d01-168 (same source), directions East / - |
| caltrans-d01-22 | caltrans | US-101 : North Of SR-20 - Looking North (C001) | 39.250328, -123.211273 | 0.0 m from caltrans-d01-24 (same source), directions North / South |
| caltrans-d01-82 | caltrans | US-199 : South Of Oregon State Line - Looking East | 41.994023, -123.720224 | 1.2 m from odot-tripcheck-710-3301 (odot-tripcheck), directions South / - |

## Missing name (0)

None.

## Missing coordinates (0)

None.

## Missing official URL (0)

None.

## Outside its country (0)

None.

Pairs within 10 m by source of the first camera: iowa-dot 1214, drivebc 849, iceland-vegagerdin 529, wsdot-cameras 314, vegvesen-cameras 176, quebec-mtmd 172, odot-tripcheck 163, taiwan-thb 62, caltrans 60, taiwan-wra-cameras 58, georgia-511 48, hongkong-traffic 12, tallinn-ristmikud 9, toronto-traffic 6, austin-traffic 5, maryland-chart-cameras 5, madrid-camaras 4, nsw-live-traffic 3, mlit-river 2, brla-dotd 1, calgary-traffic 1, cita-lu-cameras 1, montreal-osm-cameras 1.

Of 3695 pairs, 3491 sit at exactly the same point and 2635 record the same direction (empty counts as same): those are the likeliest true duplicates. The rest are mostly several views on one pole.
