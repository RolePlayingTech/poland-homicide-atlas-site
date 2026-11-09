import { DEMO_CLUSTER_CENTER, DEMO_FIXTURES, getDemoFixtureById } from './demo-fixtures.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GEOJSON_LOCAL_PATH = './assets/geo/wojewodztwa.geojson';
const COUNTRY_CENTER = Object.freeze([52.05, 19.1]);
const COUNTRY_ZOOM = 6;
const STREET_ZOOM_THRESHOLD = 11;
const CLUSTER_ZOOM_THRESHOLD = 15;
const CLUSTER_RADIUS_PX = 54;

export const SEQUENTIAL_SCALE_COLORS = Object.freeze([
  '#202d29',
  '#2e423b',
  '#3f5a50',
  '#547568',
  '#6e9484'
]);

export const TILE_CONFIG = Object.freeze({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  minZoom: 5,
  maxZoom: 18,
  attributionPrefix: 'Podkład geograficzny i uliczny: © ',
  attributionLinkText: 'OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  attributionSuffix: ' (licencja ODbL) · Granice województw: GUGiK PRG'
});

/**
 * Tablica LUT (256 × RGBA) dla warstwy gęstości zdarzeń (heatmap):
 * głęboka miedź (#a8383b) -> ciepły brąz (#c87d4b) -> stare złoto (#d6b578) -> pergamin (#eee8d9),
 * z maksymalną nieprzezroczystością ~0.72, aby ulice OSM i pinezki pozostawały czytelne.
 */
const HEATMAP_LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 4);
  const stops = [
    { t: 0.0, r: 168, g: 56, b: 59 },
    { t: 0.4, r: 200, g: 125, b: 75 },
    { t: 0.78, r: 214, g: 181, b: 120 },
    { t: 1.0, r: 238, g: 232, b: 217 }
  ];
  for (let a = 0; a < 256; a++) {
    if (a < 6) continue;
    const t = a / 255;
    let s0 = stops[0];
    let s1 = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].t && t <= stops[i + 1].t) {
        s0 = stops[i];
        s1 = stops[i + 1];
        break;
      }
    }
    const localT = s1.t > s0.t ? (t - s0.t) / (s1.t - s0.t) : 0;
    const idx = a * 4;
    lut[idx] = Math.round(s0.r + (s1.r - s0.r) * localT);
    lut[idx + 1] = Math.round(s0.g + (s1.g - s0.g) * localT);
    lut[idx + 2] = Math.round(s0.b + (s1.b - s0.b) * localT);
    lut[idx + 3] = Math.min(184, Math.round(Math.pow(t, 0.85) * 184));
  }
  return lut;
})();

/**
 * Waliduje zewnętrzny adres URL (wyłącznie protokół https: bez danych logowania).
 * @param {string|null|undefined} rawUrl
 * @returns {string|null}
 */
export function validateHttpsUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Tworzy element DOM z klasą i opcjonalnym tekstem (wyłącznie przez textContent).
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  }
  return el;
}

/**
 * Tworzy element SVG w przestrzeni nazw W3C SVG.
 * @param {string} tag
 * @param {Record<string, string|number>} [attrs]
 * @returns {SVGElement}
 */
function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) {
      el.setAttribute(k, String(v));
    }
  }
  return el;
}

/**
 * Wstrzykuje definicje wzorców kreskowania (<defs><pattern>) do głównego <svg>
 * warstwy wektorowej Leaflet wyłącznie za pomocą createElementNS.
 * @param {SVGElement|null} svgRoot
 */
function ensureSvgPatterns(svgRoot) {
  if (!svgRoot || svgRoot.querySelector('#atlas-pattern-missing')) return;

  const defs = createSvgEl('defs');

  // Ukośne kreskowanie 45° dla braków danych (missing)
  const missingPattern = createSvgEl('pattern', {
    id: 'atlas-pattern-missing',
    patternUnits: 'userSpaceOnUse',
    width: 8,
    height: 8
  });
  missingPattern.appendChild(
    createSvgEl('rect', {
      width: 8,
      height: 8,
      fill: '#192321',
      'fill-opacity': '0.46'
    })
  );
  missingPattern.appendChild(
    createSvgEl('path', {
      d: 'M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6',
      stroke: '#3f5146',
      'stroke-width': 1
    })
  );

  // Krzyżowe kreskowanie dla obserwacji utajnionych (suppressed)
  const suppressedPattern = createSvgEl('pattern', {
    id: 'atlas-pattern-suppressed',
    patternUnits: 'userSpaceOnUse',
    width: 8,
    height: 8
  });
  suppressedPattern.appendChild(
    createSvgEl('rect', {
      width: 8,
      height: 8,
      fill: '#192321',
      'fill-opacity': '0.46'
    })
  );
  suppressedPattern.appendChild(
    createSvgEl('path', {
      d: 'M0,0 L8,8 M8,0 L0,8',
      stroke: '#42534b',
      'stroke-width': 0.85
    })
  );

  defs.appendChild(missingPattern);
  defs.appendChild(suppressedPattern);
  svgRoot.insertBefore(defs, svgRoot.firstChild);
}

/**
 * Buduje węzeł DOM dla znacznika pojedynczej sprawy lub punktu DEMO.
 * Przekazywany bezpośrednio jako HTMLElement do L.divIcon({ html: node }).
 * @param {Object} item
 * @param {boolean} isSelected
 * @param {{lat: number, lng: number}|null} [baseCoords]
 * @param {boolean} [isOffset]
 * @returns {HTMLElement}
 */
function buildCaseMarkerNode(item, isSelected, baseCoords = null, isOffset = false) {
  const isDemo = Boolean(item.isDemoFixture);
  const isAttempted = !isDemo && (item.outcome === 'attempted' || item.offenseType === 'attempted_homicide');
  const precision = item.published_location?.precision || item.location?.precision || 'municipality';
  const isApproximateArea =
    precision === 'municipality' || precision === 'district' || precision === 'unknown';
  const resolvedBase = baseCoords || getItemLatLng(item) || { lat: 0, lng: 0 };
  const shortTag = isDemo
    ? `DEMO ${item.shortCode || item.id.replace(/^DEMO-/, '')}`
    : isAttempted
      ? isApproximateArea
        ? 'USIŁ. (OBSZAR)'
        : 'USIŁOWANIE'
      : precision === 'exact_public_place'
        ? 'PUNKT'
        : precision === 'street_segment'
          ? 'ULICA'
          : precision === 'district'
            ? 'DZIELNICA'
            : 'OBSZAR';
  const pinCode = isDemo ? item.shortCode || 'D' : isAttempted ? '!' : isApproximateArea ? '≈' : '●';

  const wrapper = createEl(
    'div',
    `atlas-marker-node ${isDemo ? 'demo-marker' : 'case-marker'}${!isDemo ? (isAttempted ? ' is-attempted-homicide' : ' is-completed-homicide') : ''}${isApproximateArea ? ' is-approximate-area' : ' is-precise-location'}${isSelected ? ' selected' : ''}`
  );
  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-expanded', String(isSelected));
  wrapper.dataset.caseId = item.id;
  wrapper.dataset.outcome = isDemo ? 'demo' : isAttempted ? 'attempted' : 'death';
  wrapper.dataset.approvedLat = String(resolvedBase.lat);
  wrapper.dataset.approvedLng = String(resolvedBase.lng);
  wrapper.dataset.precision = precision;
  wrapper.dataset.isApproximate = isApproximateArea ? 'true' : 'false';
  wrapper.dataset.visualOffset = isOffset ? 'true' : 'false';

  const titleLabel = item.titlePl || item.published_location?.publicLabelPl || item.municipality || item.id;
  const outcomeLabel = isDemo
    ? ''
    : isAttempted
      ? ' · usiłowanie zabójstwa'
      : ' · zabójstwo dokonane';
  const precisionBadge =
    item.published_location?.precisionBadgePl ||
    (precision === 'exact_public_place'
      ? 'miejsce potwierdzone'
      : precision === 'street_segment'
        ? 'odcinek ulicy'
        : 'obszar przybliżony — punkt referencyjny gminy/dzielnicy, nie dokładny adres');
  const offsetNote = isOffset
    ? ` — Współrzędne zatwierdzone: ${resolvedBase.lat.toFixed(4)}, ${resolvedBase.lng.toFixed(4)} (wizualne rozsunięcie w jednym punkcie)`
    : '';

  wrapper.setAttribute(
    'aria-label',
    `${titleLabel} (${precisionBadge}${outcomeLabel})${isDemo ? ' — wzorzec interakcji DEMO, to nie zdarzenie' : ''}${offsetNote}; naciśnij Enter, aby otworzyć dossier`
  );

  const svg = createSvgEl('svg', {
    viewBox: '-22 -36 44 62',
    width: 44,
    height: 62,
    class: 'atlas-marker-svg',
    'aria-hidden': 'true'
  });

  const hit = createSvgEl('circle', { class: 'marker-hit', cx: 0, cy: 0, r: 20 });
  const halo = createSvgEl('circle', {
    class: 'marker-halo',
    cx: 0,
    cy: 0,
    r: isApproximateArea ? 15 : 11,
    ...(isApproximateArea ? { 'stroke-dasharray': '3 2' } : {})
  });
  const dot = createSvgEl('circle', { class: 'marker-dot', cx: 0, cy: 0, r: isApproximateArea ? 4 : 5 });

  const pinGroup = createSvgEl('g', { class: 'marker-pin' });
  if (!isDemo && isApproximateArea) {
    const areaDisc = createSvgEl('circle', {
      class: 'marker-area-disc',
      cx: 0,
      cy: -22,
      r: 13,
      'stroke-dasharray': '4 2'
    });
    const pinText = createSvgEl('text', {
      x: 0,
      y: -18,
      'text-anchor': 'middle'
    });
    pinText.textContent = pinCode;
    pinGroup.appendChild(areaDisc);
    pinGroup.appendChild(pinText);
  } else {
    const pinPath = createSvgEl('path', {
      d: 'M0 0C-3-6-15-18-15-28A15 15 0 1 1 15-28C15-18 3-6 0 0Z'
    });
    const pinText = createSvgEl('text', {
      x: 0,
      y: -24,
      'text-anchor': 'middle'
    });
    pinText.textContent = pinCode;
    pinGroup.appendChild(pinPath);
    pinGroup.appendChild(pinText);
  }

  const tagText = createSvgEl('text', {
    class: 'marker-tag',
    x: 0,
    y: 22,
    'text-anchor': 'middle'
  });
  tagText.textContent = shortTag;

  svg.appendChild(hit);
  svg.appendChild(halo);
  svg.appendChild(dot);
  svg.appendChild(pinGroup);
  svg.appendChild(tagText);
  wrapper.appendChild(svg);

  return wrapper;
}

