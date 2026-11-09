import { TERYT_CODES, isValidHttpsUrl } from '../validation.mjs';

export const SUPPORTED_METRIC_OPTIONS = new Set([
  'police_article_148_recorded_acts',
  'police_article_148_rate_per_100k',
  'gus_intentional_homicide_victims'
]);

export const DEMO_CASE_IDS = new Set(['DEMO-A', 'DEMO-B', 'DEMO-C']);

export const VALID_MAP_LAYERS = new Set(['regions', 'heatmap', 'pins']);

export const VALID_CASE_OUTCOME_FILTERS = new Set(['all', 'death', 'attempted']);

/**
 * Validates that a URL is a safe HTTPS URL without embedded credentials.
 * Returns the normalized URL string if valid, or null if unsafe/malformed.
 *
 * @param {unknown} url
 * @returns {string | null}
 */
export function validateHttpsUrl(url) {
  if (!isValidHttpsUrl(url)) return null;
  try {
    return new URL(String(url)).toString();
  } catch {
    return null;
  }
}

/**
 * Parses URL search parameters into a partial state override object.
 *
 * @param {string} [searchString='']
 * @param {{ validCaseIds?: Set<string>, minYear?: number, maxYear?: number }} [options={}]
 * @returns {Partial<import('./state.mjs').AppState>}
 */
