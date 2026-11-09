import { adaptDataset } from './core/adapter.mjs';
import {
  createStore,
  buildObservationsCsv,
  buildObservationsJson
} from './core/state.mjs';
import { bindUrlNavigation } from './core/url.mjs';
import { mountMap } from './map/map.mjs';
import { mountPanel } from './ui/panel.mjs';

/**
 * Fetches a required JSON resource and throws if HTTP status is not OK.
 *
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchRequiredJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} przy wczytywaniu ${url}`);
  }
  return response.json();
}

/**
 * Fetches an optional JSON resource; returns null when not present (e.g. 404).
 *
 * @param {string} url
 * @returns {Promise<any | null>}
 */
async function fetchOptionalJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Triggers a client-side file download using a temporary Blob URL.
 *
 * @param {string} content
 * @param {string} mimeType
 * @param {string} filename
 */
function triggerFileDownload(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Initializes the Poland Homicide Atlas application.
 */
async function bootstrapAtlas() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  try {
    const [
      national,
      provinces,
      regional,
      cases,
      release,
      sources,
      series,
      observations,
      population
    ] = await Promise.all([
      fetchRequiredJson('./data/national.json'),
      fetchRequiredJson('./data/provinces.json'),
      fetchRequiredJson('./data/regional.json'),
      fetchRequiredJson('./data/cases.json'),
      fetchRequiredJson('./data/release.json'),
      fetchRequiredJson('./data/sources.json'),
      fetchRequiredJson('./data/series.json'),
      fetchRequiredJson('./data/observations.json'),
      fetchRequiredJson('./data/population.json')
    ]);

    const dataset = adaptDataset({
      national,
      provinces,
      regional,
      cases,
      release,
      sources,
      series,
      observations,
      population
    });

    const store = createStore(dataset, window.location.search);
    bindUrlNavigation(store, window);

    const mapController = mountMap(mapEl, {
      onSelectArea(areaId) {
        store.dispatch({ type: 'SELECT_AREA', areaId });
      },
      onToggleCompare(areaId) {
        store.dispatch({ type: 'TOGGLE_COMPARE_AREA', areaId });
      },
      onSelectCase(caseId) {
        store.dispatch({ type: 'SELECT_CASE', caseId });
      },
      onToggleDemo(enabled) {
        store.dispatch({ type: 'TOGGLE_DEMO_FIXTURES', enabled });
      },
      onToggleLayer(layer, enabled) {
        store.dispatch({ type: 'TOGGLE_MAP_LAYER', layer, enabled });
      },
      onGeometryStatus(payload) {
        store.dispatch({
          type: 'SET_GEOMETRY_STATUS',
          fallbackActive: Boolean(payload?.fallbackActive)
        });
      },
      onTileStatus(payload) {
        store.dispatch({
          type: 'SET_TILE_STATUS',
          hasError: Boolean(payload?.hasError)
        });
      }
    });

    window.__atlasStore = store;
    window.__atlasMap = mapController;

    const panelController = mountPanel(document.body, {
      dispatch(action) {
        store.dispatch(action);
      },
      mapActions: mapController,
      onExportCsv(view) {
        const currentView = view || store.getView();
        const csv = buildObservationsCsv(currentView);
        const filename = `poland-homicide-atlas-${currentView.year}-${currentView.selectedMetricOption}.csv`;
        triggerFileDownload(csv, 'text/csv;charset=utf-8;', filename);
      },
      onExportJson(view) {
        const currentView = view || store.getView();
        const json = buildObservationsJson(currentView);
        const filename = `poland-homicide-atlas-${currentView.year}-${currentView.selectedMetricOption}.json`;
        triggerFileDownload(json, 'application/json;charset=utf-8;', filename);
      }
    });

    store.subscribe((view) => {
      mapController.update(view);
      panelController.update(view);
    });

    const initialView = store.getView();
    mapController.update(initialView);
    panelController.update(initialView);

    if (initialView.selectedCaseId) {
      requestAnimationFrame(() => {
        mapController.focusCase(initialView.selectedCaseId);
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Nie udało się wczytać plików danych atlasu.';
    const statusEl = document.getElementById('selection-status');
    if (statusEl) {
      statusEl.textContent = `Błąd inicjalizacji danych: ${message}`;
    }
    const bannerEl = document.getElementById('metric-block-banner');
    const bannerTextEl = document.getElementById('metric-block-text');
    if (bannerEl) {
      bannerEl.hidden = false;
      bannerEl.classList.add('is-error');
      if (bannerTextEl) {
        bannerTextEl.textContent = `Błąd wczytywania danych: ${message}`;
      } else {
        bannerEl.textContent = `Błąd wczytywania danych: ${message}`;
      }
    }
    for (const id of ['national-value', 'area-value', 'coverage']) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '— (błąd wczytywania danych)';
      }
    }
    const tbodyEl = document.getElementById('atlas-table-body');
    if (tbodyEl) {
      tbodyEl.replaceChildren();
      const tr = document.createElement('tr');
      tr.className = 'table-empty-row is-error';
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = `Błąd wczytywania danych: ${message}`;
      tr.appendChild(td);
      tbodyEl.appendChild(tr);
    }
  }
}

bootstrapAtlas();
