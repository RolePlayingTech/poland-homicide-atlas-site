import { DEMO_FIXTURES, getDemoFixtureById } from '../map/demo-fixtures.mjs';
import { validateHttpsUrl } from '../map/map.mjs';
import {
  buildObservationsCsv as buildObservationsCsvFromState,
  buildObservationsJson as buildObservationsJsonFromState,
  buildCasesCsv as buildCasesCsvFromState,
  buildCasesJson as buildCasesJsonFromState,
  sanitizeCsvCell
} from '../core/state.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Tworzy element HTML z opcjonalną klasą i tekstem ustawianym wyłącznie przez textContent.
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
 * Tworzy bezpieczny link zewnętrzny (wyłącznie https://) lub zwykły span, jeśli URL nie przejdzie walidacji.
 * @param {string|null|undefined} rawUrl
 * @param {string} labelText
 * @param {string} [className]
 * @returns {HTMLElement}
 */
function createSafeExternalLink(rawUrl, labelText, className) {
  const safeHref = validateHttpsUrl(rawUrl);
  if (!safeHref) {
    return createEl('span', className, labelText);
  }
  const a = createEl('a', className, labelText);
  a.href = safeHref;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

/**
 * Zabezpiecza komórkę CSV przed CSV Formula Injection (=, +, -, @, \t, \r) oraz cudzysłowami.
 * @param {unknown} val
 * @returns {string}
 */
export function formatSafeCsvCell(val) {
  return sanitizeCsvCell(val);
}

/**
 * Buduje zawartość eksportu CSV dla aktualnie widocznych obserwacji (zawsze bez fixture'ów DEMO).
 * Deleguje bezpośrednio do kanonicznej implementacji w src/core/state.mjs.
 * @param {Object} view
 * @param {Object[]} [visibleRows]
 * @returns {string}
 */
export function buildObservationsCsv(view, visibleRows) {
  const effectiveView = Array.isArray(visibleRows) ? { ...view, rows: visibleRows } : view;
  return buildObservationsCsvFromState(effectiveView);
}

/**
 * Buduje zawartość eksportu JSON dla aktualnie widocznych obserwacji (zawsze bez fixture'ów DEMO).
 * Deleguje bezpośrednio do kanonicznej implementacji w src/core/state.mjs.
 * @param {Object} view
 * @param {Object[]} [visibleRows]
 * @returns {string}
 */
export function buildObservationsJson(view, visibleRows) {
  const effectiveView = Array.isArray(visibleRows) ? { ...view, rows: visibleRows } : view;
  return buildObservationsJsonFromState(effectiveView);
}

export function buildCasesCsv(view) {
  return buildCasesCsvFromState(view);
}

export function buildCasesJson(view) {
  return buildCasesJsonFromState(view);
}

/**
 * Wyzwala pobranie pliku w przeglądarce.
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} content
 */
function triggerFileDownload(filename, mimeType, content) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sortuje i filtruje wiersze tabeli zgodnie z zasadą: wartości brakujące (missing / null)
 * są ZAWSZE grupowane na końcu tabeli (zarówno przy sortowaniu rosnącym, jak i malejącym).
 * @param {Object[]} rows
 * @param {string} query
 * @param {'all'|'observed'|'missing'} filterMode
 * @param {{key: 'name'|'teryt'|'value', dir: 'asc'|'desc'}} sortCfg
 * @returns {Object[]}
 */
export function filterAndSortAreaRows(rows, query = '', filterMode = 'all', sortCfg = { key: 'name', dir: 'asc' }) {
  if (!Array.isArray(rows)) return [];
  const normQuery = String(query || '')
    .trim()
    .toLocaleLowerCase('pl');

  const filtered = rows.filter((row) => {
    const code = String(row.areaId || row.teryt || '');
    const name = String(row.name || '');
    if (normQuery) {
      const matchesName = name.toLocaleLowerCase('pl').includes(normQuery);
      const matchesCode = code.toLocaleLowerCase('pl').includes(normQuery);
      if (!matchesName && !matchesCode) return false;
    }
    const isObs = row.availability === 'observed' && row.displayValue !== null && row.displayValue !== undefined;
    if (filterMode === 'observed' && !isObs) return false;
    if (filterMode === 'missing' && isObs) return false;
    return true;
  });

  const dirMultiplier = sortCfg.dir === 'desc' ? -1 : 1;

  return [...filtered].sort((a, b) => {
    if (sortCfg.key === 'value') {
      const aObs = a.availability === 'observed' && typeof a.displayValue === 'number';
      const bObs = b.availability === 'observed' && typeof b.displayValue === 'number';
      // Braki danych zawsze na końcu tabeli!
      if (aObs && !bObs) return -1;
      if (!aObs && bObs) return 1;
      if (!aObs && !bObs) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'pl');
      }
      if (a.displayValue !== b.displayValue) {
        return (a.displayValue - b.displayValue) * dirMultiplier;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'pl');
    }

    if (sortCfg.key === 'teryt') {
      const aCode = String(a.areaId || a.teryt || '');
      const bCode = String(b.areaId || b.teryt || '');
      return aCode.localeCompare(bCode, 'pl') * dirMultiplier;
    }

    return String(a.name || '').localeCompare(String(b.name || ''), 'pl') * dirMultiplier;
  });
}

/**
 * Montuje kompletny interfejs „Ciemnej czytelni”:
 * kolumnę wprowadzającą z wyborem miary, legendę mapy, prawe dossier (kraj, region, porównanie do 3 obszarów,
 * pełne dossier sprawy / wzorca DEMO oraz mobilny arkusz dolny), oś czasu 1999–2025,
 * dostępną tabelę 16 województw z eksportem CSV/JSON oraz aparat źródłowy (#sources).
 *
 * @param {HTMLElement} [rootEl]
 * @param {Object} [context]
 * @param {(action: Object) => void} [context.dispatch]
 * @param {Object} [context.mapActions]
 * @param {(target: Object) => void} [context.onFocusMapTarget]
 * @param {(view: Object, rows: Object[]) => void} [context.onExportCsv]
 * @param {(view: Object, rows: Object[]) => void} [context.onExportJson]
 */
