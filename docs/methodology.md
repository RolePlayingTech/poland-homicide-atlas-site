# Editorial and Statistical Methodology

## 1. Definitions and Strict Separation of Series

The Atlas maintains five distinct statistical series and never conflates, subtracts, or averages unlike units:

1. **Police recorded offences (`police_article_148_recorded_acts`, 1999–2025):**
   - Annual offences recorded in completed preparatory proceedings (`przestępstwa stwierdzone w zakończonych postępowaniach przygotowawczych`) under Article 148 § 1–4 of the Polish Penal Code (`Kodeks karny`).
   - **Scope & unit:** Includes both completed homicides (`zabójstwa dokonane`) and attempted homicides (`usiłowania`). Unit = recorded acts (`recorded_acts`), **not** people killed. One proceeding may involve multiple acts or multiple victims, and an act committed in year $t-1$ may be recorded upon completion of proceedings in year $t$.
2. **Police detected offences and detection rate (`police_article_148_detected_acts`, 1999–2025):**
   - Offences under Art. 148 k.k. detected in the reporting year (`przestępstwa wykryte`), including offences detected after reopening discontinued proceedings from prior years (`podjęte z lat ubiegłych`). Consequently, in a given year `detected_acts` can exceed `recorded_acts` (e.g., in 2025 for Poland: `503` detected vs. `501` recorded, with an official detection rate of `99.4%` because the denominator of `% wykrycia` includes reopened prior-year cases).
3. **Police initiated proceedings (`police_article_148_initiated_proceedings`, 1999–2025):**
   - Preparatory proceedings initiated for the first time in the reporting year (`postępowania wszczęte`) under Art. 148 § 1–4 k.k., reported by Police organizational units (`KWP`, `KSP`, `CBŚP`; `499` in 2025, `557` in 2024).
4. **GUS / KGP homicide victims (`gus_intentional_homicide_victims`, 2013–2024):**
   - Deceased victims of **completed** homicides under Art. 148 k.k. (`osoby zmarłe w wyniku zabójstwa dokonanego`, excluding attempts), published by the Central Statistical Office (GUS) in *Ofiary zabójstw według wieku i płci w latach 2013–2024* (`258` deceased victims in 2024: `167` men, `87` women, and `4` of unknown sex). Published only at the national level (`PL`).
5. **GUS vital statistics homicide mortality (`gus_intentional_homicide_mortality_rate`, 2010–2024):**
   - Deaths caused by assault / intentional homicide registered in GUS vital statistics from medical death certificates (`karty zgonów`) under ICD-10 codes `X85–Y09` (*Zabójstwo*), attributed by the deceased person's permanent residence (SDG Indicator `16.1.1` & *Rocznik Demograficzny 2025*, Tabl. 99: `182` deaths in 2024 — `144` men, `38` women — or `0.48` per 100,000 inhabitants). In voivodeship tables (Tabl. 100), GUS publishes only chapter-level external causes (`V01–Y89`), not `X85–Y09` separately.
6. **Individually documented case (`Case`):**
   - A specific event documented by independently checkable authoritative public sources and approved by a human editor. An archive of documented cases is **never** a complete statistical distribution or proxy for Police aggregates.

## 2. Rules for Publishing an Individual Case (`data/cases.json`)

1. **Source requirement**: At least one official Police, prosecutor, court, or equivalent authoritative public source (`https://` only). Preserve exact source URLs, publication/retrieval dates, document locators, and SHA-256 content hashes.
2. **Double human editorial gate**:
   - A human editor confirms legal qualification, event date (and date precision: `day | month | year | range`), municipality, voivodeship (`TERYT`), event `outcome` (`death | attempted | unclassified_mortem`), and procedural `legal_status` (`investigation | charged | trial | convicted_non_final | convicted_final | acquitted | discontinued | unknown`).
   - Set `verification = "human_approved"` and `reviewed_at = "YYYY-MM-DD"`. Automated scripts (`scripts/review-candidates.mjs`) may validate candidate files in external quarantine, but **never** approve facts or copy unapproved cases into `data/cases.json`.
