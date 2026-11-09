import { TERYT_CODES } from '../validation.mjs';
import { validateHttpsUrl } from './url.mjs';

export const DEFAULT_BOUNDARY_VERSION = 'prg-2025-08';

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
}

const DEFAULT_PROVINCES = [
  { teryt: '02', name: 'Dolnośląskie', lat: 51.11, lng: 17.03 },
  { teryt: '04', name: 'Kujawsko-pomorskie', lat: 53.12, lng: 18.01 },
  { teryt: '06', name: 'Lubelskie', lat: 51.25, lng: 22.57 },
  { teryt: '08', name: 'Lubuskie', lat: 52.74, lng: 15.24 },
  { teryt: '10', name: 'Łódzkie', lat: 51.76, lng: 19.46 },
  { teryt: '12', name: 'Małopolskie', lat: 50.06, lng: 19.94 },
  { teryt: '14', name: 'Mazowieckie', lat: 52.23, lng: 21.01 },
  { teryt: '16', name: 'Opolskie', lat: 50.67, lng: 17.92 },
  { teryt: '18', name: 'Podkarpackie', lat: 50.04, lng: 22.00 },
  { teryt: '20', name: 'Podlaskie', lat: 53.13, lng: 23.16 },
  { teryt: '22', name: 'Pomorskie', lat: 54.35, lng: 18.65 },
  { teryt: '24', name: 'Śląskie', lat: 50.26, lng: 19.03 },
  { teryt: '26', name: 'Świętokrzyskie', lat: 50.87, lng: 20.63 },
  { teryt: '28', name: 'Warmińsko-mazurskie', lat: 53.78, lng: 20.48 },
  { teryt: '30', name: 'Wielkopolskie', lat: 52.41, lng: 16.93 },
  { teryt: '32', name: 'Zachodniopomorskie', lat: 53.43, lng: 14.55 }
];