export function mountPanel(rootEl = document.body, context = {}) {
  const dispatch = typeof context.dispatch === 'function' ? context.dispatch : () => {};
  const mapActions = context.mapActions || {};

  let latestView = null;
  let localSearchQuery = '';
  let localFilterMode = 'all';
  let localSort = { key: 'name', dir: 'asc' };
  let mobileSheetOpen = false;
  let lastSelectedAreaId = null;
  let lastAnnouncement = '';

  const q = (selector) => rootEl.querySelector(selector) || document.querySelector(selector);

  function syncMobileSheetState() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('sheet-open', mobileSheetOpen);
    document.body.classList.toggle('mobile-sheet-open', mobileSheetOpen);
  }

  // Otwieranie i fokusowanie przypisu <details> w aparacie źródłowym (#sources)
  function jumpToSourceFootnote(href) {
    if (!href || !href.startsWith('#')) return;
    const target = q(href);
    if (!target) return;
    if (target.tagName === 'DETAILS') {
      target.open = true;
    }
    const summary = target.querySelector('summary') || target;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    summary.focus({ preventScroll: true });
  }

  // Powiązanie linków do przypisów (#source-...) oraz kliknięć poligonów na mobile
  const onDocumentClick = (event) => {
    const regionEl = event.target.closest?.('.region, .teryt-fallback-badge');
    if (regionEl && typeof window !== 'undefined' && window.innerWidth <= 720) {
      mobileSheetOpen = true;
      syncMobileSheetState();
    }

    const link = event.target.closest?.('a[href^="#source-"], a.source-jump');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      event.preventDefault();
      jumpToSourceFootnote(href);
    }
  };
  rootEl.addEventListener('click', onDocumentClick);

  const onDocumentKeydown = (event) => {
    if (event.key === 'Escape' && mobileSheetOpen) {
      mobileSheetOpen = false;
      syncMobileSheetState();
      if (latestView?.selectedCase || latestView?.selectedCaseId) {
        dispatch({ type: 'SELECT_CASE', caseId: null });
      }
    }
  };
  rootEl.addEventListener('keydown', onDocumentKeydown);

  // Selektor miary (#metric-select)
  const metricSelectEl = q('#metric-select');
  metricSelectEl?.addEventListener('change', (event) => {
    const val = event.target.value;
    if (val === 'police_article_148_rate_per_100k') {
      dispatch({
        type: 'SET_METRIC',
        optionId: val,
        metricId: 'police_article_148_recorded_acts',
        displayType: 'rate_per_100k',
        requestedOption: val
      });
    } else {
      dispatch({
        type: 'SET_METRIC',
        optionId: val,
        metricId: val,
        displayType: 'count',
        requestedOption: val
      });
    }
  });

  // Selektor województwa w dossier (#area-select)
  const areaSelectEl = q('#area-select');
  areaSelectEl?.addEventListener('change', (event) => {
    const areaId = String(event.target.value).padStart(2, '0');
    mobileSheetOpen = true;
    syncMobileSheetState();
    dispatch({ type: 'SELECT_AREA', areaId });
  });

  // Przycisk "Przybliż województwo na mapie"
  const zoomAreaBtn = q('#zoom-area-btn');
  zoomAreaBtn?.addEventListener('click', () => {
    const areaId =
      latestView?.selectedAreaId ||
      latestView?.selectedArea?.areaId ||
      areaSelectEl?.value ||
      '14';
    dispatch({ type: 'SELECT_AREA', areaId, flyTo: true });
    mapActions.focusArea?.(areaId);
    context.onFocusMapTarget?.({ type: 'area', areaId });
  });

  // Przycisk "+ Przypnij do porównania (N/3)"
  const toggleCompareBtn = q('#toggle-compare-btn');
  toggleCompareBtn?.addEventListener('click', () => {
    const areaId =
      latestView?.selectedAreaId ||
      latestView?.selectedArea?.areaId ||
      areaSelectEl?.value ||
      '14';
    dispatch({ type: 'TOGGLE_COMPARE_AREA', areaId });
  });

  // Przycisk wyczyszczenia porównania
  const clearCompareBtn = q('#clear-compare-btn');
  clearCompareBtn?.addEventListener('click', () => {
    dispatch({ type: 'CLEAR_COMPARE' });
  });

  // Przełącznik punktów wzorcowych DEMO (#demo-toggle) i przycisk przybliżenia do DEMO (#show-demo-points)
  const demoToggleEl = q('#demo-toggle');
  demoToggleEl?.addEventListener('change', (event) => {
    dispatch({ type: 'TOGGLE_DEMO_FIXTURES', enabled: Boolean(event.target.checked) });
  });

  const showDemoPointsBtn = q('#show-demo-points');
  showDemoPointsBtn?.addEventListener('click', () => {
    if (demoToggleEl) demoToggleEl.checked = true;
    dispatch({ type: 'TOGGLE_DEMO_FIXTURES', enabled: true });
    mapActions.focusDemoCluster?.();
    context.onFocusMapTarget?.({ type: 'demo-cluster' });
  });

  // Przełącznik widoczności danych wtórnych (#unreviewed-toggle)
  const unreviewedToggleEl = q('#unreviewed-toggle');
  unreviewedToggleEl?.addEventListener('change', (event) => {
    dispatch({ type: 'TOGGLE_UNREVIEWED_PREVIEW', enabled: Boolean(event.target.checked) });
  });

  // Przełączniki 3 warstw wizualizacji mapy (#layer-toggle-regions, #layer-toggle-heatmap, #layer-toggle-pins)
  const layerToggleRegionsBtn = q('#layer-toggle-regions');
  const layerToggleHeatmapBtn = q('#layer-toggle-heatmap');
  const layerTogglePinsBtn = q('#layer-toggle-pins');

  [
    [layerToggleRegionsBtn, 'regions'],
    [layerToggleHeatmapBtn, 'heatmap'],
    [layerTogglePinsBtn, 'pins']
  ].forEach(([btn, layer]) => {
    btn?.addEventListener('click', () => {
      dispatch({ type: 'TOGGLE_MAP_LAYER', layer });
    });
  });

  // Filtr skutku czynu w archiwum spraw (#outcome-filter-all, #outcome-filter-death, #outcome-filter-attempted)
  const outcomeFilterAllBtn = q('#outcome-filter-all');
  const outcomeFilterDeathBtn = q('#outcome-filter-death');
  const outcomeFilterAttemptedBtn = q('#outcome-filter-attempted');

  [
    [outcomeFilterAllBtn, 'all'],
    [outcomeFilterDeathBtn, 'death'],
    [outcomeFilterAttemptedBtn, 'attempted']
  ].forEach(([btn, outcomeFilter]) => {
    btn?.addEventListener('click', () => {
      dispatch({ type: 'SET_CASE_OUTCOME_FILTER', outcomeFilter });
    });
  });

  // Zamknięcie dossier sprawy (#close-case) oraz zamknięcie mobilnego panelu dolnego (#close-mobile-sheet)
  const closeCaseBtn = q('#close-case');
  closeCaseBtn?.addEventListener('click', () => {
    mobileSheetOpen = false;
    syncMobileSheetState();
    dispatch({ type: 'SELECT_CASE', caseId: null });
  });

  const closeMobileSheetBtn = q('#close-mobile-sheet');
  closeMobileSheetBtn?.addEventListener('click', () => {
    mobileSheetOpen = false;
    syncMobileSheetState();
    document.body.classList.remove('case-open');
    if (latestView?.selectedCase || latestView?.selectedCaseId) {
      dispatch({ type: 'SELECT_CASE', caseId: null });
    }
  });

  // Przycisk "Pokaż miejsce na mapie ↗" w dossier sprawy (#locate-case)
  const locateCaseBtn = q('#locate-case');
  locateCaseBtn?.addEventListener('click', () => {
    const activeCase =
      latestView?.selectedCase ||
      getDemoFixtureById(latestView?.selectedCaseId) ||
      null;
    if (!activeCase) return;
    dispatch({ type: 'SELECT_CASE', caseId: activeCase.id, locateOnMap: true });
    mapActions.focusCase?.(activeCase);
    context.onFocusMapTarget?.({ type: 'case', caseRecord: activeCase });
  });

  // Oś czasu: przyciski poprzedni / następny rok
  const prevYearBtn = q('#prev-year');
  prevYearBtn?.addEventListener('click', () => {
    dispatch({ type: 'STEP_YEAR', delta: -1 });
  });

  const nextYearBtn = q('#next-year');
  nextYearBtn?.addEventListener('click', () => {
    dispatch({ type: 'STEP_YEAR', delta: 1 });
  });

  // Narzędzia tabeli danych: wyszukiwarka, filtr dostępności, sortowanie, eksport CSV/JSON
  const tableSearchEl = q('#table-search') || q('#province-search');
  tableSearchEl?.addEventListener('input', (event) => {
    localSearchQuery = event.target.value;
    dispatch({ type: 'SET_SEARCH', query: localSearchQuery });
  });

  const tableFilterEl = q('#table-filter');
  tableFilterEl?.addEventListener('change', (event) => {
    localFilterMode = event.target.value;
    dispatch({ type: 'SET_TABLE_FILTER', filter: localFilterMode });
  });

  rootEl.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sortKey = btn.dataset.sort || 'name';
      if (localSort.key === sortKey) {
        localSort = { key: sortKey, dir: localSort.dir === 'asc' ? 'desc' : 'asc' };
      } else {
        localSort = { key: sortKey, dir: sortKey === 'value' ? 'desc' : 'asc' };
      }
      dispatch({ type: 'SET_TABLE_SORT', key: localSort.key, dir: localSort.dir });
    });
  });

  const exportCsvBtn = q('#export-csv-btn');
  exportCsvBtn?.addEventListener('click', () => {
    if (!latestView) return;
    const rows = getVisibleTableRows(latestView);
    if (typeof context.onExportCsv === 'function') {
      context.onExportCsv(latestView, rows);
      return;
    }
    const csv = buildObservationsCsv(latestView, rows);
    triggerFileDownload(`poland-homicide-atlas-${latestView.year}.csv`, 'text/csv;charset=utf-8', csv);
  });

  const exportJsonBtn = q('#export-json-btn');
  exportJsonBtn?.addEventListener('click', () => {
    if (!latestView) return;
    const rows = getVisibleTableRows(latestView);
    if (typeof context.onExportJson === 'function') {
      context.onExportJson(latestView, rows);
      return;
    }
    const json = buildObservationsJson(latestView, rows);
    triggerFileDownload(`poland-homicide-atlas-${latestView.year}.json`, 'application/json;charset=utf-8', json);
  });

  function getVisibleTableRows(view) {
    const query = view?.searchQuery !== undefined ? view.searchQuery : localSearchQuery;
    const filterMode = view?.tableFilter || localFilterMode;
    const sortCfg = view?.tableSort || localSort;
    return filterAndSortAreaRows(view?.rows || [], query, filterMode, sortCfg);
  }

  /**
   * Renderuje pasek kontekstu (Aktywna miara + Rok) zawsze widoczny na górze Dossier.
   */
  function renderDossierContextBar(view) {
    const contextMetricEl = q('#dossier-context-metric');
    const contextYearEl = q('#dossier-context-year');
    if (contextMetricEl) {
      contextMetricEl.textContent =
        view?.displayType === 'rate_per_100k'
          ? 'Wskaźnik art. 148 k.k. na 100 tys.'
          : view?.metric?.shortNamePl || 'Czyny z art. 148 k.k. (Policja)';
    }
    if (contextYearEl) {
      contextYearEl.textContent = `ROK ${view?.year ?? 2025}`;
    }
  }

  /**
   * Renderuje blok wyboru miary i ostrzeżenie o blokadzie metodologicznej (np. brak mianownika GUS).
   */
  function renderMetricSelectorAndBlockBanner(view) {
    if (metricSelectEl && typeof view?.selectedMetricOption === 'string') {
      metricSelectEl.value = view.selectedMetricOption;
    }

    const metricCaptionEl = q('#metric-caption') || q('.metric-caption');
    if (metricCaptionEl) {
      if (view?.displayType === 'rate_per_100k') {
        metricCaptionEl.textContent =
          'Wskaźnik na 100 000 mieszkańców obliczony ze stwierdzonych czynów z art. 148 k.k. (KGP) oraz stanu ludności GUS BDL (z uwagą na rewizje spisowe NSP 2002/2011/2021).';
      } else if (view?.metric?.id === 'gus_intentional_homicide_victims') {
        metricCaptionEl.textContent =
          'Osoby zmarłe w wyniku zabójstwa dokonanego (bez usiłowań) w Polsce wg GUS (2013–2024). Seria wyłącznie ogólnokrajowa (brak przekroju wojewódzkiego w publikacji GUS).';
      } else {
        metricCaptionEl.textContent =
          'Liczba czynów stwierdzonych w postępowaniach przygotowawczych (obejmuje też usiłowania). To nie jest liczba osób zabitych.';
      }
    }

    const blockBannerEl = q('#metric-block-banner');
    if (!blockBannerEl) return;

    const blockReason = view?.metricBlockReasonPl || null;
    if (blockReason) {
      blockBannerEl.hidden = false;
      blockBannerEl.textContent = blockReason;
    } else if (view?.displayType === 'rate_per_100k' && !view?.rateAvailableForYear) {
      blockBannerEl.hidden = false;
      blockBannerEl.textContent =
        'Obliczenie wskaźnika na 100 000 mieszkańców jest zablokowane dla tego przekroju: wymaga zatwierdzonej serii regionalnej oraz uzgodnionego mianownika populacji GUS BDL dla tego samego roku i wersji granic TERYT.';
    } else {
      blockBannerEl.hidden = true;
      blockBannerEl.textContent = '';
    }
  }

  /**
   * Renderuje dynamiczną legendę mapy oraz podsumowanie pokrycia.
   */
  function renderMapHeaderAndLegend(view) {
    const year = view?.year ?? 2025;
    const mapYearEl = q('#map-year');
    if (mapYearEl) mapYearEl.textContent = `/ ${year}`;

    const mapTitleEl = q('#map-title');
    if (mapTitleEl) {
      mapTitleEl.textContent = `Atlas · ${view?.metric?.shortNamePl || 'czyny z art. 148 k.k.'}`;
    }

    // Synchronizacja 3 przełączników warstw i liczników (badge)
    const layers = view?.layers || { regions: true, heatmap: true, pins: true };
    const regionsEnabled = layers.regions !== false;
    const heatmapEnabled = layers.heatmap !== false;
    const pinsEnabled = layers.pins !== false;

    if (layerToggleRegionsBtn) {
      layerToggleRegionsBtn.setAttribute('aria-pressed', String(regionsEnabled));
      layerToggleRegionsBtn.classList.toggle('is-active', regionsEnabled);
    }
    if (layerToggleHeatmapBtn) {
      layerToggleHeatmapBtn.setAttribute('aria-pressed', String(heatmapEnabled));
      layerToggleHeatmapBtn.classList.toggle('is-active', heatmapEnabled);
    }
    if (layerTogglePinsBtn) {
      layerTogglePinsBtn.setAttribute('aria-pressed', String(pinsEnabled));
      layerTogglePinsBtn.classList.toggle('is-active', pinsEnabled);
    }

    const badgeRegionsEl = q('#layer-badge-regions');
    if (badgeRegionsEl) {
      if (view?.metric?.id === 'gus_intentional_homicide_victims') {
        badgeRegionsEl.textContent = 'tylko PL';
      } else if ((view?.coverage?.observedCount ?? 0) > 0) {
        badgeRegionsEl.textContent = `${view.coverage.observedCount}/16 woj.`;
      } else {
        badgeRegionsEl.textContent = 'brak serii';
      }
    }

    const publishedCasesList = Array.isArray(view?.publishedCases) ? view.publishedCases : [];
    const heatmapPointsList = Array.isArray(view?.heatmapPoints) ? view.heatmapPoints : publishedCasesList;

    const badgeHeatmapEl = q('#layer-badge-heatmap');
    if (badgeHeatmapEl) {
      badgeHeatmapEl.textContent = `${heatmapPointsList.length} spraw`;
    }

    const badgePinsEl = q('#layer-badge-pins');
    if (badgePinsEl) {
      badgePinsEl.textContent = `${publishedCasesList.length} spraw${view?.demoFixturesEnabled ? ' + 3 DEMO' : ''}`;
    }

    const activeOutcomeFilter = view?.caseOutcomeFilter || 'all';
    [
      [outcomeFilterAllBtn, 'all'],
      [outcomeFilterDeathBtn, 'death'],
      [outcomeFilterAttemptedBtn, 'attempted']
    ].forEach(([btn, filterVal]) => {
      if (!btn) return;
      const isSelected = activeOutcomeFilter === filterVal;
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.classList.toggle('is-active', isSelected);
    });

    const summary = view?.caseArchiveSummary || null;
    const badgeOutcomeAllEl = q('#outcome-badge-all');
    if (badgeOutcomeAllEl) {
      badgeOutcomeAllEl.textContent = String(summary?.yearTotalArchiveCount ?? publishedCasesList.length);
    }
    const badgeOutcomeDeathEl = q('#outcome-badge-death');
    if (badgeOutcomeDeathEl) {
      badgeOutcomeDeathEl.textContent = String(
        summary?.yearCompletedHomicideCount ??
          publishedCasesList.filter((c) => (c.outcome || 'death') !== 'attempted').length
      );
    }
    const badgeOutcomeAttemptedEl = q('#outcome-badge-attempted');
    if (badgeOutcomeAttemptedEl) {
      badgeOutcomeAttemptedEl.textContent = String(
        summary?.yearAttemptedHomicideCount ??
          publishedCasesList.filter((c) => (c.outcome || 'death') === 'attempted').length
      );
    }

    const legendRegionsLabelEl = q('#legend-regions-label');
    if (legendRegionsLabelEl) {
      if (view?.metric?.id === 'gus_intentional_homicide_victims') {
        legendRegionsLabelEl.textContent = 'Seria krajowa GUS: osoby zmarłe (brak przekroju woj.)';
      } else if (view?.displayType === 'rate_per_100k') {
        legendRegionsLabelEl.textContent = 'Kartogram: wskaźnik czynów / 100 tys. ludności';
      } else {
        legendRegionsLabelEl.textContent = 'Kartogram: czyny z art. 148 k.k. (z usiłowaniami)';
      }
    }

    const legendItemRegionsEl = q('#legend-item-regions');
    const legendItemHeatmapEl = q('#legend-item-heatmap');
    const legendItemPinsEl = q('#legend-item-pins');
    legendItemRegionsEl?.classList.toggle('is-layer-off', !regionsEnabled);
    legendItemHeatmapEl?.classList.toggle('is-layer-off', !heatmapEnabled);
    legendItemPinsEl?.classList.toggle('is-layer-off', !pinsEnabled);

    const caseEmptyStateEl = q('#case-layers-empty-state');
    if (caseEmptyStateEl) {
      const shouldShowCaseEmpty = (heatmapEnabled || pinsEnabled) && publishedCasesList.length === 0;
      caseEmptyStateEl.hidden = !shouldShowCaseEmpty;
      if (shouldShowCaseEmpty) {
        const emptyTitleEl = q('#case-empty-title');
        const emptyTextEl = q('#case-empty-text');
        const cs = view?.caseLayerEmptyState;
        const totalApprovedCases = Number.isInteger(view?.publishedCasesTotalCount)
          ? view.publishedCasesTotalCount
          : publishedCasesList.length;
        const fallbackTitle =
          totalApprovedCases === 0
            ? 'Warstwy zdarzeń (mapa ciepła i pinezki): 0 zatwierdzonych spraw w publicznym zbiorze'
            : `Warstwy zdarzeń (mapa ciepła i pinezki): 0 zatwierdzonych spraw w roku ${year}`;
        const fallbackText =
          totalApprovedCases === 0
            ? 'Szczegółowa mapa ciepła oraz pinezki spraw wymagają indywidualnie zweryfikowanych rekordów w pliku data/cases.json. Statystyki wojewódzkie KGP i GUS opisują wyłącznie agregaty regionalne i nigdy nie są zamieniane na sztuczne punkty ani mapę ciepła.'
            : `W wybranym roku (${year}) brak indywidualnie zatwierdzonych spraw w pliku data/cases.json (łącznie w archiwum: ${totalApprovedCases}). Statystyki wojewódzkie KGP i GUS opisują wyłącznie agregaty regionalne i nigdy nie są zamieniane na sztuczne punkty ani mapę ciepła.`;
        if (emptyTitleEl) {
          emptyTitleEl.textContent = (cs && (cs.titlePl || cs.title)) || fallbackTitle;
        }
        if (emptyTextEl) {
          emptyTextEl.textContent =
            (cs &&
              (cs.descriptionPl ||
                cs.reasonPl ||
                cs.messagePl ||
                cs.bodyPl ||
                cs.textPl ||
                cs.text)) ||
            fallbackText;
        }
      }
    }

    const coverageEl = q('#coverage');
    if (coverageEl) {
      if (view?.coverage?.labelPl) {
        coverageEl.textContent = view.coverage.labelPl;
      } else {
        const obsCount = (view?.rows || []).filter(
          (r) => r.availability === 'observed' && r.displayValue !== null
        ).length;
        const appCount = (view?.rows || []).filter(
          (r) => r.availability === 'observed' && r.reviewStatus === 'approved'
        ).length;
        coverageEl.textContent = `${obsCount} / 16 województw z wpisem · ${appCount} / 16 zatwierdzonych po audycie`;
      }
    }

    const mapNoteEl = q('#map-note-text') || q('.map-note');
    if (mapNoteEl) {
      mapNoteEl.replaceChildren();
      if (view?.metric?.id === 'gus_intentional_homicide_victims') {
        mapNoteEl.appendChild(createEl('strong', null, 'Uwaga metodologiczna (GUS 2013–2024): '));
        mapNoteEl.appendChild(
          document.createTextNode(
            'tablica GUS „Ofiary zabójstw” jest publikowana wyłącznie dla Polski ogółem (brak przekroju wojewódzkiego). Poligony województw są zakreskowane jako nieobjęte przekrojem regionalnym.'
          )
        );
      } else if (view?.displayType === 'rate_per_100k') {
        mapNoteEl.appendChild(createEl('strong', null, 'Uwaga metodologiczna (Wskaźnik na 100 tys.): '));
        mapNoteEl.appendChild(
          document.createTextNode(
            'wskaźnik łączy stwierdzone czyny z art. 148 k.k. (KGP) z mianownikiem ludności GUS BDL dla każdego roku (1999–2025). Dla woj. mazowieckiego (TERYT 14) licznik stanowi sumę KSP Warszawa i KWP z siedzibą w Radomiu.'
          )
        );
      } else {
        mapNoteEl.appendChild(
          document.createTextNode('W pierwotnych tabelach KGP (dane.gov.pl / statystyka.policja.pl) ')
        );
        mapNoteEl.appendChild(
          createEl('strong', null, 'wszystkie 16 województw ma pełne pokrycie dla lat 1999–2025')
        );
        mapNoteEl.appendChild(
          document.createTextNode(
            '. Dla woj. mazowieckiego (TERYT 14) wartość stanowi sumę garnizonu KSP Warszawa oraz KWP z siedzibą w Radomiu; brak wpisu w innych przekrojach nigdy nie jest zamieniany na zero.'
          )
        );
      }
    }

    if (demoToggleEl && typeof view?.demoFixturesEnabled === 'boolean') {
      demoToggleEl.checked = view.demoFixturesEnabled;
    }
    if (unreviewedToggleEl && typeof view?.includeUnreviewedPreview === 'boolean') {
      unreviewedToggleEl.checked = view.includeUnreviewedPreview;
    }
  }

  /**
   * Formatuje liczbę całkowitą z odstępami tysięcznymi (np. populację GUS).
   */
  function formatIntegerSpaces(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    return Math.round(val)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  /**
   * Normalizuje listę lub obiekt wskaźników uzupełniających (supplementaryMetrics) do tablicy komórek.
   */
  function normalizeSupplementaryItems(rawSup, isGus = false) {
    if (!rawSup) return [];
    if (Array.isArray(rawSup)) {
      return rawSup
        .filter((it) => it && (it.labelPl || it.namePl || it.label || it.id))
        .map((it) => ({
          label: String(it.labelPl || it.namePl || it.label || it.id),
          value:
            it.formattedValue !== undefined && it.formattedValue !== null
              ? String(it.formattedValue)
              : it.value !== undefined && it.value !== null
                ? String(it.value).replace('.', ',')
                : '—',
          sub: String(it.unitLabelPl || it.unitPl || it.unit || it.statusLabelPl || it.notePl || '')
        }));
    }

    if (typeof rawSup === 'object') {
      const labelMap = {
        crimesRecorded: 'Czyny stwierdzone (KGP)',
        recordedActs: 'Czyny stwierdzone (KGP)',
        stwierdzone: 'Czyny stwierdzone (KGP)',
        crimesDetected: isGus ? 'Czyny wykryte (KGP art. 148)' : 'Przestępstwa wykryte',
        detectedActs: isGus ? 'Czyny wykryte (KGP art. 148)' : 'Przestępstwa wykryte',
        wykryte: isGus ? 'Czyny wykryte (KGP art. 148)' : 'Przestępstwa wykryte',
        detectionRatePct: isGus ? 'Wykrywalność (KGP art. 148)' : 'Wskaźnik wykrywalności',
        detectionRate: isGus ? 'Wykrywalność (KGP art. 148)' : 'Wskaźnik wykrywalności',
        wykrywalnoscPct: isGus ? 'Wykrywalność (KGP art. 148)' : 'Wskaźnik wykrywalności',
        proceedingsInitiated: isGus ? 'Postępowania wszczęte (KGP)' : 'Postępowania wszczęte',
        initiatedProceedings: isGus ? 'Postępowania wszczęte (KGP)' : 'Postępowania wszczęte',
        postepowaniaWszczete: isGus ? 'Postępowania wszczęte (KGP)' : 'Postępowania wszczęte',
        wszczete: isGus ? 'Postępowania wszczęte (KGP)' : 'Postępowania wszczęte',
        gusHomicideVictims: 'Ofiary zabójstw (GUS)',
        gusVictims: 'Ofiary zabójstw (GUS)',
        ofiaryGus: 'Ofiary zabójstw (GUS)',
        gusMortalityRate: 'Zgony ICD-10 X85–Y09 (GUS)',
        gusMortalityRatePer100k: 'Zgony ICD-10 X85–Y09 (GUS)',
        mortalityRatePer100k: 'Zgony ICD-10 X85–Y09 (GUS)',
        population: 'Ludność GUS',
        ratePer100k: 'Wskaźnik / 100 tys.'
      };
      const out = [];
      for (const [k, v] of Object.entries(rawSup)) {
        if (
          k === 'national' ||
          k === 'regional' ||
          k === 'year' ||
          k === 'garrisonBreakdown' ||
          k === 'note' ||
          v === null ||
          v === undefined
        ) {
          continue;
        }
        if (typeof v === 'object' && !Array.isArray(v)) {
          if (isGus && (k === 'gusVictims' || k === 'gusHomicideVictims' || k === 'ofiaryGus')) {
            if (v.femalesTotal != null) {
              out.push({
                label: 'Kobiety (ofiary GUS)',
                value: String(v.femalesTotal),
                sub: 'Polska ogółem'
              });
            }
            if (v.malesTotal != null) {
              out.push({
                label: 'Mężczyźni (ofiary GUS)',
                value: String(v.malesTotal),
                sub: 'Polska ogółem'
              });
            }
            continue;
          }
          const lbl = v.labelPl || v.namePl || v.label || labelMap[k] || k;
          const rawVal = v.formattedValue ?? v.value ?? v.total ?? v.ratePer100k ?? null;
          const valStr = rawVal != null ? String(rawVal).replace('.', ',') : null;
          let subText = String(v.unitLabelPl || v.unitPl || v.unit || v.notePl || '');
          if (!subText && v.femalesTotal != null && v.malesTotal != null) {
            subText = `K: ${v.femalesTotal} · M: ${v.malesTotal}`;
          } else if (!subText && v.deathsTotal != null) {
            subText = `na 100 tys. (${v.deathsTotal} zgonów)`;
          }
          if (valStr !== null) {
            out.push({
              label: String(lbl),
              value: String(valStr),
              sub: subText
            });
          }
        } else if (typeof v === 'number' || typeof v === 'string') {
          const lbl = labelMap[k] || k;
          const isPct = k.toLowerCase().includes('pct') || k.toLowerCase().includes('rate');
          const valStr =
            k === 'population' && typeof v === 'number'
              ? formatIntegerSpaces(v)
              : typeof v === 'number'
                ? String(v).replace('.', ',') + (k.toLowerCase().includes('pct') ? ' %' : '')
                : String(v);
          out.push({
            label: String(lbl),
            value: valStr,
            sub: isPct && !valStr.includes('%') && k.toLowerCase().includes('detection') ? '%' : ''
          });
        }
      }
      return out;
    }
    return [];
  }

  /**
   * Renderuje sekcję krajową, callout rozbieżności 505/501 oraz sekcję wybranego województwa.
   */
  function renderNationalAndRegionalDossier(view) {
    const year = view?.year ?? 2025;
    const nat = view?.nationalRow;
    const isGus = view?.metric?.id === 'gus_intentional_homicide_victims';
    const isRate = view?.displayType === 'rate_per_100k';

    const countryYearEl = q('#country-year');
    if (countryYearEl) countryYearEl.textContent = String(year);

    const natSourceRefEl = q('#national-source-ref') || q('.country-detail .eyebrow .gold');
    if (natSourceRefEl) {
      natSourceRefEl.textContent = `[${nat?.source?.footnoteRef || '01'}]`;
    }

    const natMetricHeadingEl = q('#national-metric-heading');
    if (natMetricHeadingEl) {
      natMetricHeadingEl.textContent =
        view?.metric?.namePl || 'Czyny stwierdzone z art. 148 k.k. (zapis z komunikatu Policji)';
    }

    const natValueEl = q('#national-value');
    if (natValueEl) {
      natValueEl.textContent = nat?.formattedValue || (nat?.displayValue != null ? String(nat.displayValue) : '—');
    }

    const natUnitEl = q('#national-unit');
    if (natUnitEl) {
      natUnitEl.textContent = isRate
        ? 'czynów na 100 tys. ludności · nie osób zabitych'
        : view?.metric?.unitLabelPl || 'czynów · nie osób zabitych (obejmuje też usiłowania)';
    }

    const natCaveatEl = q('#national-metric-caveat') || q('.country-detail .metric-caveat');
    if (natCaveatEl) {
      if (isGus) {
        natCaveatEl.textContent =
          'Seria GUS obejmuje wyłącznie osoby zmarłe w wyniku zabójstwa dokonanego (bez usiłowań), publikowana wyłącznie ogółem dla Polski w latach 2013–2024.';
      } else if (isRate) {
        natCaveatEl.textContent =
          'Wskaźnik obliczony z liczby czynów stwierdzonych z art. 148 k.k. (KGP) oraz stanu ludności GUS BDL na dzień 31 XII. Uwaga na rewizje spisowe NSP (2002, 2011, 2021).';
      } else {
        natCaveatEl.textContent =
          'Wartość krajowa pochodzi z oficjalnej serii KGP (art. 148 k.k.) i nie jest sumą niepełnych danych wojewódzkich ani liczbą ofiar śmiertelnych.';
      }
    }

    const natStatusEl = q('#national-status');
    if (natStatusEl) {
      natStatusEl.textContent = nat?.statusLabelPl || 'Komunikat oficjalny · Definicja do audytu';
    }

    const natSourceJumpEl = q('#national-source-jump');
    if (natSourceJumpEl) {
      const refCode = nat?.source?.footnoteRef || '01';
      const domId = nat?.source?.domId || 'source-national';
      natSourceJumpEl.href = `#${domId}`;
      natSourceJumpEl.textContent = `Otwórz przypis źródłowy [${refCode}] ↗`;
    }

    const natDenomJumpEl = q('#national-denom-source-jump');
    if (natDenomJumpEl) {
      if (isRate && nat?.populationSource) {
        natDenomJumpEl.hidden = false;
        natDenomJumpEl.href = `#${nat.populationSource.domId || 'source-gus-population'}`;
        natDenomJumpEl.textContent = `Mianownik ludności GUS [${nat.populationSource.footnoteRef || '07'}] ↗`;
      } else {
        natDenomJumpEl.hidden = true;
      }
    }

    const discrepancyEl = q('#discrepancy-callout');
    if (discrepancyEl) {
      const note = nat?.discrepancyNotePl || null;
      if (note) {
        discrepancyEl.hidden = false;
        discrepancyEl.textContent = note;
      } else {
        discrepancyEl.hidden = true;
      }
    }

    // Wzbogacony kontekst statystyczny na poziomie kraju (Stage C: wykrywalność, wszczęte, ludność GUS)
    const countryDetailEl = q('.country-detail');
    if (countryDetailEl) {
      let natSuppEl = countryDetailEl.querySelector('#national-supplementary-context');
      const rawNatSup =
        nat?.supplementaryMetrics ||
        view?.nationalSupplementaryMetrics ||
        view?.supplementaryMetrics?.national ||
        (Array.isArray(view?.supplementaryMetrics) ? view.supplementaryMetrics : view?.supplementaryMetrics);
      const natItems = normalizeSupplementaryItems(rawNatSup, isGus);

      if (!isRate && !isGus && typeof nat?.rateValue === 'number') {
        if (!natItems.some((i) => i.label.toLowerCase().includes('100 tys'))) {
          natItems.unshift({
            label: 'Wskaźnik / 100 tys.',
            value: nat.rateValue.toFixed(2).replace('.', ','),
            sub: `Polska · ${year}`
          });
        }
      } else if (isRate && typeof nat?.rawValue === 'number') {
        if (!natItems.some((i) => i.label.toLowerCase().includes('stwierdzon'))) {
          natItems.unshift({
            label: 'Czyny stwierdzone',
            value: String(nat.rawValue),
            sub: `Polska · ${year}`
          });
        }
      }

      if (typeof nat?.population === 'number' && !natItems.some((i) => i.label.toLowerCase().includes('ludno'))) {
        natItems.push({
          label: 'Ludność GUS',
          value: formatIntegerSpaces(nat.population),
          sub: `mianownik ${year}`
        });
      }

      if (natItems.length > 0) {
        if (!natSuppEl) {
          natSuppEl = createEl('div', 'supplementary-context');
          natSuppEl.id = 'national-supplementary-context';
          countryDetailEl.appendChild(natSuppEl);
        }
        natSuppEl.hidden = false;
        natSuppEl.replaceChildren();
        natSuppEl.appendChild(
          createEl('p', 'supplementary-context-title', `Wskaźniki kontekstowe · Polska (${year})`)
        );
        const grid = createEl('div', 'supplementary-grid');
        for (const item of natItems.slice(0, 6)) {
          const cell = createEl('div', 'supplementary-cell');
          cell.appendChild(createEl('small', null, item.label));
          cell.appendChild(createEl('strong', null, item.value));
          if (item.sub) cell.appendChild(createEl('span', null, item.sub));
          grid.appendChild(cell);
        }
        natSuppEl.appendChild(grid);
      } else if (natSuppEl) {
        natSuppEl.hidden = true;
        natSuppEl.replaceChildren();
      }
    }

    // Wykres słupkowy porównania lat krajowych (od zera)
    const comparisonFig = q('figure.comparison');
    const histBars = Array.isArray(view?.nationalHistoryBars) ? view.nationalHistoryBars : [];
    if (comparisonFig && histBars.length > 0) {
      const capEl = comparisonFig.querySelector('#comparison-title');
      if (capEl) {
        capEl.textContent = isGus
          ? 'WYBRANE LATA KRAJOWE (2013–2024) / SKALA OD ZERA'
          : 'WYBRANE LATA KRAJOWE (1999–2025) / SKALA OD ZERA';
      }
      const milestoneYears = isGus
        ? new Set([2013, 2016, 2019, 2022, 2024, year])
        : new Set([1999, 2005, 2015, 2024, 2025, year]);
      const chosenBars = histBars
        .filter((b) => milestoneYears.has(Number(b.year)))
        .sort((a, b) => a.year - b.year);
      const axisFloor = isRate ? 3.0 : isGus ? 350 : 600;
      const maxBarVal = Math.max(
        axisFloor,
        ...chosenBars.map((b) => (typeof b.value === 'number' ? b.value : 0))
      );

      comparisonFig.querySelectorAll('.bar-row').forEach((el) => el.remove());
      const scaleEl = comparisonFig.querySelector('.bar-scale');
      for (const b of chosenBars) {
        const bYear = Number(b.year);
        const bVal = typeof b.value === 'number' ? b.value : null;
        const rowDiv = createEl('div', `bar-row${bYear === year ? ' current' : ''}`);
        rowDiv.dataset.barYear = String(bYear);
        const yrSpan = createEl('span', null, String(bYear));
        const trackSpan = createEl('span', 'bar-track');
        if (bVal !== null) {
          const barI = createEl('i', 'bar');
          const pct = Math.min(100, Math.max(2, (bVal / maxBarVal) * 100));
          barI.style.width = `${pct.toFixed(1)}%`;
          trackSpan.appendChild(barI);
        } else {
          trackSpan.appendChild(createEl('span', 'bar-missing-slot', 'brak wpisu (≠ 0)'));
        }
        const formattedBarVal =
          b.formattedValue ||
          (bVal !== null
            ? isRate
              ? bVal.toFixed(2).replace('.', ',')
              : String(bVal).replace('.', ',')
            : '—');
        const valSpan = createEl('span', null, formattedBarVal);
        rowDiv.append(yrSpan, trackSpan, valSpan);
        if (scaleEl) {
          comparisonFig.insertBefore(rowDiv, scaleEl);
        } else {
          comparisonFig.appendChild(rowDiv);
        }
      }
      if (scaleEl) {
        const spans = scaleEl.querySelectorAll('span');
        if (spans.length >= 2) {
          spans[0].textContent = '0';
          spans[1].textContent = isRate ? maxBarVal.toFixed(2).replace('.', ',') : String(Math.round(maxBarVal));
        }
      }
      const compCaptionEl = comparisonFig.querySelector('#comparison-caption') || comparisonFig.querySelector('p');
      if (compCaptionEl) {
        compCaptionEl.textContent = isGus
          ? 'Wykres słupkowy od zera dla serii GUS „Ofiary zabójstw” (2013–2024, Polska ogółem).'
          : isRate
            ? 'Wykres słupkowy od zera dla wskaźnika czynów stwierdzonych z art. 148 k.k. na 100 tys. ludności (1999–2025).'
            : 'Wykres słupkowy zaczyna się od 0. Oś czasu poniżej przełącza aktywny rok badania (1999–2025).';
      }
    } else {
      rootEl.querySelectorAll('[data-bar-year]').forEach((rowEl) => {
        rowEl.classList.toggle('current', Number(rowEl.dataset.barYear) === year);
      });
    }

    // Wybrany obszar (województwo)
    const selected =
      (typeof view?.selectedArea === 'object' && view?.selectedArea) ||
      (view?.rows || []).find((r) => r.areaId === view?.selectedAreaId || r.isSelected) ||
      (view?.rows || [])[0] ||
      null;

    if (areaSelectEl && selected) {
      if (areaSelectEl.options.length === 0 && Array.isArray(view?.rows)) {
        for (const r of view.rows) {
          const opt = createEl('option', null, `${r.name.toLocaleLowerCase('pl')} (TERYT ${r.areaId})`);
          opt.value = r.areaId;
          areaSelectEl.appendChild(opt);
        }
      }
      areaSelectEl.value = selected.areaId;
    }

    const areaSourceRefEl = q('#area-source-ref') || q('#area-label .gold');
    if (areaSourceRefEl && selected) {
      areaSourceRefEl.textContent = `[${selected.source?.footnoteRef || '02'}]`;
    }

    const areaTerytBadgeEl = q('#area-teryt-badge');
    if (areaTerytBadgeEl && selected) {
      areaTerytBadgeEl.textContent = `TERYT ${selected.areaId} / ${year}`;
    }

    const areaMetricNameEl = q('#area-metric-name');
    if (areaMetricNameEl) {
      areaMetricNameEl.textContent =
        view?.metric?.namePl || 'Zarejestrowane czyny z art. 148 k.k.';
    }

    const isObs = selected && selected.availability === 'observed' && selected.displayValue !== null;
    const isNotApplicable = selected?.availability === 'not_applicable';

    const areaValueEl = q('#area-value');
    if (areaValueEl) {
      areaValueEl.textContent = isObs ? selected.formattedValue || String(selected.displayValue) : '—';
    }

    const areaUnitEl = q('#area-unit');
    if (areaUnitEl) {
      areaUnitEl.textContent = isObs
        ? `${isRate ? 'czynów na 100 tys.' : isGus ? 'osób zmarłych' : 'czynów'} · ${year}`
        : isNotApplicable
          ? `przekrój wyłącznie krajowy · ${year}`
          : `brak wpisu w zbiorze · ${year}`;
    }

    const areaStatusEl = q('#area-status');
    if (areaStatusEl) {
      areaStatusEl.textContent = selected?.statusLabelPl || (isObs ? 'Wtórne · niezweryfikowane' : 'Brak danych w zbiorze');
    }

    const areaNoteEl = q('#area-note');
    if (areaNoteEl) {
      const explicitObsNote =
        selected?.notePl ||
        selected?.note ||
        view?.selectedObservation?.notePl ||
        view?.selectedObservation?.note ||
        null;
      areaNoteEl.textContent = isNotApplicable
        ? 'Tablica GUS „Ofiary zabójstw” (2013–2024) jest publikowana wyłącznie dla Polski ogółem (brak przekroju wojewódzkiego). Wybierz miarę KGP powyżej, aby porównywać województwa.'
        : explicitObsNote
          ? String(explicitObsNote)
          : isObs
            ? selected?.reviewStatus === 'approved'
              ? 'Obserwacja zatwierdzona po audycie źródła pierwotnego.'
              : 'Wpis w zbiorze wtórnym (secondary_unverified). Wymaga weryfikacji w pierwotnej tabeli KGP.'
            : 'Nie znamy wartości w tym zbiorze dla wybranego roku. Brak danych nie oznacza zera czynów w województwie.';
    }

    const areaSourceEl = q('#area-source');
    if (areaSourceEl && selected) {
      const refCode = selected.source?.footnoteRef || '02';
      const domId = selected.source?.domId || 'source-regional';
      areaSourceEl.href = `#${domId}`;
      areaSourceEl.textContent = `Otwórz przypis źródłowy [${refCode}] ↗`;
    }

    const areaDenomJumpEl = q('#area-denom-source-jump');
    if (areaDenomJumpEl) {
      if (isRate && selected?.populationSource) {
        areaDenomJumpEl.hidden = false;
        areaDenomJumpEl.href = `#${selected.populationSource.domId || 'source-gus-population'}`;
        areaDenomJumpEl.textContent = `Mianownik ludności GUS [${selected.populationSource.footnoteRef || '07'}] ↗`;
      } else {
        areaDenomJumpEl.hidden = true;
      }
    }

    const areaJurisdictionEl = q('#area-jurisdiction-note');
    if (areaJurisdictionEl) {
      if (isGus) {
        areaJurisdictionEl.hidden = true;
      } else if (selected?.jurisdictionWarningPl) {
        areaJurisdictionEl.hidden = false;
        areaJurisdictionEl.textContent = selected.jurisdictionWarningPl;
      } else if (selected?.areaId === '14') {
        areaJurisdictionEl.hidden = false;
        areaJurisdictionEl.textContent =
          'Uwaga metodologiczna (TERYT 14): w policyjnych statystykach garnizonowych Komenda Stołeczna Policji (Warszawa i powiaty okołowarszawskie) jest wykazywana odrębnie od KWP z siedzibą w Radomiu. Przed porównaniem należy potwierdzić, czy źródło zsumowało oba garnizony.';
      } else {
        areaJurisdictionEl.hidden = true;
      }
    }

    // Wzbogacony kontekst regionalny i rozbicie garnizonowe KSP + KWP Radom (Stage C)
    const areaDetailEl = q('.area-detail');
    const areaActionsEl = q('.area-actions');
    if (areaDetailEl && selected) {
      let regSuppEl = areaDetailEl.querySelector('#area-supplementary-context');
      const rawRegSup =
        selected.supplementaryMetrics ||
        view?.selectedObservation?.supplementaryMetrics ||
        view?.regionalSupplementaryMetrics ||
        view?.supplementaryMetrics?.regional ||
        null;
      const regItems = normalizeSupplementaryItems(rawRegSup, isGus);

      if (isObs && !isRate && typeof selected.rateValue === 'number') {
        if (!regItems.some((i) => i.label.toLowerCase().includes('100 tys'))) {
          regItems.unshift({
            label: 'Wskaźnik / 100 tys.',
            value: selected.rateValue.toFixed(2).replace('.', ','),
            sub: `${selected.name} · ${year}`
          });
        }
      } else if (isObs && isRate && typeof selected.rawValue === 'number') {
        if (!regItems.some((i) => i.label.toLowerCase().includes('stwierdzon'))) {
          regItems.unshift({
            label: 'Czyny stwierdzone',
            value: String(selected.rawValue),
            sub: `${selected.name} · ${year}`
          });
        }
      }

      if (!isGus && typeof selected.detectedActs === 'number') {
        if (!regItems.some((i) => i.label.toLowerCase().includes('wykryt'))) {
          regItems.push({
            label: 'Przestępstwa wykryte',
            value: String(selected.detectedActs),
            sub: `${selected.name} · ${year}`
          });
        }
      }

      if (!isGus && typeof selected.detectionRatePct === 'number') {
        if (!regItems.some((i) => i.label.toLowerCase().includes('wykrywalno'))) {
          regItems.push({
            label: 'Wskaźnik wykrywalności',
            value: `${selected.detectionRatePct.toFixed(1).replace('.', ',')} %`,
            sub: `art. 148 k.k. · ${year}`
          });
        }
      }

      if (typeof selected.population === 'number' && !regItems.some((i) => i.label.toLowerCase().includes('ludno'))) {
        regItems.push({
          label: 'Ludność GUS',
          value: formatIntegerSpaces(selected.population),
          sub: `TERYT ${selected.areaId} · ${year}`
        });
      }

      const garrison = !isGus
        ? selected.garrisonBreakdown ||
          view?.garrisonBreakdown ||
          view?.selectedObservation?.garrisonBreakdown ||
          null
        : null;

      if (regItems.length > 0 || garrison) {
        if (!regSuppEl) {
          regSuppEl = createEl('div', 'supplementary-context');
          regSuppEl.id = 'area-supplementary-context';
          if (areaActionsEl) {
            areaDetailEl.insertBefore(regSuppEl, areaActionsEl);
          } else {
            areaDetailEl.appendChild(regSuppEl);
          }
        }
        regSuppEl.hidden = false;
        regSuppEl.replaceChildren();

        if (regItems.length > 0) {
          regSuppEl.appendChild(
            createEl('p', 'supplementary-context-title', `Kontekst statystyczny · ${selected.name} (${year})`)
          );
          const grid = createEl('div', 'supplementary-grid');
          for (const item of regItems.slice(0, 6)) {
            const cell = createEl('div', 'supplementary-cell');
            cell.appendChild(createEl('small', null, item.label));
            cell.appendChild(createEl('strong', null, item.value));
            if (item.sub) cell.appendChild(createEl('span', null, item.sub));
            grid.appendChild(cell);
          }
          regSuppEl.appendChild(grid);
        }

        if (garrison) {
          const gBox = createEl('div', 'garrison-breakdown-list');
          gBox.appendChild(
            createEl('div', 'supplementary-context-title', `Rozbicie garnizonowe (TERYT ${selected.areaId})`)
          );
          const garrisonLabelMap = {
            kspWarszawa: 'KSP Warszawa',
            kwpRadom: 'KWP z siedzibą w Radomiu'
          };
          const entries = Array.isArray(garrison)
            ? garrison
            : typeof garrison === 'object'
              ? Object.entries(garrison)
                  .filter(([k, v]) => k !== 'note' && v !== null && v !== undefined)
                  .map(([k, v]) =>
                    typeof v === 'object'
                      ? { label: v.labelPl || v.name || garrisonLabelMap[k] || k, value: v.value ?? v.recordedActs ?? v.count }
                      : { label: garrisonLabelMap[k] || k, value: v }
                  )
              : [];
          for (const entry of entries) {
            const row = createEl('div', 'garrison-breakdown-item');
            row.appendChild(createEl('span', null, String(entry.labelPl || entry.name || entry.label || '')));
            row.appendChild(
              createEl(
                'strong',
                null,
                entry.value !== undefined && entry.value !== null ? String(entry.value) : '—'
              )
            );
            gBox.appendChild(row);
          }
          regSuppEl.appendChild(gBox);
        }
      } else if (regSuppEl) {
        regSuppEl.hidden = true;
        regSuppEl.replaceChildren();
      }
    }

    if (toggleCompareBtn && selected) {
      const compareIds = view?.compareAreas || view?.compareAreaIds || [];
      const isPinned = compareIds.includes(selected.areaId);
      toggleCompareBtn.setAttribute('aria-pressed', String(isPinned));
      toggleCompareBtn.textContent = isPinned
        ? `✓ Przypięto do porównania (${compareIds.length}/3) — odepnij`
        : `+ Przypnij do porównania (${compareIds.length}/3)`;
    }
  }

  /**
   * Renderuje sekcję porównania wieloobszarowego (do 3 województw):
   * pigułki obszarów, wykres słupkowy od zera (z kreskowaniem dla braków) oraz wykres liniowy z przerwami.
   */
  function renderMultiAreaComparison(view) {
    const compareContainerEl = q('#multi-compare-body');
    const compareCountEl = q('#compare-count-badge');
    if (!compareContainerEl) return;

    const compareIds = view?.compareAreas || view?.compareAreaIds || [];
    if (compareCountEl) {
      compareCountEl.textContent = `${compareIds.length} / 3`;
    }
    if (clearCompareBtn) {
      clearCompareBtn.hidden = compareIds.length === 0;
    }

    compareContainerEl.replaceChildren();

    if (compareIds.length === 0) {
      const emptyNote = createEl(
        'p',
        'compare-empty-note',
        'Przypnij do 3 województw przyciskiem powyżej lub w tabeli, aby zestawić je na wspólnej skali od zera i na wykresie czasowym.'
      );
      compareContainerEl.appendChild(emptyNote);
      return;
    }

    const rowsByArea = new Map((view?.rows || []).map((r) => [r.areaId, r]));
    const pinnedRows = compareIds.map((id) => rowsByArea.get(id)).filter(Boolean);

    if (view?.compareLimitNoticePl) {
      const limitNote = createEl('div', 'discrepancy-box', view.compareLimitNoticePl);
      limitNote.id = 'compare-limit-notice';
      compareContainerEl.appendChild(limitNote);
    }

    // 1. Pigułki przypiętych obszarów
    const chipsWrap = createEl('div', 'compare-chips');
    for (const row of pinnedRows) {
      const chip = createEl('button', 'compare-chip');
      chip.type = 'button';
      chip.setAttribute('aria-label', `Usuń województwo ${row.name} z porównania`);
      const labelSpan = createEl('span', null, `[${row.areaId}] ${row.name}`);
      const removeSpan = createEl('span', 'chip-remove', '×');
      chip.append(labelSpan, removeSpan);
      chip.addEventListener('click', () => {
        dispatch({ type: 'TOGGLE_COMPARE_AREA', areaId: row.areaId });
      });
      chipsWrap.appendChild(chip);
    }
    compareContainerEl.appendChild(chipsWrap);

    // 2. Wykres słupkowy od zera dla wybranego roku (braki danych = kreskowany pasek BRAK WPISU)
    const barsTitle = createEl(
      'div',
      'compare-subhead',
      `PRZEKRÓJ ROKU ${view?.year ?? 2025} · WSPÓLNA OŚ OD ZERA`
    );
    compareContainerEl.appendChild(barsTitle);

    const minAxisFloor = view?.displayType === 'rate_per_100k' ? 2.5 : 80;
    const maxObserved = Math.max(
      minAxisFloor,
      ...pinnedRows.map((r) => (r.availability === 'observed' && typeof r.displayValue === 'number' ? r.displayValue : 0))
    );

    const barsWrap = createEl('div', 'compare-bars-list');
    for (const row of pinnedRows) {
      const isObs = row.availability === 'observed' && typeof row.displayValue === 'number';
      const barRow = createEl('div', `compare-bar-item${row.isSelected ? ' current' : ''}`);
      const nameCol = createEl('span', 'compare-bar-name', row.name.slice(0, 12));
      const trackCol = createEl('span', 'bar-track');

      if (isObs) {
        const fillBar = createEl(
          'i',
          `bar${row.reviewStatus !== 'approved' ? ' bar-unreviewed' : ''}`
        );
        const widthPct = Math.min(100, Math.max(2, (row.displayValue / maxObserved) * 100));
        fillBar.style.width = `${widthPct.toFixed(1)}%`;
        trackCol.appendChild(fillBar);
      } else {
        const missingSlot = createEl(
          'span',
          'bar-missing-slot',
          row.availability === 'not_applicable' ? 'tylko Polska (GUS)' : 'brak wpisu (≠ 0)'
        );
        trackCol.appendChild(missingSlot);
      }

      const valCol = createEl('span', 'compare-bar-val', isObs ? row.formattedValue : '—');
      barRow.append(nameCol, trackCol, valCol);
      barsWrap.appendChild(barRow);
    }
    compareContainerEl.appendChild(barsWrap);

    // 3. Wykres liniowy historii (SVG) — luki pozostają przerwami na wykresie
    const compareSeriesList = Array.isArray(view?.compareSeries) ? view.compareSeries : [];
    const samplePts =
      compareSeriesList[0]?.historyPoints ||
      compareSeriesList[0]?.points || [
        { year: 2024, value: null, availability: 'missing' },
        { year: 2025, value: null, availability: 'missing' }
      ];
    const minYear = samplePts.length > 0 ? Number(samplePts[0].year) : 2024;
    const maxYear = samplePts.length > 0 ? Number(samplePts[samplePts.length - 1].year) : 2025;

    const seriesTitle = createEl(
      'div',
      'compare-subhead',
      `SERIA CZASOWA (${minYear}–${maxYear}) · BRAKI SĄ PRZERWĄ NA WYKRESIE`
    );
    compareContainerEl.appendChild(seriesTitle);

    let maxSeriesVal = maxObserved;
    for (const sObj of compareSeriesList) {
      const sPts = sObj?.historyPoints || sObj?.points || [];
      for (const p of sPts) {
        if (p?.availability === 'observed' && typeof p.value === 'number' && p.value > maxSeriesVal) {
          maxSeriesVal = p.value;
        }
      }
    }

    const svgLine = createSvgEl('svg', {
      viewBox: '0 0 280 96',
      class: 'compare-line-svg',
      role: 'img',
      'aria-label': 'Wykres liniowy porównywanych obszarów; brakujące lata są pokazane jako przerwy'
    });

    // Linie siatki i oś 0
    svgLine.appendChild(createSvgEl('line', { x1: 32, y1: 14, x2: 264, y2: 14, stroke: '#2a3c34', 'stroke-width': 1 }));
    svgLine.appendChild(createSvgEl('line', { x1: 32, y1: 44, x2: 264, y2: 44, stroke: '#2a3c34', 'stroke-width': 1 }));
    svgLine.appendChild(createSvgEl('line', { x1: 32, y1: 74, x2: 264, y2: 74, stroke: '#42534b', 'stroke-width': 1 }));

    const yMaxText = createSvgEl('text', { x: 4, y: 18, fill: '#b0bcb5', 'font-size': 9 });
    yMaxText.textContent = String(Math.round(maxSeriesVal * 10) / 10).replace('.', ',');
    const yZeroText = createSvgEl('text', { x: 14, y: 77, fill: '#b0bcb5', 'font-size': 9 });
    yZeroText.textContent = '0';

    const xForYear = (yr) => {
      if (maxYear <= minYear) return 146;
      if (maxYear - minYear === 1) {
        return yr === minYear ? 64 : 228;
      }
      return 38 + ((yr - minYear) / (maxYear - minYear)) * 220;
    };

    const xMinText = createSvgEl('text', {
      x: xForYear(minYear),
      y: 90,
      fill: '#b0bcb5',
      'font-size': 9,
      'text-anchor': 'middle'
    });
    xMinText.textContent = String(minYear);
    const xMaxText = createSvgEl('text', {
      x: xForYear(maxYear),
      y: 90,
      fill: '#b0bcb5',
      'font-size': 9,
      'text-anchor': 'middle'
    });
    xMaxText.textContent = String(maxYear);
    svgLine.append(yMaxText, yZeroText, xMinText, xMaxText);

    if (maxYear - minYear > 4) {
      const midYear = Math.round((minYear + maxYear) / 2);
      const xMidText = createSvgEl('text', {
        x: xForYear(midYear),
        y: 90,
        fill: '#b0bcb5',
        'font-size': 9,
        'text-anchor': 'middle'
      });
      xMidText.textContent = String(midYear);
      svgLine.appendChild(xMidText);
    }

    const strokePalette = ['#d6b578', '#eee8d9', '#819681'];
    const yForVal = (v) => 74 - Math.min(1, Math.max(0, v / maxSeriesVal)) * 60;

    let anyMultiYearSegment = false;
    let hasMissingGap = false;
    let hasBreakGap = false;

    pinnedRows.forEach((row, idx) => {
      const color = strokePalette[idx % strokePalette.length];
      const seriesObj = compareSeriesList.find((s) => s.areaId === row.areaId);
      const pts = seriesObj?.historyPoints || seriesObj?.points || [
        { year: 2024, value: null, availability: 'missing' },
        {
          year: 2025,
          value: row.availability === 'observed' ? row.displayValue : null,
          availability: row.availability
        }
      ];
      const breaksList = Array.isArray(seriesObj?.methodologicalBreaks) ? seriesObj.methodologicalBreaks : [];
      const hasGlobalBreak = Boolean(seriesObj?.hasMethodologicalBreak);

      for (let i = 0; i < pts.length; i++) {
        const cur = pts[i];
        const curValid = cur?.availability === 'observed' && typeof cur.value === 'number';
        if (!curValid) {
          hasMissingGap = true;
          continue;
        }
        const cx = xForYear(Number(cur.year));
        const cy = yForVal(cur.value);

        if (i > 0) {
          const prev = pts[i - 1];
          const prevValid = prev?.availability === 'observed' && typeof prev.value === 'number';
          const isConsecutiveYear = Number(cur.year) - Number(prev.year) === 1;
          const breakBetween =
            hasGlobalBreak ||
            breaksList.some(
              (b) => Number(b.fromYear) === Number(prev.year) && Number(b.toYear) === Number(cur.year)
            );
          if (breakBetween) {
            hasBreakGap = true;
          }
          if (prevValid && isConsecutiveYear && !breakBetween) {
            anyMultiYearSegment = true;
            svgLine.appendChild(
              createSvgEl('line', {
                x1: xForYear(Number(prev.year)),
                y1: yForVal(prev.value),
                x2: cx,
                y2: cy,
                stroke: color,
                'stroke-width': 1.8
              })
            );
          }
        }

        if (pts.length <= 6 || Number(cur.year) === Number(view?.year) || i === 0 || i === pts.length - 1) {
          svgLine.appendChild(
            createSvgEl('circle', {
              cx,
              cy,
              r: Number(cur.year) === Number(view?.year) ? 4 : 2.8,
              fill: color
            })
          );
        }
      }
    });

    if (!anyMultiYearSegment || hasMissingGap || hasBreakGap) {
      const gapText = createSvgEl('text', {
        x: 146,
        y: anyMultiYearSegment ? 26 : 42,
        fill: '#b0bcb5',
        'font-size': 9,
        'text-anchor': 'middle'
      });
      gapText.textContent = anyMultiYearSegment
        ? hasBreakGap
          ? 'Przerwy oznaczają rewizje bazy ludności NSP lub luki w zbiorze'
          : 'Luki w zbiorze pozostają przerwą (brak interpolacji)'
        : view?.metric?.id === 'gus_intentional_homicide_victims'
          ? 'Seria GUS nie posiada przekroju wojewódzkiego'
          : 'Brak danych historycznych (brak interpolacji)';
      svgLine.appendChild(gapText);
    }

    compareContainerEl.appendChild(svgLine);
  }

  /**
   * Pomocnik: tworzy klikalny odnośnik do przypisu źródłowego dla identyfikatora źródła w sprawie/wzorcu DEMO.
   */
  function createCaseSourceRefNode(srcId, view, activeCase) {
    const footnotes = Array.isArray(view?.footnotes) ? view.footnotes : [];
    const matchedFn = footnotes.find(
      (f) => f && (f.id === srcId || f.footnoteRef === srcId || f.domId === srcId)
    );
    if (matchedFn) {
      const a = createEl('a', 'source-jump claim-ref', `[źródło: ${matchedFn.footnoteRef}] ↗`);
      a.href = `#${matchedFn.domId}`;
      return a;
    }
    const caseSources = Array.isArray(activeCase?.sources) ? activeCase.sources : [];
    const matchedCaseSrc = caseSources.find((s) => s && (s.id === srcId || s.url === srcId));
    if (matchedCaseSrc && matchedCaseSrc.url) {
      return createSafeExternalLink(matchedCaseSrc.url, `[źródło: ${matchedCaseSrc.id || srcId}] ↗`, 'claim-ref');
    }
    if (matchedCaseSrc && !matchedCaseSrc.url) {
      const citLabel =
        matchedCaseSrc.archiveCitationPl ||
        matchedCaseSrc.locatorPl ||
        matchedCaseSrc.title ||
        matchedCaseSrc.id ||
        srcId;
      return createEl(
        'span',
        'claim-ref archival-citation-badge',
        `[źródło archiwalne: ${citLabel}]`
      );
    }
    const defaultMapFn = footnotes.find((f) => f && f.id === 'src-prg-osm-cartography');
    if (defaultMapFn && (srcId === 'src-map-prg-osm' || srcId === '03')) {
      const a = createEl('a', 'source-jump claim-ref', `[źródło: ${defaultMapFn.footnoteRef}] ↗`);
      a.href = `#${defaultMapFn.domId}`;
      return a;
    }
    return createEl('span', 'claim-ref', `[źródło: ${srcId}]`);
  }

  /**
   * Renderuje pełne dossier wybranej sprawy lub wzorca DEMO (#case-sheet) obok mapy.
   */
  function renderCaseDossier(view) {
    const statsPaneEl = q('#statistics-pane');
    const caseSheetEl = q('#case-sheet');
    if (!statsPaneEl || !caseSheetEl) return;

    const activeCase =
      view?.selectedCase ||
      (typeof view?.selectedCaseId === 'string' ? getDemoFixtureById(view.selectedCaseId) : null) ||
      null;

    if (!activeCase) {
      caseSheetEl.hidden = true;
      statsPaneEl.hidden = false;
      const colocatedPanelEl = q('#case-colocated-panel');
      if (colocatedPanelEl) {
        colocatedPanelEl.hidden = true;
        colocatedPanelEl.replaceChildren();
      }
      syncMobileSheetState();
      document.body.classList.remove('case-open');
      return;
    }

    statsPaneEl.hidden = true;
    caseSheetEl.hidden = false;
    document.body.classList.add('case-open');

    const isDemo = Boolean(activeCase.isDemoFixture);
    const codeEl = q('#case-code');
    if (codeEl) {
      codeEl.textContent = isDemo
        ? `WZORZEC INTERAKCJI / ${activeCase.id}`
        : `SPRAWA ARCHIWUM / ${activeCase.id}`;
    }

    const occurredOnFormatted =
      activeCase.date_precision === 'year'
        ? `${activeCase.occurred_on || ''} (dokładność: rok)`
        : activeCase.date_precision === 'month'
          ? `${activeCase.occurred_on || ''} (dokładność: miesiąc)`
          : activeCase.occurred_on || '';

    const headingEl = q('#case-heading');
    if (headingEl) {
      headingEl.textContent =
        activeCase.titlePl ||
        `${activeCase.municipality || 'Miejsce'} · ${occurredOnFormatted}`;
    }

    const precisionBadge =
      activeCase.published_location?.precisionBadgePl ||
      (activeCase.location?.precision === 'exact_public_place'
        ? 'miejsce potwierdzone'
        : activeCase.location?.precision === 'street_segment'
          ? 'odcinek ulicy'
          : 'obszar przybliżony');

    const noticeEl = q('#case-notice');
    if (noticeEl) {
      const dateNote =
        !isDemo && (activeCase.date_precision === 'year' || activeCase.date_precision === 'month')
          ? ` · Data zdarzenia: ${occurredOnFormatted}`
          : '';
      noticeEl.textContent = isDemo
        ? `WZORZEC INTERAKCJI DEMO · NIE PRZEDSTAWIA ZDARZENIA · Precyzja geometryczna: ${precisionBadge}`
        : `PRECYZJA MIEJSCA: ${precisionBadge.toUpperCase()}${dateNote} · Weryfikacja redakcyjna: ${activeCase.reviewed_at || 'zatwierdzono'}`;
    }

    const summaryEl = q('#case-summary-text');
    if (summaryEl) {
      summaryEl.textContent = activeCase.summary || '';
    }

    const formatDossierField = (val) => {
      if (Array.isArray(val)) return val.filter(Boolean).join(' ');
      if (typeof val === 'string') return val.trim();
      return '';
    };

    const factsEl = q('#case-confirmed-facts');
    if (factsEl) {
      factsEl.textContent =
        formatDossierField(activeCase.dossier?.confirmedFactsPl) ||
        activeCase.summary ||
        'Potwierdzone ustalenia wynikające bezpośrednio z dokumentów źródłowych.';
    }

    const courseEl = q('#case-course-findings');
    if (courseEl) {
      const courseStr =
        formatDossierField(activeCase.dossier?.courseAndFindingsPl) ||
        [
          formatDossierField(activeCase.dossier?.allegationsPl),
          formatDossierField(activeCase.dossier?.legalFindingsPl)
        ]
          .filter(Boolean)
          .join(' ');
      courseEl.textContent =
        courseStr || 'Brak dodatkowego opisu przebiegu i ustaleń organów w tym rekordzie.';
    }

    const unknownsEl = q('#case-unknowns-limitations');
    if (unknownsEl) {
      const unknownsStr =
        formatDossierField(activeCase.dossier?.unknownsAndLimitationsPl) ||
        formatDossierField(activeCase.dossier?.uncertaintiesPl);
      unknownsEl.textContent =
        unknownsStr || 'Brak dodatkowych zastrzeżeń i ograniczeń źródłowych.';
    }

    const locationDescEl = q('#case-location-desc');
    if (locationDescEl) {
      const pubLoc = activeCase.published_location;
      locationDescEl.textContent = pubLoc
        ? `${pubLoc.publicLabelPl}. Decyzja publikacyjna: ${pubLoc.reviewDecision?.scopeNotePl || 'zatwierdzono po kontroli prywatności'} (${pubLoc.reviewDecision?.reviewedAt || activeCase.reviewed_at || ''}).`
        : `${activeCase.municipality} — lokalizacja przybliżona (ochrona prywatności).`;
    }

    const approvedCoordsEl = q('#case-approved-coords');
    if (approvedCoordsEl) {
      const lat = activeCase.location?.lat;
      const lng = activeCase.location?.lng;
      if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
        const isoLatStr = `${lat.toFixed(4)}°N`;
        const isoLngStr = `${lng.toFixed(4)}°E`;
        const plLatStr = `${lat.toFixed(4).replace('.', ',')}° N`;
        const plLngStr = `${lng.toFixed(4).replace('.', ',')}° E`;
        approvedCoordsEl.textContent = `Współrzędne zatwierdzone: ${isoLatStr}, ${isoLngStr} (${plLatStr}, ${plLngStr}) · Poziom precyzji: ${precisionBadge}. Ewentualne rozsunięcie nałożonych znaczników na mapie ma charakter wyłącznie wizualny i nie zmienia zatwierdzonej lokalizacji.`;
      } else {
        approvedCoordsEl.textContent = `Poziom precyzji: ${precisionBadge}. Lokalizacja publikowana zgodnie z ograniczeniem prywatności.`;
      }
    }

    const colocatedPanelEl = q('#case-colocated-panel');
    if (colocatedPanelEl) {
      let coLocatedList = [];
      if (Array.isArray(view?.coLocatedCases)) {
        if (view.coLocatedCases.length > 0 && Array.isArray(view.coLocatedCases[0]?.cases)) {
          const matchedGroup =
            view.coLocatedCases.find(
              (g) => Array.isArray(g.cases) && g.cases.some((c) => c.id === activeCase.id)
            ) || view.coLocatedCases[0];
          coLocatedList = Array.isArray(matchedGroup?.cases) ? matchedGroup.cases : [];
        } else {
          coLocatedList = view.coLocatedCases;
        }
      }
      if (coLocatedList.length > 1) {
        colocatedPanelEl.hidden = false;
        colocatedPanelEl.replaceChildren();
        colocatedPanelEl.appendChild(
          createEl(
            'p',
            'case-colocated-title',
            `Rekordy w tej samej lokalizacji (${coLocatedList.length}):`
          )
        );
        const btnGroup = createEl('div', 'case-colocated-buttons');
        for (const item of coLocatedList) {
          if (!item || !item.id) continue;
          const isCurrent = item.id === activeCase.id;
          const btn = createEl(
            'button',
            `case-colocated-btn${isCurrent ? ' is-active' : ''}`,
            `${item.id} · ${item.occurred_on || item.year || ''} (${item.municipality || 'sprawa'})`
          );
          btn.type = 'button';
          btn.dataset.caseId = item.id;
          btn.setAttribute('aria-pressed', String(isCurrent));
          btn.addEventListener('click', () => {
            dispatch({ type: 'SELECT_CASE', caseId: item.id });
          });
          btnGroup.appendChild(btn);
        }
        colocatedPanelEl.appendChild(btnGroup);
      } else {
        colocatedPanelEl.hidden = true;
        colocatedPanelEl.replaceChildren();
      }
    }

    // Sekcja: Wynik zdarzenia a status prawny
    const outcomeValEl = q('#case-outcome-value');
    if (outcomeValEl) {
      outcomeValEl.textContent =
        activeCase.outcomeLabelPl ||
        (activeCase.outcome === 'death'
          ? 'Zgon potwierdzony w źródle'
          : activeCase.outcome === 'attempted'
            ? 'Usiłowanie zabójstwa'
            : 'Zgodnie z kwalifikacją źródłową');
    }

    const legalValEl = q('#case-legal-value');
    if (legalValEl) {
      legalValEl.textContent =
        activeCase.legalStatusLabelPl ||
        `${activeCase.legal_status_detail || activeCase.legal_status || 'w toku'} (stan na: ${activeCase.status_updated_at || activeCase.reviewed_at || 'brak daty'})`;
    }

    const fatalValEl = q('#case-fatal-victims-value');
    if (fatalValEl) {
      if (isDemo) {
        fatalValEl.textContent = '0 (DEMO)';
      } else {
        const fatalCnt = Number.isSafeInteger(activeCase.victimCountFatal)
          ? activeCase.victimCountFatal
          : Number.isSafeInteger(activeCase.victim_count)
            ? activeCase.victim_count
            : activeCase.outcome === 'attempted'
              ? 0
              : 1;
        fatalValEl.textContent = `${fatalCnt} os.`;
      }
    }

    const injuredValEl = q('#case-injured-victims-value');
    if (injuredValEl) {
      if (isDemo) {
        injuredValEl.textContent = '0 (DEMO)';
      } else {
        const injCnt = Number.isSafeInteger(activeCase.victimCountInjured)
          ? activeCase.victimCountInjured
          : activeCase.outcome === 'attempted'
            ? 1
            : 0;
        injuredValEl.textContent = `${injCnt} os.`;
      }
    }

    const perpExcludedCellEl = q('#case-perp-excluded-cell');
    const perpExcludedValEl = q('#case-perp-excluded-value');
    const perpExcludedCnt = Number.isSafeInteger(activeCase.perpetratorFatalityCountExcluded)
      ? activeCase.perpetratorFatalityCountExcluded
      : 0;
    if (perpExcludedCellEl) {
      perpExcludedCellEl.hidden = isDemo || perpExcludedCnt <= 0;
    }
    if (perpExcludedValEl) {
      perpExcludedValEl.textContent = `${perpExcludedCnt} (wyłączono z liczby ofiar)`;
    }

    // Powiązane sprawy i wspólne śledztwo (relatedCaseIds, sharedInvestigationId)
    const linkedPanelEl = q('#case-linked-panel');
    if (linkedPanelEl) {
      const relIds = Array.isArray(activeCase.relatedCaseIds) ? activeCase.relatedCaseIds : [];
      const sharedInvId = activeCase.sharedInvestigationId || null;
      if (!isDemo && (relIds.length > 0 || sharedInvId)) {
        linkedPanelEl.hidden = false;
        linkedPanelEl.replaceChildren();
        const titleText = sharedInvId
          ? `Powiązane sprawy / wspólne postępowanie (${sharedInvId}):`
          : 'Powiązane sprawy w archiwum:';
        linkedPanelEl.appendChild(createEl('p', 'case-colocated-title', titleText));
        if (relIds.length > 0) {
          const btnGroup = createEl('div', 'case-colocated-buttons');
          for (const relId of relIds) {
            const btn = createEl('button', 'case-colocated-btn', `Otwórz sprawę powiązaną: ${relId} →`);
            btn.type = 'button';
            btn.dataset.relatedCaseId = relId;
            btn.addEventListener('click', () => {
              dispatch({ type: 'SELECT_CASE', caseId: relId, locateOnMap: true });
            });
            btnGroup.appendChild(btn);
          }
          linkedPanelEl.appendChild(btnGroup);
        }
      } else {
        linkedPanelEl.hidden = true;
        linkedPanelEl.replaceChildren();
      }
    }

    // Jawne niepewności i rozbieżności źródłowe (unresolvedDiscrepancies)
    const discrepanciesPanelEl = q('#case-discrepancies-panel');
    if (discrepanciesPanelEl) {
      const discs = Array.isArray(activeCase.unresolvedDiscrepancies)
        ? activeCase.unresolvedDiscrepancies.filter(Boolean)
        : [];
      if (!isDemo && discs.length > 0) {
        discrepanciesPanelEl.hidden = false;
        discrepanciesPanelEl.replaceChildren();
        discrepanciesPanelEl.appendChild(
          createEl('p', 'case-colocated-title', `Jawne niepewności źródłowe (${discs.length}):`)
        );
        const ul = createEl('ul', 'case-chrono-list');
        for (const d of discs) {
          const li = createEl('li', 'case-discrepancy-item');
          if (typeof d === 'object' && d !== null) {
            const descText = d.descriptionPl || d.summaryPl || d.notePl || d.topic || '';
            li.appendChild(createEl('span', null, `${descText} `));
            const dSrcIds = Array.isArray(d.sourceIds) ? d.sourceIds : [];
            dSrcIds.forEach((srcId, sIdx) => {
              if (sIdx > 0) li.appendChild(document.createTextNode(' '));
              li.appendChild(createCaseSourceRefNode(srcId, view, activeCase));
            });
          } else {
            li.textContent = String(d);
          }
          ul.appendChild(li);
        }
        discrepanciesPanelEl.appendChild(ul);
      } else {
        discrepanciesPanelEl.hidden = true;
        discrepanciesPanelEl.replaceChildren();
      }
    }

    // Lista twierdzeń powiązanych ze źródłami (claims)
    const claimsListEl = q('#case-claims-list');
    if (claimsListEl) {
      claimsListEl.replaceChildren();
      const claims = Array.isArray(activeCase.claims) ? activeCase.claims : [];
      for (const clm of claims) {
        const li = createEl('li', 'case-claim-item');
        const badge = createEl(
          'span',
          'claim-cat-badge',
          clm.categoryLabelPl ||
            (clm.category === 'court_finding'
              ? 'USTALENIE SĄDU'
              : clm.category === 'prosecutor_charge'
                ? 'ZARZUT PROKURATORSKI'
                : clm.category === 'official_statement'
                  ? 'KOMUNIKAT OFICJALNY'
                  : 'FAKT POTWIERDZONY')
        );
        const verifiedNote = clm.verifiedAt ? ` (weryfikacja: ${clm.verifiedAt}) ` : ' ';
        const text = createEl('span', 'claim-text', ` ${clm.textPl}${verifiedNote}`);
        li.append(badge, text);
        const srcIds = Array.isArray(clm.sourceIds) ? clm.sourceIds : [];
        srcIds.forEach((srcId, sIdx) => {
          if (sIdx > 0) li.appendChild(document.createTextNode(' '));
          li.appendChild(createCaseSourceRefNode(srcId, view, activeCase));
        });
        claimsListEl.appendChild(li);
      }
    }

    // Chronologia postępowania
    const chronologyListEl = q('#case-chronology-list');
    if (chronologyListEl) {
      chronologyListEl.replaceChildren();
      const items = Array.isArray(activeCase.chronology) ? activeCase.chronology : [];
      if (items.length === 0) {
        chronologyListEl.appendChild(
          createEl('li', null, `${occurredOnFormatted} — Rejestracja i weryfikacja sprawy w archiwum.`)
        );
      } else {
        for (const item of items) {
          const li = createEl('li', 'case-chrono-item');
          const dt = createEl('strong', 'chrono-date', `${item.date}: `);
          const lb = createEl('span', null, `${item.labelPl} `);
          li.append(dt, lb);
          const srcIds = Array.isArray(item.sourceIds) ? item.sourceIds : [];
          srcIds.forEach((srcId, sIdx) => {
            if (sIdx > 0) li.appendChild(document.createTextNode(' '));
            li.appendChild(createCaseSourceRefNode(srcId, view, activeCase));
          });
          chronologyListEl.appendChild(li);
        }
      }
    }

    // Źródła i dziennik korekt
    const sourcesListEl = q('#case-sources-list');
    if (sourcesListEl) {
      sourcesListEl.replaceChildren();
      const urls = Array.isArray(activeCase.source_urls) ? activeCase.source_urls : [];
      const caseSources = Array.isArray(activeCase.sources) ? activeCase.sources : [];
      for (let idx = 0; idx < urls.length; idx++) {
        const u = urls[idx];
        const matchedSource = caseSources.find((s) => s && s.url === u);
        let labelText = `Dokument źródłowy #${idx + 1} ↗`;
        if (matchedSource && (matchedSource.title || matchedSource.publisher || matchedSource.institution)) {
          const pub = matchedSource.publisher || matchedSource.institution || '';
          const title = matchedSource.title || 'Dokument źródłowy';
          const pubDateSuffix = matchedSource.publishedAt ? `, opubl. ${matchedSource.publishedAt}` : '';
          labelText = pub
            ? `${title} (${pub}${pubDateSuffix}) ↗`
            : `${title}${matchedSource.publishedAt ? ` (opubl. ${matchedSource.publishedAt})` : ''} ↗`;
        } else {
          try {
            const host = new URL(u).hostname.replace(/^www\./i, '');
            labelText = `Dokument źródłowy #${idx + 1} (${host}) ↗`;
          } catch {
            labelText = `Dokument źródłowy #${idx + 1} ↗`;
          }
        }
        const li = createEl('li', 'case-source-item');
        li.appendChild(createSafeExternalLink(u, labelText, 'case-source-link'));
        sourcesListEl.appendChild(li);
      }
      for (const s of caseSources) {
        if (!s || s.url) continue;
        const citText = s.archiveCitationPl || s.locatorPl || s.publisher || s.id || '';
        const titlePrefix = s.title ? `${s.title} — ` : '';
        const li = createEl('li', 'case-source-item');
        li.appendChild(
          createEl(
            'span',
            'archival-citation-badge',
            `Źródło archiwalne / biblioteczne (offline): ${titlePrefix}${citText}`
          )
        );
        sourcesListEl.appendChild(li);
      }
      const corrections = Array.isArray(activeCase.corrections) ? activeCase.corrections : [];
      for (const corr of corrections) {
        const li = createEl('li', 'case-correction-item');
        li.appendChild(createEl('span', null, `Korekta / wpis (${corr.correctedAt}): ${corr.summaryPl} `));
        const corrSrcIds = Array.isArray(corr.sourceIds) ? corr.sourceIds : [];
        corrSrcIds.forEach((srcId, sIdx) => {
          if (sIdx > 0) li.appendChild(document.createTextNode(' '));
          li.appendChild(createCaseSourceRefNode(srcId, view, activeCase));
        });
        sourcesListEl.appendChild(li);
      }
    }
  }

  /**
   * Renderuje wspólną oś czasu (1999–2025 oraz ewentualne lata spraw 2026+) z przyciskami lat i linijką dostępności.
   */
  function renderTimeline(view) {
    const activeYear = view?.year ?? 2025;
    const yearButtonsContainer = q('#year-buttons');
    const rulerContainer = q('#timeline-ruler');

    const dynamicPost2025Years = new Set();
    if (Array.isArray(view?.timelineYears)) {
      for (const yr of view.timelineYears) {
        const numYr = Number(yr);
        if (Number.isInteger(numYr) && numYr > 2025) {
          dynamicPost2025Years.add(numYr);
        }
      }
    }
    if (view?.yearAvailability) {
      for (const [yrStr, info] of Object.entries(view.yearAvailability)) {
        const numYr = Number(yrStr);
        if (
          Number.isInteger(numYr) &&
          numYr > 2025 &&
          (info?.hasAnyData || info?.hasCases || info?.casesOnly || numYr === activeYear)
        ) {
          dynamicPost2025Years.add(numYr);
        }
      }
    }
    if (Number.isInteger(activeYear) && activeYear > 2025) {
      dynamicPost2025Years.add(activeYear);
    }
    const sortedPost2025Years = Array.from(dynamicPost2025Years).sort((a, b) => a - b);

    if (yearButtonsContainer) {
      yearButtonsContainer.querySelectorAll('[data-year]').forEach((btn) => {
        const yr = Number(btn.dataset.year);
        if (yr > 2025 && !dynamicPost2025Years.has(yr)) {
          btn.remove();
        }
      });
      const nextBtn = yearButtonsContainer.querySelector('#next-year');
      for (const yr of sortedPost2025Years) {
        if (!yearButtonsContainer.querySelector(`[data-year="${yr}"]`)) {
          const dynBtn = createEl('button', 'year-button cases-only', String(yr));
          dynBtn.type = 'button';
          dynBtn.dataset.year = String(yr);
          dynBtn.setAttribute('aria-pressed', String(yr === activeYear));
          if (nextBtn) {
            yearButtonsContainer.insertBefore(dynBtn, nextBtn);
          } else {
            yearButtonsContainer.appendChild(dynBtn);
          }
        }
      }
    }

    if (rulerContainer) {
      rulerContainer.querySelectorAll('[data-tick]').forEach((tickEl) => {
        const yr = Number(tickEl.dataset.tick);
        if (yr > 2025 && !dynamicPost2025Years.has(yr)) {
          tickEl.remove();
        }
      });
      for (const yr of sortedPost2025Years) {
        if (!rulerContainer.querySelector(`[data-tick="${yr}"]`)) {
          const dynTick = createEl('div', 'tick available cases-only');
          dynTick.dataset.tick = String(yr);
          dynTick.appendChild(createEl('span', null, String(yr)));
          rulerContainer.appendChild(dynTick);
        }
      }
    }

    const availableYears = [];
    if (view?.yearAvailability) {
      for (const [yrStr, info] of Object.entries(view.yearAvailability)) {
        const yr = Number(yrStr);
        const hasAnyData = Boolean(
          info?.hasAnyData ||
            info?.hasNational ||
            info?.hasRegionalApproved ||
            info?.hasRegionalUnreviewed ||
            info?.hasCases ||
            info?.casesOnly
        );
        if (hasAnyData && !availableYears.includes(yr)) {
          availableYears.push(yr);
        }
      }
      availableYears.sort((a, b) => a - b);
    }
    for (const yr of sortedPost2025Years) {
      if (!availableYears.includes(yr)) {
        availableYears.push(yr);
      }
    }
    availableYears.sort((a, b) => a - b);
    if (availableYears.length === 0) {
      availableYears.push(2024, 2025);
    }

    if (prevYearBtn) {
      const idx = availableYears.indexOf(activeYear);
      prevYearBtn.disabled = idx <= 0;
    }
    if (nextYearBtn) {
      const idx = availableYears.indexOf(activeYear);
      nextYearBtn.disabled = idx === -1 || idx >= availableYears.length - 1;
    }

    if (yearButtonsContainer) {
      const existingBtns = yearButtonsContainer.querySelectorAll('[data-year]');
      if (existingBtns.length > 0) {
        existingBtns.forEach((btn) => {
          const yr = Number(btn.dataset.year);
          const isAvail = availableYears.includes(yr);
          const isCasesOnly = Boolean(yr > 2025 || view?.yearAvailability?.[yr]?.casesOnly);
          btn.classList.toggle('cases-only', isCasesOnly);
          btn.disabled = !isAvail;
          btn.setAttribute('aria-disabled', String(!isAvail));
          btn.setAttribute('aria-pressed', String(yr === activeYear));
          if (!btn.dataset.bound) {
            btn.dataset.bound = 'true';
            btn.addEventListener('click', () => {
              if (btn.disabled) return;
              dispatch({ type: 'SET_YEAR', year: yr });
            });
          }
        });
      }
    }

    if (rulerContainer) {
      rulerContainer.querySelectorAll('[data-tick]').forEach((tickEl) => {
        const yr = Number(tickEl.dataset.tick);
        const isAvail = availableYears.includes(yr);
        const isCasesOnly = Boolean(yr > 2025 || view?.yearAvailability?.[yr]?.casesOnly);
        tickEl.classList.toggle('available', isAvail);
        tickEl.classList.toggle('active', yr === activeYear);
        tickEl.classList.toggle('cases-only', isCasesOnly);
        tickEl.setAttribute('role', 'button');
        tickEl.setAttribute('aria-disabled', String(!isAvail));
        tickEl.setAttribute('tabindex', isAvail ? '0' : '-1');
        tickEl.setAttribute(
          'aria-label',
          isAvail
            ? isCasesOnly
              ? `Wybierz rok ${yr} (wyłącznie sprawy indywidualne — brak rocznych tabel KGP/GUS)`
              : `Wybierz rok ${yr}`
            : `Rok ${yr} (brak danych dla wybranej serii)`
        );
        if (!tickEl.dataset.bound) {
          tickEl.dataset.bound = 'true';
          const activateTick = () => {
            if (!tickEl.classList.contains('available')) return;
            dispatch({ type: 'SET_YEAR', year: yr });
          };
          tickEl.addEventListener('click', activateTick);
          tickEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              activateTick();
            } else if (
              e.key === 'ArrowLeft' ||
              e.key === 'ArrowRight' ||
              e.key === 'Home' ||
              e.key === 'End'
            ) {
              const availTicks = Array.from(
                rulerContainer.querySelectorAll('[data-tick].available')
              );
              const curIdx = availTicks.indexOf(tickEl);
              if (curIdx === -1 || availTicks.length === 0) return;
              e.preventDefault();
              let nextIdx = curIdx;
              if (e.key === 'ArrowLeft') nextIdx = Math.max(0, curIdx - 1);
              else if (e.key === 'ArrowRight') nextIdx = Math.min(availTicks.length - 1, curIdx + 1);
              else if (e.key === 'Home') nextIdx = 0;
              else if (e.key === 'End') nextIdx = availTicks.length - 1;
              const targetTick = availTicks[nextIdx];
              if (targetTick) {
                const targetYr = Number(targetTick.dataset.tick);
                dispatch({ type: 'SET_YEAR', year: targetYr });
                if (typeof targetTick.focus === 'function') targetTick.focus();
              }
            }
          });
        }
      });
    }

    const timelineNoteEl = q('.timeline-note');
    if (timelineNoteEl) {
      if (activeYear > 2025 || sortedPost2025Years.length > 0) {
        timelineNoteEl.textContent =
          'Oficjalne roczne serie statystyczne KGP i GUS BDL obejmują 27 lat (1999–2025). Roczniki 2026+ prezentują wyłącznie indywidualnie zweryfikowane sprawy z archiwum (bez fabrykowania nieopublikowanych tabel KGP/GUS).';
      } else {
        timelineNoteEl.textContent =
          view?.metric?.id === 'gus_intentional_homicide_victims'
            ? 'Seria GUS „Ofiary zabójstw” obejmuje lata 2013–2024 (12 przekrojów rocznych). Lata spoza zakresu serii są nieaktywne.'
            : 'Wszystkie 27 lat (1999–2025) zawiera pełne serie KGP (art. 148 k.k.) i GUS BDL. Kliknij dowolny znacznik roku na osi, aby przełączyć przekrój.';
      }
    }
  }

  /**
   * Renderuje dostępną tabelę HTML 16 województw (pełna równoważność z mapą).
   */
  function renderAccessibleTable(view) {
    const tbodyEl = q('#atlas-table-body');
    if (!tbodyEl) return;

    if (tableFilterEl && view?.tableCounts) {
      const tc = view.tableCounts;
      const optAll = tableFilterEl.querySelector('option[value="all"]');
      const optObs = tableFilterEl.querySelector('option[value="observed"]');
      const optMis = tableFilterEl.querySelector('option[value="missing"]');
      if (optAll) optAll.textContent = `Wszystkie województwa (${tc.all})`;
      if (optObs) optObs.textContent = `Z wpisem w zbiorze (${tc.observed})`;
      if (optMis) optMis.textContent = `Brak / nie dotyczy (${tc.missing})`;
    }

    const sortCfg = view?.tableSort || localSort;
    rootEl.querySelectorAll('.sort-btn').forEach((btn) => {
      const key = btn.dataset.sort;
      const th = btn.closest('th');
      if (key === sortCfg.key) {
        th?.setAttribute('aria-sort', sortCfg.dir === 'asc' ? 'ascending' : 'descending');
        btn.dataset.dir = sortCfg.dir;
      } else {
        th?.setAttribute('aria-sort', 'none');
        delete btn.dataset.dir;
      }
    });

    const visibleRows = getVisibleTableRows(view);
    tbodyEl.replaceChildren();

    const year = view?.year ?? 2025;
    const isGus = view?.metric?.id === 'gus_intentional_homicide_victims';
    const isRate = view?.displayType === 'rate_per_100k';
    const compareIds = view?.compareAreas || view?.compareAreaIds || [];
    const tableYearHeaderEl = q('#table-year-col');
    if (tableYearHeaderEl) {
      tableYearHeaderEl.textContent = `Wartość (${year})`;
    }

    if (visibleRows.length === 0) {
      const tr = createEl('tr', 'table-empty-row');
      const td = createEl('td', null, 'Brak województw spełniających wybrane kryteria filtra.');
      td.colSpan = 7;
      tr.appendChild(td);
      tbodyEl.appendChild(tr);
      return;
    }

    for (const row of visibleRows) {
      const isObs = row.availability === 'observed' && row.displayValue !== null && row.displayValue !== undefined;
      const isNotApplicable = row.availability === 'not_applicable';
      const isSelected = Boolean(row.isSelected || row.areaId === view?.selectedAreaId);
      const isCompared = Boolean(row.isCompared || compareIds.includes(row.areaId));

      const tr = createEl(
        'tr',
        `atlas-table-row${isSelected ? ' is-selected' : ''}${isCompared ? ' is-compared' : ''}${!isObs ? ' is-missing' : ''}`
      );
      tr.dataset.area = row.areaId;

      const tdTeryt = createEl('td', 'col-teryt', row.areaId);
      const tdName = createEl('th', 'col-name');
      tdName.scope = 'row';
      const selectNameBtn = createEl('button', 'table-area-link', row.name);
      selectNameBtn.type = 'button';
      selectNameBtn.addEventListener('click', () => {
        mobileSheetOpen = true;
        syncMobileSheetState();
        dispatch({ type: 'SELECT_AREA', areaId: row.areaId });
      });
      tdName.appendChild(selectNameBtn);

      const tdValText = isObs
        ? row.formattedValue
        : isNotApplicable
          ? '— (tylko Polska)'
          : '— (brak wpisu)';
      const tdVal = createEl('td', `col-value${!isObs ? ' val-missing' : ''}`, tdValText);

      const unitText = isRate
        ? 'czynów na 100 tys. ludności'
        : isGus
          ? 'osób zmarłych (tylko Polska)'
          : 'czynów z art. 148 k.k.';
      const tdUnit = createEl('td', 'col-unit', unitText);

      const tdStatus = createEl(
        'td',
        `col-status ${isObs ? 'status-observed' : 'status-missing'}`,
        row.statusLabelPl || (isObs ? 'Wtórne · niezweryfikowane' : 'Brak w zbiorze (≠ 0)')
      );

      const tdSource = createEl('td', 'col-source');
      const srcRef = row.source?.footnoteRef || '02';
      const srcDomId = row.source?.domId || 'source-regional';
      const srcLinkText = isObs
        ? `Przypis [${srcRef}] ↗`
        : isNotApplicable
          ? `Przypis GUS [${srcRef}] ↗`
          : `Granica zbioru [${srcRef}] ↗`;
      const srcLink = createEl('a', 'source-jump table-source-link', srcLinkText);
      srcLink.href = `#${srcDomId}`;
      tdSource.appendChild(srcLink);

      if (isRate && row.populationSource) {
        tdSource.appendChild(createEl('span', 'table-source-sep', ' + '));
        const denomLink = createEl(
          'a',
          'source-jump table-source-link',
          `GUS [${row.populationSource.footnoteRef || '07'}] ↗`
        );
        denomLink.href = `#${row.populationSource.domId || 'source-gus-population'}`;
        tdSource.appendChild(denomLink);
      }

      const tdActions = createEl('td', 'col-actions');
      const focusBtn = createEl('button', 'table-action-btn', isSelected ? 'Wybrano' : 'Pokaż w dossier');
      focusBtn.type = 'button';
      focusBtn.setAttribute('aria-pressed', String(isSelected));
      focusBtn.addEventListener('click', () => {
        mobileSheetOpen = true;
        syncMobileSheetState();
        dispatch({ type: 'SELECT_AREA', areaId: row.areaId, flyTo: true });
        mapActions.focusArea?.(row.areaId);
      });

      const cmpBtn = createEl('button', 'table-action-btn', isCompared ? '✓ W porównaniu' : '+ Porównaj');
      cmpBtn.type = 'button';
      cmpBtn.setAttribute('aria-pressed', String(isCompared));
      cmpBtn.addEventListener('click', () => {
        dispatch({ type: 'TOGGLE_COMPARE_AREA', areaId: row.areaId });
      });

      tdActions.append(focusBtn, cmpBtn);
      tr.append(tdTeryt, tdName, tdVal, tdUnit, tdStatus, tdSource, tdActions);
      tbodyEl.appendChild(tr);
    }
  }

  /**
   * Renderuje i aktualizuje wszystkie przypisy źródłowe (#sources) na podstawie katalogu view.footnotes.
   */
  function renderSourcesSection(view) {
    const sourcesSectionEl = q('#sources');
    if (!sourcesSectionEl || !Array.isArray(view?.footnotes) || view.footnotes.length === 0) return;

    for (const fn of view.footnotes) {
      if (!fn || !fn.domId) continue;
      let detailsEl = sourcesSectionEl.querySelector(`#${fn.domId}`);
      const wasOpen = detailsEl ? detailsEl.open : false;
      if (!detailsEl) {
        detailsEl = createEl('details');
        detailsEl.id = fn.domId;
        sourcesSectionEl.appendChild(detailsEl);
      }
      detailsEl.replaceChildren();
      detailsEl.open = wasOpen;

      const summaryEl = createEl(
        'summary',
        null,
        `[${fn.footnoteRef || '01'}] ${fn.sectionLabelPl || fn.title || 'Źródło katalogowe'}`
      );
      detailsEl.appendChild(summaryEl);

      const metaP = createEl('p');
      const refSpan = createEl(
        'span',
        'reference',
        `DOKUMENT: ${fn.title || ''} · PUBLIKUJĄCY: ${fn.publisher || ''}`
      );
      metaP.appendChild(refSpan);
      const locatorPart = fn.locatorPl ? `${fn.locatorPl}. ` : '';
      const pubDatePart = fn.publishedAt ? `Data publikacji: ${fn.publishedAt} · ` : '';
      const retDatePart = fn.retrievedAt ? `Data pobrania: ${fn.retrievedAt}` : '';
      const shaPart = fn.sha256 ? ` · SHA-256: ${fn.sha256}.` : '.';
      metaP.appendChild(document.createTextNode(`${locatorPart}${pubDatePart}${retDatePart}${shaPart}`));
      detailsEl.appendChild(metaP);

      if (fn.limitationsPl) {
        detailsEl.appendChild(createEl('p', null, `Zakres i ograniczenia: ${fn.limitationsPl}`));
      }

      if (fn.url) {
        const linkP = createEl('p');
        linkP.appendChild(
          createSafeExternalLink(fn.url, `Otwórz źródło zewnętrzne (${fn.publisher || 'link'}) ↗`)
        );
        detailsEl.appendChild(linkP);
      } else if (
        fn.isOfflineArchival ||
        fn.archiveCitationPl ||
        fn.category === 'archival_document' ||
        fn.category === 'court_record_offline' ||
        fn.sourceClass === 'archival_document' ||
        fn.sourceClass === 'court_record_offline'
      ) {
        const citP = createEl('p');
        citP.appendChild(
          createEl(
            'span',
            'archival-citation-badge',
            `Źródło archiwalne / biblioteczne (offline): ${fn.archiveCitationPl || fn.locatorPl || fn.title || ''}`
          )
        );
        detailsEl.appendChild(citP);
      }
    }
  }

  /**
   * Renderuje sekcję archiwum spraw (#case-note) z uczciwym pustym stanem, gdy brak zatwierdzonych spraw.
   */
  function renderCaseArchiveStatus(view) {
    const archiveCountEl = q('#archive-approved-count');
    const demoExplanationEl = q('#archive-demo-explanation');
    const caseNoteEl = q('#case-note');
    const approvedCases = Array.isArray(view?.publishedCases) ? view.publishedCases : [];
    const totalCases = Number.isInteger(view?.publishedCasesTotalCount)
      ? view.publishedCasesTotalCount
      : approvedCases.length;
    const summary = view?.caseArchiveSummary || null;
    const activeYear = view?.year ?? 2025;
    if (archiveCountEl) {
      archiveCountEl.textContent =
        totalCases === 0
          ? '0 zatwierdzonych spraw w publicznym pliku data/cases.json (uczciwy pusty stan archiwum)'
          : `${approvedCases.length} zatwierdzonych spraw w roku ${activeYear} (${totalCases} ogółem w data/cases.json: ${summary?.completedHomicideCount ?? 0} zabójstw dokonanych, ${summary?.attemptedHomicideCount ?? 0} usiłowań zabójstwa)`;
    }
    if (demoExplanationEl) {
      demoExplanationEl.textContent =
        totalCases === 0
          ? 'Widoczne na mapie znaczniki DEMO w Warszawie prezentują wyłącznie docelowy wzorzec interakcji i nie przedstawiają rzeczywistych zdarzeń.'
          : `W całym kuratorowanym archiwum (1999–2026) udokumentowano ${summary?.fatalVictimCount ?? 0} ofiar śmiertelnych oraz ${summary?.injuredVictimCount ?? 0} osób rannych/pokrzywdzonych (ponadto ${summary?.excludedPerpetratorFatalityCount ?? 0} zgonów sprawców wyłączono z licznika ofiar). Archiwum ma charakter wybiórczy i dokumentacyjny — nie stanowi pełnego rejestru przestępczości.`;
    }
    if (caseNoteEl) {
      let archiveListEl = caseNoteEl.querySelector('#case-archive-list');
      if (approvedCases.length === 0 && totalCases === 0) {
        if (archiveListEl) {
          archiveListEl.hidden = true;
          archiveListEl.replaceChildren();
        }
      } else {
        if (!archiveListEl) {
          archiveListEl = createEl('div', 'case-archive-list');
          archiveListEl.id = 'case-archive-list';
          caseNoteEl.appendChild(archiveListEl);
        }
        archiveListEl.hidden = false;
        archiveListEl.replaceChildren();
        if (summary?.distinctionLabelPl) {
          const distEl = createEl('p', 'case-archive-distinction', summary.distinctionLabelPl);
          distEl.id = 'archive-vs-police-distinction';
          archiveListEl.appendChild(distEl);
        }
        if (summary) {
          const metricsGrid = createEl('div', 'case-status-grid case-archive-metrics-grid');
          metricsGrid.id = 'case-archive-metrics-grid';
          const metricCells = [
            {
              label: `1. CZYNY STWIERDZONE KGP (${activeYear})`,
              value:
                summary.nationalPoliceRecordedCount !== null &&
                summary.nationalPoliceRecordedCount !== undefined
                  ? `${summary.nationalPoliceRecordedCount} czynów (Polska)`
                  : `brak tabeli rocznej KGP (${activeYear})`
            },
            {
              label: `2. SPRAWY W ARCHIWUM (${activeYear} / OGÓŁEM)`,
              value: `${summary.yearTotalArchiveCount ?? approvedCases.length} w ${activeYear} r. / ${summary.totalArchiveCount ?? totalCases} ogółem`
            },
            {
              label: `3. ZABÓJSTWA DOKONANE (${activeYear} / OGÓŁEM)`,
              value: `${summary.yearCompletedHomicideCount ?? 0} w ${activeYear} r. / ${summary.completedHomicideCount ?? 0} ogółem`
            },
            {
              label: `4. USIŁOWANIA ZABÓJSTWA (${activeYear} / OGÓŁEM)`,
              value: `${summary.yearAttemptedHomicideCount ?? 0} w ${activeYear} r. / ${summary.attemptedHomicideCount ?? 0} ogółem`
            },
            {
              label: `5. OFIARY ŚMIERTELNE (${activeYear} / OGÓŁEM)`,
              value: `${summary.yearFatalVictimCount ?? 0} w ${activeYear} r. / ${summary.fatalVictimCount ?? 0} ogółem`
            },
            {
              label: `6. OSOBY RANNE / POKRZYWDZONE (${activeYear} / OGÓŁEM)`,
              value: `${summary.yearInjuredVictimCount ?? 0} w ${activeYear} r. / ${summary.injuredVictimCount ?? 0} ogółem`
            }
          ];
          for (const mc of metricCells) {
            const cell = createEl('div', 'case-status-cell');
            cell.append(createEl('small', null, mc.label), createEl('strong', null, mc.value));
            metricsGrid.appendChild(cell);
          }
          archiveListEl.appendChild(metricsGrid);
        }
        if (summary?.geographicHonestyNotePl) {
          archiveListEl.appendChild(
            createEl('p', 'case-archive-honesty-note', summary.geographicHonestyNotePl)
          );
        }
        const itemsWrap = createEl('div', 'co-located-list');
        for (const c of approvedCases) {
          if (!c || !c.id) continue;
          const prec = c.published_location?.precision || c.location?.precision || 'municipality';
          const precLabel =
            prec === 'exact_public_place'
              ? 'miejsce publiczne (dokładne)'
              : prec === 'street_segment'
                ? 'odcinek ulicy'
                : 'obszar przybliżony (gmina/dzielnica)';
          const outcomeTag =
            (c.outcome || 'death') === 'attempted' ? 'USIŁOWANIE ZABÓJSTWA' : 'ZABÓJSTWO DOKONANE';
          const btn = createEl('button', 'co-located-item case-archive-item');
          btn.type = 'button';
          btn.dataset.caseId = c.id;
          btn.dataset.outcome = c.outcome || 'death';
          btn.append(
            createEl(
              'span',
              'co-located-badge',
              `${c.occurred_on || ''} · ${outcomeTag} · TERYT ${c.voivodeship_teryt} · ${precLabel}`
            ),
            createEl('strong', 'co-located-item-title', c.titlePl || c.published_location?.publicLabelPl || c.municipality || c.id),
            createEl('span', 'co-located-item-sub', `${c.summary || ''} · Otwórz pełne dossier i pokaż na mapie →`)
          );
          btn.addEventListener('click', () => {
            mobileSheetOpen = true;
            syncMobileSheetState();
            dispatch({ type: 'SELECT_CASE', caseId: c.id });
            mapActions.focusCase?.(c);
          });
          itemsWrap.appendChild(btn);
        }
        archiveListEl.appendChild(itemsWrap);
      }
    }
  }

  /**
   * Aktualizuje region aria-live po zatwierdzeniu wyboru.
   */
  function updateLiveAnnouncement(view) {
    const statusEl = q('#selection-status');
    if (!statusEl) return;
    const text = view?.liveAnnouncementPl || '';
    if (text && text !== lastAnnouncement) {
      lastAnnouncement = text;
      statusEl.textContent = text;
    }
  }

  function update(view) {
    latestView = view;
    const nextAreaId = view?.selectedAreaId ?? view?.selectedArea?.areaId ?? null;
    if (lastSelectedAreaId === null) {
      lastSelectedAreaId = nextAreaId;
    } else if (nextAreaId !== lastSelectedAreaId) {
      lastSelectedAreaId = nextAreaId;
      if (nextAreaId && nextAreaId !== 'PL' && typeof window !== 'undefined' && window.innerWidth <= 720) {
        mobileSheetOpen = true;
        syncMobileSheetState();
      }
    }

    renderDossierContextBar(view);
    renderMetricSelectorAndBlockBanner(view);
    renderMapHeaderAndLegend(view);
    renderNationalAndRegionalDossier(view);
    renderMultiAreaComparison(view);
    renderCaseDossier(view);
    renderTimeline(view);
    renderAccessibleTable(view);
    renderSourcesSection(view);
    renderCaseArchiveStatus(view);
    updateLiveAnnouncement(view);
  }

  function destroy() {
    rootEl.removeEventListener('click', onDocumentClick);
    rootEl.removeEventListener('keydown', onDocumentKeydown);
  }

  return {
    update,
    destroy
  };
}