/**
 * Buduje węzeł DOM dla klastra punktów spraw / DEMO.
 * @param {Object[]} items
 * @returns {HTMLElement}
 */
function buildClusterMarkerNode(items) {
  const allDemo = items.every((item) => Boolean(item.isDemoFixture));
  const count = items.length;
  const tagLabel = allDemo ? 'DEMO' : 'ARCHIWUM';

  const wrapper = createEl('div', 'atlas-marker-node demo-cluster case-cluster');
  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute(
    'aria-label',
    allDemo
      ? `${count} znaczniki DEMO w tym obszarze; naciśnij Enter, aby przybliżyć i rozdzielić punkty. To nie są sprawy.`
      : `${count} rekordy w archiwum spraw w tym obszarze (to nie suma policyjna); naciśnij Enter, aby przybliżyć lub wyświetlić listę.`
  );

  const svg = createSvgEl('svg', {
    viewBox: '-28 -28 56 68',
    width: 56,
    height: 68,
    class: 'atlas-cluster-svg',
    'aria-hidden': 'true'
  });

  svg.appendChild(createSvgEl('circle', { class: 'marker-hit', cx: 0, cy: 0, r: 24 }));
  svg.appendChild(createSvgEl('circle', { class: 'cluster-ring', cx: 0, cy: 0, r: 21 }));
  svg.appendChild(createSvgEl('circle', { class: 'cluster-body', cx: 0, cy: 0, r: 15 }));

  const countText = createSvgEl('text', {
    class: 'cluster-count',
    x: 0,
    y: 5,
    'text-anchor': 'middle'
  });
  countText.textContent = String(count);

  const tagText = createSvgEl('text', {
    class: 'marker-tag',
    x: 0,
    y: 34,
    'text-anchor': 'middle'
  });
  tagText.textContent = tagLabel;

  svg.appendChild(countText);
  svg.appendChild(tagText);
  wrapper.appendChild(svg);

  return wrapper;
}

/**
 * Buduje prostokątną fiszkę indeksową województwa dla trybu awaryjnego (brak GeoJSON).
 * Fiszka celowo nie przypomina pinezki ani lokalizacji zdarzenia.
 * @param {Object} row
 * @returns {HTMLElement}
 */
function buildFallbackTerritoryBadge(row) {
  const btn = createEl(
    'button',
    `teryt-fallback-badge${row.isSelected ? ' is-selected' : ''}${row.isCompared ? ' is-compared' : ''}`
  );
  btn.type = 'button';
  btn.dataset.area = row.areaId;
  const codeSpan = createEl('span', 'teryt-fallback-code', `[${row.areaId}]`);
  const nameSpan = createEl('span', 'teryt-fallback-name', row.name);
  const valSpan = createEl('span', 'teryt-fallback-val', row.formattedValue || '—');
  btn.append(codeSpan, nameSpan, valSpan);
  btn.setAttribute(
    'aria-label',
    `Indeks województwa ${row.name} (TERYT ${row.areaId}): ${row.formattedValue || 'brak wpisu'} — to punkt odniesienia województwa, nie miejsce zdarzenia`
  );
  return btn;
}

/**
 * Wyznacza współrzędne [lat, lng] reprezentujące sprawę do klastrowania i kotwiczenia.
 * @param {Object} item
 * @returns {{lat: number, lng: number}|null}
 */
function getItemLatLng(item) {
  if (!item) return null;
  if (
    item.location &&
    typeof item.location.lat === 'number' &&
    Number.isFinite(item.location.lat) &&
    typeof item.location.lng === 'number' &&
    Number.isFinite(item.location.lng)
  ) {
    return { lat: item.location.lat, lng: item.location.lng };
  }
  const geom = item.published_location?.geometry;
  if (!geom) return null;
  if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
    return { lat: Number(geom.coordinates[1]), lng: Number(geom.coordinates[0]) };
  }
  if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
    const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
    return { lat: Number(mid[1]), lng: Number(mid[0]) };
  }
  if (
    geom.type === 'Polygon' &&
    Array.isArray(geom.coordinates) &&
    Array.isArray(geom.coordinates[0]) &&
    geom.coordinates[0].length > 0
  ) {
    const ring = geom.coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    for (const pt of ring) {
      sumLng += Number(pt[0]);
      sumLat += Number(pt[1]);
    }
    return { lat: sumLat / ring.length, lng: sumLng / ring.length };
  }
  return null;
}

/**
 * Montuje jedną spójną mapę interaktywną (Polska -> województwa -> ulice OSM -> sprawy/DEMO).
 *
 * @param {HTMLElement} containerEl
 * @param {Object} [handlers]
 * @param {(areaId: string) => void} [handlers.onSelectArea]
 * @param {(areaId: string) => void} [handlers.onToggleCompare]
 * @param {(caseId: string|null) => void} [handlers.onSelectCase]
 * @param {(enabled: boolean) => void} [handlers.onToggleDemo]
 * @param {(status: {fallbackActive: boolean}) => void} [handlers.onGeometryStatus]
 * @param {(status: {hasError: boolean}) => void} [handlers.onTileStatus]
 */