const DEFAULT_SOURCES = [
  {
    id: 'src-kgp-dane-gov-1723681',
    footnoteRef: '01',
    domId: 'source-national',
    sectionLabelPl: '01 / POLSKA I WOJEWÓDZTWA (2025)',
    url: 'https://api.dane.gov.pl/resources/1723681/file',
    publisher: 'Komenda Główna Policji (Dane.gov.pl, zbiór 25094, zasób 1723681)',
    title: 'Podstawowe dane statystyczne w podziale na jednostki administracyjne kraju oraz jednostki organizacyjne Policji w 2025 r. — arkusz ._Zabójstwo (zasób 1723681, plik Kategorie_wg_podziału_administracyjnego_od_2025.xlsx)',
    category: 'open_data_portal',
    locatorPl: 'Zbiór 25094, zasób 1723681 (pobierany skoroszyt wieloarkuszowy Kategorie_wg_podziału_administracyjnego_od_2025.xlsx, 33 758 B, SHA-256: b98f379bb714d37d82f466d92c82ea6b2d45e17bb785bb6a31699b4c3f39574a), drugi arkusz ._Zabójstwo: Polska = 501 stwierdzone, 503 wykryte (99,41%), 16/16 województw oraz KSP Warszawa (48) i KWP Radom (25).',
    publishedAt: '2026-04-21',
    retrievedAt: '2026-11-08',
    sha256: 'b98f379bb714d37d82f466d92c82ea6b2d45e17bb785bb6a31699b4c3f39574a',
    contentHash: 'b98f379bb714d37d82f466d92c82ea6b2d45e17bb785bb6a31699b4c3f39574a',
    licenseAndTermsPl: 'Dane publiczne (ustawa o otwartych danych i ponownym wykorzystywaniu informacji sektora publicznego / dane.gov.pl).',
    limitationsPl:
      'Jednostką są przestępstwa stwierdzone z art. 148 § 1–4 k.k. w zakończonych postępowaniach przygotowawczych (obejmuje czyny dokonane oraz usiłowania), a nie liczba osób zmarłych. Tabela terytorialna KGP w Dane.gov.pl (zasób 1723681 z 21.04.2026) wykazuje 501 czynów w 2025 r., natomiast komunikat prasowy KGP z 16.01.2026 podawał 505 czynów. KGP nie opublikowała tabeli uzgodnień wyjaśniającej przyczynę tej różnicy.'
  },
  {
    id: 'src-kgp-dane-gov-1160448',
    footnoteRef: '02',
    domId: 'source-regional',
    sectionLabelPl: '02 / SZEREG HISTORYCZNY 1999–2024',
    url: 'https://api.dane.gov.pl/resources/1160448,zabojstwo-wg-jednostek-podziau-administracyjnego-kraju-przestepstwa-stwierdzone-przestepstwa-wykryte-wykrycia/file',
    publisher: 'Komenda Główna Policji (Dane.gov.pl, zbiór 25094, zasób 1160448)',
    title: 'Zabójstwo wg jednostek podziału administracyjnego kraju (przestępstwa stwierdzone, przestępstwa wykryte, % wykrycia), 1999–2024',
    category: 'open_data_portal',
    locatorPl: 'Zbiór 25094, zasób 1160448 (CSV, 19 069 B): 494 wiersze danych (19 jednostek × 26 lat 1999–2024; Polska 2024 = 498 stwierdzone, 497 wykryte).',
    publishedAt: '2025-05-26',
    retrievedAt: '2026-11-08',
    sha256: '4459bbec9494bed7c0c5250b5a21d60a0c6d55843b0ef5a3007f09d9a54129f3',
    contentHash: '4459bbec9494bed7c0c5250b5a21d60a0c6d55843b0ef5a3007f09d9a54129f3',
    licenseAndTermsPl: 'Dane publiczne (dane.gov.pl / KGP).',
    limitationsPl:
      'Statystyka według roku stwierdzenia przestępstwa w zakończonym postępowaniu przygotowawczym (art. 148 k.k., w tym usiłowania). Dla 2024 r. tabela z 26.05.2025 wykazuje 498 czynów wobec 503 przywołanych w komunikacie KGP z 16.01.2026.'
  },
  {
    id: 'src-prg-osm-cartography',
    footnoteRef: '03',
    domId: 'source-map',
    sectionLabelPl: '03 / KARTOGRAFIA (PRG & OSM)',
    url: 'https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/',
    publisher: 'GUGiK Państwowy Rejestr Granic (PRG) / OpenStreetMap contributors',
    title: 'Granice administracyjne województw (PRG sierpień 2025, WGS84) oraz podkład uliczny OpenStreetMap (ODbL)',
    category: 'open_data_portal',
    locatorPl: 'Plik lokalny assets/geo/wojewodztwa.geojson (commit 450c4a6c583d18a358768a42a806207053bd88ed) oraz ciągła warstwa kafelków OSM (z5–z18).',
    publishedAt: '2025-08-01',
    retrievedAt: '2026-11-08',
    sha256: '0602dbd9c5fa3980b549ddb617cc3979c19f0fa23d1fbae08d87b264373b2118',
    contentHash: '0602dbd9c5fa3980b549ddb617cc3979c19f0fa23d1fbae08d87b264373b2118',
    licenseAndTermsPl: 'PRG GUGiK: domena publiczna (art. 40a Prawa geodezyjnego i kartograficznego); podkład uliczny: © OpenStreetMap contributors (ODbL).',
    limitationsPl:
      'Granice administracyjne i punkty referencyjne województw nie oznaczają lokalizacji zdarzeń. Szczegółowość podkładu ulicznego nie podnosi precyzji lokalizacji sprawy.'
  },
  {
    id: 'src-kgp-2026-01-16-national',
    footnoteRef: '04',
    domId: 'source-kgp-communique',
    sectionLabelPl: '04 / KOMUNIKAT PRASOWY KGP (16.01.2026)',
    url: 'https://www.policja.pl/pol/aktualnosci/271951,Zwalczanie-przestepczosci-kryminalnej.html',
    publisher: 'Komenda Główna Policji',
    title: 'W 2025 roku mniej przestępstw kryminalnych i wysoka wykrywalność. Najbezpieczniej od lat (komunikat z 16.01.2026)',
    category: 'official_press_release',
    locatorPl: 'Akapit dotyczący zabójstw (publikacja nr 271951 z 16.01.2026): 503 w 2024 r. oraz 505 w 2025 r. (wzrost o 2).',
    publishedAt: '2026-01-16',
    retrievedAt: '2026-11-08',
    sha256: '5da20d3666fb31d4154f1606811d2a79ff91ef84ef44699e0d3d4bc51889a701',
    contentHash: '5da20d3666fb31d4154f1606811d2a79ff91ef84ef44699e0d3d4bc51889a701',
    licenseAndTermsPl: 'Informacja publiczna (policja.pl).',
    limitationsPl:
      'Komunikat prasowy z 16.01.2026 podaje 505 czynów stwierdzonych w 2025 r. oraz 503 w 2024 r., natomiast tabele terytorialne KGP w Dane.gov.pl (zasoby 1160448 i 1723681) wykazują 498 w 2024 r. i 501 w 2025 r. KGP nie opublikowała tabeli uzgodnień wyjaśniającej tę różnicę.'
  },
  {
    id: 'src-kgp-dane-gov-1160417',
    footnoteRef: '05',
    domId: 'source-kgp-initiated-1999-2024',
    sectionLabelPl: '05 / POSTĘPOWANIA WSZCZĘTE (1999–2024)',
    url: 'https://api.dane.gov.pl/resources/1160417,postepowania-wszczete-zabojstwo-wg-jednostek-organizacyjnych-policji/file',
    publisher: 'Komenda Główna Policji (Dane.gov.pl, zbiór 25094, zasób 1160417)',
    title: 'Postępowania wszczęte — zabójstwo wg jednostek organizacyjnych Policji, 1999–2024',
    category: 'open_data_portal',
    locatorPl: 'Zbiór 25094, zasób 1160417 (CSV): postępowania wszczęte w latach 1999–2024 wg jednostek organizacyjnych Policji (2024 = 557).',
    publishedAt: '2025-05-26',
    retrievedAt: '2026-11-08',
    sha256: 'bcc1eceb3507de5367122926fafdf6b52e9e87fefbef207e54c444e84bc824be',
    contentHash: 'bcc1eceb3507de5367122926fafdf6b52e9e87fefbef207e54c444e84bc824be',
    licenseAndTermsPl: 'Dane publiczne (dane.gov.pl / KGP).',
    limitationsPl:
      'Postępowania wszczęte w danym roku nie są tożsame z przestępstwstwami stwierdzonymi w zakończonych postępowaniach ani z podziałem administracyjnym TERYT.'
  },
  {
    id: 'src-kgp-dane-gov-1723707',
    footnoteRef: '06',
    domId: 'source-kgp-initiated-2025',
    sectionLabelPl: '06 / POSTĘPOWANIA WSZCZĘTE (2025)',
    url: 'https://api.dane.gov.pl/resources/1723707,zabojstwo-postepowania-wszczete/file',
    publisher: 'Komenda Główna Policji (Dane.gov.pl, zbiór 25094, zasób 1723707)',
    title: 'Zabójstwo — postępowania wszczęte wg jednostek organizacyjnych Policji w 2025 r.',
    category: 'open_data_portal',
    locatorPl: 'Zbiór 25094, zasób 1723707 (CSV): Jednostki organizacyjne Policji ogółem w 2025 r. = 499 (KSP Warszawa = 41, KWP Radom = 26, CBŚP = 5).',
    publishedAt: '2026-04-21',
    retrievedAt: '2026-11-08',
    sha256: '24d96b8c166a65235cfb24facef578d0dd377b18fee0707ffb0d2272a715ac6d',
    contentHash: '24d96b8c166a65235cfb24facef578d0dd377b18fee0707ffb0d2272a715ac6d',
    licenseAndTermsPl: 'Dane publiczne (dane.gov.pl / KGP).',
    limitationsPl:
      'Obejmuje postępowania pierwszorazowo wszczęte w 2025 r. wg garnizonów Policji i CBŚP (499 w skali kraju).'
  },
  {
    id: 'src-gus-bdl-population-1999-2025',
    footnoteRef: '07',
    domId: 'source-gus-population',
    sectionLabelPl: '07 / LUDNOŚĆ GUS (1999–2025)',
    url: 'https://demografia.stat.gov.pl/BazaDemografia/Downloader.aspx?file=pl_lud_2025_00_01.zip&sys=lud',
    publisher: 'Główny Urząd Statystyczny (Baza Demografia / Bank Danych Lokalnych P2137 / Rocznik Demograficzny 2025)',
    title: 'Stan i struktura ludności w dniu 31 XII wg województw i kraju (1999–2025) — mianowniki populacyjne do wskaźników na 100 tys. ludności',
    category: 'official_statistical_table',
    locatorPl: 'Baza Demografia GUS: roczne archiwa pl_lud_{2002..2025}_00_01.zip (Tabl. 01 Stan ludności w dniu 31 XII), dla lat 1999–2001 bilanse z dokładnością do 0,1 tys. z Rocznika Statystycznego RP 2001 i 2002 oraz Rocznik Demograficzny 2025 (Tabl. 1).',
    publishedAt: '2026-04-30',
    retrievedAt: '2026-11-08',
    sha256: '726e6201eff530ba44fb4a7a20ee8b117cdaed1bbbf0813b4902c42679b0ec63',
    contentHash: '726e6201eff530ba44fb4a7a20ee8b117cdaed1bbbf0813b4902c42679b0ec63',
    licenseAndTermsPl: 'Dane GUS udostępniane publicznie (CC BY 4.0 / ustawa o statystyce publicznej).',
    limitationsPl:
      'Skoki baz spisowych w rocznych bilansach pl_lud występują na granicach 2001→2002 (NSP 2002), 2010→2011 (NSP 2011) oraz 2021→2022 (NSP 2021).'
  },
  {
    id: 'src-gus-homicide-victims-2013-2024',
    footnoteRef: '08',
    domId: 'source-gus-victims',
    sectionLabelPl: '08 / OFIARY ZABÓJSTW GUS (2013–2024)',
    url: 'https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultaktualnosci/6285/3/1/1/ofiary_zabojstw_2013-2024.xlsx',
    publisher: 'Główny Urząd Statystyczny (na podstawie danych KGP)',
    title: 'Ofiary zabójstw według wieku i płci w latach 2013–2024 (zabójstwa dokonane)',
    category: 'official_statistical_table',
    locatorPl: 'Plik ofiary_zabojstw_2013-2024.xlsx: liczba osób zmarłych w wyniku zabójstwa dokonanego w Polsce (2013: 302 ... 2023: 306, 2024: 258).',
    publishedAt: '2025-07-15',
    retrievedAt: '2026-11-08',
    sha256: 'ef888068fa93ab5a3d84afdc2906396d257ca8c7518b8e75512d3e8ff655bdd8',
    contentHash: 'ef888068fa93ab5a3d84afdc2906396d257ca8c7518b8e75512d3e8ff655bdd8',
    licenseAndTermsPl: 'Dane GUS (stat.gov.pl).',
    limitationsPl:
      'Obejmuje wyłącznie osoby zmarłe wskutek zabójstwa dokonanego (bez usiłowań) i publikowane jest wyłącznie na poziomie ogólnokrajowym (brak przekroju wojewódzkiego w tej tablicy).'
  },
  {
    id: 'src-gus-mortality-sdg-2010-2024',
    footnoteRef: '09',
    domId: 'source-gus-sdg',
    sectionLabelPl: '09 / ZGONY ICD-10 X85–Y09 (GUS SDG 16.1.1)',
    url: 'https://sdg.gov.pl/statistics_glob/16-1-1/',
    publisher: 'Główny Urząd Statystyczny (SDG 16.1.1 & Rocznik Demograficzny 2025)',
    title: 'Wskaźnik SDG 16.1.1 (Liczba ofiar umyślnych zabójstw na 100 tys. ludności, 2010–2024) oraz Rocznik Demograficzny 2025 (Tabl. 99 Zgony wg przyczyn ICD-10 X85–Y09)',
    category: 'official_statistical_table',
    locatorPl: 'SDG 16.1.1 (2010: 0,92 ... 2023: 0,52; 2024: 0,48 na 100 tys.) oraz Rocznik Demograficzny 2025 Dział 09 Tabl. 99 (2024: 182 zgony z przyczyny X85–Y09: 144 mężczyzn, 38 kobiet).',
    publishedAt: '2025-11-28',
    retrievedAt: '2026-11-08',
    sha256: '89bf0b5f0bedff00aba48311e6f6503ec702373eb8646b27fd05e24507e762ca',
    contentHash: '89bf0b5f0bedff00aba48311e6f6503ec702373eb8646b27fd05e24507e762ca',
    licenseAndTermsPl: 'Dane GUS (sdg.gov.pl / stat.gov.pl).',
    limitationsPl:
      'Statystyka przyczyn zgonów na podstawie lekarskich kart zgonu (kod ICD-10 X85–Y09 wg miejsca stałego zamieszkania zmarłego). W Tabl. 100 Rocznika Demograficznego GUS publikuje przekrój wojewódzki wyłącznie dla całej klasy V01–Y89 (zewnętrzne przyczyny zgonu), bez wydzielenia X85–Y09.'
  }
];