3. **Strict privacy and no-reidentification rule**:
   - **Never** publish victim or suspect names, personal initials (e.g., `Jan K.`), photographs, private home or apartment addresses, building/flat numbers, workplaces, schools, or GPS coordinates of a private residence.
   - Quarantine or unreviewed candidate records must never be committed to the public Git repository or hidden merely via a UI filter.
4. **Source-backed location precision (`PublishedLocation`)**:
   - Each published case carries an explicit `precision` level (`exact_public_place | street_segment | municipality | district | unknown`) and a separate human location-publication decision (`published_location.reviewDecision`):
     - `exact_public_place` (`Point`, `is_approximate: false`): permitted **only** when an authoritative source confirms a public place (e.g., public square, park, bridge, station, public intersection) and a human editor approves location publication.
     - `street_segment` (`LineString` or segment midpoint, `is_approximate: true`): used when a source confirms a public street stretch without a specific public landmark or house number. Never place a pin on a private building number.
     - `district` or `municipality` (`is_approximate: true`, max 4 decimal places reference centroid/polygon): **mandatory maximum precision** whenever the scene is a private apartment, house, stairwell, workplace, school, or any location that could identify protected persons. Street names (`ulica`, `ul.`, `aleja`, `al.`) are forbidden in summaries of approximate cases.
     - `unknown` (`geometry: null`): used when only the voivodeship or judicial circuit is confirmed.
5. **Claim attribution and neutral language**:
   - Connect every factual claim and date to a specific `sourceId`. Explicitly separate confirmed facts (`fact`), prosecutor charges (`prosecutor_charge`), and court findings (`court_finding`).

## 3. Aggregates, Comparability, and Population Denominators

- **Missing vs. unreviewed vs. zero**:
  - `availability: "missing" | "suppressed" | "not_applicable"` always carries `value: null` (rendered as `—` and diagonal hatching on the map), **never** `0`.
- **National vs. regional reconciliation**:
  - In the official KGP administrative datasets (`resource_1160448.csv` for 1999–2024 and `Kategorie_wg_podziału_administracyjnego_od_2025.xlsx` sheet `._Zabójstwo` in resource `1723681` for 2025), all 16 voivodeships (`TERYT 02`–`32`) are observed across all 27 years (`432` regional observations), and their sum equals `Polska` (`501` in 2025; `498` in 2024).
  - For `woj. mazowieckie` (`TERYT 14`), the administrative total equals the sum of `KSP Warszawa` and `KWP z siedzibą w Radomiu` in every year (`1999–2025`).
  - The KGP press communication of `2026-01-16` (`505` in 2025, `503` in 2024) is preserved as an explicit non-active revision (`isActiveRevision: false`) alongside the territorial tables (`501` in 2025 from `1723681` published `2026-04-21`; `498` in 2024 from `1160448` published `2025-05-26`); KGP has not published a methodological reconciliation explaining the 4–5 act difference.
- **Rates per 100,000 inhabitants and GUS Census Regimes**:
  - Rates per 100,000 inhabitants (`value / population * 100000`) are computed **only** when an approved observation matches an approved GUS resident population denominator (`data/population.json`) for the exact same year, `areaId`, and `boundaryVersion`.
  - Users comparing long-term rates across `1999–2025` should note four contemporaneous GUS `Baza Demografia` (`pl_lud_{yr}_00_01.zip`) population balance regimes (state as of 31 December), with census-base transitions at `2001 → 2002`, `2010 → 2011`, and `2021 → 2022`:
    - `1999–2001`: pre-NSP 2002 balances rounded to `0.1k` (`100` persons; *Rocznik Demograficzny 2025* `Tabl. 1` provides recalculated national NSP 2002 totals `38,263,303`, `38,253,955`, `38,242,197` without a voivodeship breakdown);
    - `2002–2010`: contemporaneous `NSP 2002` base (`2010` `pl_lud`: `38,200,037` vs `38,529,866` recalculated on the `NSP 2011` base in *Rocznik Demograficzny 2025* `Tabl. 1`);
    - `2011–2021`: contemporaneous `NSP 2011` base (`2020` `pl_lud`: `38,265,013` vs `38,088,564` in RD 2025; `2021` `pl_lud`: `38,080,411` vs `37,907,704` in RD 2025);
    - `2022–2025`: `NSP 2021` base.

