import { TERYT_CODES } from '../validation.mjs';
import { deepFreeze, computeRatePer100k, DEFAULT_BOUNDARY_VERSION } from './adapter.mjs';
import {
  parseUrlState,
  SUPPORTED_METRIC_OPTIONS,
  DEMO_CASE_IDS,
  VALID_MAP_LAYERS,
  VALID_CASE_OUTCOME_FILTERS
} from './url.mjs';
import { DEMO_FIXTURES, getDemoFixtureById } from '../map/demo-fixtures.mjs';

const SEQUENTIAL_SCALE_COLORS = ['#202d29', '#2e423b', '#3f5a50', '#547568', '#6e9484'];

export const DEFAULT_MAP_LAYERS = deepFreeze({
  regions: true,
  heatmap: true,
  pins: true
});

function normalizeLayers(raw, fallback = DEFAULT_MAP_LAYERS) {
  if (!raw || typeof raw !== 'object') {
    return {
      regions: fallback.regions !== false,
      heatmap: fallback.heatmap !== false,
      pins: fallback.pins !== false
    };
  }
  return {
    regions: typeof raw.regions === 'boolean' ? raw.regions : fallback.regions !== false,
    heatmap: typeof raw.heatmap === 'boolean' ? raw.heatmap : fallback.heatmap !== false,
    pins: typeof raw.pins === 'boolean' ? raw.pins : fallback.pins !== false
  };
}

function classifyValue(value, breaks) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return i;
  }
  return Math.max(0, breaks.length - 1);
}

function buildLegend(breaks, isRate = false) {
  const classes = breaks.map((upper, idx) => {
    const prev = idx === 0 ? 0 : breaks[idx - 1];
    const min = idx === 0 ? 0 : isRate ? Number((prev + 0.01).toFixed(2)) : prev + 1;
    const max = upper;
    const isLast = idx === breaks.length - 1;
    const label = isRate
      ? isLast
        ? `${min.toFixed(2).replace('.', ',')}+`
        : `${min.toFixed(2).replace('.', ',')}–${max.toFixed(2).replace('.', ',')}`
      : isLast
        ? `${min}+`
        : `${min}–${max}`;
    return {
      index: idx,
      min,
      max,
      label,
      color: SEQUENTIAL_SCALE_COLORS[idx] || SEQUENTIAL_SCALE_COLORS[SEQUENTIAL_SCALE_COLORS.length - 1]
    };
  });
  return {
    breaks,
    classes,
    missingLabel: 'Brak w zbiorze (kreskowanie ≠ 0)',
    unreviewedLabel: 'Wpis wtórny · do weryfikacji (obrys przerywany)'
  };
}

/**
 * Extracts the 4-digit calendar year from a case record (supporting 'YYYY', 'YYYY-MM', and 'YYYY-MM-DD').
 *
 * @param {Object|null|undefined} c
 * @returns {number|null}
 */
export function getCaseYear(c) {
  if (!c || typeof c !== 'object') return null;
  if (Number.isInteger(c.year) && c.year >= 1900 && c.year <= 2100) return c.year;
  const match = /^(\d{4})\b/.exec(String(c.occurred_on ?? ''));
  return match ? Number(match[1]) : null;
}

/**
 * Creates the initial immutable AppState from the adapted dataset and optional URL query string.
 *
 * @param {Object} dataset - Adapted AtlasDataset from adaptDataset()
 * @param {string} [initialUrlSearch='']
 * @returns {Object} Deeply frozen AppState
 */
export function createInitialState(dataset, initialUrlSearch = '') {
  const validCaseIds = new Set((dataset?.cases || []).map(c => c.id));
  const parsedUrl = parseUrlState(initialUrlSearch, { validCaseIds });
  const defaultDemoEnabled =
    parsedUrl.demoFixturesEnabled !== undefined ? parsedUrl.demoFixturesEnabled : false;

  const selectedMetricOption =
    parsedUrl.selectedMetricOption ?? dataset?.release?.defaultMetricId ?? 'police_article_148_recorded_acts';
  let initialYear = parsedUrl.year ?? dataset?.release?.defaultYear ?? 2025;
  let initialAreaId = parsedUrl.selectedAreaId ?? '14';
  let initialCaseId = parsedUrl.selectedCaseId ?? null;
  let initialOutcomeFilter = VALID_CASE_OUTCOME_FILTERS.has(parsedUrl.caseOutcomeFilter)
    ? parsedUrl.caseOutcomeFilter
    : 'all';

  if (initialCaseId && !initialCaseId.startsWith('DEMO-')) {
    const matchedRealCase = (dataset?.cases || []).find(c => c.id === initialCaseId) || null;
    if (matchedRealCase) {
      const caseYr = getCaseYear(matchedRealCase);
      if (parsedUrl.year === undefined && Number.isInteger(caseYr) && caseYr >= 1999 && caseYr <= 2030) {
        initialYear = caseYr;
      } else if (parsedUrl.year !== undefined && caseYr !== initialYear) {
        initialCaseId = null;
      }
      if (
        initialCaseId &&
        initialOutcomeFilter !== 'all' &&
        (matchedRealCase.outcome || 'death') !== initialOutcomeFilter
      ) {
        if (parsedUrl.caseOutcomeFilter === undefined) {
          initialOutcomeFilter = 'all';
        } else {
          initialCaseId = null;
        }
      }
      if (
        initialCaseId &&
        parsedUrl.selectedAreaId === undefined &&
        TERYT_CODES.has(matchedRealCase.voivodeship_teryt)
      ) {
        initialAreaId = matchedRealCase.voivodeship_teryt;
      }
    }
  }

  if (
    parsedUrl.year === undefined &&
    selectedMetricOption === 'gus_intentional_homicide_victims'
  ) {
    const gusYears = getAvailableYearsForSeries(
      dataset,
      'gus_homicide_victims_national',
      'gus_homicide_victims_regional'
    );
    if (gusYears.length > 0 && !gusYears.includes(initialYear)) {
      initialYear = gusYears[gusYears.length - 1];
    }
  }

  return deepFreeze({
    mode: parsedUrl.mode ?? 'atlas',
    metricId: parsedUrl.metricId ?? dataset?.release?.defaultMetricId ?? 'police_article_148_recorded_acts',
    selectedMetricOption,
    displayType: parsedUrl.displayType ?? 'count',
    year: initialYear,
    selectedAreaId: initialAreaId,
    compareAreaIds: parsedUrl.compareAreaIds ?? [],
    selectedCaseId: initialCaseId,
    caseOutcomeFilter: initialOutcomeFilter,
    layers: normalizeLayers(parsedUrl.layers, DEFAULT_MAP_LAYERS),
    includeUnreviewedPreview: parsedUrl.includeUnreviewedPreview ?? true,
    demoFixturesEnabled: defaultDemoEnabled,
    searchQuery: parsedUrl.searchQuery ?? '',
    tableFilter: ['all', 'observed', 'missing'].includes(parsedUrl.tableFilter)
      ? parsedUrl.tableFilter
      : 'all',
    tableSort:
      parsedUrl.tableSort &&
      ['name', 'teryt', 'value'].includes(parsedUrl.tableSort.key) &&
      ['asc', 'desc'].includes(parsedUrl.tableSort.dir)
        ? { key: parsedUrl.tableSort.key, dir: parsedUrl.tableSort.dir }
        : { key: 'name', dir: 'asc' },
    compareLimitNoticePl: null,
    loadState: 'ready',
    errorMessage: null,
    geometryFallbackActive: false,
    tileLayerError: false
  });
}

function getAvailableYearsForSeries(
  dataset,
  nationalSeriesId,
  regionalSeriesId,
  includeCaseYears = false
) {
  const years = new Set();
  for (const obs of dataset.observations) {
    if (
      (obs.seriesId === nationalSeriesId || obs.seriesId === regionalSeriesId) &&
      obs.availability === 'observed'
    ) {
      years.add(obs.period);
    }
  }
  if (includeCaseYears && Array.isArray(dataset.cases)) {
    for (const c of dataset.cases) {
      const cy = getCaseYear(c);
      if (Number.isInteger(cy) && cy >= 1999 && cy <= 2030) {
        years.add(cy);
      }
    }
  }
  const sorted = Array.from(years).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : [2024, 2025];
}