const DEFAULT_METRICS = [
  {
    id: 'police_article_148_recorded_acts',
    namePl: 'Czyny stwierdzone z art. 148 k.k.',
    shortNamePl: 'Czyny z art. 148 k.k. (Policja)',
    unit: 'recorded_acts',
    unitLabelPl: 'czynów · nie osób zabitych',
    definitionPl:
      'Przestępstwa stwierdzone w zakończonych postępowaniach przygotowawczych kwalifikowane z art. 148 § 1–4 Kodeksu karnego (obejmuje czyny dokonane oraz usiłowania).',
    referencePopulation: 'resident_population_gus_bdl',
    attemptScope: 'completed_and_attempted',
    registrationMethodPl: 'Statystyka policyjna KGP według roku stwierdzenia przestępstwa.',
    supportsRatePer100k: true
  },
  {
    id: 'police_article_148_rate_per_100k',
    namePl: 'Wskaźnik czynów z art. 148 k.k. na 100 tys. ludności',
    shortNamePl: 'Wskaźnik / 100 tys. (art. 148 k.k.)',
    unit: 'rate_per_100k',
    unitLabelPl: 'czynów na 100 tys. mieszkańców',
    definitionPl:
      'Liczba czynów stwierdzonych z art. 148 k.k. podzielona przez liczbę ludności zamieszkałej (GUS BDL) w tej samej jednostce TERYT i tym samym roku × 100 000.',
    referencePopulation: 'resident_population_gus_bdl',
    attemptScope: 'completed_and_attempted',
    registrationMethodPl: 'Iloraz zatwierdzonej serii KGP i uzgodnionego mianownika populacji GUS BDL.',
    supportsRatePer100k: true
  },
  {
    id: 'gus_intentional_homicide_victims',
    namePl: 'Ofiary zabójstw dokonanych (GUS / KGP, 2013–2024)',
    shortNamePl: 'Ofiary zabójstw (GUS)',
    unit: 'persons_killed',
    unitLabelPl: 'osób zmarłych wskutek zabójstwa dokonanego',
    definitionPl:
      'Osoby zmarłe w wyniku zabójstwa dokonanego (art. 148 k.k., bez usiłowań) według ogólnokrajowej tablicy GUS Ofiary zabójstw (2013–2024, opracowanej na podstawie danych KGP; 258 osób w 2024 r.). Miara odrębna zarówno od policyjnych czynów stwierdzonych, jak i od demograficznej statystyki zgonów ICD-10 X85–Y09.',
    referencePopulation: 'resident_population_gus_bdl',
    attemptScope: 'completed_only',
    registrationMethodPl: 'Tablica GUS Ofiary zabójstw (2013–2024) na podstawie sprawozdawczości KGP.',
    supportsRatePer100k: true
  },
  {
    id: 'gus_intentional_homicide_mortality_rate',
    namePl: 'Zgony wskutek zabójstwa ICD-10 X85–Y09 / SDG 16.1.1 (GUS, 2010–2024)',
    shortNamePl: 'Zgony ICD-10 X85–Y09 / 100 tys. (GUS)',
    unit: 'rate_per_100k',
    unitLabelPl: 'zgonów na 100 tys. ludności (karty zgonów)',
    definitionPl:
      'Zgony z przyczyn zewnętrznych zakodowanych jako zabójstwo (ICD-10 X85–Y09) na podstawie lekarskich kart zgonu wg miejsca stałego zamieszkania zmarłego (wskaźnik SDG 16.1.1: 0,48 na 100 tys. oraz 182 zgony w 2024 r. wg Tabl. 99 Rocznika Demograficznego GUS).',
    referencePopulation: 'resident_population_gus_bdl',
    attemptScope: 'completed_only',
    registrationMethodPl: 'Statystyka przyczyn zgonów GUS na podstawie lekarskich kart zgonu.',
    supportsRatePer100k: true
  }
];