export function mountMap(containerEl, handlers = {}) {
  if (!containerEl) {
    throw new Error('mountMap requires a valid container HTMLElement');
  }

  const reducedMotionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

  let latestView = null;
  let geoJsonData = null;
  let geometryFallbackActive = false;
  let tileErrorActive = false;
  let tileLayerAttached = false;
  let lastFocusedCaseId = null;
  let wheelHintTimer = null;
  let isDestroyed = false;

  // Przygotowanie struktury DOM wewnątrz kontenera mapy (obsługa zarówno #map-frame, jak i #map)
  const frameEl = containerEl.closest('.map-frame') || containerEl;
  frameEl.classList.add('map-frame');
  if (!frameEl.hasAttribute('tabindex')) {
    frameEl.setAttribute('tabindex', '0');
  }

  let canvasEl =
    containerEl !== frameEl
      ? containerEl
      : frameEl.querySelector('#map, .atlas-leaflet-canvas');
  if (!canvasEl) {
    canvasEl = createEl('div', 'atlas-leaflet-canvas');
    canvasEl.id = 'map';
    frameEl.appendChild(canvasEl);
  } else {
    canvasEl.classList.add('atlas-leaflet-canvas');
  }

  // Przyciski sterowania zoomem i powrotem do widoku Polski
  let controlsEl = frameEl.querySelector('.map-controls');
  let zoomInBtn;
  let zoomOutBtn;
  let resetBtn;
  if (!controlsEl) {
    controlsEl = createEl('div', 'map-controls');
    controlsEl.setAttribute('role', 'group');
    controlsEl.setAttribute('aria-label', 'Sterowanie główną mapą');

    zoomInBtn = createEl('button', 'map-ctrl-btn', '+');
    zoomInBtn.type = 'button';
    zoomInBtn.id = 'zoom-in';
    zoomInBtn.setAttribute('aria-label', 'Przybliż główną mapę');

    zoomOutBtn = createEl('button', 'map-ctrl-btn', '−');
    zoomOutBtn.type = 'button';
    zoomOutBtn.id = 'zoom-out';
    zoomOutBtn.setAttribute('aria-label', 'Oddal główną mapę');

    resetBtn = createEl('button', 'map-ctrl-btn reset-map', 'PL');
    resetBtn.type = 'button';
    resetBtn.id = 'map-reset';
    resetBtn.setAttribute('aria-label', 'Wróć do widoku całej Polski');

    controlsEl.append(zoomInBtn, zoomOutBtn, resetBtn);
    frameEl.appendChild(controlsEl);
  } else {
    zoomInBtn = controlsEl.querySelector('#zoom-in');
    zoomOutBtn = controlsEl.querySelector('#zoom-out');
    resetBtn = controlsEl.querySelector('#map-reset');
  }

  // Pływający tooltip podglądu (hover / focus)
  let tooltipEl = frameEl.querySelector('#map-tooltip');
  let tooltipEyebrowEl;
  let tooltipTitleEl;
  let tooltipActionEl;
  if (!tooltipEl) {
    tooltipEl = createEl('div', 'map-tooltip');
    tooltipEl.id = 'map-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.hidden = true;
    tooltipEyebrowEl = createEl('span', 'tooltip-eyebrow');
    tooltipTitleEl = createEl('strong', 'tooltip-title');
    tooltipActionEl = createEl('span', 'tooltip-action');
    tooltipEl.append(tooltipEyebrowEl, tooltipTitleEl, tooltipActionEl);
    frameEl.appendChild(tooltipEl);
  } else {
    tooltipEyebrowEl = tooltipEl.querySelector('.tooltip-eyebrow') || tooltipEl.querySelector('span:first-child');
    tooltipTitleEl = tooltipEl.querySelector('#tooltip-title') || tooltipEl.querySelector('strong');
    tooltipActionEl = tooltipEl.querySelector('#tooltip-action') || tooltipEl.querySelector('span:last-child');
  }

  // Pasek pozycji i skali w lewym dolnym rogu mapy
  let positionEl = frameEl.querySelector('#map-position');
  if (!positionEl) {
    positionEl = createEl('div', 'map-position', 'Polska · widok przeglądowy (z6)');
    positionEl.id = 'map-position';
    frameEl.appendChild(positionEl);
  }

  // Wskazówka dotycząca przewijania (Ctrl + kółko)
  let wheelHintEl = frameEl.querySelector('.map-wheel-hint');
  if (!wheelHintEl) {
    wheelHintEl = createEl(
      'div',
      'map-wheel-hint',
      'Użyj Ctrl + kółko myszy lub przycisków + / −, aby przybliżyć mapę'
    );
    wheelHintEl.hidden = true;
    frameEl.appendChild(wheelHintEl);
  }

  // Baner błędu kafli ulicznych OSM (z przyciskiem ponowienia)
  let tileErrorBannerEl = frameEl.querySelector('#tile-error-banner');
  let retryTilesBtn;
  if (!tileErrorBannerEl) {
    tileErrorBannerEl = createEl('div', 'map-tile-error');
    tileErrorBannerEl.id = 'tile-error-banner';
    tileErrorBannerEl.setAttribute('role', 'status');
    tileErrorBannerEl.hidden = true;

    const msgSpan = createEl(
      'span',
      'tile-error-text',
      'Podkład uliczny OpenStreetMap jest chwilowo niedostępny. Granice, geometria spraw, tabela i dossier działają normalnie.'
    );
    retryTilesBtn = createEl('button', 'tile-retry-btn', 'Ponów wczytywanie podkładu');
    retryTilesBtn.type = 'button';
    retryTilesBtn.id = 'retry-tiles';

    tileErrorBannerEl.append(msgSpan, retryTilesBtn);
    frameEl.appendChild(tileErrorBannerEl);
  } else {
    retryTilesBtn = tileErrorBannerEl.querySelector('#retry-tiles');
  }

  // Baner awarii geometrii województw
  let geoErrorBannerEl = document.getElementById('map-error') || frameEl.querySelector('.map-geo-error');
  if (!geoErrorBannerEl) {
    geoErrorBannerEl = createEl('div', 'map-geo-error');
    geoErrorBannerEl.id = 'map-error';
    geoErrorBannerEl.setAttribute('role', 'status');
    geoErrorBannerEl.hidden = true;
    frameEl.appendChild(geoErrorBannerEl);
  }

  // Lista wyboru spraw o identycznych współrzędnych (zamiast fikcyjnego jittera)
  let coLocatedChooserEl = frameEl.querySelector('#co-located-chooser');
  let coLocatedListEl;
  if (!coLocatedChooserEl) {
    coLocatedChooserEl = createEl('div', 'co-located-chooser');
    coLocatedChooserEl.id = 'co-located-chooser';
    coLocatedChooserEl.setAttribute('role', 'dialog');
    coLocatedChooserEl.setAttribute('aria-label', 'Sprawy przypisane do tego samego miejsca lub obszaru');
    coLocatedChooserEl.hidden = true;

    const header = createEl('div', 'co-located-header');
    const title = createEl('strong', 'co-located-title', 'Rekordy w tym samym miejscu / obszarze');
    const closeChooserBtn = createEl('button', 'co-located-close', '×');
    closeChooserBtn.type = 'button';
    closeChooserBtn.setAttribute('aria-label', 'Zamknij listę rekordów w jednym miejscu');
    closeChooserBtn.addEventListener('click', () => {
      coLocatedChooserEl.hidden = true;
    });
    header.append(title, closeChooserBtn);

    const sub = createEl(
      'p',
      'co-located-note',
      'Atlas nie rozsuwa punktów na fikcyjne sąsiednie adresy. Wybierz rekord z listy:'
    );
    coLocatedListEl = createEl('div', 'co-located-list');
    coLocatedChooserEl.append(header, sub, coLocatedListEl);
    frameEl.appendChild(coLocatedChooserEl);
  } else {
    coLocatedListEl = coLocatedChooserEl.querySelector('.co-located-list');
  }

  // Element atrybucji OSM (widoczny od z >= 11)
  const ensureOsmAttributionNode = () => {
    const attrEl = document.getElementById('osm-attribution');
    if (!attrEl || attrEl.dataset.initialized === 'true') return attrEl;
    attrEl.replaceChildren();
    attrEl.appendChild(document.createTextNode(TILE_CONFIG.attributionPrefix));
    const safeUrl = validateHttpsUrl(TILE_CONFIG.attributionUrl);
    if (safeUrl) {
      const link = createEl('a', null, TILE_CONFIG.attributionLinkText);
      link.href = safeUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      attrEl.appendChild(link);
    } else {
      attrEl.appendChild(document.createTextNode(TILE_CONFIG.attributionLinkText));
    }
    attrEl.appendChild(document.createTextNode(TILE_CONFIG.attributionSuffix));
    attrEl.dataset.initialized = 'true';
    return attrEl;
  };
  ensureOsmAttributionNode();

  // Sprawdzenie dostępności biblioteki Leaflet
  const LRef = typeof window !== 'undefined' ? window.L : undefined;
  if (!LRef || typeof LRef.map !== 'function') {
    geometryFallbackActive = true;
    geoErrorBannerEl.hidden = false;
    geoErrorBannerEl.textContent =
      'Biblioteka mapy (Leaflet) jest niedostępna. Korzystaj z pełnej tabeli województw i panelu dossier.';
    handlers.onGeometryStatus?.({ fallbackActive: true });

    const noopDiagnostics = () => ({
      zoom: COUNTRY_ZOOM,
      minZoom: TILE_CONFIG.minZoom,
      maxZoom: TILE_CONFIG.maxZoom,
      tileLayerAttached: false,
      tileErrorActive: false,
      layers: latestView?.layers || { regions: true, heatmap: true, pins: true },
      heatmapPointCount: 0,
      markerCount: 0
    });

    const noopController = {
      update(view) {
        latestView = view;
      },
      focusArea() {},
      flyToArea() {},
      focusCase() {},
      focusCaseLocation() {},
      focusDemoCluster() {},
      resetView() {},
      resetCountryView() {},
      retryTiles() {},
      getDiagnostics: noopDiagnostics,
      getMapDiagnostics: noopDiagnostics,
      destroy() {
        isDestroyed = true;
      }
    };
    return noopController;
  }

  // Inicjalizacja instancji L.map — ciągły podkład uliczny OSM na wszystkich poziomach zoomu (z5–z18)
  const svgRenderer = LRef.svg({ padding: 0.5 });
  const map = LRef.map(canvasEl, {
    center: COUNTRY_CENTER,
    zoom: COUNTRY_ZOOM,
    minZoom: TILE_CONFIG.minZoom,
    maxZoom: TILE_CONFIG.maxZoom,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    renderer: svgRenderer
  });

  // Dedykowana płaszczyzna (pane) i <canvas> dla warstwy gęstości zdarzeń (heatmap) ponad poligonami i pod pinezkami
  const heatmapPane =
    typeof map.createPane === 'function'
      ? map.createPane('heatmapPane')
      : map.getPanes?.()?.overlayPane || canvasEl;
  if (heatmapPane && heatmapPane !== canvasEl) {
    heatmapPane.classList.add('leaflet-heatmap-pane');
    heatmapPane.style.zIndex = '450';
    heatmapPane.style.pointerEvents = 'none';
  }
  let heatmapCanvas = frameEl.querySelector('canvas.atlas-heatmap-canvas');
  if (!heatmapCanvas) {
    heatmapCanvas = createEl('canvas', 'atlas-heatmap-canvas');
    heatmapCanvas.setAttribute('aria-hidden', 'true');
    heatmapPane.appendChild(heatmapCanvas);
  }
  heatmapCanvas.dataset.pointCount = '0';
  heatmapCanvas.dataset.nonEmpty = 'false';
  heatmapCanvas.dataset.year = '2025';
  heatmapCanvas.dataset.active = 'true';

  let tileLayer = null;
  let geoLayer = null;
  let fallbackBadgeLayer = LRef.layerGroup().addTo(map);
  let caseGeometryLayer = LRef.layerGroup().addTo(map);
  let spiderfyLayer = LRef.layerGroup().addTo(map);
  let caseMarkerLayer = LRef.layerGroup().addTo(map);
  const markerDomByCaseId = new Map();
  const rowsByAreaId = new Map();
  let hoveredOrFocusedAreaCode = null;
  let tileErrorCountInCycle = 0;
  let hasSuccessfulTileInCycle = false;
  let lastMarkersRenderKey = '';
  let lastRenderedSelectedCaseId = null;

  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  function showTooltipForElement(targetEl, eyebrowText, titleText, actionText) {
    if (!tooltipEl || !targetEl) return;
    tooltipEyebrowEl.textContent = eyebrowText;
    tooltipTitleEl.textContent = titleText;
    tooltipActionEl.textContent = actionText;
    tooltipEl.hidden = false;

    const frameBox = frameEl.getBoundingClientRect();
    const targetBox = targetEl.getBoundingClientRect();
    if (frameBox.width === 0 || targetBox.width === 0) return;

    const tipWidth = tooltipEl.offsetWidth || 228;
    const tipHeight = tooltipEl.offsetHeight || 74;
    const centerX = targetBox.left - frameBox.left + targetBox.width / 2;
    const topY = targetBox.top - frameBox.top;

    const left = Math.max(12, Math.min(centerX - tipWidth / 2, frameBox.width - tipWidth - 12));
    const top = Math.max(10, topY - tipHeight - 14);
    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
  }

  /**
   * Utrzymuje ciągłą warstwę podkładu ulicznego OpenStreetMap na wszystkich poziomach zoomu (z5–z18),
   * zapewniając widoczną atrybucję oraz obsługę błędów i ponawiania kafli w każdym przybliżeniu.
   */
  function syncTileLayerForZoom() {
    const z = map.getZoom();
    const isStreetZoom = z >= STREET_ZOOM_THRESHOLD;
    frameEl.classList.toggle('is-detail', z > COUNTRY_ZOOM);
    frameEl.classList.toggle('is-street-zoom', isStreetZoom);

    if (zoomOutBtn) zoomOutBtn.disabled = z <= map.getMinZoom();
    if (zoomInBtn) zoomInBtn.disabled = z >= map.getMaxZoom();

    const attrEl = ensureOsmAttributionNode();
    if (attrEl) attrEl.hidden = false;

    if (!tileLayer) {
      tileLayer = LRef.tileLayer(TILE_CONFIG.url, {
        minZoom: TILE_CONFIG.minZoom,
        maxZoom: TILE_CONFIG.maxZoom,
        keepBuffer: 2,
        updateWhenIdle: true,
        updateWhenZooming: false
      });
      tileLayer.on('loading', () => {
        tileErrorCountInCycle = 0;
        hasSuccessfulTileInCycle = false;
      });
      tileLayer.on('tileerror', () => {
        tileErrorCountInCycle += 1;
        if (!tileErrorActive) {
          tileErrorActive = true;
          if (tileErrorBannerEl) tileErrorBannerEl.hidden = false;
          handlers.onTileStatus?.({ hasError: true });
        }
      });
      tileLayer.on('tileload', () => {
        hasSuccessfulTileInCycle = true;
        if (tileErrorActive && tileErrorCountInCycle === 0) {
          tileErrorActive = false;
          if (tileErrorBannerEl) tileErrorBannerEl.hidden = true;
          handlers.onTileStatus?.({ hasError: false });
        }
      });
      tileLayer.on('load', () => {
        if (tileErrorActive && tileErrorCountInCycle === 0 && hasSuccessfulTileInCycle) {
          tileErrorActive = false;
          if (tileErrorBannerEl) tileErrorBannerEl.hidden = true;
          handlers.onTileStatus?.({ hasError: false });
        }
      });
    }
    if (!tileLayerAttached) {
      tileLayer.addTo(map);
      tileLayerAttached = true;
    }

    updatePositionLabel();
  }

  function updatePositionLabel() {
    if (!positionEl) return;
    const z = map.getZoom();
    const demoSuffix =
      latestView?.demoFixturesEnabled ? ' · aktywny wzorzec DEMO (Warszawa)' : '';
    if (z <= 7) {
      positionEl.textContent = `Polska · podkład drogowo-miejski OSM + 16 województw (z${z})${demoSuffix}`;
    } else if (z <= 10) {
      positionEl.textContent = `Widok regionalny · podkład uliczny OSM + granice województw (z${z})${demoSuffix}`;
    } else if (z <= 14) {
      positionEl.textContent = `Widok miejski · podkład uliczny OpenStreetMap (z${z})${demoSuffix}`;
    } else {
      positionEl.textContent = `Widok uliczny · ulice i obrysy budynków OSM (z${z})${demoSuffix}`;
    }
  }

  /**
   * Wyznacza styl poligonu województwa dla przekazanego wiersza ViewModel.
   * Przezroczystość wypełnienia jest stopniowana względem zoomu, aby podkład uliczny OSM
   * był czytelny na każdym przybliżeniu (od widoku Polski z6 po widok ulicy z18).
   * @param {Object|undefined} row
   */
  function computePolygonStyle(row) {
    if (latestView?.layers?.regions === false) {
      return {
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#42534b',
        weight: 0.75,
        opacity: 0.45,
        dashArray: '3 4'
      };
    }

    const z = map.getZoom();
    const baseFillOpacity =
      z <= 7
        ? 0.56
        : z <= 10
          ? 0.40
          : z <= 13
            ? 0.16
            : 0.06;
    const selectedFillOpacity =
      z <= 7
        ? 0.66
        : z <= 10
          ? 0.50
          : z <= 13
            ? 0.24
            : 0.10;

    if (!row) {
      return {
        fillColor: 'url(#atlas-pattern-missing)',
        fillOpacity: baseFillOpacity,
        color: '#687e6b',
        weight: 1.1,
        opacity: 0.92,
        dashArray: null
      };
    }

    const isSelected = Boolean(
      row.isSelected ||
        (latestView?.selectedAreaId && row.areaId === latestView.selectedAreaId) ||
        (typeof latestView?.selectedArea === 'string' && row.areaId === latestView.selectedArea) ||
        (latestView?.selectedArea?.areaId && row.areaId === latestView.selectedArea.areaId)
    );
    const isCompared = Boolean(
      row.isCompared ||
        (Array.isArray(latestView?.compareAreas) && latestView.compareAreas.includes(row.areaId)) ||
        (Array.isArray(latestView?.compareAreaIds) && latestView.compareAreaIds.includes(row.areaId))
    );

    const isObserved = row.availability === 'observed' && row.displayValue !== null && row.displayValue !== undefined;
    const isApproved = row.reviewStatus === 'approved' || row.verification === 'official_verified';
    const showUnreviewed = latestView?.includeUnreviewedPreview !== false;

    let fillColor = 'url(#atlas-pattern-missing)';
    let strokeColor = '#687e6b';
    let strokeWeight = 1.1;
    let dashArray = null;

    if (row.availability === 'suppressed') {
      fillColor = 'url(#atlas-pattern-suppressed)';
    } else if (isObserved && isApproved) {
      const idx =
        typeof row.classIndex === 'number' && row.classIndex >= 0 && row.classIndex < SEQUENTIAL_SCALE_COLORS.length
          ? row.classIndex
          : 0;
      fillColor = SEQUENTIAL_SCALE_COLORS[idx];
      strokeColor = '#718475';
    } else if (isObserved && !isApproved) {
      // Dane wtórne / niezweryfikowane: wypełnienie pomocnicze + przerywany obrys
      fillColor = showUnreviewed ? '#34493b' : 'url(#atlas-pattern-missing)';
      strokeColor = '#819681';
      strokeWeight = 1.35;
      dashArray = '4 3';
    }

    if (isCompared && !isSelected) {
      strokeColor = '#eee8d9';
      strokeWeight = 1.9;
      dashArray = '2 2';
    }

    if (isSelected) {
      if (isObserved) {
        fillColor = '#4c533b';
      }
      strokeColor = '#d6b578';
      strokeWeight = 2.4;
      dashArray = null;
    }

    return {
      fillColor,
      fillOpacity: isSelected ? selectedFillOpacity : baseFillOpacity,
      color: strokeColor,
      weight: strokeWeight,
      opacity: 0.92,
      dashArray
    };
  }

  /**
   * Odświeża warstwę poligonów województw (lub fiszki indeksowe w trybie awaryjnym).
   */
  function renderRegionsLayer() {
    const rows = latestView?.rows || [];
    rowsByAreaId.clear();
    for (const r of rows) {
      rowsByAreaId.set(String(r.areaId || r.teryt).padStart(2, '0'), r);
    }

    if (geoJsonData && !geometryFallbackActive) {
      fallbackBadgeLayer.clearLayers();

      if (!geoLayer) {
        geoLayer = LRef.geoJSON(geoJsonData, {
          style(feature) {
            const code = String(feature.properties?.JPT_KOD_JE ?? feature.properties?.teryt ?? '').padStart(2, '0');
            return computePolygonStyle(rowsByAreaId.get(code));
          },
          onEachFeature(feature, layer) {
            const code = String(feature.properties?.JPT_KOD_JE ?? feature.properties?.teryt ?? '').padStart(2, '0');
            layer.on('click', () => {
              handlers.onSelectArea?.(code);
            });
            layer.on('mouseover', () => {
              hoveredOrFocusedAreaCode = code;
              const row = rowsByAreaId.get(code);
              layer.setStyle({
                weight: 2.2,
                color: '#eee8d9'
              });
              const pathEl = layer.getElement?.();
              if (pathEl && row) {
                showTooltipForElement(
                  pathEl,
                  `WOJEWÓDZTWO · TERYT ${code}`,
                  `${row.name}: ${row.formattedValue || '—'}`,
                  `${row.statusLabelPl || ''} · Kliknij → wybierz obszar`
                );
              }
            });
            layer.on('mouseout', () => {
              if (hoveredOrFocusedAreaCode === code) {
                hoveredOrFocusedAreaCode = null;
              }
              hideTooltip();
              const currentRow = rowsByAreaId.get(code);
              layer.setStyle(computePolygonStyle(currentRow));
            });
          }
        }).addTo(map);

        map.invalidateSize({ animate: false });
        const initialBounds = geoLayer.getBounds?.();
        if (
          initialBounds &&
          initialBounds.isValid() &&
          (canvasEl.clientWidth || 800) >= 500 &&
          map.getZoom() < STREET_ZOOM_THRESHOLD &&
          !latestView?.selectedCaseId &&
          !latestView?.selectedCase
        ) {
          const boundsZoom =
            typeof map.getBoundsZoom === 'function' ? map.getBoundsZoom(initialBounds, false, [4, 4]) : COUNTRY_ZOOM;
          if (boundsZoom >= COUNTRY_ZOOM) {
            map.fitBounds(initialBounds, {
              padding: [4, 4],
              maxZoom: STREET_ZOOM_THRESHOLD - 1,
              animate: false
            });
          } else {
            map.setView(COUNTRY_CENTER, COUNTRY_ZOOM, { animate: false });
          }
        }
      } else {
        geoLayer.eachLayer((layer) => {
          const code = String(layer.feature?.properties?.JPT_KOD_JE ?? layer.feature?.properties?.teryt ?? '').padStart(
            2,
            '0'
          );
          const row = rowsByAreaId.get(code);
          layer.setStyle(computePolygonStyle(row));
          if (row?.isSelected || code === latestView?.selectedAreaId) {
            layer.bringToFront();
          }
        });
      }

      // Wstrzyknięcie wzorca kreskowania <defs><pattern> oraz atrybutów ARIA na ścieżki SVG
      const overlaySvg = map.getPanes()?.overlayPane?.querySelector('svg');
      ensureSvgPatterns(overlaySvg);

      geoLayer.eachLayer((layer) => {
        const code = String(layer.feature?.properties?.JPT_KOD_JE ?? layer.feature?.properties?.teryt ?? '').padStart(
          2,
          '0'
        );
        const row = rowsByAreaId.get(code);
        const pathEl = layer.getElement?.();
        if (!pathEl) return;

        pathEl.classList.add('region');
        pathEl.dataset.area = code;
        const isSelected = Boolean(row?.isSelected || code === latestView?.selectedAreaId);
        const hasRecord = Boolean(row?.availability === 'observed' && row?.displayValue !== null);
        pathEl.classList.toggle('selected', isSelected);
        pathEl.classList.toggle('has-record', hasRecord);
        pathEl.setAttribute('tabindex', '0');
        pathEl.setAttribute('role', 'button');
        pathEl.setAttribute('aria-pressed', String(isSelected));

        const labelName = row?.name || layer.feature?.properties?.JPT_NAZWA_ || `TERYT ${code}`;
        const labelStatus = hasRecord
          ? `${row.formattedValue} (${row.statusLabelPl || 'wpis w zbiorze'})`
          : row?.availability === 'not_applicable'
            ? 'przekrój wyłącznie krajowy (GUS)'
            : 'brak wpisu w zbiorze';
        pathEl.setAttribute('aria-label', `${labelName} — ${labelStatus}; wybierz obszar`);

        if (!pathEl.dataset.keyBound) {
          pathEl.dataset.keyBound = 'true';
          pathEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (event.shiftKey) {
                handlers.onToggleCompare?.(code);
              } else {
                handlers.onSelectArea?.(code);
              }
            }
          });
          pathEl.addEventListener('focus', () => {
            hoveredOrFocusedAreaCode = code;
            const currentRow = rowsByAreaId.get(code);
            if (currentRow) {
              showTooltipForElement(
                pathEl,
                `WOJEWÓDZTWO · TERYT ${code}`,
                `${currentRow.name}: ${currentRow.formattedValue || '—'}`,
                `${currentRow.statusLabelPl || ''} · Enter → wybierz, Shift+Enter → porównaj`
              );
            }
          });
          pathEl.addEventListener('blur', () => {
            if (hoveredOrFocusedAreaCode === code) {
              hoveredOrFocusedAreaCode = null;
            }
            hideTooltip();
          });
        }

        if (hoveredOrFocusedAreaCode === code && tooltipEl && !tooltipEl.hidden && row) {
          showTooltipForElement(
            pathEl,
            `WOJEWÓDZTWO · TERYT ${code}`,
            `${row.name}: ${row.formattedValue || '—'}`,
            `${row.statusLabelPl || ''} · Kliknij / Enter → wybierz obszar`
          );
        }
      });
    } else if (geometryFallbackActive && rows.length > 0) {
      // Tryb awaryjny geometrii: prostokątne fiszki katalogowe [TERYT] zamiast kołowych punktów
      fallbackBadgeLayer.clearLayers();
      if (latestView?.layers?.regions === false) return;
      for (const row of rows) {
        if (typeof row.lat !== 'number' || typeof row.lng !== 'number') continue;
        const badgeNode = buildFallbackTerritoryBadge(row);
        badgeNode.addEventListener('click', () => {
          handlers.onSelectArea?.(row.areaId);
        });
        const icon = LRef.divIcon({
          className: 'atlas-fallback-div-icon',
          html: badgeNode,
          iconSize: [128, 30],
          iconAnchor: [64, 15]
        });
        LRef.marker([row.lat, row.lng], { icon, keyboard: false }).addTo(fallbackBadgeLayer);
      }
    }
  }

  /**
   * Renderuje warstwę gęstości zdarzeń (heatmap) na elemencie <canvas class="atlas-heatmap-canvas">
   * wyłącznie na podstawie zatwierdzonych opublikowanych spraw indywidualnych dla wybranego roku.
   * NIGDY nie generuje punktów z sum wojewódzkich ani z wzorców DEMO.
   */
  function renderHeatmapLayer() {
    if (!heatmapCanvas) return;

    const yearStr = String(latestView?.year ?? 2025);
    const isHeatmapActive = latestView?.layers?.heatmap !== false;

    const size = map.getSize?.() || { x: canvasEl.clientWidth || 800, y: canvasEl.clientHeight || 520 };
    const width = Math.max(1, Math.round(size.x || canvasEl.clientWidth || 800));
    const height = Math.max(1, Math.round(size.y || canvasEl.clientHeight || 520));
    if (heatmapCanvas.width !== width) heatmapCanvas.width = width;
    if (heatmapCanvas.height !== height) heatmapCanvas.height = height;
    heatmapCanvas.style.width = `${width}px`;
    heatmapCanvas.style.height = `${height}px`;

    if (typeof map.containerPointToLayerPoint === 'function' && LRef.DomUtil?.setPosition) {
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      LRef.DomUtil.setPosition(heatmapCanvas, topLeft);
    }

    const ctx = typeof heatmapCanvas.getContext === 'function' ? heatmapCanvas.getContext('2d') : null;
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }

    // Wyłącznie zweryfikowane sprawy indywidualne (bez sum wojewódzkich i bez punktów DEMO)
    const rawSource = Array.isArray(latestView?.heatmapPoints)
      ? latestView.heatmapPoints
      : Array.isArray(latestView?.publishedCases)
        ? latestView.publishedCases
        : [];

    const validPoints = [];
    for (const item of rawSource) {
      if (!item || item.isDemoFixture || String(item.id || '').startsWith('DEMO-')) continue;
      const coords =
        typeof item.lat === 'number' &&
        Number.isFinite(item.lat) &&
        typeof item.lng === 'number' &&
        Number.isFinite(item.lng)
          ? { lat: item.lat, lng: item.lng }
          : getItemLatLng(item);
      if (!coords) continue;
      const precision =
        item.precision || item.published_location?.precision || item.location?.precision || 'municipality';
      validPoints.push({
        lat: coords.lat,
        lng: coords.lng,
        precision
      });
    }

    const z = map.getZoom();
    const isStreetZoom = z >= STREET_ZOOM_THRESHOLD;

    // Geographic honesty: at street/municipal zoom (z >= 11), approximate municipal or district
    // centroids must NOT be rendered as high-resolution street heatmap hotspots at city centres.
    const eligiblePoints = isStreetZoom
      ? validPoints.filter(
          pt => pt.precision === 'exact_public_place' || pt.precision === 'street_segment'
        )
      : validPoints;
    const coarseFilteredCount = validPoints.length - eligiblePoints.length;

    if (!isHeatmapActive || eligiblePoints.length === 0 || !ctx) {
      heatmapCanvas.dataset.pointCount = '0';
      heatmapCanvas.dataset.totalCasePoints = String(validPoints.length);
      heatmapCanvas.dataset.coarseFilteredCount = String(coarseFilteredCount);
      heatmapCanvas.dataset.streetPrecisionOnly = String(isStreetZoom);
      heatmapCanvas.dataset.drawnPointCount = '0';
      heatmapCanvas.dataset.nonEmpty = 'false';
      heatmapCanvas.dataset.year = yearStr;
      heatmapCanvas.dataset.active = String(isHeatmapActive);
      heatmapCanvas.hidden = !isHeatmapActive;
      return;
    }

    const baseRadius = z <= 7 ? 34 : z <= 10 ? 42 : z <= 13 ? 48 : 54;
    let drawnCount = 0;

    for (const pt of eligiblePoints) {
      const px = map.latLngToContainerPoint([pt.lat, pt.lng]);
      const radiusFactor =
        pt.precision === 'exact_public_place'
          ? 0.78
          : pt.precision === 'street_segment'
            ? 0.96
            : pt.precision === 'district'
              ? 1.28
              : 1.48;
      const peakAlpha =
        pt.precision === 'exact_public_place'
          ? 0.62
          : pt.precision === 'street_segment'
            ? 0.54
            : pt.precision === 'district'
              ? 0.36
              : 0.30;
      const r = Math.max(16, Math.round(baseRadius * radiusFactor));

      if (px.x < -r * 1.5 || px.y < -r * 1.5 || px.x > width + r * 1.5 || px.y > height + r * 1.5) {
        continue;
      }

      const grad = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, r);
      grad.addColorStop(0, `rgba(0, 0, 0, ${peakAlpha})`);
      grad.addColorStop(0.35, `rgba(0, 0, 0, ${peakAlpha * 0.68})`);
      grad.addColorStop(0.7, `rgba(0, 0, 0, ${peakAlpha * 0.28})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px.x, px.y, r, 0, Math.PI * 2);
      ctx.fill();
      drawnCount += 1;
    }

    if (drawnCount > 0) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 6) {
          data[i + 3] = 0;
          continue;
        }
        const lutIdx = alpha * 4;
        data[i] = HEATMAP_LUT[lutIdx];
        data[i + 1] = HEATMAP_LUT[lutIdx + 1];
        data[i + 2] = HEATMAP_LUT[lutIdx + 2];
        data[i + 3] = HEATMAP_LUT[lutIdx + 3];
      }
      ctx.putImageData(imgData, 0, 0);
    }

    heatmapCanvas.dataset.pointCount = String(eligiblePoints.length);
    heatmapCanvas.dataset.totalCasePoints = String(validPoints.length);
    heatmapCanvas.dataset.coarseFilteredCount = String(coarseFilteredCount);
    heatmapCanvas.dataset.streetPrecisionOnly = String(isStreetZoom);
    heatmapCanvas.dataset.drawnPointCount = String(drawnCount);
    heatmapCanvas.dataset.nonEmpty = String(drawnCount > 0);
    heatmapCanvas.dataset.year = yearStr;
    heatmapCanvas.dataset.active = 'true';
    heatmapCanvas.hidden = false;
  }

  /**
   * Otwiera dostępną listę spraw przypisanych do tego samego miejsca / współrzędnych.
   * @param {Object[]} items
   */
  function openCoLocatedChooser(items) {
    if (!coLocatedChooserEl || !coLocatedListEl) return;
    coLocatedListEl.replaceChildren();
    for (const item of items) {
      const btn = createEl('button', 'co-located-item');
      btn.type = 'button';
      const badge = createEl(
        'span',
        'co-located-badge',
        item.isDemoFixture
          ? `DEMO ${item.shortCode || item.id}`
          : item.published_location?.precisionBadgePl || 'ARCHIWUM'
      );
      const title = createEl(
        'strong',
        'co-located-item-title',
        item.titlePl || item.published_location?.publicLabelPl || item.municipality || item.id
      );
      const sub = createEl('span', 'co-located-item-sub', `${item.occurred_on || ''} · Otwórz pełne dossier →`);
      btn.append(badge, title, sub);
      btn.addEventListener('click', () => {
        coLocatedChooserEl.hidden = true;
        lastFocusedCaseId = item.id;
        handlers.onSelectCase?.(item.id);
      });
      coLocatedListEl.appendChild(btn);
    }
    coLocatedChooserEl.hidden = false;
    const firstBtn = coLocatedListEl.querySelector('button');
    firstBtn?.focus({ preventScroll: true });
  }

  function renderCaseGeometryOverlay(allItems, selectedCaseId, z) {
    caseGeometryLayer.clearLayers();
    if (z < STREET_ZOOM_THRESHOLD) return;
    for (const item of allItems) {
      const geom = item.published_location?.geometry;
      const precision = item.published_location?.precision || item.location?.precision || 'municipality';
      const isSelected = selectedCaseId === item.id;

      if (geom?.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
        if (z < 13) continue;
        const latLngs = geom.coordinates.map(([lng, lat]) => [lat, lng]);
        LRef.polyline(latLngs, {
          color: '#111918',
          weight: isSelected ? 9 : 7,
          opacity: 0.9,
          interactive: false
        }).addTo(caseGeometryLayer);

        LRef.polyline(latLngs, {
          color: isSelected ? '#eee8d9' : '#d6b578',
          weight: isSelected ? 4.5 : 3.5,
          dashArray: '8 5',
          opacity: 0.95,
          interactive: false
        }).addTo(caseGeometryLayer);
      } else if (
        geom?.type === 'Polygon' &&
        Array.isArray(geom.coordinates) &&
        Array.isArray(geom.coordinates[0])
      ) {
        const latLngs = geom.coordinates[0].map(([lng, lat]) => [lat, lng]);
        LRef.polygon(latLngs, {
          color: isSelected ? '#eee8d9' : '#d6b578',
          weight: isSelected ? 2.2 : 1.6,
          dashArray: '5 4',
          fillColor: '#d6b578',
          fillOpacity: isSelected ? 0.16 : 0.08,
          interactive: false
        }).addTo(caseGeometryLayer);
      } else if (
        (precision === 'municipality' || precision === 'district') &&
        typeof LRef.circle === 'function'
      ) {
        const coords = getItemLatLng(item);
        if (!coords) continue;
        const radiusMeters = precision === 'district' ? 1150 : 2400;
        LRef.circle([coords.lat, coords.lng], {
          radius: radiusMeters,
          className: 'approximate-area-circle',
          color: isSelected ? '#eee8d9' : '#d6b578',
          weight: isSelected ? 2.0 : 1.35,
          dashArray: '6 5',
          fillColor: '#d6b578',
          fillOpacity: isSelected ? 0.11 : 0.04,
          interactive: false
        }).addTo(caseGeometryLayer);
      }
    }
  }

  /**
   * Renderuje znaczniki zatwierdzonych spraw oraz wzorce interakcji DEMO (klastry, punkty, odcinki ulic, obszary).
   * Wykorzystuje aktualizacje różnicowe (keyed DOM updates), aby nie niszczyć fokusu i węzłów przy zmianie roku/filtra.
   */
  function renderCasesAndDemoLayer(forceRebuild = false) {
    if (latestView?.layers?.pins === false) {
      caseGeometryLayer.clearLayers();
      caseMarkerLayer.clearLayers();
      spiderfyLayer.clearLayers();
      markerDomByCaseId.clear();
      lastMarkersRenderKey = '';
      if (coLocatedChooserEl) coLocatedChooserEl.hidden = true;
      return;
    }

    const approvedCases = Array.isArray(latestView?.publishedCases) ? latestView.publishedCases : [];
    const demoItems =
      latestView?.demoFixturesEnabled
        ? Array.isArray(latestView?.demoMarkers) && latestView.demoMarkers.length > 0
          ? latestView.demoMarkers
          : DEMO_FIXTURES
        : [];

    const allItems = [...approvedCases, ...demoItems];
    const selectedCaseId =
      latestView?.selectedCase?.id ||
      (typeof latestView?.selectedCaseId === 'string' ? latestView.selectedCaseId : null);

    const z = map.getZoom();
    const center = map.getCenter();
    const nextRenderKey = `${latestView?.year ?? 2025}:${z}:${latestView?.layers?.pins !== false ? 'pins1' : 'pins0'}:${latestView?.demoFixturesEnabled ? 'demo1' : 'demo0'}:${approvedCases.map((c) => c.id).join(',')}:${Math.round(center.lat * 1000)},${Math.round(center.lng * 1000)}`;

    if (!forceRebuild && nextRenderKey === lastMarkersRenderKey) {
      if (selectedCaseId !== lastRenderedSelectedCaseId) {
        for (const [id, node] of markerDomByCaseId.entries()) {
          if (node.classList.contains('case-cluster')) continue;
          const isSel = id === selectedCaseId;
          node.classList.toggle('selected', isSel);
          node.setAttribute('aria-expanded', String(isSel));
        }
        renderCaseGeometryOverlay(allItems, selectedCaseId, z);
        lastRenderedSelectedCaseId = selectedCaseId;
      }
      return;
    }

    const activeDomCaseId =
      typeof document !== 'undefined' && document.activeElement?.dataset?.caseId
        ? document.activeElement.dataset.caseId
        : null;

    lastMarkersRenderKey = nextRenderKey;
    lastRenderedSelectedCaseId = selectedCaseId;

    caseGeometryLayer.clearLayers();
    caseMarkerLayer.clearLayers();
    spiderfyLayer.clearLayers();
    markerDomByCaseId.clear();

    if (allItems.length === 0) return;

    renderCaseGeometryOverlay(allItems, selectedCaseId, z);

    // Grupowanie rekordów o identycznych lub bardzo bliskich współrzędnych bazowych
    const rawPositioned = [];
    for (const item of allItems) {
      const baseCoords = getItemLatLng(item);
      if (!baseCoords) continue;
      rawPositioned.push({ item, baseCoords });
    }

    const coordBuckets = new Map();
    for (const entry of rawPositioned) {
      const key = `${Math.round(entry.baseCoords.lat * 5000)}:${Math.round(entry.baseCoords.lng * 5000)}`;
      if (!coordBuckets.has(key)) coordBuckets.set(key, []);
      coordBuckets.get(key).push(entry);
    }

    const positioned = [];
    for (const bucket of coordBuckets.values()) {
      const shouldSpiderfy = bucket.length > 1 && z >= CLUSTER_ZOOM_THRESHOLD;
      if (shouldSpiderfy) {
        const anchorCoords = bucket[0].baseCoords;
        LRef.circleMarker([anchorCoords.lat, anchorCoords.lng], {
          radius: 4.5,
          className: 'spiderfy-anchor',
          color: '#d6b578',
          fillColor: '#111918',
          fillOpacity: 0.95,
          weight: 1.8,
          interactive: false
        }).addTo(spiderfyLayer);
      }

      bucket.forEach((entry, idx) => {
        let coords = entry.baseCoords;
        let isOffset = false;
        if (shouldSpiderfy) {
          isOffset = true;
          const angle = (2 * Math.PI * idx) / bucket.length;
          const radiusPx = 26;
          const basePx = map.latLngToContainerPoint([entry.baseCoords.lat, entry.baseCoords.lng]);
          const offsetLatLng = map.containerPointToLatLng([
            basePx.x + radiusPx * Math.cos(angle),
            basePx.y + radiusPx * Math.sin(angle)
          ]);
          coords = {
            lat: Number(offsetLatLng.lat.toFixed(6)),
            lng: Number(offsetLatLng.lng.toFixed(6))
          };
          LRef.polyline(
            [
              [entry.baseCoords.lat, entry.baseCoords.lng],
              [coords.lat, coords.lng]
            ],
            {
              className: 'spiderfy-leg',
              color: '#d6b578',
              weight: 1.5,
              dashArray: '3 3',
              interactive: false
            }
          ).addTo(spiderfyLayer);
        }
        const pointPx = map.latLngToContainerPoint([coords.lat, coords.lng]);
        positioned.push({
          item: entry.item,
          coords,
          baseCoords: entry.baseCoords,
          isOffset,
          pointPx,
          clustered: false
        });
      });
    }

    const groups = [];
    for (let i = 0; i < positioned.length; i++) {
      const current = positioned[i];
      if (current.clustered) continue;
      current.clustered = true;
      const members = [current];

      for (let j = i + 1; j < positioned.length; j++) {
        const candidate = positioned[j];
        if (candidate.clustered) continue;
        const distPx = Math.hypot(current.pointPx.x - candidate.pointPx.x, current.pointPx.y - candidate.pointPx.y);
        const closeDeg =
          Math.abs(current.coords.lat - candidate.coords.lat) < 0.15 &&
          Math.abs(current.coords.lng - candidate.coords.lng) < 0.15;
        const sameRenderedCoords = !current.isOffset && !candidate.isOffset && distPx < 6;

        if ((z < CLUSTER_ZOOM_THRESHOLD && (distPx <= CLUSTER_RADIUS_PX || closeDeg)) || sameRenderedCoords) {
          candidate.clustered = true;
          members.push(candidate);
        }
      }
      groups.push(members);
    }

    for (const group of groups) {
      if (group.length === 1) {
        const { item, coords, baseCoords, isOffset } = group[0];
        const isSelected = selectedCaseId === item.id;
        const node = buildCaseMarkerNode(item, isSelected, baseCoords, isOffset);
        markerDomByCaseId.set(item.id, node);

        const isDemo = Boolean(item.isDemoFixture);
        const eyebrow = isDemo
          ? 'INTERAKCJA DEMO · NIE ZDARZENIE'
          : (item.published_location?.precisionBadgePl || 'ARCHIWUM SPRAW').toUpperCase();
        const title = item.titlePl || item.published_location?.publicLabelPl || item.municipality || item.id;
        const actionText = isOffset
          ? `Współrzędne zatwierdzone: ${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)} (wizualne rozsunięcie w jednym punkcie) · Kliknij → opis`
          : 'Kliknij lub naciśnij Enter → opis obok mapy';

        const showCaseTooltip = () => {
          const activeId =
            latestView?.selectedCase?.id ||
            (typeof latestView?.selectedCaseId === 'string' ? latestView.selectedCaseId : null);
          if (activeId === item.id) {
            hideTooltip();
            return;
          }
          showTooltipForElement(node, eyebrow, title, actionText);
        };

        node.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'touch') {
            showCaseTooltip();
          }
        });
        node.addEventListener('pointerleave', hideTooltip);
        node.addEventListener('focus', () => {
          showCaseTooltip();
        });
        node.addEventListener('blur', hideTooltip);

        const activateCase = (event) => {
          event.stopPropagation();
          hideTooltip();
          lastFocusedCaseId = item.id;
          handlers.onSelectCase?.(item.id);
          requestAnimationFrame(() => {
            const headingEl = typeof document !== 'undefined' ? document.getElementById('case-heading') : null;
            if (headingEl && !headingEl.closest('[hidden]')) {
              headingEl.focus({ preventScroll: true });
            } else {
              markerDomByCaseId.get(item.id)?.focus({ preventScroll: true });
            }
          });
        };
        node.addEventListener('click', activateCase);
        node.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activateCase(event);
          }
        });

        const icon = LRef.divIcon({
          className: 'atlas-marker-div-icon',
          html: node,
          iconSize: [44, 62],
          iconAnchor: [22, 36]
        });
        LRef.marker([coords.lat, coords.lng], {
          icon,
          keyboard: false,
          zIndexOffset: isSelected ? 900 : 200
        }).addTo(caseMarkerLayer);
      } else {
        // Klaster wielu punktów
        const itemsInGroup = group.map((g) => g.item);
        const avgLat = group.reduce((acc, g) => acc + g.coords.lat, 0) / group.length;
        const avgLng = group.reduce((acc, g) => acc + g.coords.lng, 0) / group.length;

        const clusterNode = buildClusterMarkerNode(itemsInGroup);
        for (const item of itemsInGroup) {
          markerDomByCaseId.set(item.id, clusterNode);
        }

        const allDemo = itemsInGroup.every((it) => Boolean(it.isDemoFixture));
        const eyebrow = allDemo ? 'INTERAKCJA DEMO · NIE ZDARZENIE' : 'GRUPA REKORDÓW ARCHIWUM';
        const title = allDemo
          ? `${itemsInGroup.length} punkty wzorcowe DEMO w Warszawie`
          : `${itemsInGroup.length} sprawy archiwum w tym obszarze`;

        // Sprawdzamy, czy punkty mają identyczne współrzędne
        let maxCoordDiff = 0;
        for (let i = 1; i < group.length; i++) {
          maxCoordDiff = Math.max(
            maxCoordDiff,
            Math.abs(group[i].coords.lat - group[0].coords.lat),
            Math.abs(group[i].coords.lng - group[0].coords.lng)
          );
        }
        const areIdenticalCoords = maxCoordDiff < 0.00018;
        const actionText =
          areIdenticalCoords || z >= 16
            ? 'Kliknij lub Enter → pokaż listę rekordów w tym miejscu'
            : 'Kliknij lub Enter → przybliż i rozdziel punkty';

        clusterNode.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'touch') {
            showTooltipForElement(clusterNode, eyebrow, title, actionText);
          }
        });
        clusterNode.addEventListener('pointerleave', hideTooltip);
        clusterNode.addEventListener('focus', () => {
          showTooltipForElement(clusterNode, eyebrow, title, actionText);
        });
        clusterNode.addEventListener('blur', hideTooltip);

        const expandCluster = (event) => {
          event.stopPropagation();
          hideTooltip();
          if ((areIdenticalCoords && map.getZoom() >= CLUSTER_ZOOM_THRESHOLD) || map.getZoom() >= 16) {
            openCoLocatedChooser(itemsInGroup);
            return;
          }
          const targetZoom = allDemo
            ? DEMO_CLUSTER_CENTER.zoomStreet
            : Math.max(CLUSTER_ZOOM_THRESHOLD + 2, Math.min(16, map.getZoom() + 5));
          if (areIdenticalCoords) {
            if (reducedMotionQuery.matches) {
              map.setView([avgLat, avgLng], targetZoom, { animate: false });
            } else {
              map.flyTo([avgLat, avgLng], targetZoom, { duration: 0.38 });
            }
            return;
          }
          const bounds = LRef.latLngBounds(group.map((g) => [g.coords.lat, g.coords.lng]));
          if (reducedMotionQuery.matches) {
            map.fitBounds(bounds, { padding: [48, 48], maxZoom: targetZoom, animate: false });
          } else {
            map.flyToBounds(bounds, {
              padding: [48, 48],
              maxZoom: targetZoom,
              duration: 0.38
            });
          }
        };

        clusterNode.addEventListener('click', expandCluster);
        clusterNode.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            expandCluster(event);
          }
        });

        const icon = LRef.divIcon({
          className: 'atlas-cluster-div-icon',
          html: clusterNode,
          iconSize: [56, 68],
          iconAnchor: [28, 28]
        });
        LRef.marker([avgLat, avgLng], {
          icon,
          keyboard: false,
          zIndexOffset: 500
        }).addTo(caseMarkerLayer);
      }
    }

    if (activeDomCaseId && !selectedCaseId && markerDomByCaseId.has(activeDomCaseId)) {
      markerDomByCaseId.get(activeDomCaseId)?.focus({ preventScroll: true });
    }
  }

  // Obsługa zmiany zoomu i przesunięcia mapy
  map.on('zoomend', () => {
    hideTooltip();
    syncTileLayerForZoom();
    renderRegionsLayer();
    renderHeatmapLayer();
    renderCasesAndDemoLayer();
  });

  map.on('moveend', () => {
    hideTooltip();
    updatePositionLabel();
    renderHeatmapLayer();
    renderCasesAndDemoLayer();
  });

  // Przyciski sterowania (+ / - / PL / Ponów kafle)
  zoomInBtn?.addEventListener('click', () => {
    map.zoomIn(1, { animate: !reducedMotionQuery.matches });
  });
  zoomOutBtn?.addEventListener('click', () => {
    map.zoomOut(1, { animate: !reducedMotionQuery.matches });
  });
  resetBtn?.addEventListener('click', () => {
    resetView();
  });
  retryTilesBtn?.addEventListener('click', () => {
    retryTiles();
  });

  // Kółko myszy: tylko z klawiszem Ctrl / Meta, aby nie przechwytywać przewijania strony
  const onWheel = (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (Math.abs(event.deltaY) > 4) {
        if (event.deltaY < 0) {
          map.zoomIn(1, { animate: !reducedMotionQuery.matches });
        } else {
          map.zoomOut(1, { animate: !reducedMotionQuery.matches });
        }
      }
    } else if (wheelHintEl) {
      wheelHintEl.hidden = false;
      if (wheelHintTimer) clearTimeout(wheelHintTimer);
      wheelHintTimer = setTimeout(() => {
        if (wheelHintEl) wheelHintEl.hidden = true;
      }, 1600);
    }
  };
  frameEl.addEventListener('wheel', onWheel, { passive: false });

  // Obsługa klawiatury na kontenerze mapy (+, -, Escape)
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      hideTooltip();
      if (coLocatedChooserEl && !coLocatedChooserEl.hidden) {
        coLocatedChooserEl.hidden = true;
        return;
      }
      if (typeof document !== 'undefined') {
        document.body.classList.remove('sheet-open', 'mobile-sheet-open', 'case-open');
      }
      if (latestView?.selectedCase || latestView?.selectedCaseId) {
        const prevId = latestView.selectedCase?.id || latestView.selectedCaseId || lastFocusedCaseId;
        handlers.onSelectCase?.(null);
        if (prevId && markerDomByCaseId.has(prevId)) {
          requestAnimationFrame(() => {
            markerDomByCaseId.get(prevId)?.focus({ preventScroll: true });
          });
        }
      }
      return;
    }

    if (event.target.closest('button, input, select')) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      map.zoomIn(1, { animate: !reducedMotionQuery.matches });
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      map.zoomOut(1, { animate: !reducedMotionQuery.matches });
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Asynchroniczne wczytanie lokalnego pliku granic województw
  (async function loadLocalBoundaries() {
    try {
      const response = await fetch(GEOJSON_LOCAL_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (isDestroyed) return;
      if (!json || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
        throw new Error('Invalid GeoJSON FeatureCollection');
      }
      geoJsonData = json;
      geometryFallbackActive = false;
      if (geoErrorBannerEl) geoErrorBannerEl.hidden = true;
      handlers.onGeometryStatus?.({ fallbackActive: false });
      renderRegionsLayer();
      renderHeatmapLayer();
      renderCasesAndDemoLayer(true);
    } catch {
      if (isDestroyed) return;
      geometryFallbackActive = true;
      if (geoErrorBannerEl) {
        geoErrorBannerEl.hidden = false;
        geoErrorBannerEl.textContent =
          'Granice województw są chwilowo niedostępne. Widoczne etykiety [TERYT] to wyłącznie indeksy województw, NIE miejsca zdarzeń.';
      }
      handlers.onGeometryStatus?.({ fallbackActive: true });
      renderRegionsLayer();
      renderHeatmapLayer();
      renderCasesAndDemoLayer(true);
    }
  })();

  function moveCamera(latLng, targetZoom) {
    if (reducedMotionQuery.matches) {
      map.setView(latLng, targetZoom, { animate: false });
    } else {
      map.flyTo(latLng, targetZoom, { duration: 0.38 });
    }
  }

  function focusArea(areaId) {
    if (!areaId) return;
    const code = String(areaId).padStart(2, '0');
    if (geoLayer) {
      let matchedBounds = null;
      geoLayer.eachLayer((layer) => {
        const layerCode = String(
          layer.feature?.properties?.JPT_KOD_JE ?? layer.feature?.properties?.teryt ?? ''
        ).padStart(2, '0');
        if (layerCode === code && typeof layer.getBounds === 'function') {
          matchedBounds = layer.getBounds();
        }
      });
      if (matchedBounds) {
        if (reducedMotionQuery.matches) {
          map.fitBounds(matchedBounds, { padding: [24, 24], maxZoom: 8, animate: false });
        } else {
          map.flyToBounds(matchedBounds, { padding: [24, 24], maxZoom: 8, duration: 0.38 });
        }
        return;
      }
    }
    const row = latestView?.rows?.find((r) => String(r.areaId || r.teryt).padStart(2, '0') === code);
    if (row && typeof row.lat === 'number' && typeof row.lng === 'number') {
      moveCamera([row.lat, row.lng], 8);
    }
  }

  function focusCase(caseIdOrRecord) {
    if (!caseIdOrRecord) return;
    let record = typeof caseIdOrRecord === 'object' ? caseIdOrRecord : null;
    if (!record && typeof caseIdOrRecord === 'string') {
      record =
        getDemoFixtureById(caseIdOrRecord) ||
        latestView?.publishedCases?.find((c) => c.id === caseIdOrRecord) ||
        latestView?.demoMarkers?.find((d) => d.id === caseIdOrRecord) ||
        null;
    }
    if (!record) return;
    const coords = getItemLatLng(record);
    if (!coords) return;

    const precision = record.published_location?.precision || record.location?.precision || 'municipality';
    const targetZoom =
      record.location?.targetZoom ||
      (precision === 'exact_public_place'
        ? 17
        : precision === 'street_segment'
          ? 16
          : precision === 'district'
            ? 14
            : 12);

    moveCamera([coords.lat, coords.lng], targetZoom);
  }

  function focusDemoCluster() {
    const center = map.getCenter();
    const alreadyAtTarget =
      map.getZoom() === DEMO_CLUSTER_CENTER.zoomStreet &&
      Math.abs(center.lat - DEMO_CLUSTER_CENTER.lat) < 0.0005 &&
      Math.abs(center.lng - DEMO_CLUSTER_CENTER.lng) < 0.0005;

    const focusFirstDemoNode = () => {
      renderCasesAndDemoLayer();
      requestAnimationFrame(() => {
        const firstDemo = markerDomByCaseId.get('DEMO-A');
        firstDemo?.focus({ preventScroll: true });
      });
    };

    if (reducedMotionQuery.matches || alreadyAtTarget) {
      moveCamera([DEMO_CLUSTER_CENTER.lat, DEMO_CLUSTER_CENTER.lng], DEMO_CLUSTER_CENTER.zoomStreet);
      focusFirstDemoNode();
    } else {
      map.once('moveend', focusFirstDemoNode);
      moveCamera([DEMO_CLUSTER_CENTER.lat, DEMO_CLUSTER_CENTER.lng], DEMO_CLUSTER_CENTER.zoomStreet);
    }
  }

  function resetView() {
    hideTooltip();
    if (coLocatedChooserEl) coLocatedChooserEl.hidden = true;
    map.invalidateSize({ animate: false });
    if (geoLayer && typeof geoLayer.getBounds === 'function' && (canvasEl.clientWidth || 800) >= 500) {
      const bounds = geoLayer.getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [4, 4],
          maxZoom: STREET_ZOOM_THRESHOLD - 1,
          animate: !reducedMotionQuery.matches
        });
        return;
      }
    }
    moveCamera(COUNTRY_CENTER, COUNTRY_ZOOM);
  }

  function retryTiles() {
    tileErrorCountInCycle = 0;
    tileErrorActive = false;
    if (tileErrorBannerEl) tileErrorBannerEl.hidden = true;
    handlers.onTileStatus?.({ hasError: false });
    if (!tileLayer || !tileLayerAttached) {
      syncTileLayerForZoom();
    }
    if (tileLayer && tileLayerAttached && typeof tileLayer.redraw === 'function') {
      tileLayer.redraw();
    }
  }

  function getDiagnostics() {
    let approximateAreaCircleCount = 0;
    if (caseGeometryLayer && typeof caseGeometryLayer.eachLayer === 'function') {
      caseGeometryLayer.eachLayer(layer => {
        if (layer?.options?.className === 'approximate-area-circle') {
          approximateAreaCircleCount += 1;
        }
      });
    }
    return {
      zoom: map.getZoom(),
      minZoom: map.getMinZoom(),
      maxZoom: map.getMaxZoom(),
      tileLayerAttached,
      tileLayerMounted: tileLayerAttached,
      tileErrorActive,
      layers: latestView?.layers || { regions: true, heatmap: true, pins: true },
      heatmapPointCount: Number(heatmapCanvas?.dataset?.pointCount || 0),
      heatmapTotalCasePoints: Number(heatmapCanvas?.dataset?.totalCasePoints || 0),
      heatmapCoarseFilteredCount: Number(heatmapCanvas?.dataset?.coarseFilteredCount || 0),
      heatmapStreetPrecisionOnly: heatmapCanvas?.dataset?.streetPrecisionOnly === 'true',
      heatmapDrawnPointCount: Number(heatmapCanvas?.dataset?.drawnPointCount || 0),
      approximateAreaCircleCount,
      markerCount: markerDomByCaseId.size
    };
  }

  function update(view) {
    const prevSelectedCaseId =
      latestView?.selectedCase?.id ||
      (typeof latestView?.selectedCaseId === 'string' ? latestView.selectedCaseId : null);
    latestView = view;
    const nextSelectedCaseId =
      view?.selectedCase?.id || (typeof view?.selectedCaseId === 'string' ? view.selectedCaseId : null);

    if (nextSelectedCaseId) {
      hideTooltip();
    }

    syncTileLayerForZoom();
    renderRegionsLayer();
    renderHeatmapLayer();
    renderCasesAndDemoLayer();

    // Po zamknięciu dossier sprawy przywróć fokus klawiatury do znacznika na mapie
    if (prevSelectedCaseId && !nextSelectedCaseId) {
      requestAnimationFrame(() => {
        const targetNode = markerDomByCaseId.get(prevSelectedCaseId);
        if (targetNode) {
          targetNode.focus({ preventScroll: true });
        } else {
          frameEl.focus({ preventScroll: true });
        }
      });
    }
  }

  function destroy() {
    isDestroyed = true;
    if (wheelHintTimer) clearTimeout(wheelHintTimer);
    frameEl.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
    map.remove();
  }

  syncTileLayerForZoom();
  renderHeatmapLayer();

  return {
    update,
    focusArea,
    flyToArea: focusArea,
    focusCase,
    focusCaseLocation: focusCase,
    focusDemoCluster,
    resetView,
    resetCountryView: resetView,
    retryTiles,
    setZoom(z) {
      map.setZoom(z, { animate: false });
    },
    setView(latLng, z) {
      map.setView(latLng, z, { animate: false });
    },
    getZoom() {
      return map.getZoom();
    },
    getDiagnostics,
    getMapDiagnostics: getDiagnostics,
    destroy
  };
}