/**
 * Pure state reducer returning a deeply frozen next AppState.
 *
 * @param {Object} state
 * @param {Object} action
 * @param {Object} dataset
 * @returns {Object}
 */
export function reduceState(state, action, dataset) {
  if (!action || typeof action.type !== 'string') return state;

  switch (action.type) {
    case 'SET_MODE': {
      const mode = action.mode === 'cases' ? 'cases' : 'atlas';
      return deepFreeze({ ...state, mode });
    }

    case 'TOGGLE_MAP_LAYER': {
      const layerKey = String(action.layer || '').trim();
      if (!VALID_MAP_LAYERS.has(layerKey)) return state;
      const currentLayers = state.layers || DEFAULT_MAP_LAYERS;
      const nextEnabled =
        typeof action.enabled === 'boolean' ? action.enabled : !currentLayers[layerKey];
      return deepFreeze({
        ...state,
        layers: {
          ...currentLayers,
          [layerKey]: nextEnabled
        }
      });
    }

    case 'SET_MAP_LAYERS': {
      const raw = action.layers ?? action;
      const currentLayers = state.layers || DEFAULT_MAP_LAYERS;
      return deepFreeze({
        ...state,
        layers: normalizeLayers(raw, currentLayers)
      });
    }

    case 'SET_CASE_OUTCOME_FILTER': {
      const rawFilter = String(action.outcomeFilter ?? action.filter ?? action.outcome ?? 'all').trim().toLowerCase();
      const nextFilter =
        rawFilter === 'death' || rawFilter === 'completed' || rawFilter === 'completed_homicide'
          ? 'death'
          : rawFilter === 'attempted' || rawFilter === 'attempted_homicide'
            ? 'attempted'
            : 'all';
      if (nextFilter === state.caseOutcomeFilter) return state;
      const currentRealCase =
        state.selectedCaseId && !state.selectedCaseId.startsWith('DEMO-')
          ? (dataset?.cases || []).find(c => c.id === state.selectedCaseId) || null
          : null;
      const keepSelectedCase =
        !currentRealCase ||
        nextFilter === 'all' ||
        (currentRealCase.outcome || 'death') === nextFilter;
      return deepFreeze({
        ...state,
        caseOutcomeFilter: nextFilter,
        selectedCaseId: keepSelectedCase ? state.selectedCaseId : null
      });
    }

    case 'SET_METRIC': {
      const rawOption = action.optionId || action.metric || action.metricId || state.selectedMetricOption;
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
      const normalized = metricAliases[rawOption] || rawOption;
      if (!SUPPORTED_METRIC_OPTIONS.has(normalized)) return state;
      const isRate = normalized === 'police_article_148_rate_per_100k' || action.displayType === 'rate_per_100k';
      const metricId =
        normalized === 'police_article_148_rate_per_100k'
          ? 'police_article_148_recorded_acts'
          : normalized;

      let nextYear = state.year;
      if (normalized === 'gus_intentional_homicide_victims' && !action.preserveYear) {
        const gusYears = getAvailableYearsForSeries(
          dataset,
          'gus_homicide_victims_national',
          'gus_homicide_victims_regional'
        );
        if (gusYears.length > 0 && !gusYears.includes(state.year)) {
          nextYear =
            state.year > gusYears[gusYears.length - 1]
              ? gusYears[gusYears.length - 1]
              : state.year < gusYears[0]
                ? gusYears[0]
                : gusYears[gusYears.length - 1];
        }
      }

      return deepFreeze({
        ...state,
        selectedMetricOption: normalized,
        metricId,
        displayType: isRate ? 'rate_per_100k' : 'count',
        year: nextYear
      });
    }

    case 'SET_YEAR': {
      const year = Number(action.year);
      if (!Number.isInteger(year) || year < 1999 || year > 2030) return state;
      const currentRealCase =
        state.selectedCaseId && !state.selectedCaseId.startsWith('DEMO-')
          ? (dataset?.cases || []).find(c => c.id === state.selectedCaseId) || null
          : null;
      const keepSelectedCase = !currentRealCase || getCaseYear(currentRealCase) === year;
      return deepFreeze({
        ...state,
        year,
        selectedCaseId: keepSelectedCase ? state.selectedCaseId : null
      });
    }

    case 'STEP_YEAR': {
      const delta = Number(action.delta) >= 0 ? 1 : -1;
      const isGus = state.selectedMetricOption === 'gus_intentional_homicide_victims';
      const availableYears = getAvailableYearsForSeries(
        dataset,
        isGus ? 'gus_homicide_victims_national' : 'kgp_art148_national_official',
        isGus ? 'gus_homicide_victims_regional' : 'kgp_art148_regional',
        !isGus
      );
      const idx = availableYears.indexOf(state.year);
      let nextYear = state.year;
      if (idx === -1) {
        nextYear = delta > 0 ? availableYears[availableYears.length - 1] : availableYears[0];
      } else {
        const nextIdx = Math.max(0, Math.min(availableYears.length - 1, idx + delta));
        nextYear = availableYears[nextIdx];
      }
      const currentRealCase =
        state.selectedCaseId && !state.selectedCaseId.startsWith('DEMO-')
          ? (dataset?.cases || []).find(c => c.id === state.selectedCaseId) || null
          : null;
      const keepSelectedCase = !currentRealCase || getCaseYear(currentRealCase) === nextYear;
      return deepFreeze({
        ...state,
        year: nextYear,
        selectedCaseId: keepSelectedCase ? state.selectedCaseId : null
      });
    }

    case 'SELECT_AREA': {
      const cleaned = String(action.areaId ?? action.teryt ?? '').trim().replace(/^PL-/i, '');
      const raw = cleaned.padStart(2, '0');
      if (!TERYT_CODES.has(raw)) return state;
      return deepFreeze({
        ...state,
        selectedAreaId: raw,
        selectedCaseId: action.keepCaseOpen ? state.selectedCaseId : null
      });
    }

    case 'TOGGLE_COMPARE_AREA': {
      const cleaned = String(action.areaId ?? action.teryt ?? '').trim().replace(/^PL-/i, '');
      const code = cleaned.padStart(2, '0');
      if (!TERYT_CODES.has(code)) return state;
      const existing = state.compareAreaIds;
      if (existing.includes(code)) {
        return deepFreeze({
          ...state,
          compareAreaIds: existing.filter(id => id !== code),
          compareLimitNoticePl: null
        });
      }
      if (existing.length >= 3) {
        return deepFreeze({
          ...state,
          compareLimitNoticePl:
            'Porównanie obejmuje maksymalnie 3 obszary jednocześnie, aby zachować czytelność wspólnej osi.'
        });
      }
      return deepFreeze({
        ...state,
        compareAreaIds: [...existing, code],
        compareLimitNoticePl: null
      });
    }

    case 'CLEAR_COMPARE': {
      return deepFreeze({
        ...state,
        compareAreaIds: [],
        compareLimitNoticePl: null
      });
    }

    case 'SELECT_CASE': {
      const caseId = action.caseId ?? null;
      if (caseId === null) {
        return deepFreeze({
          ...state,
          selectedCaseId: null
        });
      }
      const normalizedDemo =
        caseId === 'A' || caseId === 'B' || caseId === 'C' ? `DEMO-${caseId}` : String(caseId);
      const isDemo = DEMO_CASE_IDS.has(normalizedDemo);
      const matchedRealCase = (dataset?.cases || []).find(c => c.id === normalizedDemo) || null;
      if (!isDemo && !matchedRealCase) return state;
      const caseYr = matchedRealCase ? getCaseYear(matchedRealCase) : null;
      const nextYear =
        Number.isInteger(caseYr) && caseYr >= 1999 && caseYr <= 2030 ? caseYr : state.year;
      const nextAreaId =
        matchedRealCase && TERYT_CODES.has(matchedRealCase.voivodeship_teryt)
          ? matchedRealCase.voivodeship_teryt
          : state.selectedAreaId;
      const nextOutcomeFilter =
        matchedRealCase &&
        state.caseOutcomeFilter &&
        state.caseOutcomeFilter !== 'all' &&
        (matchedRealCase.outcome || 'death') !== state.caseOutcomeFilter
          ? 'all'
          : state.caseOutcomeFilter || 'all';
      return deepFreeze({
        ...state,
        year: nextYear,
        selectedAreaId: nextAreaId,
        selectedCaseId: normalizedDemo,
        caseOutcomeFilter: nextOutcomeFilter,
        demoFixturesEnabled: isDemo ? true : state.demoFixturesEnabled
      });
    }

    case 'SET_SEARCH': {
      return deepFreeze({
        ...state,
        searchQuery: String(action.query ?? '')
      });
    }

    case 'SET_TABLE_FILTER': {
      const filter = ['all', 'observed', 'missing'].includes(action.filter) ? action.filter : 'all';
      return deepFreeze({
        ...state,
        tableFilter: filter
      });
    }

    case 'SET_TABLE_SORT': {
      const key = ['name', 'teryt', 'value'].includes(action.key) ? action.key : 'name';
      let dir = action.dir;
      if (dir !== 'asc' && dir !== 'desc') {
        if (state.tableSort.key === key) {
          dir = state.tableSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          dir = key === 'value' ? 'desc' : 'asc';
        }
      }
      return deepFreeze({
        ...state,
        tableSort: { key, dir }
      });
    }

    case 'TOGGLE_UNREVIEWED_PREVIEW': {
      const enabled =
        typeof action.enabled === 'boolean' ? action.enabled : !state.includeUnreviewedPreview;
      return deepFreeze({
        ...state,
        includeUnreviewedPreview: enabled
      });
    }

    case 'TOGGLE_DEMO_FIXTURES': {
      const enabled =
        typeof action.enabled === 'boolean' ? action.enabled : !state.demoFixturesEnabled;
      const shouldCloseDemo =
        !enabled && state.selectedCaseId && state.selectedCaseId.startsWith('DEMO-');
      return deepFreeze({
        ...state,
        demoFixturesEnabled: enabled,
        selectedCaseId: shouldCloseDemo ? null : state.selectedCaseId
      });
    }

    case 'RESTORE_URL_STATE': {
      const rawInput = action.urlState ?? action.state ?? action.search ?? {};
      const validCaseIds = new Set((dataset?.cases || []).map(c => c.id));
      const u = parseUrlState(rawInput, { validCaseIds });
      const rawObj = typeof rawInput === 'object' && rawInput !== null ? rawInput : {};
      let nextCaseId =
        u.selectedCaseId !== undefined
          ? u.selectedCaseId
          : rawObj.selectedCaseId === null || rawObj.case === null
            ? null
            : null;
      const nextDemo =
        u.demoFixturesEnabled !== undefined
          ? u.demoFixturesEnabled
          : nextCaseId && nextCaseId.startsWith('DEMO-')
            ? true
            : rawObj.demoFixturesEnabled === false
              ? false
              : state.demoFixturesEnabled;
      const nextMetricOption = u.selectedMetricOption ?? state.selectedMetricOption;
      let nextYear = u.year ?? dataset?.release?.defaultYear ?? 2025;
      let nextAreaId = u.selectedAreaId ?? '14';
      let nextOutcomeFilter = VALID_CASE_OUTCOME_FILTERS.has(u.caseOutcomeFilter)
        ? u.caseOutcomeFilter
        : 'all';
      const nextLayers = u.layers
        ? normalizeLayers(u.layers, DEFAULT_MAP_LAYERS)
        : typeof rawInput === 'string' || 'layers' in rawObj
          ? normalizeLayers(DEFAULT_MAP_LAYERS)
          : state.layers || DEFAULT_MAP_LAYERS;

      if (nextCaseId && !nextCaseId.startsWith('DEMO-')) {
        const matchedRealCase = (dataset?.cases || []).find(c => c.id === nextCaseId) || null;
        if (matchedRealCase) {
          const caseYr = getCaseYear(matchedRealCase);
          if (u.year === undefined && Number.isInteger(caseYr) && caseYr >= 1999 && caseYr <= 2030) {
            nextYear = caseYr;
          } else if (u.year !== undefined && caseYr !== nextYear) {
            nextCaseId = null;
          }
          if (
            nextCaseId &&
            nextOutcomeFilter !== 'all' &&
            (matchedRealCase.outcome || 'death') !== nextOutcomeFilter
          ) {
            if (u.caseOutcomeFilter === undefined) {
              nextOutcomeFilter = 'all';
            } else {
              nextCaseId = null;
            }
          }
          if (
            nextCaseId &&
            u.selectedAreaId === undefined &&
            TERYT_CODES.has(matchedRealCase.voivodeship_teryt)
          ) {
            nextAreaId = matchedRealCase.voivodeship_teryt;
          }
        }
      }

      if (nextMetricOption === 'gus_intentional_homicide_victims') {
        const gusYears = getAvailableYearsForSeries(
          dataset,
          'gus_homicide_victims_national',
          'gus_homicide_victims_regional'
        );
        if (gusYears.length > 0 && !gusYears.includes(nextYear)) {
          nextYear =
            nextYear > gusYears[gusYears.length - 1]
              ? gusYears[gusYears.length - 1]
              : nextYear < gusYears[0]
                ? gusYears[0]
                : gusYears[gusYears.length - 1];
        }
      }
      return deepFreeze({
        ...state,
        mode: u.mode ?? state.mode,
        selectedMetricOption: nextMetricOption,
        metricId: u.metricId ?? state.metricId,
        displayType: u.displayType ?? state.displayType,
        year: nextYear,
        selectedAreaId: nextAreaId,
        compareAreaIds: Array.isArray(u.compareAreaIds) ? u.compareAreaIds : state.compareAreaIds,
        selectedCaseId: nextCaseId,
        caseOutcomeFilter: nextOutcomeFilter,
        demoFixturesEnabled: nextDemo,
        layers: nextLayers,
        compareLimitNoticePl: null
      });
    }

    case 'SET_LOAD_STATE': {
      const loadState = ['loading', 'ready', 'empty', 'error'].includes(action.loadState)
        ? action.loadState
        : 'ready';
      return deepFreeze({
        ...state,
        loadState,
        errorMessage: action.errorMessage ?? null
      });
    }

    case 'SET_GEOMETRY_STATUS': {
      return deepFreeze({
        ...state,
        geometryFallbackActive: Boolean(action.fallbackActive)
      });
    }

    case 'SET_TILE_STATUS': {
      return deepFreeze({
        ...state,
        tileLayerError: Boolean(action.hasError)
      });
    }

    default:
      return state;
  }
}