const ALL_TIMELINE_YEARS = Array.from({ length: 27 }, (_, idx) => 1999 + idx);

const DEFAULT_SERIES = [
  {
    id: 'kgp_art148_national_official',
    metricId: 'police_article_148_recorded_acts',
    publisher: 'Komenda Główna Policji (Dane.gov.pl)',
    temporalAxis: 'registration_year',
    territorialDivision: 'national',
    comparabilityGroup: 'kgp_art148_stwierdzone_pl',
    expectedYears: ALL_TIMELINE_YEARS,
    expectedAreaIds: ['PL'],
    fixedClassBreaks: [15, 30, 45, 60, 120],
    fixedRateClassBreaks: [0.8, 1.2, 1.6, 2.0, 3.5],
    methodologicalBreaks: []
  },
  {
    id: 'kgp_art148_regional',
    metricId: 'police_article_148_recorded_acts',
    publisher: 'Komenda Główna Policji (Dane.gov.pl)',
    temporalAxis: 'registration_year',
    territorialDivision: 'voivodeship',
    comparabilityGroup: 'kgp_art148_stwierdzone_woj',
    expectedYears: ALL_TIMELINE_YEARS,
    expectedAreaIds: Array.from(TERYT_CODES),
    fixedClassBreaks: [15, 30, 45, 60, 120],
    fixedRateClassBreaks: [0.8, 1.2, 1.6, 2.0, 3.5],
    methodologicalBreaks: []
  },
  {
    id: 'police_recorded_homicides_rate',
    metricId: 'police_article_148_rate_per_100k',
    publisher: 'Komenda Główna Policji / GUS BDL',
    temporalAxis: 'registration_year',
    territorialDivision: 'voivodeship',
    comparabilityGroup: 'kgp_art148_rate_100k',
    expectedYears: ALL_TIMELINE_YEARS,
    expectedAreaIds: ['PL', ...Array.from(TERYT_CODES)],
    fixedClassBreaks: [15, 30, 45, 60, 120],
    fixedRateClassBreaks: [0.8, 1.2, 1.6, 2.0, 3.5],
    methodologicalBreaks: [
      {
        fromYear: 2001,
        toYear: 2002,
        reasonPl:
          'Przejście z przedspisowych bilansów ludności GUS zaokrąglanych do 0,1 tys. (1999–2001) na dokładny bilans oparty na Narodowym Spisie Powszechnym 2002 (NSP 2002, lata 2002–2010).'
      },
      {
        fromYear: 2010,
        toYear: 2011,
        reasonPl:
          'Przejście w rocznych bilansach Bazy Demografia (pl_lud) z bazy NSP 2002 na bazę Narodowego Spisu Powszechnego 2011 (NSP 2011, lata 2011–2021).'
      },
      {
        fromYear: 2021,
        toYear: 2022,
        reasonPl:
          'Przejście w rocznych bilansach Bazy Demografia (pl_lud) z bazy NSP 2011 na bazę Narodowego Spisu Powszechnego 2021 (NSP 2021, lata 2022–2025).'
      }
    ]
  },
  {
    id: 'gus_homicide_victims_national',
    metricId: 'gus_intentional_homicide_victims',
    publisher: 'Główny Urząd Statystyczny',
    temporalAxis: 'death_registration_year',
    territorialDivision: 'national',
    comparabilityGroup: 'gus_homicide_victims_pl',
    expectedYears: Array.from({ length: 12 }, (_, idx) => 2013 + idx),
    expectedAreaIds: ['PL'],
    fixedClassBreaks: [15, 30, 45, 60, 120],
    fixedRateClassBreaks: [0.8, 1.2, 1.6, 2.0, 3.5],
    methodologicalBreaks: []
  },
  {
    id: 'gus_homicide_victims_regional',
    metricId: 'gus_intentional_homicide_victims',
    publisher: 'Główny Urząd Statystyczny',
    temporalAxis: 'death_registration_year',
    territorialDivision: 'voivodeship',
    comparabilityGroup: 'gus_homicide_victims_woj',
    expectedYears: ALL_TIMELINE_YEARS,
    expectedAreaIds: Array.from(TERYT_CODES),
    fixedClassBreaks: [10, 20, 30, 45, 80],
    fixedRateClassBreaks: [0.5, 0.9, 1.3, 1.7, 3.0],
    methodologicalBreaks: []
  }
];

