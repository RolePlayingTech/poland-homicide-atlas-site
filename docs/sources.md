# Data Sources, Primary Verification & Methodological Scope (2026-11-08)

## 1. Verified Official Primary Sources (`data/sources.json`)

| Source ID | Institution / Publisher | Title & Scope | URL | Published | SHA-256 Checksum (Primary File) |
|---|---|---|---|---|---|
| `src-kgp-dane-gov-1723681` | Komenda Główna Policji (`dane.gov.pl`, dataset `25094`, resource `1723681`) | **Kategorie wg podziału administracyjnego od 2025 r. — arkusz 10 `._Zabójstwo` (oraz bliźniaczy zasób `1723674` arkusz `._Zabójstwo`)** (`2025`: Polska `501` stwierdzone, `503` wykryte, `99,41%`, 16/16 województw, KSP Warszawa `48`, KWP Radom `25`; `33,758` B; strona zasobu: `https://dane.gov.pl/pl/dataset/25094/resource/1723681`, API: `https://api.dane.gov.pl/1.4/resources/1723681`, redirect 302 → `Kategorie_wg_podziału_administracyjnego_od_2025.xlsx`) | `https://api.dane.gov.pl/resources/1723681/file` | `2026-04-21` | `b98f379bb714d37d82f466d92c82ea6b2d45e17bb785bb6a31699b4c3f39574a` |
| `src-kgp-dane-gov-1160448` | Komenda Główna Policji (`dane.gov.pl`, dataset `25094`, resource `1160448`) | **Zabójstwo wg jednostek podziału administracyjnego kraju, 1999–2024** (`1999–2024`: Polska, 16/16 województw, KSP Warszawa, KWP Radom; `19,069` B) | `https://api.dane.gov.pl/resources/1160448,zabojstwo-wg-jednostek-podziau-administracyjnego-kraju-przestepstwa-stwierdzone-przestepstwa-wykryte-wykrycia/file` | `2025-05-26` | `4459bbec9494bed7c0c5250b5a21d60a0c6d55843b0ef5a3007f09d9a54129f3` |
| `src-prg-osm-cartography` | GUGiK Państwowy Rejestr Granic (PRG) / OpenStreetMap contributors | **Granice administracyjne województw (PRG sierpień 2025, WGS84)** (`assets/geo/wojewodztwa.geojson`) & ciągły podkład uliczny OSM (`z5–z18`, `ODbL`) | `https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/` | `2025-08-01` | `0602dbd9c5fa3980b549ddb617cc3979c19f0fa23d1fbae08d87b264373b2118` |
| `src-kgp-2026-01-16-national` | Komenda Główna Policji (`policja.pl`) | **Zwalczanie przestępczości kryminalnej — komunikat prasowy KGP** (`503` w 2024 r., `505` w 2025 r.; zarchiwizowana migawka z `2026-01-16`, `policja.pl` blokuje ruch automatyczny HTTP 403) | `https://www.policja.pl/pol/aktualnosci/271951,Zwalczanie-przestepczosci-kryminalnej.html` | `2026-01-16` | `5da20d3666fb31d4154f1606811d2a79ff91ef84ef44699e0d3d4bc51889a701` |
| `src-kgp-dane-gov-1160417` | Komenda Główna Policji (`dane.gov.pl`, dataset `25094`, resource `1160417`) | **Postępowania wszczęte — zabójstwo wg jednostek organizacyjnych Policji, 1999–2024** (`2024`: Polska `557`; `12,625` B) | `https://api.dane.gov.pl/resources/1160417,postepowania-wszczete-zabojstwo-wg-jednostek-organizacyjnych-policji/file` | `2025-05-26` | `bcc1eceb3507de5367122926fafdf6b52e9e87fefbef207e54c444e84bc824be` |
| `src-kgp-dane-gov-1723707` | Komenda Główna Policji (`dane.gov.pl`, dataset `25094`, resource `1723707`) | **Zabójstwo — postępowania wszczęte wg jednostek organizacyjnych Policji w 2025 r.** (`2025`: Polska `499`; `505` B) | `https://api.dane.gov.pl/resources/1723707,zabojstwo-postepowania-wszczete/file` | `2026-04-21` | `24d96b8c166a65235cfb24facef578d0dd377b18fee0707ffb0d2272a715ac6d` |
| `src-gus-bdl-population-1999-2025` | Główny Urząd Statystyczny (Baza Demografia `pl_lud_{2002..2025}_00_01.zip` / BDL `P2137` / Rocznik Demograficzny 2025) | **Stan i struktura ludności w dniu 31 XII wg województw i kraju, 1999–2025** (`459` mianowników; plik `pl_lud_2025_00_01.zip` + `rocznik_demograficzny_2025_tablice.zip` SHA-256 `78e2f26772bf39732228c07e3ce6dab1e94b1a915e77729d4eeed1eef39bbd36`) | `https://demografia.stat.gov.pl/BazaDemografia/Downloader.aspx?file=pl_lud_2025_00_01.zip&sys=lud` | `2026-04-30` | `726e6201eff530ba44fb4a7a20ee8b117cdaed1bbbf0813b4902c42679b0ec63` |
| `src-gus-homicide-victims-2013-2024` | Główny Urząd Statystyczny (na podstawie danych KGP) | **Ofiary zabójstw według wieku i płci w latach 2013–2024** (`ofiary_zabojstw_2013-2024.xlsx`, `35,465` B; `2024`: `258` ofiar) | `https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultaktualnosci/6285/3/1/1/ofiary_zabojstw_2013-2024.xlsx` | `2025-07-15` | `ef888068fa93ab5a3d84afdc2906396d257ca8c7518b8e75512d3e8ff655bdd8` |
| `src-gus-mortality-sdg-2010-2024` | Główny Urząd Statystyczny (SDG `16.1.1` & Rocznik Demograficzny 2025) | **Wskaźnik SDG 16.1.1 (2010–2024) oraz Tabl. 99 (123) Zgony wg przyczyn ICD-10 X85–Y09** (`2024`: `182` zgony, `0,48 / 100 tys.`; karta PDF `16-1-1.pdf` SHA-256 `339732eabc70a1873118067683d5b2001e610245f662c0773f4b118e86e9678c`, `09_zgony_RD'2025.xlsx` w `rocznik_demograficzny_2025_tablice.zip` SHA-256 `78e2f26772bf39732228c07e3ce6dab1e94b1a915e77729d4eeed1eef39bbd36`) | `https://sdg.gov.pl/statistics_glob/16-1-1/` | `2025-11-28` | `89bf0b5f0bedff00aba48311e6f6503ec702373eb8646b27fd05e24507e762ca` |