function findObservation(dataset, seriesId, year, areaId) {
  return (
    dataset.observations.find(
      o =>
        o.seriesId === seriesId &&
        o.period === year &&
        o.areaId === areaId &&
        o.isActiveRevision !== false
    ) || null
  );
}

function findPopulation(dataset, areaId, year, boundaryVersion = DEFAULT_BOUNDARY_VERSION) {
  return dataset.populationByKey[`${areaId}:${year}:${boundaryVersion}`] || null;
}

function formatPolishNumber(val, isRate = false) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  if (isRate) {
    return val.toFixed(2).replace('.', ',');
  }
  return String(val);
}

function extractCaseCoords(c) {
  if (!c || typeof c !== 'object') return null;
  const lat = Number(c.location?.lat);
  const lng = Number(c.location?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  const geom = c.published_location?.geometry;
  if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    const gLng = Number(geom.coordinates[0]);
    const gLat = Number(geom.coordinates[1]);
    if (Number.isFinite(gLat) && Number.isFinite(gLng)) {
      return { lat: gLat, lng: gLng };
    }
  }
  return null;
}

/**
 * Derives the complete immutable ViewModel consumed by both map.mjs and panel.mjs.
 *
 * @param {Object} state - Current AppState
 * @param {Object} dataset - Adapted AtlasDataset
 * @returns {Object} Deeply frozen ViewModel
 */