/**
 * Computes rate per 100,000 inhabitants ONLY when the observation is observed,
 * approved, and matches the population denominator's year, areaId, and boundaryVersion.
 *
 * @param {Object|null} observation
 * @param {Object|null} populationRecord
 * @returns {number|null}
 */
export function computeRatePer100k(observation, populationRecord) {
  if (
    !observation ||
    observation.availability !== 'observed' ||
    typeof observation.value !== 'number' ||
    observation.reviewStatus !== 'approved'
  ) {
    return null;
  }
  if (
    !populationRecord ||
    populationRecord.reviewStatus !== 'approved' ||
    typeof populationRecord.population !== 'number' ||
    populationRecord.population <= 0
  ) {
    return null;
  }
  if (
    observation.period !== populationRecord.year ||
    observation.areaId !== populationRecord.areaId ||
    observation.boundaryVersion !== populationRecord.boundaryVersion
  ) {
    return null;
  }
  return Number(((observation.value / populationRecord.population) * 100000).toFixed(2));
}

function buildObservationsFromLegacy(nationalRows = [], regionalRows = [], sourcesById = {}) {
  const out = [];
  const defaultNatSourceId = sourcesById['src-kgp-dane-gov-1723681']
    ? 'src-kgp-dane-gov-1723681'
    : Object.keys(sourcesById)[0] || 'src-kgp-dane-gov-1723681';
  const defaultRegSourceId = sourcesById['src-kgp-dane-gov-1160448']
    ? 'src-kgp-dane-gov-1160448'
    : defaultNatSourceId;

  for (const n of nationalRows) {
    out.push({
      seriesId: 'kgp_art148_national_official',
      period: Number(n.year),
      areaId: 'PL',
      boundaryVersion: DEFAULT_BOUNDARY_VERSION,
      value: Number.isSafeInteger(n.value) ? n.value : null,
      availability: Number.isSafeInteger(n.value) ? 'observed' : 'missing',
      reviewStatus: 'approved',
      verification: n.verification || 'official_publication',
      sourceId: n.sourceId || defaultNatSourceId,
      sourceUrl: validateHttpsUrl(n.source_url) || DEFAULT_SOURCES[0].url,
      sourceName: n.source_name || DEFAULT_SOURCES[0].title,
      revisionId: 'rev-2026-04-21-dane-gov-final',
      isActiveRevision: true,
      notePl: n.note || null,
      discrepancyNotePl:
        Number(n.year) === 2025
          ? 'Tabela statystyczna KGP w serwisie Dane.gov.pl (zasób 1723681 z 21.04.2026) wykazuje 501 czynów stwierdzonych w 2025 r. (suma 16 województw = 501; wykryte: 503; wskaźnik wykrycia: 99,4%; postępowania wszczęte: 499), natomiast komunikat KGP z 16.01.2026 podawał wartość 505 (503 w 2024 r. wobec 498 w tabeli KGP).'
          : null
    });
  }

  for (const r of regionalRows) {
    const isVerified = r.verification === 'official_verified' || r.reviewStatus === 'approved';
    out.push({
      seriesId: 'kgp_art148_regional',
      period: Number(r.year),
      areaId: String(r.teryt).padStart(2, '0'),
      boundaryVersion: DEFAULT_BOUNDARY_VERSION,
      value: Number.isSafeInteger(r.count) ? r.count : null,
      availability: Number.isSafeInteger(r.count) ? 'observed' : 'missing',
      reviewStatus: isVerified ? 'approved' : 'unreviewed',
      verification: r.verification || (isVerified ? 'official_verified' : 'secondary_unverified'),
      sourceId: r.sourceId || defaultRegSourceId,
      sourceUrl: validateHttpsUrl(r.source_url) || DEFAULT_SOURCES[1].url,
      revisionId: 'rev-2026-04-21-dane-gov-final',
      isActiveRevision: true,
      notePl: null,
      discrepancyNotePl: null
    });
  }

  return out;
}

