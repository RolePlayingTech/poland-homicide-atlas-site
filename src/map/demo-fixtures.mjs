/**
 * Jawnie oznaczone fixture'y interfejsu (DEMO) służące wyłącznie do weryfikacji
 * pętli interakcji na głównej mapie: klaster -> przybliżenie do ulic OSM ->
 * rozdzielenie punktów -> podgląd (tooltip) -> pinezka / odcinek ulicy / obszar ->
 * pełne dossier wzorcowe obok mapy.
 *
 * UWAGA: Te obiekty NIE są rekordami spraw, NIE pochodzą z data/cases.json
 * i NIGDY nie są dołączane do eksportów danych (CSV / JSON).
 */

const deepFreeze = (obj) => {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
};

export const DEMO_CLUSTER_CENTER = deepFreeze({
  lat: 52.2486,
  lng: 21.0131,
  zoomCountry: 6,
  zoomCity: 13,
  zoomStreet: 16,
  labelPl: 'Warszawa · Stare Miasto — 3 punkty wzorcowe DEMO (to nie są zdarzenia)'
});

export const DEMO_FIXTURES = deepFreeze([
  {
    id: 'DEMO-A',
    shortCode: 'A',
    isDemoFixture: true,
    badgePl: 'WZORZEC INTERAKCJI DEMO · NIE ZDARZENIE',
    titlePl: 'Punkt demonstracyjny A — wzorzec miejsca publicznego',
    occurred_on: 'WZORZEC UI (brak daty zdarzenia)',
    date_precision: 'day',
    voivodeship_teryt: '14',
    municipality: 'Warszawa',
    district: 'Śródmieście (Stare Miasto)',
    outcome: 'unclassified_mortem',
    outcomeLabelPl: 'Wzorzec interfejsu — nie dotyczy rzeczywistego zdarzenia',
    legal_status: 'unknown',
    legal_status_detail: 'unknown',
    legalStatusLabelPl: 'Wzorzec interfejsu — brak postępowania',
    status_updated_at: '2026-11-08',
    summary:
      'Wzorzec interakcji dla potwierdzonego miejsca publicznego (precision: exact_public_place). Pokazuje przejście kropki w nieruchomo zakotwiczoną pinezkę i układ pełnego dossier obok mapy.',
    location: {
      lat: 52.2477,
      lng: 21.0142,
      precision: 'exact_public_place',
      is_approximate: false,
      targetZoom: 17
    },
    published_location: {
      precision: 'exact_public_place',
      scenePrivacyClass: 'public_place',
      publicLabelPl: 'Plac Zamkowy, Warszawa — wzorzec potwierdzonej przestrzeni publicznej',
      precisionBadgePl: 'miejsce potwierdzone (wzorzec DEMO)',
      geometry: {
        type: 'Point',
        coordinates: [21.0142, 52.2477]
      },
      sourceIds: ['src-prg-osm-cartography'],
      determinationMethod: 'source_named_public_place',
      reviewDecision: {
        status: 'approved',
        reviewedBy: 'Zespół projektowy UI (fixture demonstracyjny)',
        reviewedAt: '2026-11-08',
        scopeNotePl:
          'W rzeczywistej sprawie dokładny punkt jest dopuszczalny wyłącznie dla potwierdzonego miejsca publicznego po osobnej decyzji redakcyjnej.'
      }
    },
    dossier: {
      confirmedFactsPl:
        'W opublikowanej sprawie ta sekcja zawiera wyłącznie zweryfikowane fakty (czas, gminę, kwalifikację i potwierdzone okoliczności) z bezpośrednim odnośnikiem do dokumentu źródłowego przy każdym twierdzeniu.',
      courseAndFindingsPl:
        'Sekcja rozdziela potwierdzony fakt od zarzutu prokuratorskiego i prawomocnego ustalenia sądu. W tej demonstracji nie prezentujemy żadnego rzeczywistego zdarzenia.',
      unknownsAndLimitationsPl:
        'Brak ustalenia jest jawną informacją. Atlas nie dopowiada motywu i nigdy nie publikuje prywatnych adresów ani nazwisk.'
    },
    claims: [
      {
        claimId: 'demo-a-clm-1',
        category: 'fact',
        categoryLabelPl: 'Wzorzec twierdzenia faktograficznego',
        textPl:
          'Każde twierdzenie w zatwierdzonym dossier wskazuje konkretną podstawę źródłową oraz datę weryfikacji redakcyjnej.',
        sourceIds: ['src-prg-osm-cartography'],
        verifiedAt: '2026-11-08'
      },
      {
        claimId: 'demo-a-clm-2',
        category: 'official_statement',
        categoryLabelPl: 'Wzorzec weryfikacji precyzji miejsca',
        textPl:
          'Pinezka punktowa jest używana tylko wtedy, gdy źródło potwierdza publiczne miejsce zdarzenia, a redaktor zatwierdził bezpieczeństwo publikacji.',
        sourceIds: ['src-prg-osm-cartography'],
        verifiedAt: '2026-11-08'
      }
    ],
    chronology: [
      {
        date: 'Etap 1',
        datePrecision: 'day',
        stageType: 'official_statement',
        labelPl: 'Weryfikacja źródła pierwotnego (komunikat Policji / prokuratury / orzeczenie sądu).',
        sourceIds: ['src-prg-osm-cartography']
      },
      {
        date: 'Etap 2',
        datePrecision: 'day',
        stageType: 'fact',
        labelPl: 'Osobna ocena prywatności i decyzja redakcyjna o poziomie precyzji lokalizacji.',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    corrections: [
      {
        correctedAt: '2026-11-08',
        summaryPl: 'Utworzono wzorzec interakcji DEMO A na potrzeby weryfikacji interfejsu Ciemnej czytelni.',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    source_urls: ['https://www.openstreetmap.org/copyright']
  },
  {
    id: 'DEMO-B',
    shortCode: 'B',
    isDemoFixture: true,
    badgePl: 'WZORZEC INTERAKCJI DEMO · NIE ZDARZENIE',
    titlePl: 'Punkt demonstracyjny B — wzorzec odcinka ulicy',
    occurred_on: 'WZORZEC UI (brak daty zdarzenia)',
    date_precision: 'day',
    voivodeship_teryt: '14',
    municipality: 'Warszawa',
    district: 'Śródmieście (Stare Miasto)',
    outcome: 'unclassified_mortem',
    outcomeLabelPl: 'Wzorzec interfejsu — nie dotyczy rzeczywistego zdarzenia',
    legal_status: 'unknown',
    legal_status_detail: 'unknown',
    legalStatusLabelPl: 'Wzorzec interfejsu — brak postępowania',
    status_updated_at: '2026-11-08',
    summary:
      'Wzorzec interakcji dla potwierdzonego odcinka ulicy (precision: street_segment, geometria LineString). Stosowany, gdy źródło wskazuje ulicę bez numeru budynku.',
    location: {
      lat: 52.2485,
      lng: 21.0129,
      precision: 'street_segment',
      is_approximate: true,
      targetZoom: 16
    },
    published_location: {
      precision: 'street_segment',
      scenePrivacyClass: 'public_street_segment',
      publicLabelPl: 'ul. Świętojańska, Warszawa — wzorzec potwierdzonego odcinka ulicy',
      precisionBadgePl: 'odcinek ulicy (wzorzec DEMO)',
      geometry: {
        type: 'LineString',
        coordinates: [
          [21.0138, 52.2479],
          [21.0129, 52.2485],
          [21.012, 52.2491]
        ]
      },
      sourceIds: ['src-prg-osm-cartography'],
      determinationMethod: 'source_named_street_segment',
      reviewDecision: {
        status: 'approved',
        reviewedBy: 'Zespół projektowy UI (fixture demonstracyjny)',
        reviewedAt: '2026-11-08',
        scopeNotePl:
          'Gdy źródło wskazuje wyłącznie ulicę, mapa zaznacza potwierdzony odcinek zamiast stawiać pozornie dokładną pinezkę na przypadkowym budynku.'
      }
    },
    dossier: {
      confirmedFactsPl:
        'Ten wzorzec demonstruje prezentację geometrii liniowej (LineString) na podkładzie ulicznym OpenStreetMap. Nie wskazuje żadnego prawdziwego zdarzenia.',
      courseAndFindingsPl:
        'W rzeczywistym rekordzie zmiana statusu prawnego (np. z zarzutów na prawomocny wyrok) jest odnotowywana z datą aktualności i wpisem w dzienniku korekt.',
      unknownsAndLimitationsPl:
        'Brak numeru posesji jest celowy: atlas nie przypisuje zdarzeń do arbitralnych budynków ani prywatnych mieszkań.'
    },
    claims: [
      {
        claimId: 'demo-b-clm-1',
        category: 'fact',
        categoryLabelPl: 'Wzorzec geometrii odcinka ulicy',
        textPl:
          'Źródło wskazuje ulicę w przestrzeni publicznej -> na mapie wyróżniany jest odcinek ulicy wraz z jawną etykietą precyzji.',
        sourceIds: ['src-prg-osm-cartography'],
        verifiedAt: '2026-11-08'
      }
    ],
    chronology: [
      {
        date: 'Wzorzec',
        datePrecision: 'day',
        stageType: 'fact',
        labelPl: 'Prezentacja odcinka ulicy (LineString) bez wskazywania konkretnego adresu.',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    corrections: [
      {
        correctedAt: '2026-11-08',
        summaryPl: 'Utworzono wzorzec interakcji DEMO B (odcinek ulicy).',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    source_urls: ['https://www.openstreetmap.org/copyright']
  },
  {
    id: 'DEMO-C',
    shortCode: 'C',
    isDemoFixture: true,
    badgePl: 'WZORZEC INTERAKCJI DEMO · NIE ZDARZENIE',
    titlePl: 'Punkt demonstracyjny C — wzorzec obszaru przybliżonego',
    occurred_on: 'WZORZEC UI (brak daty zdarzenia)',
    date_precision: 'day',
    voivodeship_teryt: '14',
    municipality: 'Warszawa',
    district: 'Śródmieście (Stare Miasto)',
    outcome: 'unclassified_mortem',
    outcomeLabelPl: 'Wzorzec interfejsu — nie dotyczy rzeczywistego zdarzenia',
    legal_status: 'unknown',
    legal_status_detail: 'unknown',
    legalStatusLabelPl: 'Wzorzec interfejsu — brak postępowania',
    status_updated_at: '2026-11-08',
    summary:
      'Wzorzec interakcji dla obszaru przybliżonego (precision: district / municipality). Obowiązkowy m.in. wtedy, gdy zdarzenie dotyczy prywatnego mieszkania lub domu.',
    location: {
      lat: 52.2496,
      lng: 21.0122,
      precision: 'district',
      is_approximate: true,
      targetZoom: 15
    },
    published_location: {
      precision: 'district',
      scenePrivacyClass: 'private_residence_or_protected',
      publicLabelPl: 'Warszawa, Stare Miasto — wzorzec obszaru przybliżonego (bez dokładnego adresu)',
      precisionBadgePl: 'obszar przybliżony (wzorzec DEMO)',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [21.0105, 52.2487],
            [21.014, 52.2487],
            [21.014, 52.2506],
            [21.0105, 52.2506],
            [21.0105, 52.2487]
          ]
        ]
      },
      sourceIds: ['src-prg-osm-cartography'],
      determinationMethod: 'administrative_centroid',
      reviewDecision: {
        status: 'approved',
        reviewedBy: 'Zespół projektowy UI (fixture demonstracyjny)',
        reviewedAt: '2026-11-08',
        scopeNotePl:
          'Prywatne mieszkanie, dom lub miejsce umożliwiające identyfikację osób chronionych zawsze otrzymuje wyłącznie przybliżony obszar.'
      }
    },
    dossier: {
      confirmedFactsPl:
        'Ten wzorzec pokazuje sposób oznaczania przybliżonego obszaru (przerywany obrys wielokąta). Nawet przy dużym zbliżeniu mapa nie zamienia przybliżonego obszaru w dokładny punkt budynku.',
      courseAndFindingsPl:
        'Ochrona prywatności i danych osobowych ma pierwszeństwo przed szczegółowością kartograficzną.',
      unknownsAndLimitationsPl:
        'Współrzędne prywatnych mieszkań i domów nigdy nie trafiają do publicznych plików JSON ani historii repozytorium Git.'
    },
    claims: [
      {
        claimId: 'demo-c-clm-1',
        category: 'official_statement',
        categoryLabelPl: 'Zasada ochrony prywatności miejsca',
        textPl:
          'Miejsce prywatne jest prezentowane wyłącznie na poziomie gminy lub dzielnicy jako obszar przybliżony.',
        sourceIds: ['src-prg-osm-cartography'],
        verifiedAt: '2026-11-08'
      }
    ],
    chronology: [
      {
        date: 'Zasada stała',
        datePrecision: 'day',
        stageType: 'official_statement',
        labelPl: 'Blokada publikacji dokładnych współrzędnych miejsc prywatnych w walidatorze i interfejsie.',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    corrections: [
      {
        correctedAt: '2026-11-08',
        summaryPl: 'Utworzono wzorzec interakcji DEMO C (obszar przybliżony).',
        sourceIds: ['src-prg-osm-cartography']
      }
    ],
    source_urls: ['https://www.openstreetmap.org/copyright']
  }
]);

/**
 * Zwraca fixture DEMO po identyfikatorze ('DEMO-A', 'A', itd.) lub null.
 * @param {string|null|undefined} id
 */
export function getDemoFixtureById(id) {
  if (!id || typeof id !== 'string') return null;
  const normalized = id.trim().toUpperCase();
  return (
    DEMO_FIXTURES.find(
      (item) => item.id === normalized || `DEMO-${item.shortCode}` === normalized || item.shortCode === normalized
    ) || null
  );
}

/**
 * Sprawdza, czy podany identyfikator oznacza fixture DEMO.
 * @param {string|null|undefined} id
 */
export function isDemoCaseId(id) {
  return getDemoFixtureById(id) !== null;
}