## 2. Five Distinct Statistical Series (Never Conflated)

1. **`police_article_148_recorded_acts` (`kgp_art148_national_official` / `kgp_art148_regional`, 1999–2025):**
   - **Unit:** Recorded offences (`przestępstwa stwierdzone`) under Art. 148 § 1–4 k.k. in completed preparatory proceedings. Includes both completed homicides and attempted homicides.
   - **2025 Official Final Value:** `501` (`2024`: `498`). Sum of all 16 voivodeships equals `Polska` in all 27 years (`1999–2025`).
2. **`police_article_148_detected_acts` (`police_detected_homicides`, 1999–2025):**
   - **Unit:** Detected offences (`przestępstwa wykryte`, including detections in reopened prior-year proceedings) and detection percentage (`% wykrycia`).
   - **2025 Official Final Value:** `503` detected (`99.4%` detection rate); `2024`: `497` detected (`98.6%`).
3. **`police_article_148_initiated_proceedings` (`police_initiated_homicides`, 1999–2025):**
   - **Unit:** Preparatory proceedings initiated for the first time in the reporting year (`postępowania wszczęte`) by Police organizational units (`KWP` / `KSP` / `CBŚP`).
   - **2025 Official Final Value:** `499` (`2024`: `557`).
4. **`gus_intentional_homicide_victims` (`gus_homicide_victims_national`, 2013–2024):**
   - **Unit:** Deceased victims of completed Art. 148 k.k. homicides (`osoby zmarłe w wyniku zabójstwa dokonanego`, excluding attempts) published by GUS based on KGP reporting (`ofiary_zabojstw_2013-2024.xlsx`).
   - **2024 Value:** `258` victims (`87` females, `167` males, `4` unknown sex; `2023`: `306`). National total only.
5. **`gus_intentional_homicide_mortality_rate` (`gus_homicide_mortality_rate`, 2010–2024):**
   - **Unit:** Vital-statistics deaths certified on medical death certificates under ICD-10 codes `X85–Y09` (*Zabójstwo*), attributed by permanent residence of the deceased (SDG Indicator `16.1.1` & *Rocznik Demograficzny 2025*, Dział 09, Tabl. 99).
   - **2024 Value:** `182` deaths (`144` males, `38` females; `128` urban, `54` rural), rate `0.48` per 100,000 inhabitants (`2023`: `0.52`). Note: In Tabl. 100 (voivodeship breakdown), GUS publishes only chapter-level external causes (`V01–Y89`), not `X85–Y09` separately.

## 3. Cartographic Basemap, Three Coordinated Layers & Post-2025 Case Timeline

- **Continuous OSM Basemap (`z5–z18`) + PRG Boundaries:** OpenStreetMap tiles (`© OpenStreetMap contributors`, ODbL) render across all zoom levels (`z5`–`z18`) beneath translucent voivodeship polygons (`PRG` `assets/geo/wojewodztwa.geojson`).
- **Three Coordinated Analytical Layers (`?layers=regions,heatmap,pins`):**
  1. `regions` — voivodeship choropleth from `data/observations.json` (`1999–2025` KGP / `data/population.json` GUS BDL);
  2. `heatmap` — kernel density surface derived strictly from verified individual cases (`verification === "human_approved"` in `data/cases.json`) for the active year (never synthesized from regional aggregate counts or DEMO fixtures);
  3. `pins` — individual verified event markers and geometries (`exact_public_place`, `street_segment`, `district`/`municipality`) with deterministic spiderfy/co-location fan for cases sharing base coordinates.
- **2026+ Case Support Without Statistical Fabrication:** Individual verified cases in `data/cases.json` may belong to `2026` or later years before KGP/GUS annual tables are released; for such years, official statistical series remain explicitly `missing` (`—`).

## 4. Existing Polish Reference Products

- [Crime Maps](https://crimemaps.pl/) — community-curated interactive crime map (broad true-crime scope).
- [Nożownicy.pl](https://nozownicy.pl/o-serwisie) — incident map for sharp-object attacks with approximate place markers.
- [Kobietobójstwa — mapa](https://www.kobietobojstwa.pl/mapa-kobietobojstwa) — documented femicide map from 2024 onward.
- [WBData crime maps](https://wbdata.pl/mapa-przestepstw-2023/) — county-level crime choropleths built from GUS BDL statistics.