function normalizeCaseRecord(c) {
  const precision = c.published_location?.precision ?? c.location?.precision ?? 'municipality';
  const isApprox = c.location?.is_approximate ?? precision !== 'exact_public_place';
  const precisionBadgeMap = {
    exact_public_place: 'miejsce potwierdzone (przestrzeń publiczna)',
    street_segment: 'odcinek ulicy potwierdzony w źródle',
    district: 'obszar przybliżony (dzielnica / osiedle)',
    municipality: 'obszar przybliżony (miejscowość / gmina)',
    unknown: 'obszar przybliżony (województwo)'
  };
  const publishedLocation = c.published_location
    ? {
        ...c.published_location,
        precisionBadgePl: c.published_location.precisionBadgePl || precisionBadgeMap[precision] || 'obszar przybliżony'
      }
    : {
        precision,
        scenePrivacyClass: precision === 'exact_public_place' ? 'public_place' : 'area_only',
        publicLabelPl: `${c.municipality} (${precisionBadgeMap[precision] || 'obszar przybliżony'})`,
        precisionBadgePl: precisionBadgeMap[precision] || 'obszar przybliżony',
        geometry:
          typeof c.location?.lat === 'number' && typeof c.location?.lng === 'number'
            ? { type: 'Point', coordinates: [c.location.lng, c.location.lat] }
            : null,
        sourceIds: [],
        determinationMethod: 'administrative_centroid',
        reviewDecision: {
          status: c.verification === 'human_approved' ? 'approved' : 'pending_human_review',
          reviewedBy: 'Redakcja Poland Homicide Atlas',
          reviewedAt: c.reviewed_at || '2026-11-08',
          scopeNotePl: 'Weryfikacja kwalifikacji, źródeł i prywatności lokalizacji.'
        }
      };

  const safeUrls = Array.isArray(c.source_urls)
    ? c.source_urls.map(validateHttpsUrl).filter(Boolean)
    : [];
  const caseYearMatch = /^(\d{4})\b/.exec(String(c.occurred_on ?? ''));
  const caseYear = caseYearMatch
    ? Number(caseYearMatch[1])
    : Number.isInteger(c.year)
      ? c.year
      : null;

  const outcome = c.outcome || (c.offenseType === 'attempted_homicide' ? 'attempted' : 'death');
  const offenseType =
    c.offenseType || (outcome === 'attempted' ? 'attempted_homicide' : 'completed_homicide');
  const victimCountFatal = Number.isSafeInteger(c.victimCountFatal)
    ? c.victimCountFatal
    : Number.isSafeInteger(c.victim_count)
      ? c.victim_count
      : outcome === 'attempted'
        ? 0
        : 1;
  const victimCountInjured = Number.isSafeInteger(c.victimCountInjured)
    ? c.victimCountInjured
    : outcome === 'attempted'
      ? 1
      : 0;
  const perpetratorFatalityCountExcluded = Number.isSafeInteger(c.perpetratorFatalityCountExcluded)
    ? c.perpetratorFatalityCountExcluded
    : 0;

  return {
    ...c,
    year: caseYear,
    date_precision: c.date_precision || 'day',
    outcome,
    offenseType,
    victimCountFatal,
    victimCountInjured,
    perpetratorFatalityCountExcluded,
    victim_count: victimCountFatal,
    relatedCaseIds: Array.isArray(c.relatedCaseIds) ? c.relatedCaseIds : [],
    sharedInvestigationId: c.sharedInvestigationId ?? null,
    unresolvedDiscrepancies: Array.isArray(c.unresolvedDiscrepancies)
      ? c.unresolvedDiscrepancies
      : [],
    legal_status_detail: c.legal_status_detail || c.legal_status || 'unknown',
    status_updated_at: c.status_updated_at || c.reviewed_at || c.occurred_on,
    source_urls: safeUrls,
    published_location: publishedLocation,
    location: {
      lat: c.location?.lat ?? null,
      lng: c.location?.lng ?? null,
      precision,
      is_approximate: isApprox
    },
    dossier: c.dossier || {
      confirmedFactsPl: c.summary,
      courseAndFindingsPl: 'Szczegóły postępowania zgodnie z przywołanymi dokumentami źródłowymi.',
      unknownsAndLimitationsPl: 'Brak dodatkowych ustaleń wykraczających poza opublikowane źródła.'
    },
    claims: Array.isArray(c.claims) ? c.claims : [],
    chronology: Array.isArray(c.chronology) ? c.chronology : [],
    corrections: Array.isArray(c.corrections) ? c.corrections : []
  };
}

/**
 * Adapts legacy and/or v1.0.0 data files into a single immutable AtlasDataset snapshot.
 *
 * @param {Object} [raw={}]
 * @returns {Object} Deeply frozen AtlasDataset
 */