export function selectView(state, dataset) {
  const isGus = state.selectedMetricOption === 'gus_intentional_homicide_victims';
  const isRateRequested =
    state.selectedMetricOption === 'police_article_148_rate_per_100k' ||
    state.displayType === 'rate_per_100k';

  const activeMetric =
    dataset.metricsById[state.selectedMetricOption] ||
    dataset.metricsById[state.metricId] ||
    dataset.metricsById.police_article_148_recorded_acts;

  const activeNationalSeriesId = isGus
    ? 'gus_homicide_victims_national'
    : 'kgp_art148_national_official';
  const activeRegionalSeriesId = isGus
    ? 'gus_homicide_victims_regional'
    : 'kgp_art148_regional';

  const activeNationalSeries = dataset.seriesById[activeNationalSeriesId];
  const activeRegionalSeries = dataset.seriesById[activeRegionalSeriesId];

  const breaks = isRateRequested
    ? activeRegionalSeries.fixedRateClassBreaks
    : activeRegionalSeries.fixedClassBreaks;

  // Filter published cases to the active timeline year and outcome filter
  const allPublishedCases = Array.isArray(dataset.cases) ? dataset.cases : [];
  const allPublishedCasesForYear = allPublishedCases.filter(c => getCaseYear(c) === state.year);
  const caseOutcomeFilter = VALID_CASE_OUTCOME_FILTERS.has(state.caseOutcomeFilter)
    ? state.caseOutcomeFilter
    : 'all';
  const publishedCasesForYear =
    caseOutcomeFilter === 'all'
      ? allPublishedCasesForYear
      : allPublishedCasesForYear.filter(c => (c.outcome || 'death') === caseOutcomeFilter);

  const baseTimelineYears = Array.isArray(dataset.timelineYears)
    ? dataset.timelineYears
    : Array.from({ length: 27 }, (_, idx) => 1999 + idx);
  const maxBaseYear = baseTimelineYears[baseTimelineYears.length - 1] || 2025;
  const effectiveMaxYear = Math.max(maxBaseYear, Number.isInteger(state.year) ? state.year : 2025);
  const effectiveTimelineYears =
    effectiveMaxYear > maxBaseYear
      ? Array.from({ length: effectiveMaxYear - 1999 + 1 }, (_, idx) => 1999 + idx)
      : baseTimelineYears;

  // Build year availability map across effectiveTimelineYears (separating statistical vs. case availability)
  const yearAvailability = {};
  for (const y of effectiveTimelineYears) {
    const natObsForY = findObservation(dataset, activeNationalSeriesId, y, 'PL');
    const regObsForYear = dataset.observations.filter(
      o => o.seriesId === activeRegionalSeriesId && o.period === y && o.availability === 'observed'
    );
    const hasNational = Boolean(natObsForY && natObsForY.availability === 'observed');
    const hasRegionalApproved = regObsForYear.some(o => o.reviewStatus === 'approved');
    const hasRegionalUnreviewed = regObsForYear.some(o => o.reviewStatus === 'unreviewed');
    const hasStatistics = Boolean(hasNational || hasRegionalApproved || hasRegionalUnreviewed);
    const casesForY = allPublishedCases.filter(c => getCaseYear(c) === y);
    yearAvailability[y] = {
      hasNational,
      hasRegionalApproved,
      hasRegionalUnreviewed,
      hasStatistics,
      caseCount: casesForY.length,
      completedHomicideCount: casesForY.filter(c => (c.outcome || 'death') !== 'attempted').length,
      attemptedHomicideCount: casesForY.filter(c => (c.outcome || 'death') === 'attempted').length,
      hasCases: casesForY.length > 0,
      casesOnly: !hasStatistics && casesForY.length > 0,
      hasAnyData: Boolean(hasStatistics || casesForY.length > 0)
    };
  }

  // National row for active year
  const natObs = findObservation(dataset, activeNationalSeriesId, state.year, 'PL');
  const natPop = findPopulation(
    dataset,
    'PL',
    state.year,
    natObs?.boundaryVersion || DEFAULT_BOUNDARY_VERSION
  );
  const natRate = computeRatePer100k(natObs, natPop);
  const natSource =
    (natObs && dataset.sourcesById[natObs.sourceId]) ||
    (isGus
      ? dataset.sourcesById['src-gus-homicide-victims-2013-2024']
      : state.year === 2025
        ? dataset.sourcesById['src-kgp-dane-gov-1723681']
        : dataset.sourcesById['src-kgp-dane-gov-1160448']) ||
    dataset.footnotes[0] ||
    null;
  const natPopSource =
    (natPop && dataset.sourcesById[natPop.sourceId]) ||
    dataset.sourcesById['src-gus-bdl-population-1999-2025'] ||
    null;
  const natRawValue = natObs?.availability === 'observed' ? natObs.value : null;
  const natDisplayValue = isRateRequested ? natRate : natRawValue;

  const nationalRow = {
    areaId: 'PL',
    teryt: 'PL',
    name: 'Polska',
    lat: 52.05,
    lng: 19.1,
    rawValue: natRawValue,
    rateValue: natRate,
    value: natDisplayValue,
    displayValue: natDisplayValue,
    formattedValue: formatPolishNumber(natDisplayValue, isRateRequested),
    availability: natObs?.availability || 'missing',
    reviewStatus: natObs?.reviewStatus || 'unreviewed',
    verification: natObs?.verification || 'official_publication',
    statusLabelPl:
      natObs?.availability === 'observed'
        ? natObs.reviewStatus === 'approved'
          ? 'Źródło pierwotne zatwierdzone (official_publication)'
          : 'Komunikat oficjalny (official_publication) · Definicja do audytu'
        : state.year > 2025
          ? 'Brak opublikowanych danych oficjalnych (szereg KGP 1999–2025)'
          : 'Brak danych w zbiorze',
    source: natSource,
    populationSource: natPopSource,
    sourceUrl: natObs?.sourceUrl || natSource?.url || null,
    notePl: natObs?.notePl || null,
    discrepancyNotePl: natObs?.discrepancyNotePl || null,
    population: natPop?.population ?? null
  };

  // National history bars across timeline years (value matches active metric)
  const nationalHistoryBars = [];
  for (const y of effectiveTimelineYears) {
    const obs = findObservation(dataset, activeNationalSeriesId, y, 'PL');
    const pop = findPopulation(
      dataset,
      'PL',
      y,
      obs?.boundaryVersion || DEFAULT_BOUNDARY_VERSION
    );
    const isObs = Boolean(obs && obs.availability === 'observed' && typeof obs.value === 'number');
    const rawVal = isObs ? obs.value : null;
    const rateVal = isObs ? computeRatePer100k(obs, pop) : null;
    const barVal = isObs ? (isRateRequested ? rateVal : rawVal) : null;
    if (isObs || y === state.year) {
      nationalHistoryBars.push({
        year: y,
        value: barVal,
        rawValue: rawVal,
        rateValue: rateVal,
        formattedValue: formatPolishNumber(barVal, isRateRequested),
        availability: isObs ? 'observed' : 'missing',
        isCurrent: y === state.year
      });
    }
  }

  // Regional rows for all 16 voivodeships
  let observedCount = 0;
  let approvedCount = 0;
  let unreviewedCount = 0;
  let rateMatchedCount = 0;

  const rows = dataset.areas.map(area => {
    const obs = findObservation(dataset, activeRegionalSeriesId, state.year, area.areaId);
    const isObserved =
      Boolean(obs && obs.availability === 'observed' && typeof obs.value === 'number') &&
      (obs.reviewStatus === 'approved' || state.includeUnreviewedPreview);

    const rawValue = isObserved ? obs.value : null;
    const pop = findPopulation(
      dataset,
      area.areaId,
      state.year,
      obs?.boundaryVersion || area.boundaryVersion
    );
    const popSource =
      (pop && dataset.sourcesById[pop.sourceId]) ||
      dataset.sourcesById['src-gus-bdl-population-1999-2025'] ||
      null;
    const rateValue = isObserved ? computeRatePer100k(obs, pop) : null;
    if (rateValue !== null) {
      rateMatchedCount++;
    }

    const displayValue = isRateRequested ? rateValue : rawValue;
    const availability = isObserved
      ? 'observed'
      : isGus
        ? 'not_applicable'
        : obs?.availability === 'suppressed'
          ? 'suppressed'
          : 'missing';
    const reviewStatus = obs?.reviewStatus || (isGus ? 'approved' : 'unreviewed');
    const verification =
      obs?.verification ||
      (reviewStatus === 'approved' ? 'official_verified' : 'secondary_unverified');

    if (availability === 'observed') {
      observedCount++;
      if (reviewStatus === 'approved') approvedCount++;
      else unreviewedCount++;
    }

    const classIndex =
      availability === 'observed' && displayValue !== null
        ? classifyValue(displayValue, breaks)
        : null;

    const src =
      (obs && dataset.sourcesById[obs.sourceId]) ||
      (isGus
        ? dataset.sourcesById['src-gus-homicide-victims-2013-2024']
        : state.year === 2025
          ? dataset.sourcesById['src-kgp-dane-gov-1723681']
          : dataset.sourcesById['src-kgp-dane-gov-1160448']) ||
      dataset.footnotes[1] ||
      dataset.footnotes[0] ||
      null;

    let statusLabelPl = 'Brak danych w zbiorze (missing)';
    if (availability === 'observed') {
      statusLabelPl =
        reviewStatus === 'approved'
          ? 'Zatwierdzone (official_verified)'
          : 'Wtórne · niezweryfikowane (secondary_unverified)';
    } else if (availability === 'not_applicable') {
      statusLabelPl = 'Nie dotyczy — seria wyłącznie ogólnokrajowa (GUS)';
    } else if (availability === 'suppressed') {
      statusLabelPl = 'Wartość utajniona (suppressed)';
    }

    const garrison = isGus
      ? null
      : obs?.garrisonBreakdown || dataset.supplementaryByYear?.[state.year]?.garrisonBreakdown || null;
    const jurisdictionWarningPl = isGus
      ? null
      : area.areaId === '14' && garrison?.kspWarszawa && garrison?.kwpRadom
        ? `Podział garnizonowy KGP (TERYT 14, ${state.year}): woj. mazowieckie ogółem = ${rawValue ?? '—'} czynów stwierdzonych (KSP Warszawa: ${garrison.kspWarszawa.recordedActs} stwierdzone / ${garrison.kspWarszawa.detectedActs} wykryte; KWP zs. w Radomiu: ${garrison.kwpRadom.recordedActs} stwierdzone / ${garrison.kwpRadom.detectedActs} wykryte).`
        : area.jurisdictionNotePl || null;

    return {
      areaId: area.areaId,
      teryt: area.teryt,
      name: area.name,
      lat: area.lat,
      lng: area.lng,
      rawValue,
      rateValue,
      value: displayValue,
      displayValue,
      formattedValue: formatPolishNumber(displayValue, isRateRequested),
      detectedActs: obs?.detectedActs ?? null,
      detectionRatePct: obs?.detectionRatePct ?? null,
      garrisonBreakdown: area.areaId === '14' ? garrison : null,
      availability,
      reviewStatus,
      verification,
      classIndex,
      statusLabelPl,
      source: src,
      populationSource: popSource,
      sourceUrl: obs?.sourceUrl || src?.url || null,
      notePl: obs?.notePl || null,
      population: pop?.population ?? null,
      isSelected: area.areaId === state.selectedAreaId,
      isCompared: state.compareAreaIds.includes(area.areaId),
      jurisdictionWarningPl
    };
  });

  const rateAvailableForYear = observedCount > 0 && rateMatchedCount === observedCount;

  // Methodological block reason when rate per 100k, GUS series, or post-2025 year is selected without verified backing data
  let metricBlockReasonPl = null;
  if (isGus && observedCount === 0 && nationalRow.availability !== 'observed') {
    metricBlockReasonPl =
      `Publikacja GUS „Ofiary zabójstw” (zasób stat.gov.pl) obejmuje lata 2013–2024 na poziomie ogólnokrajowym; dla roku ${state.year} dane nie zostały opublikowane. Jest to odrębna miara (osoby zmarłe wskutek zabójstwa dokonanego) od policyjnej liczby czynów z art. 148 k.k.`;
  } else if (isGus && observedCount === 0 && nationalRow.availability === 'observed') {
    metricBlockReasonPl =
      `W roku ${state.year} GUS wykazuje ${nationalRow.formattedValue} osób zmarłych w wyniku zabójstwa dokonanego w skali kraju (Polska). GUS nie publikuje przekroju wojewódzkiego dla tej tablicy (w Roczniku Demograficznym Tabl. 100 przekrój wojewódzki obejmuje łącznie zewnętrzne przyczyny zgonu V01–Y89).`;
  } else if (!isGus && observedCount === 0 && nationalRow.availability !== 'observed') {
    metricBlockReasonPl =
      `Dla roku ${state.year} oficjalne dane statystyczne KGP oraz mianowniki ludności GUS nie zostały jeszcze opublikowane (zweryfikowany szereg KGP kończy się na 2025 r.). Atlas nie fabrykuje ani nie ekstrapoluje statystyk — na mapie prezentowane są wyłącznie zatwierdzone sprawy indywidualne (${allPublishedCasesForYear.length} w ${state.year} r.).`;
  } else if (isRateRequested && !rateAvailableForYear) {
    metricBlockReasonPl =
      'Obliczenie wskaźnika na 100 000 mieszkańców jest zablokowane w obecnym wydaniu: wymaga zatwierdzonej serii regionalnej KGP oraz uzgodnionego mianownika ludności GUS BDL dla tego samego roku i podziału terytorialnego.';
  }

  const selectedArea =
    rows.find(r => r.areaId === state.selectedAreaId) || rows[0] || null;

  // Table counts & filtering + mandatory null-last sorting
  const queryNorm = state.searchQuery.trim().toLocaleLowerCase('pl');
  const searchMatchedRows = rows.filter(r => {
    if (!queryNorm) return true;
    return (
      r.name.toLocaleLowerCase('pl').includes(queryNorm) ||
      r.teryt.toLocaleLowerCase('pl').includes(queryNorm)
    );
  });

  const tableCounts = {
    all: searchMatchedRows.length,
    observed: searchMatchedRows.filter(r => r.availability === 'observed').length,
    missing: searchMatchedRows.filter(r => r.availability !== 'observed').length
  };

  const filteredByAvailability = searchMatchedRows.filter(r => {
    if (state.tableFilter === 'observed') return r.availability === 'observed';
    if (state.tableFilter === 'missing') return r.availability !== 'observed';
    return true;
  });

  const { key: sortKey, dir: sortDir } = state.tableSort;
  const dirMult = sortDir === 'desc' ? -1 : 1;

  const filteredRows = [...filteredByAvailability].sort((a, b) => {
    if (sortKey === 'value') {
      const aHas = a.availability === 'observed' && a.displayValue !== null;
      const bHas = b.availability === 'observed' && b.displayValue !== null;
      // Mandatory null-last sorting in BOTH ascending and descending order
      if (!aHas && !bHas) return a.name.localeCompare(b.name, 'pl');
      if (!aHas) return 1;
      if (!bHas) return -1;
      if (a.displayValue !== b.displayValue) {
        return (a.displayValue - b.displayValue) * dirMult;
      }
      return a.name.localeCompare(b.name, 'pl');
    }
    if (sortKey === 'teryt') {
      return a.teryt.localeCompare(b.teryt, 'pl') * dirMult;
    }
    return a.name.localeCompare(b.name, 'pl') * dirMult;
  });

  // Multi-area comparison series (up to 3 pinned areas)
  const availableRegionalYears = effectiveTimelineYears.filter(
    y => yearAvailability[y]?.hasRegionalApproved || yearAvailability[y]?.hasRegionalUnreviewed
  );
  const historyYearsWindow =
    availableRegionalYears.length >= 2 ? availableRegionalYears : [2024, 2025];

  const compareSeries = state.compareAreaIds
    .map(code => {
      const currentRow = rows.find(r => r.areaId === code);
      if (!currentRow) return null;
      const historyPoints = historyYearsWindow.map(y => {
        const obs = findObservation(dataset, activeRegionalSeriesId, y, code);
        const isObs =
          Boolean(obs && obs.availability === 'observed' && typeof obs.value === 'number') &&
          (obs.reviewStatus === 'approved' || state.includeUnreviewedPreview);
        const pop = findPopulation(
          dataset,
          code,
          y,
          obs?.boundaryVersion || DEFAULT_BOUNDARY_VERSION
        );
        const val = isObs
          ? isRateRequested
            ? computeRatePer100k(obs, pop)
            : obs.value
          : null;
        return {
          year: y,
          value: val,
          availability: isObs ? 'observed' : 'missing',
          reviewStatus: obs?.reviewStatus || 'unreviewed'
        };
      });
      const activeBreaks = isRateRequested
        ? dataset.seriesById.police_recorded_homicides_rate?.methodologicalBreaks ||
          activeRegionalSeries.methodologicalBreaks ||
          []
        : activeRegionalSeries.methodologicalBreaks || [];
      return {
        areaId: currentRow.areaId,
        teryt: currentRow.teryt,
        name: currentRow.name,
        currentRow,
        historyPoints,
        observedYearsCount: historyPoints.filter(p => p.value !== null).length,
        methodologicalBreaks: activeBreaks
      };
    })
    .filter(Boolean);

  const notApplicableCount = rows.filter(r => r.availability === 'not_applicable').length;
  const coverage = {
    observedCount,
    approvedCount,
    unreviewedCount,
    notApplicableCount,
    missingCount: Math.max(0, 16 - observedCount - notApplicableCount),
    totalExpected: 16,
    labelPl:
      notApplicableCount === 16
        ? 'Seria wyłącznie ogólnokrajowa (GUS — brak przekroju wojewódzkiego)'
        : `${observedCount} / 16 województw z wpisem · ${approvedCount} / 16 zatwierdzonych`
  };

  const legend = buildLegend(breaks, isRateRequested);

  // Selected case resolution (real approved case for active year or UI DEMO fixture when enabled)
  const matchedCase = state.selectedCaseId
    ? publishedCasesForYear.find(c => c.id === state.selectedCaseId) ||
      (state.demoFixturesEnabled ? getDemoFixtureById(state.selectedCaseId) : null) ||
      null
    : null;
  const demoMarkers = state.demoFixturesEnabled ? DEMO_FIXTURES : [];

  // Heatmap points derived ONLY from verified published cases for the active year & outcome filter (never from regional counts or DEMO fixtures)
  const heatmapPoints = publishedCasesForYear
    .map(c => {
      const coords = extractCaseCoords(c);
      if (!coords) return null;
      return {
        id: c.id,
        lat: coords.lat,
        lng: coords.lng,
        precision: c.published_location?.precision || c.location?.precision || 'municipality',
        outcome: c.outcome || 'death',
        weight: 1,
        year: state.year
      };
    })
    .filter(Boolean);

  // Co-located cases at the same base coordinates as the currently selected case
  let coLocatedCases = [];
  if (matchedCase) {
    const targetCoords = extractCaseCoords(matchedCase);
    const pool = matchedCase.isDemoFixture ? demoMarkers : publishedCasesForYear;
    if (targetCoords) {
      coLocatedCases = pool.filter(c => {
        const cc = extractCaseCoords(c);
        return (
          cc &&
          Math.abs(cc.lat - targetCoords.lat) < 0.00025 &&
          Math.abs(cc.lng - targetCoords.lng) < 0.00025
        );
      });
    } else {
      coLocatedCases = [matchedCase];
    }
  }

  const caseLayerEmptyState =
    publishedCasesForYear.length === 0
      ? {
          isEmpty: true,
          year: state.year,
          totalApprovedCasesInArchive: allPublishedCases.length,
          titlePl:
            caseOutcomeFilter !== 'all' && allPublishedCasesForYear.length > 0
              ? `Brak spraw spełniających filtr w roku ${state.year}`
              : `Brak zatwierdzonych spraw indywidualnych dla roku ${state.year}`,
          reasonPl:
            allPublishedCases.length === 0
              ? 'Warstwa punktów indywidualnych (pinezek) i mapa gęstości (heatmapa) prezentują wyłącznie pojedyncze sprawy po dwuetapowej weryfikacji redakcyjnej (verification = human_approved w data/cases.json).'
              : caseOutcomeFilter !== 'all' && allPublishedCasesForYear.length > 0
                ? `W roku ${state.year} w archiwum znajduje się ${allPublishedCasesForYear.length} spraw(y), lecz żadna nie ma kategorii „${caseOutcomeFilter === 'attempted' ? 'usiłowanie zabójstwa' : 'zabójstwo dokonane'}”. Przełącz filtr na „Wszystkie sprawy (art. 148 k.k.)”.`
                : `W roku ${state.year} w kuratorowanym archiwum indywidualnym nie ujęto jeszcze żadnej opublikowanej sprawy (w całym archiwum: ${allPublishedCases.length} spraw z lat 1999–2026). Wybierz inny rok na osi czasu.`
        }
      : null;

  const selectedTerytNorm = String(state.selectedAreaId || '').replace(/^PL-/, '').padStart(2, '0');
  const publishedCasesForArea = publishedCasesForYear.filter(
    c => String(c.voivodeship_teryt || '').padStart(2, '0') === selectedTerytNorm
  );
  const preciseCasesForYearCount = publishedCasesForYear.filter(c => {
    const p = c.published_location?.precision || c.location?.precision;
    return p === 'exact_public_place' || p === 'street_segment';
  }).length;
  const approximateCasesForYearCount = publishedCasesForYear.length - preciseCasesForYearCount;

  const sumFatal = list =>
    list.reduce(
      (acc, c) =>
        acc +
        (Number.isSafeInteger(c.victimCountFatal)
          ? c.victimCountFatal
          : Number.isSafeInteger(c.victim_count)
            ? c.victim_count
            : (c.outcome || 'death') === 'attempted'
              ? 0
              : 1),
      0
    );
  const sumInjured = list =>
    list.reduce(
      (acc, c) =>
        acc +
        (Number.isSafeInteger(c.victimCountInjured)
          ? c.victimCountInjured
          : (c.outcome || 'death') === 'attempted'
            ? 1
            : 0),
      0
    );
  const sumExcludedPerp = list =>
    list.reduce(
      (acc, c) =>
        acc +
        (Number.isSafeInteger(c.perpetratorFatalityCountExcluded)
          ? c.perpetratorFatalityCountExcluded
          : 0),
      0
    );

  const totalCompletedCount = allPublishedCases.filter(
    c => (c.outcome || 'death') !== 'attempted'
  ).length;
  const totalAttemptedCount = allPublishedCases.filter(
    c => (c.outcome || 'death') === 'attempted'
  ).length;
  const yearCompletedCount = allPublishedCasesForYear.filter(
    c => (c.outcome || 'death') !== 'attempted'
  ).length;
  const yearAttemptedCount = allPublishedCasesForYear.filter(
    c => (c.outcome || 'death') === 'attempted'
  ).length;

  const caseArchiveSummary = {
    year: state.year,
    caseOutcomeFilter,
    totalArchiveCount: allPublishedCases.length,
    completedHomicideCount: totalCompletedCount,
    attemptedHomicideCount: totalAttemptedCount,
    fatalVictimCount: sumFatal(allPublishedCases),
    injuredVictimCount: sumInjured(allPublishedCases),
    excludedPerpetratorFatalityCount: sumExcludedPerp(allPublishedCases),
    yearArchiveCount: publishedCasesForYear.length,
    yearTotalArchiveCount: allPublishedCasesForYear.length,
    yearCompletedHomicideCount: yearCompletedCount,
    yearAttemptedHomicideCount: yearAttemptedCount,
    yearFatalVictimCount: sumFatal(allPublishedCasesForYear),
    yearInjuredVictimCount: sumInjured(allPublishedCasesForYear),
    yearExcludedPerpetratorFatalityCount: sumExcludedPerp(allPublishedCasesForYear),
    filteredYearFatalVictimCount: sumFatal(publishedCasesForYear),
    filteredYearInjuredVictimCount: sumInjured(publishedCasesForYear),
    selectedAreaArchiveCount: publishedCasesForArea.length,
    preciseLocationCount: preciseCasesForYearCount,
    approximateAreaCount: approximateCasesForYearCount,
    nationalPoliceRecordedCount: natRawValue,
    selectedAreaPoliceRecordedCount: selectedArea?.rawValue ?? null,
    distinctionLabelPl:
      natRawValue !== null
        ? `Udokumentowane sprawy w archiwum (${allPublishedCasesForYear.length} w ${state.year} r.) ≠ ogólna liczba czynów stwierdzonych KGP (${natRawValue} w ${state.year} r.) · w archiwum: ${yearCompletedCount} dokonane, ${yearAttemptedCount} usiłowania`
        : `Udokumentowane sprawy w archiwum (${allPublishedCasesForYear.length} w ${state.year} r.) · brak opublikowanych statystyk rocznych KGP dla ${state.year} r. · w archiwum: ${yearCompletedCount} dokonane, ${yearAttemptedCount} usiłowania`,
    geographicHonestyNotePl:
      'Współrzędne o dokładności gminy lub dzielnicy stanowią wyłącznie przybliżony punkt referencyjny obszaru administracyjnego i są wykluczone z ulicznej mapy gęstości (z ≥ 11).'
  };

  // Concise screen-reader announcement for committed selection changes
  const areaValSummary =
    selectedArea?.availability === 'observed' && selectedArea.displayValue !== null
      ? `${selectedArea.formattedValue} ${activeMetric.unitLabelPl} (${selectedArea.statusLabelPl})`
      : 'brak wpisu w zbiorze (brak danych nie oznacza zera)';
  const natValSummary =
    nationalRow.availability === 'observed' && nationalRow.displayValue !== null
      ? `${nationalRow.formattedValue} (${nationalRow.statusLabelPl})`
      : 'brak wpisu';
  const liveAnnouncementPl = metricBlockReasonPl
    ? `Rok ${state.year}. ${activeMetric.namePl}: ${metricBlockReasonPl}`
    : `Rok ${state.year}, miara: ${activeMetric.namePl}. Polska: ${natValSummary}. Wybrany obszar: ${selectedArea?.name || ''} (TERYT ${selectedArea?.teryt || ''}), ${areaValSummary}.`;

  const suppForYear = dataset.supplementaryByYear?.[state.year] || null;
  const supplementaryMetrics = {
    year: state.year,
    detectedActs: natObs?.detectedActs ?? suppForYear?.detectedActs ?? null,
    detectionRatePct: natObs?.detectionRatePct ?? suppForYear?.detectionRatePct ?? null,
    initiatedProceedings: natObs?.initiatedProceedings ?? suppForYear?.initiatedProceedings ?? null,
    gusVictims: suppForYear?.gusVictims ?? null,
    gusMortalityRate: suppForYear?.gusMortalityRate ?? null,
    garrisonBreakdown:
      state.selectedAreaId === '14' || state.selectedAreaId === 'PL-14'
        ? suppForYear?.garrisonBreakdown ?? null
        : null,
    allYearsGarrisonBreakdown: suppForYear?.garrisonBreakdown ?? null
  };

  return deepFreeze({
    mode: state.mode,
    layers: state.layers || DEFAULT_MAP_LAYERS,
    caseOutcomeFilter,
    metric: activeMetric,
    selectedMetricOption: state.selectedMetricOption,
    displayType: state.displayType,
    rateAvailableForYear,
    metricBlockReasonPl,
    supplementaryMetrics,
    activeNationalSeries,
    activeRegionalSeries,
    year: state.year,
    timelineYears: effectiveTimelineYears,
    yearAvailability,
    nationalRow,
    nationalObservation: nationalRow,
    nationalHistoryBars,
    selectedAreaId: state.selectedAreaId,
    selectedArea,
    rows,
    filteredRows,
    searchQuery: state.searchQuery,
    tableFilter: state.tableFilter,
    tableSort: state.tableSort,
    tableCounts,
    compareAreas: state.compareAreaIds,
    compareAreaIds: state.compareAreaIds,
    compareSeries,
    compareLimitNoticePl: state.compareLimitNoticePl,
    publishedCases: publishedCasesForYear,
    allPublishedCasesForYear,
    publishedCasesForArea,
    allPublishedCases,
    publishedCasesTotalCount: allPublishedCases.length,
    caseArchiveSummary,
    heatmapPoints,
    coLocatedCases,
    caseLayerEmptyState,
    demoMarkers,
    selectedCaseId: state.selectedCaseId,
    selectedCase: matchedCase,
    coverage,
    legend,
    footnotes: dataset.footnotes,
    geometryVersion: dataset.release?.boundaryVersion || DEFAULT_BOUNDARY_VERSION,
    release: dataset.release,
    loadState: state.loadState,
    errorMessage: state.errorMessage,
    geometryFallbackActive: state.geometryFallbackActive,
    tileLayerError: state.tileLayerError,
    demoFixturesEnabled: state.demoFixturesEnabled,
    includeUnreviewedPreview: state.includeUnreviewedPreview,
    liveAnnouncementPl
  });
}