export function parseUrlState(searchString = '', options = {}) {
  if (
    searchString &&
    typeof searchString === 'object' &&
    !(searchString instanceof URLSearchParams)
  ) {
    const synth = new URLSearchParams();
    if (searchString.mode) synth.set('mode', String(searchString.mode));
    const metricVal =
      searchString.metric ||
      searchString.selectedMetricOption ||
      (searchString.displayType === 'rate_per_100k'
        ? 'police_article_148_rate_per_100k'
        : searchString.metricId);
    if (metricVal) synth.set('metric', String(metricVal));
    if (searchString.year !== undefined && searchString.year !== null) {
      synth.set('year', String(searchString.year));
    }
    const areaVal = searchString.area || searchString.selectedAreaId;
    if (areaVal) synth.set('area', String(areaVal));
    const cmpVal = searchString.compare ?? searchString.compareAreaIds ?? searchString.compareAreas;
    if (Array.isArray(cmpVal)) {
      synth.set('compare', cmpVal.join(','));
    } else if (typeof cmpVal === 'string') {
      synth.set('compare', cmpVal);
    }
    const demoVal = searchString.demo ?? searchString.demoFixturesEnabled;
    if (demoVal !== undefined && demoVal !== null) {
      synth.set('demo', demoVal === true || demoVal === '1' || demoVal === 'true' ? '1' : '0');
    }
    const caseVal = searchString.case ?? searchString.selectedCaseId;
    if (caseVal) synth.set('case', String(caseVal));
    const outcomeVal = searchString.outcome ?? searchString.caseOutcomeFilter;
    if (outcomeVal) synth.set('outcome', String(outcomeVal));
    if (typeof searchString.layers === 'string') {
      synth.set('layers', searchString.layers);
    }
    const parsedFromObj = parseUrlState(synth.toString(), options);
    if (searchString.layers && typeof searchString.layers === 'object') {
      parsedFromObj.layers = {
        regions: searchString.layers.regions !== false,
        heatmap: searchString.layers.heatmap !== false,
        pins: searchString.layers.pins !== false
      };
    }
    if (typeof searchString.searchQuery === 'string') {
      parsedFromObj.searchQuery = searchString.searchQuery;
    }
    if (typeof searchString.tableFilter === 'string') {
      parsedFromObj.tableFilter = searchString.tableFilter;
    }
    if (searchString.tableSort && typeof searchString.tableSort === 'object') {
      parsedFromObj.tableSort = searchString.tableSort;
    }
    if (typeof searchString.includeUnreviewedPreview === 'boolean') {
      parsedFromObj.includeUnreviewedPreview = searchString.includeUnreviewedPreview;
    }
    return parsedFromObj;
  }

  const raw = typeof searchString === 'string' ? searchString.replace(/^\?/, '') : '';
  const params = new URLSearchParams(raw);
  const result = {};

  const minYear = options.minYear ?? 1999;
  const maxYear = options.maxYear ?? 2030;

  // 1. mode
  const rawMode = params.get('mode');
  if (rawMode === 'cases') {
    result.mode = 'cases';
  } else if (rawMode === 'atlas' || rawMode === 'stats') {
    result.mode = 'atlas';
  }

  // 2. metric
  const rawMetric = params.get('metric');
  if (rawMetric) {
    const metricAliases = {
      rate: 'police_article_148_rate_per_100k',
      rate_per_100k: 'police_article_148_rate_per_100k',
      police_article_148_rate_100k: 'police_article_148_rate_per_100k',
      police_recorded_homicides_rate: 'police_article_148_rate_per_100k',
      count: 'police_article_148_recorded_acts',
      police_recorded_homicides: 'police_article_148_recorded_acts',
      kgp_homicide_stated: 'police_article_148_recorded_acts',
      kgp_homicide_detected: 'police_article_148_recorded_acts',
      gus: 'gus_intentional_homicide_victims',
      gus_homicide_victims: 'gus_intentional_homicide_victims',
      gus_vitc_homicide_victims: 'gus_intentional_homicide_victims'
    };
    const normalizedMetric = metricAliases[rawMetric] || rawMetric;
    if (SUPPORTED_METRIC_OPTIONS.has(normalizedMetric)) {
      result.selectedMetricOption = normalizedMetric;
      if (normalizedMetric === 'police_article_148_rate_per_100k') {
        result.metricId = 'police_article_148_recorded_acts';
        result.displayType = 'rate_per_100k';
      } else {
        result.metricId = normalizedMetric;
        result.displayType = 'count';
      }
    }
  }

  // 3. year (or Polish alias 'rok')
  const rawYear = params.get('year') ?? params.get('rok');
  if (rawYear !== null && /^\d{4}$/.test(rawYear)) {
    const parsedYear = Number(rawYear);
    if (parsedYear >= minYear && parsedYear <= maxYear) {
      result.year = parsedYear;
    }
  }

  // 4. area
  const rawArea = params.get('area');
  if (rawArea) {
    const cleanedArea = rawArea.trim().replace(/^PL-/i, '');
    const padded = cleanedArea.toUpperCase() === 'PL' ? 'PL' : cleanedArea.padStart(2, '0');
    if (padded === 'PL' || TERYT_CODES.has(padded)) {
      result.selectedAreaId = padded === 'PL' ? '14' : padded;
    }
  }

  // 5. compare (up to 3 unique TERYT codes)
  const rawCompare = params.get('compare');
  if (rawCompare !== null) {
    if (rawCompare.trim() === '') {
      result.compareAreaIds = [];
    } else {
      const codes = [];
      for (const part of rawCompare.split(',')) {
        const cleaned = part.trim().replace(/^PL-/i, '');
        const code = cleaned.padStart(2, '0');
        if (TERYT_CODES.has(code) && !codes.includes(code) && codes.length < 3) {
          codes.push(code);
        }
      }
      result.compareAreaIds = codes;
    }
  }

  // 6. demo (1|0)
  const rawDemo = params.get('demo');
  if (rawDemo === '1' || rawDemo === 'true') {
    result.demoFixturesEnabled = true;
  } else if (rawDemo === '0' || rawDemo === 'false') {
    result.demoFixturesEnabled = false;
  }

  // 7. case
  const rawCase = params.get('case');
  if (rawCase) {
    const normalizedDemo =
      rawCase === 'A' || rawCase === 'B' || rawCase === 'C' ? `DEMO-${rawCase}` : rawCase;
    if (DEMO_CASE_IDS.has(normalizedDemo)) {
      result.selectedCaseId = normalizedDemo;
      // Shared DEMO case links automatically enable DEMO fixtures so they always resolve
      result.demoFixturesEnabled = true;
    } else if (
      typeof rawCase === 'string' &&
      rawCase.length >= 5 &&
      /^[a-zA-Z0-9_-]+$/.test(rawCase) &&
      (!options.validCaseIds || options.validCaseIds.has(rawCase))
    ) {
      result.selectedCaseId = rawCase;
    }
  }

  // 8. outcome filter ('all' | 'death' | 'attempted')
  const rawOutcome = params.get('outcome');
  if (rawOutcome !== null) {
    const normOutcome = rawOutcome.trim().toLowerCase();
    if (normOutcome === 'death' || normOutcome === 'completed' || normOutcome === 'completed_homicide') {
      result.caseOutcomeFilter = 'death';
    } else if (normOutcome === 'attempted' || normOutcome === 'attempted_homicide') {
      result.caseOutcomeFilter = 'attempted';
    } else if (normOutcome === 'all') {
      result.caseOutcomeFilter = 'all';
    }
  }

  // 9. layers (optional: 'regions,heatmap,pins' | 'none' | 'all')
  const rawLayers = params.get('layers');
  if (rawLayers !== null) {
    const trimmed = rawLayers.trim().toLowerCase();
    if (trimmed === 'none' || trimmed === '0') {
      result.layers = { regions: false, heatmap: false, pins: false };
    } else if (trimmed === 'all' || trimmed === '1') {
      result.layers = { regions: true, heatmap: true, pins: true };
    } else if (trimmed.length > 0) {
      const parts = trimmed
        .split(',')
        .map(s => s.trim())
        .filter(s => VALID_MAP_LAYERS.has(s));
      if (parts.length > 0) {
        const activeSet = new Set(parts);
        result.layers = {
          regions: activeSet.has('regions'),
          heatmap: activeSet.has('heatmap'),
          pins: activeSet.has('pins')
        };
      }
    }
  }

  return result;
}