export function adaptDataset(raw = {}) {
  const rawSources = Array.isArray(raw.sources) && raw.sources.length > 0 ? raw.sources : DEFAULT_SOURCES;
  const sourcesById = {};
  const footnotes = [];

  for (const [idx, s] of rawSources.entries()) {
    const isArchival =
      s?.isOfflineArchival === true ||
      s?.category === 'archival_document' ||
      s?.category === 'court_record_offline' ||
      s?.url === null;
    const safeUrl = isArchival
      ? validateHttpsUrl(s.url) || null
      : validateHttpsUrl(s.url) || DEFAULT_SOURCES[0].url;
    const normalizedSource = {
      ...s,
      url: safeUrl,
      footnoteRef: s.footnoteRef || String(idx + 1).padStart(2, '0'),
      domId:
        s.domId ||
        (idx === 0 ? 'source-national' : idx === 1 ? 'source-regional' : idx === 2 ? 'source-map' : `source-${s.id}`)
    };
    sourcesById[normalizedSource.id] = normalizedSource;
    footnotes.push(normalizedSource);
  }

  const rawMetrics =
    Array.isArray(raw.series?.metrics) && raw.series.metrics.length > 0
      ? raw.series.metrics
      : DEFAULT_METRICS;
  const metricsById = {};
  for (const m of DEFAULT_METRICS) {
    metricsById[m.id] = { ...m };
  }
  for (const m of rawMetrics) {
    metricsById[m.id] = { ...metricsById[m.id], ...m };
  }

  const rawSeriesList =
    Array.isArray(raw.series?.series) && raw.series.series.length > 0
      ? raw.series.series
      : DEFAULT_SERIES;
  const seriesById = {};
  for (const s of DEFAULT_SERIES) {
    seriesById[s.id] = { ...s };
  }
  for (const s of rawSeriesList) {
    seriesById[s.id] = { ...seriesById[s.id], ...s };
  }

  const rawProvinces =
    Array.isArray(raw.provinces) && raw.provinces.length === 16 ? raw.provinces : DEFAULT_PROVINCES;
  const areas = rawProvinces
    .map(p => {
      const teryt = String(p.teryt ?? p.areaId ?? '').padStart(2, '0');
      return {
        areaId: teryt,
        teryt,
        level: 'voivodeship',
        name: p.name,
        parentAreaId: 'PL',
        validFrom: p.validFrom || '1999-01-01',
        validTo: p.validTo ?? null,
        boundaryVersion: p.boundaryVersion || DEFAULT_BOUNDARY_VERSION,
        lat: Number(p.lat),
        lng: Number(p.lng),
        jurisdictionNotePl:
          p.jurisdictionNotePl ||
          (teryt === '14'
            ? 'W statystykach garnizonowych Policji dane dla Warszawy (KSP) i pozostałej części woj. mazowieckiego (KWP z siedzibą w Radomiu) bywają publikowane osobno.'
            : null)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const areasById = {
    PL: {
      areaId: 'PL',
      teryt: 'PL',
      level: 'country',
      name: 'Polska',
      parentAreaId: null,
      validFrom: '1999-01-01',
      validTo: null,
      boundaryVersion: DEFAULT_BOUNDARY_VERSION,
      lat: 52.05,
      lng: 19.1,
      jurisdictionNotePl: null
    }
  };
  for (const a of areas) {
    areasById[a.areaId] = a;
  }

  const nationalRows = Array.isArray(raw.national) ? raw.national : [];
  const regionalRows = Array.isArray(raw.regional) ? raw.regional : [];

  const candidateObservations =
    Array.isArray(raw.observations) && raw.observations.length > 0
      ? raw.observations.map(obs => {
          const src = sourcesById[obs.sourceId];
          const isNational2025Kgp =
            obs.seriesId === 'kgp_art148_national_official' &&
            obs.areaId === 'PL' &&
            Number(obs.period) === 2025;
          return {
            ...obs,
            period: Number(obs.period),
            sourceUrl: validateHttpsUrl(obs.sourceUrl || src?.url) || DEFAULT_SOURCES[0].url,
            sourceName: obs.sourceName || src?.title || DEFAULT_SOURCES[0].title,
            verification:
              obs.verification ||
              (obs.areaId === 'PL'
                ? 'official_publication'
                : obs.reviewStatus === 'approved'
                  ? 'official_verified'
                  : 'secondary_unverified'),
            discrepancyNotePl:
              obs.discrepancyNotePl ||
              (isNational2025Kgp
                ? 'Tabela statystyczna KGP w serwisie Dane.gov.pl (zasób 1723681 z 21.04.2026) wykazuje 501 czynów stwierdzonych w 2025 r. (suma 16 województw = 501; wykryte: 503; wskaźnik wykrycia: 99,4%; postępowania wszczęte: 499), natomiast komunikat KGP z 16.01.2026 podawał wartość 505 (503 w 2024 r. wobec 498 w tabeli KGP).'
                : null)
          };
        })
      : buildObservationsFromLegacy(nationalRows, regionalRows, sourcesById);

  const activeObservations = candidateObservations.filter(o => o.isActiveRevision !== false);

  const populationByKey = {};
  if (Array.isArray(raw.population)) {
    for (const pop of raw.population) {
      if (pop && pop.areaId && Number.isInteger(pop.year) && pop.boundaryVersion) {
        const normAreaId = pop.areaId === '00' ? 'PL' : String(pop.areaId).replace(/^PL-/i, '');
        const key = `${normAreaId}:${pop.year}:${pop.boundaryVersion}`;
        populationByKey[key] = { ...pop, areaId: normAreaId };
      }
    }
  } else {
    // Fallback: populate from national/regional rows if they carry embedded population denominators
    for (const n of nationalRows) {
      if (Number.isInteger(n.year) && Number.isSafeInteger(n.population) && n.population > 0) {
        const key = `PL:${n.year}:${DEFAULT_BOUNDARY_VERSION}`;
        populationByKey[key] = {
          areaId: 'PL',
          year: n.year,
          boundaryVersion: DEFAULT_BOUNDARY_VERSION,
          population: n.population,
          reviewStatus: 'approved',
          sourceId: 'src-gus-bdl-population-1999-2025'
        };
      }
    }
    for (const r of regionalRows) {
      if (Number.isInteger(r.year) && Number.isSafeInteger(r.population) && r.population > 0) {
        const code = String(r.teryt).padStart(2, '0');
        const key = `${code}:${r.year}:${DEFAULT_BOUNDARY_VERSION}`;
        populationByKey[key] = {
          areaId: code,
          year: r.year,
          boundaryVersion: DEFAULT_BOUNDARY_VERSION,
          population: r.population,
          reviewStatus: 'approved',
          sourceId: 'src-gus-bdl-population-1999-2025'
        };
      }
    }
  }

  const approvedCases = (Array.isArray(raw.cases) ? raw.cases : [])
    .filter(c => c && c.verification === 'human_approved')
    .map(normalizeCaseRecord);

  const release = raw.release || {
    schemaVersion: '1.0.0',
    releaseId: '2026.11.08-r2',
    releasedAt: '2026-11-08',
    defaultMetricId: 'police_article_148_recorded_acts',
    defaultYear: 2025,
    boundaryVersion: DEFAULT_BOUNDARY_VERSION,
    files: [],
    coverageSummary: {
      nationalYearsApproved: ALL_TIMELINE_YEARS,
      regionalYearsApproved: ALL_TIMELINE_YEARS,
      regionalYearsUnreviewed: [],
      approvedCaseCount: approvedCases.length
    },
    revisions: [
      {
        revisionId: 'rev-2026-04-21-dane-gov-final',
        releasedAt: '2026-11-08',
        supersedesRevisionId: 'rev-2026-01-16-kgp-communique',
        summary:
          'Pełny zweryfikowany szereg 1999–2025 z pierwotnych tabel KGP / Dane.gov.pl (16/16 województw) oraz szeregów GUS.'
      }
    ]
  };

  // Build supplementary metrics index by year (1999..2025)
  const sdgRatesList = Array.isArray(release.supplementarySeries?.gusMortalitySdgRates2010To2024)
    ? release.supplementarySeries.gusMortalitySdgRates2010To2024
    : [];
  const sdgByYear = new Map(sdgRatesList.map(item => [Number(item.year), item]));

  const supplementaryByYear = {};
  for (const yr of ALL_TIMELINE_YEARS) {
    const natObs = activeObservations.find(
      o => o.seriesId === 'kgp_art148_national_official' && o.period === yr && o.areaId === 'PL'
    );
    const detObs = activeObservations.find(
      o => o.seriesId === 'police_detected_homicides' && o.period === yr && o.areaId === 'PL'
    );
    const initObs = activeObservations.find(
      o => o.seriesId === 'police_initiated_homicides' && o.period === yr && o.areaId === 'PL'
    );
    const vicObs = activeObservations.find(
      o => o.seriesId === 'gus_homicide_victims_national' && o.period === yr && o.areaId === 'PL'
    );
    const mortObs = activeObservations.find(
      o => o.seriesId === 'gus_homicide_mortality_rate' && o.period === yr && o.areaId === 'PL'
    );
    const mazObs = activeObservations.find(
      o => o.seriesId === 'kgp_art148_regional' && o.period === yr && o.areaId === '14'
    );
    const sdgItem = sdgByYear.get(yr) || null;
    const natLegacy = nationalRows.find(n => Number(n.year) === yr) || null;
    const mazLegacy = regionalRows.find(r => Number(r.year) === yr && String(r.teryt).padStart(2, '0') === '14') || null;

    supplementaryByYear[yr] = {
      year: yr,
      detectedActs: natObs?.detectedActs ?? detObs?.value ?? natLegacy?.detected_acts ?? null,
      detectionRatePct: natObs?.detectionRatePct ?? detObs?.detectionRatePct ?? natLegacy?.detection_rate_pct ?? null,
      initiatedProceedings: natObs?.initiatedProceedings ?? initObs?.value ?? natLegacy?.initiated_proceedings ?? null,
      gusVictims:
        vicObs && vicObs.availability === 'observed'
          ? {
              total: vicObs.value,
              femalesTotal: vicObs.femalesTotal ?? null,
              malesTotal: vicObs.malesTotal ?? null,
              sexUnknown: vicObs.sexUnknown ?? null
            }
          : null,
      gusMortalityRate: sdgItem
        ? {
            ratePer100k: sdgItem.rate_per_100k,
            deathsTotal: sdgItem.deaths_total ?? null,
            deathsMale: sdgItem.deaths_male ?? null,
            deathsFemale: sdgItem.deaths_female ?? null
          }
        : mortObs && mortObs.availability === 'observed'
          ? {
              ratePer100k: mortObs.ratePer100k ?? mortObs.value,
              deathsTotal: mortObs.deathsTotal ?? null,
              deathsMale: mortObs.deathsMale ?? null,
              deathsFemale: mortObs.deathsFemale ?? null
            }
          : null,
      garrisonBreakdown: mazObs?.garrisonBreakdown ?? mazLegacy?.garrison_breakdown ?? null
    };
  }

  const caseYears = approvedCases
    .map(c => c.year)
    .filter(y => Number.isInteger(y) && y >= 1999 && y <= 2030);
  const maxDatasetYear = Math.max(2025, ...caseYears);
  const timelineYears = Array.from(
    { length: maxDatasetYear - 1999 + 1 },
    (_, idx) => 1999 + idx
  );

  return deepFreeze({
    release,
    sourcesById,
    footnotes,
    metricsById,
    seriesById,
    areas,
    areasById,
    observations: activeObservations,
    populationByKey,
    supplementaryByYear,
    cases: approvedCases,
    timelineYears
  });
}

export const createDataAdapter = adaptDataset;