/**
 * Sanitizes a CSV cell value against CSV Formula Injection (DDE/spreadsheet execution)
 * and wraps/escapes RFC 4180 quotes and delimiters.
 *
 * @param {unknown} val
 * @returns {string}
 */
export function formatCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Prevent CSV formula injection when cell begins with =, +, -, @, tab, or CR
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const sanitizeCsvCell = formatCsvCell;

/**
 * Builds a UTF-8 BOM CSV string of the currently visible observations (national + filtered regional rows),
 * with full metric definition, availability, verification status, and source metadata.
 * UI DEMO fixtures are strictly excluded.
 *
 * @param {Object} view - ViewModel from selectView()
 * @returns {string}
 */
export function buildObservationsCsv(view) {
  const headers = [
    'year',
    'teryt',
    'area_name',
    'metric_id',
    'metric_name_pl',
    'unit',
    'value',
    'recorded_count',
    'population',
    'rate_per_100k',
    'availability',
    'verification_status',
    'source_id',
    'source_url',
    'denominator_source_id',
    'methodology_note'
  ];

  const exportRows = [view.nationalRow, ...(view.filteredRows || view.rows || [])].filter(Boolean);
  const lines = [headers.join(',')];

  for (const row of exportRows) {
    const activeVal =
      row.displayValue !== undefined
        ? row.displayValue
        : row.value !== undefined
          ? row.value
          : row.rawValue;
    const valCell = row.availability === 'observed' && activeVal !== null && activeVal !== undefined ? activeVal : '';
    const countCell = row.rawValue !== null && row.rawValue !== undefined ? row.rawValue : '';
    const popCell = row.population !== null && row.population !== undefined ? row.population : '';
    const rateCell = row.rateValue !== null && row.rateValue !== undefined ? row.rateValue : '';
    const note =
      row.discrepancyNotePl ||
      row.jurisdictionWarningPl ||
      (row.availability === 'not_applicable'
        ? 'Seria wyłącznie ogólnokrajowa (GUS nie publikuje przekroju wojewódzkiego dla tej miary).'
        : row.availability !== 'observed'
          ? 'Brak wpisu w zbiorze nie oznacza zera czynów.'
          : view.metric.definitionPl);

    const record = [
      view.year,
      row.teryt || row.areaId,
      row.name,
      view.metric.id,
      view.metric.namePl,
      view.metric.unitLabelPl,
      valCell,
      countCell,
      popCell,
      rateCell,
      row.availability,
      row.verification,
      row.source?.id || '',
      row.sourceUrl || row.source?.url || '',
      row.populationSource?.id || '',
      note
    ];
    lines.push(record.map(formatCsvCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/**
 * Builds a JSON string of the currently visible observations with embedded metric definition,
 * release metadata, and sources. UI DEMO fixtures are strictly excluded.
 *
 * @param {Object} view - ViewModel from selectView()
 * @returns {string}
 */
export function buildObservationsJson(view) {
  const exportRows = [view.nationalRow, ...(view.filteredRows || view.rows || [])].filter(Boolean);
  const payload = {
    schemaVersion: view.release?.schemaVersion || '1.0.0',
    releaseId: view.release?.releaseId || '2026.11.08-r2',
    exportedAt: new Date().toISOString().slice(0, 10),
    year: view.year,
    metric_id: view.metric.id,
    metric: {
      id: view.metric.id,
      namePl: view.metric.namePl,
      unit: view.metric.unit,
      unitLabelPl: view.metric.unitLabelPl,
      definitionPl: view.metric.definitionPl,
      attemptScope: view.metric.attemptScope
    },
    coverage: view.coverage,
    observations: exportRows.map(row => {
      const activeVal =
        row.displayValue !== undefined
          ? row.displayValue
          : row.value !== undefined
            ? row.value
            : row.rawValue;
      const note =
        row.discrepancyNotePl ||
        row.jurisdictionWarningPl ||
        (row.availability === 'not_applicable'
          ? 'Seria wyłącznie ogólnokrajowa (GUS nie publikuje przekroju wojewódzkiego dla tej miary).'
          : row.availability !== 'observed'
            ? 'Brak wpisu w zbiorze nie oznacza zera czynów.'
            : null);
      return {
        year: view.year,
        teryt: row.teryt || row.areaId,
        areaName: row.name,
        metric_id: view.metric.id,
        unit: view.metric.unitLabelPl,
        value: row.availability === 'observed' ? activeVal : null,
        recorded_count: row.rawValue ?? null,
        population: row.population ?? null,
        rate_per_100k: row.rateValue ?? null,
        ratePer100k: row.rateValue ?? null,
        availability: row.availability,
        reviewStatus: row.reviewStatus,
        verificationStatus: row.verification,
        source_id: row.source?.id || null,
        sourceId: row.source?.id || null,
        sourceTitle: row.source?.title || null,
        source_url: row.sourceUrl || row.source?.url || null,
        sourceUrl: row.sourceUrl || row.source?.url || null,
        denominator_source_id: row.populationSource?.id || null,
        denominatorSourceId: row.populationSource?.id || null,
        methodologyNotePl: note
      };
    }),
    caseArchiveSummary: view.caseArchiveSummary || null,
    approvedCases: (Array.isArray(view.publishedCases) ? view.publishedCases : [])
      .filter(c => c && !c.isDemoFixture && !String(c.id || '').startsWith('DEMO-'))
      .map(c => ({
        id: c.id,
        occurred_on: c.occurred_on,
        date_precision: c.date_precision || 'day',
        voivodeship_teryt: c.voivodeship_teryt,
        municipality: c.municipality,
        precision: c.published_location?.precision || c.location?.precision || 'municipality',
        is_approximate: Boolean(c.location?.is_approximate ?? true),
        publicLabelPl: c.published_location?.publicLabelPl || c.municipality,
        legal_status: c.legal_status,
        outcome: c.outcome || 'death',
        offenseType: c.offenseType || (c.outcome === 'attempted' ? 'attempted_homicide' : 'completed_homicide'),
        victimCountFatal: c.victimCountFatal ?? (c.outcome === 'attempted' ? 0 : 1),
        victimCountInjured: c.victimCountInjured ?? (c.outcome === 'attempted' ? 1 : 0),
        perpetratorFatalityCountExcluded: c.perpetratorFatalityCountExcluded ?? 0,
        relatedCaseIds: Array.isArray(c.relatedCaseIds) ? c.relatedCaseIds : [],
        sharedInvestigationId: c.sharedInvestigationId ?? null,
        summary: c.summary,
        reviewed_at: c.reviewed_at,
        source_urls: Array.isArray(c.source_urls) ? c.source_urls : []
      }))
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Builds a privacy-screened UTF-8 BOM CSV string of approved archive cases for the active year
 * (or all approved cases when scope === 'all'). UI DEMO fixtures are strictly excluded.
 *
 * @param {Object} view - ViewModel from selectView()
 * @param {{scope?: 'year'|'all'}} [options]
 * @returns {string}
 */
export function buildCasesCsv(view, options = {}) {
  const headers = [
    'id',
    'occurred_on',
    'date_precision',
    'voivodeship_teryt',
    'municipality',
    'location_precision',
    'is_approximate',
    'public_label_pl',
    'legal_status',
    'outcome',
    'offense_type',
    'victim_count_fatal',
    'victim_count_injured',
    'perpetrator_fatality_excluded',
    'related_case_ids',
    'shared_investigation_id',
    'summary',
    'reviewed_at',
    'source_urls',
    'archive_vs_police_note'
  ];
  const rawCases =
    options.scope === 'all'
      ? Array.isArray(view?.allPublishedCases)
        ? view.allPublishedCases
        : []
      : Array.isArray(view?.publishedCases)
        ? view.publishedCases
        : [];
  const exportCases = rawCases.filter(
    c => c && !c.isDemoFixture && !String(c.id || '').startsWith('DEMO-')
  );
  const lines = [headers.join(',')];
  const distinctionNote =
    view?.caseArchiveSummary?.distinctionLabelPl ||
    'Archiwum udokumentowanych spraw stanowi zweryfikowaną próbę dokumentacyjną, a nie pełną liczbę czynów stwierdzonych KGP.';

  for (const c of exportCases) {
    const precision = c.published_location?.precision || c.location?.precision || 'municipality';
    const isApprox = c.location?.is_approximate ?? precision !== 'exact_public_place';
    const urls = Array.isArray(c.source_urls) ? c.source_urls.join(' | ') : '';
    const outcome = c.outcome || 'death';
    const offenseType = c.offenseType || (outcome === 'attempted' ? 'attempted_homicide' : 'completed_homicide');
    const fatalCount = Number.isSafeInteger(c.victimCountFatal)
      ? c.victimCountFatal
      : Number.isSafeInteger(c.victim_count)
        ? c.victim_count
        : outcome === 'attempted'
          ? 0
          : 1;
    const injuredCount = Number.isSafeInteger(c.victimCountInjured)
      ? c.victimCountInjured
      : outcome === 'attempted'
        ? 1
        : 0;
    const perpExcluded = Number.isSafeInteger(c.perpetratorFatalityCountExcluded)
      ? c.perpetratorFatalityCountExcluded
      : 0;
    const relatedIds = Array.isArray(c.relatedCaseIds) ? c.relatedCaseIds.join(' | ') : '';
    const row = [
      c.id,
      c.occurred_on,
      c.date_precision || 'day',
      c.voivodeship_teryt,
      c.municipality,
      precision,
      isApprox ? 'true' : 'false',
      c.published_location?.publicLabelPl || c.municipality,
      c.legal_status,
      outcome,
      offenseType,
      fatalCount,
      injuredCount,
      perpExcluded,
      relatedIds,
      c.sharedInvestigationId || '',
      c.summary,
      c.reviewed_at,
      urls,
      distinctionNote
    ];
    lines.push(row.map(formatCsvCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/**
 * Builds a privacy-screened JSON string of approved archive cases for the active year
 * (or all approved cases when scope === 'all'). UI DEMO fixtures are strictly excluded.
 *
 * @param {Object} view - ViewModel from selectView()
 * @param {{scope?: 'year'|'all'}} [options]
 * @returns {string}
 */
export function buildCasesJson(view, options = {}) {
  const rawCases =
    options.scope === 'all'
      ? Array.isArray(view?.allPublishedCases)
        ? view.allPublishedCases
        : []
      : Array.isArray(view?.publishedCases)
        ? view.publishedCases
        : [];
  const exportCases = rawCases.filter(
    c => c && !c.isDemoFixture && !String(c.id || '').startsWith('DEMO-')
  );
  return JSON.stringify(
    {
      schemaVersion: view?.release?.schemaVersion || '1.0.0',
      releaseId: view?.release?.releaseId || '2026.11.08-r2',
      exportedAt: new Date().toISOString().slice(0, 10),
      scope: options.scope === 'all' ? 'all' : 'year',
      year: view?.year ?? null,
      caseArchiveSummary: view?.caseArchiveSummary || null,
      cases: exportCases
    },
    null,
    2
  );
}

/**
 * Creates a lightweight observable store around reduceState and selectView.
 *
 * @param {Object} dataset - Adapted AtlasDataset
 * @param {string} [initialUrlSearch='']
 */
export function createStore(dataset, initialUrlSearch = '') {
  let currentDataset = dataset;
  let currentState = createInitialState(currentDataset, initialUrlSearch);
  let currentView = selectView(currentState, currentDataset);
  const listeners = new Set();

  function getState() {
    return currentState;
  }

  function getView() {
    return currentView;
  }

  function dispatch(action) {
    const nextState = reduceState(currentState, action, currentDataset);
    if (nextState === currentState) return currentView;
    currentState = nextState;
    currentView = selectView(currentState, currentDataset);
    for (const listener of listeners) {
      listener(currentView, currentState, action);
    }
    return currentView;
  }

  function replaceDataset(nextDataset) {
    currentDataset = nextDataset;
    currentView = selectView(currentState, currentDataset);
    for (const listener of listeners) {
      listener(currentView, currentState, { type: 'REPLACE_DATASET' });
    }
    return currentView;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    getView,
    dispatch,
    replaceDataset,
    subscribe
  };
}