## 4. Cartographic Architecture & Three Coordinated Visualization Layers

The main map canvas renders a **continuous OpenStreetMap (`OSM`) street/topographic basemap across all zoom levels (`z5`–`z18`)** with zoom-responsive translucent voivodeship polygons (`PRG` `assets/geo/wojewodztwa.geojson`) so geographic context (cities, road corridors, rivers, and street networks) remains legible at national, regional, municipal, and street scales.

Users can independently toggle and combine three coordinated analytical layers (`layers: { regions, heatmap, pins }`, persisted in URL query parameter `?layers=...`):

1. **Regional statistics layer (`regions`, choropleth):**
   - Displays annual voivodeship aggregates (`1999–2025` KGP Art. 148 k.k. counts or rates per 100,000 inhabitants) using a 5-class sequential scale with translucent fill (`fill-opacity` decreasing smoothly as zoom increases from country view `z6` to street view `z14+`) and crisp administrative boundaries.
   - Missing or unpublished years (e.g., `2026+` before official KGP release, or regional view when the national-only GUS victim series is selected) render with diagonal hatching (`availability: "missing" | "not_applicable"`), never as zero.
2. **Event density layer (`heatmap`, kernel density):**
   - Renders a smooth kernel density surface **exclusively** from verified, human-approved individual cases (`verification === "human_approved"` in `data/cases.json`) for the active timeline year.
   - **Strict anti-fabrication rule:** The heatmap is **never** synthesized from voivodeship aggregate counts (`data/observations.json`) and **never** includes UI demonstration fixtures (`DEMO-A/B/C`). When `publishedCases.length === 0` for the selected year, the heatmap canvas is empty (`0` points) and the interface displays an explicit provenance notice.
   - **Geographic honesty at street zoom (`z >= 11`):** An approximate municipal or district centroid (`precision: "municipality" | "district"`) is not evidence of an incident at the city centre. At street/municipal zoom (`z >= 11`), `renderHeatmapLayer()` filters out coarse precisions (`municipality`, `district`, `unknown`) and renders kernel density hotspots **only** for verified `exact_public_place` and `street_segment` records (`data-street-precision-only="true"`). Coarse-precision records render as approximate area markers (`is-approximate-area`, dashed ring with `≈`) and dashed radius circles (`circle.approximate-area-circle`).
3. **Individual event pins & geometry layer (`pins`):**
   - Renders each human-approved case for the active year at its approved `published_location` precision (`exact_public_place` point pin, `street_segment` `LineString`, or `district` / `municipality` approximate boundary + reference marker).
   - **Coordinate fidelity & co-located cases:** Approved coordinates are never altered by random jitter. At lower zoom levels or when multiple cases in the same year share identical municipality/street-segment coordinates, the map renders a deterministic spiderfy fan or multi-case badge (`coLocatedCases`) so every case remains individually selectable and inspectable in the side dossier.

## 5. Separation of Statistical Availability vs. Event Timeline (`1999–2026+`)

- **Statistical availability (`yearAvailability[y].hasStatistics`):**
  - Official KGP territorial series covers `1999–2025` (`27` years); GUS homicide victims covers `2013–2024`; GUS ICD-10 `X85–Y09` mortality covers `2010–2024`.
- **Event availability (`yearAvailability[y].hasCases`):**
  - Individual human-approved cases in `data/cases.json` may be recorded in any calendar year from `1999` onward, including `2026` and subsequent years before annual KGP/GUS tables are published.
  - When a user selects a year such as `2026` (or navigates via `?year=2026` or `?case=<2026-case-id>`), the Atlas displays the verified `2026` case pins and heatmap points while explicitly marking national and regional official statistics as `missing` (`—`) with a clear methodological explanation (`metricBlockReasonPl`). Official statistics are never extrapolated or zero-filled.

## 6. Legal & Ethical Safeguards

Review privacy law (GDPR / RODO), sources' reuse terms, takedown/correction workflow, and publication impact. Respect GUGiK PRG and OpenStreetMap attribution (`© OpenStreetMap contributors`, ODbL). The Atlas is an archival research publication, not a safety alert system or forensic evidence.