/**
 * Serializes the relevant exploration state into a URL query string (starting with '?').
 *
 * @param {import('./state.mjs').AppState} state
 * @returns {string}
 */
export function serializeUrlState(state) {
  const params = new URLSearchParams();

  if (state.mode === 'cases') {
    params.set('mode', 'cases');
  }

  const metricOption =
    state.selectedMetricOption ||
    (state.displayType === 'rate_per_100k' ? 'police_article_148_rate_per_100k' : state.metricId);
  if (metricOption) {
    params.set('metric', metricOption);
  }

  if (Number.isInteger(state.year)) {
    params.set('year', String(state.year));
  }

  if (state.selectedAreaId) {
    params.set('area', state.selectedAreaId);
  }

  if (Array.isArray(state.compareAreaIds) && state.compareAreaIds.length > 0) {
    params.set('compare', state.compareAreaIds.slice(0, 3).join(','));
  }

  if (state.selectedCaseId) {
    params.set('case', state.selectedCaseId);
  }

  if (state.caseOutcomeFilter === 'death' || state.caseOutcomeFilter === 'attempted') {
    params.set('outcome', state.caseOutcomeFilter);
  }

  if (state.demoFixturesEnabled || (state.selectedCaseId && state.selectedCaseId.startsWith('DEMO-'))) {
    params.set('demo', '1');
  }

  if (state.layers && typeof state.layers === 'object') {
    const r = state.layers.regions !== false;
    const h = state.layers.heatmap !== false;
    const p = state.layers.pins !== false;
    if (!r || !h || !p) {
      const active = [];
      if (r) active.push('regions');
      if (h) active.push('heatmap');
      if (p) active.push('pins');
      params.set('layers', active.length > 0 ? active.join(',') : 'none');
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Synchronizes browser history and Back/Forward navigation with the store.
 *
 * @param {{ getState: () => import('./state.mjs').AppState, dispatch: (action: Object) => void }} store
 * @param {Window} [win=globalThis.window]
 * @returns {{ syncUrl: (state: import('./state.mjs').AppState, opts?: { replace?: boolean }) => void, destroy: () => void }}
 */
export function bindUrlNavigation(store, win = globalThis.window) {
  if (!win || !win.history || !win.location) {
    return {
      syncUrl() {},
      destroy() {}
    };
  }

  let isHandlingPopState = false;

  function syncUrl(state, opts = {}) {
    if (isHandlingPopState) return;
    const nextSearch = serializeUrlState(state);
    const currentHash = win.location.hash || '';
    const nextUrl = `${win.location.pathname}${nextSearch}${currentHash}`;
    const currentUrl = `${win.location.pathname}${win.location.search}${currentHash}`;
    if (nextUrl === currentUrl) return;
    if (opts.replace) {
      win.history.replaceState(null, '', nextUrl);
    } else {
      win.history.pushState(null, '', nextUrl);
    }
  }

  function onPopState() {
    isHandlingPopState = true;
    try {
      const parsed = parseUrlState(win.location.search);
      store.dispatch({
        type: 'RESTORE_URL_STATE',
        urlState: {
          mode: parsed.mode ?? 'atlas',
          selectedMetricOption: parsed.selectedMetricOption ?? 'police_article_148_recorded_acts',
          metricId: parsed.metricId ?? 'police_article_148_recorded_acts',
          displayType: parsed.displayType ?? 'count',
          year: parsed.year,
          selectedAreaId: parsed.selectedAreaId,
          compareAreaIds: parsed.compareAreaIds ?? [],
          selectedCaseId: parsed.selectedCaseId ?? null,
          caseOutcomeFilter: parsed.caseOutcomeFilter ?? 'all',
          demoFixturesEnabled: parsed.demoFixturesEnabled ?? false,
          layers: parsed.layers
        }
      });
    } finally {
      isHandlingPopState = false;
    }
  }

  win.addEventListener('popstate', onPopState);
  syncUrl(store.getState(), { replace: true });

  const unsubscribe =
    typeof store.subscribe === 'function'
      ? store.subscribe((firstArg, secondArg, action) => {
          if (isHandlingPopState || action?.type === 'RESTORE_URL_STATE') return;
          const nextState =
            secondArg && typeof secondArg === 'object' && 'selectedAreaId' in secondArg
              ? secondArg
              : firstArg && typeof firstArg === 'object' && 'selectedAreaId' in firstArg
                ? firstArg
                : store.getState();
          const shouldReplace = Boolean(action?.replaceUrl);
          syncUrl(nextState, { replace: shouldReplace });
        })
      : null;

  function destroy() {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
    win.removeEventListener('popstate', onPopState);
  }
  destroy.destroy = destroy;
  destroy.unbind = destroy;
  destroy.syncUrl = syncUrl;
  return destroy;
}
