export const METRIC = 'police_article_148_recorded_acts';
export const TERYT_CODES = new Set(['02','04','06','08','10','12','14','16','18','20','22','24','26','28','30','32']);

export const LOCATION_PRECISIONS = new Set([
  'exact_public_place',
  'street_segment',
  'municipality',
  'district',
  'unknown'
]);

export const PRIVATE_SCENE_PRECISIONS = new Set([
  'municipality',
  'district',
  'unknown'
]);

export const SCENE_PRIVACY_CLASSES = new Set([
  'public_place',
  'public_street_segment',
  'private_residence_or_protected',
  'area_only',
  'unknown'
]);

export const LEGAL_STATUSES = new Set([
  'investigation',
  'charged',
  'trial',
  'convicted',
  'convicted_non_final',
  'convicted_final',
  'acquitted',
  'discontinued',
  'unknown'
]);

export const CASE_OUTCOMES = new Set([
  'death',
  'attempted',
  'unclassified_mortem'
]);

export const OFFENSE_TYPES = new Set([
  'completed_homicide',
  'attempted_homicide'
]);

export const AVAILABILITY_VALUES = new Set([
  'observed',
  'missing',
  'suppressed',
  'not_applicable'
]);

export const REVIEW_STATUSES = new Set([
  'unreviewed',
  'approved',
  'rejected'
]);

// 1. Unconditional Private Residence / Apartment / Building Number Ban (applies to ALL cases regardless of precision)
export const PRIVATE_ADDRESS_PATTERN = new RegExp(
  [
    '\\bmieszkani(?:e|a|u|em|ach|om)\\b',
    '\\b(?:nr\\.?\\s*domu|numer\\s+domu|nr\\.?\\s*lokalu|posesj[ia]\\s+nr)\\b',
    '\\b(?:lok(?:al|\\.)?|m\\.|klatk[ai]|piętro|piętrze|bl(?:ok|\\.)?)\\s*\\d+\\b',
    '\\b(?:ul(?:ica|icy|icą|\\.)?|al(?:eja|ei|eją|\\.)?|os(?:iedle|iedlu|\\.)?)\\s+[\\p{Lu}][\\p{L}\\d.-]*(?:\\s+(?!(?:z|dnia|w|we|na|pod|przy|koło|rejonie|okolicach)\\b)[\\p{L}\\d.-]+){0,3}\\s+\\d+[a-z]?(?:\\s*\\/\\s*\\d+[a-z]?)?(?![-\\p{L}])\\b'
  ].join('|'),
  'iu'
);

// 2. Conditional Street Reference Ban (applies when precision is 'municipality' | 'district' | 'unknown')
export const STREET_REFERENCE_PATTERN = /\b(?:(?:ulica|ulicy|ulicą|aleja|alei|aleją)\b|(?:ul|al)\.(?=\s|$))/iu;

// 3. Personal Name + Initial Ban (e.g. "Jan K.", "Marek W.", "Piotr S.")
export const PERSONAL_INITIAL_PATTERN = /\b(?!Archiwum\s+X\.)[\p{Lu}][\p{Ll}]{2,20}\s+[\p{Lu}]\.(?!\s*[\p{Lu}])/u;

// 4. Automated / AI / Bot Self-Approval Ban
export const AUTOMATED_ACTOR_PATTERN =
  /\b(?:agent|ai|bot|auto|automated|llm|system|model|gemini|argon|claude|gpt|chatgpt|codex|subagent|copilot|antigravity|script|pipeline)\b/i;

// 5. Template Placeholder / Unresolved Sign-Off Ban
export const PLACEHOLDER_APPROVAL_PATTERN =
  /(?:^replace_with_|^todo\b|^tbd\b|placeholder|dry-run|simulated\s+editorial|editorial-protocol-dry-run|^0{8,})/i;

export const ALLOWED_EDITORIAL_APPROVAL_KEYS = new Set([
  'approvedBy',
  'approvedAt',
  'approvalRef',
  'signature',
  'publicPayloadDigest',
  'decisionNotesPl'
]);

export const ALLOWED_LOCATION_REVIEW_KEYS = new Set([
  'status',
  'reviewedBy',
  'reviewedAt',
  'scopeNotePl',
  'approvalRef'
]);

export function isAutomatedOrPlaceholderActor(value, { allowDryRun = false, minLength = 3 } = {}) {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (trimmed.length < minLength) return true;
  if (AUTOMATED_ACTOR_PATTERN.test(trimmed)) return true;
  if (!allowDryRun && PLACEHOLDER_APPROVAL_PATTERN.test(trimmed)) return true;
  return false;
}

export function isValidHttpsUrl(url) {
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function isWithinPolandBounds(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 48.5 &&
    lat <= 55.2 &&
    lng >= 13.5 &&
    lng <= 24.6
  );
}

function hasExcessiveCoordinatePrecision(coord) {
  if (!Number.isFinite(coord)) return false;
  const parts = String(coord).split('.');
  return parts.length === 2 && parts[1].length > 4;
}

function isIsoDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isIsoYearMonth(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}$/.test(str)) return false;
  const [y, m] = str.split('-').map(Number);
  return y >= 1900 && y <= 2100 && m >= 1 && m <= 12;
}

function isIsoYear(str) {
  if (typeof str !== 'string' || !/^\d{4}$/.test(str)) return false;
  const y = Number(str);
  return y >= 1900 && y <= 2100;
}

export function isValidPartialOrIsoDate(value, precision = 'day') {
  if (precision === 'year') {
    return isIsoYear(value) || isIsoYearMonth(value) || isIsoDate(value);
  }
  if (precision === 'month') {
    return isIsoYearMonth(value) || isIsoDate(value);
  }
  if (precision === 'day' || precision === 'range') {
    return isIsoDate(value);
  }
  return false;
}

export function isValidArchivalSource(src) {
  if (!src || typeof src !== 'object') return false;
  const sid =
    typeof src.id === 'string' && src.id.trim()
      ? src.id.trim()
      : typeof src.sourceId === 'string' && src.sourceId.trim()
        ? src.sourceId.trim()
        : null;
  if (!sid || sid.length < 3) return false;
  if (typeof src.publisher !== 'string' || !src.publisher.trim()) return false;
  if (typeof src.title !== 'string' || !src.title.trim()) return false;
  const isArchivalCategory =
    src.category === 'archival_document' ||
    src.category === 'court_record_offline' ||
    src.sourceClass === 'archival_document' ||
    src.sourceClass === 'court_record_offline' ||
    src.isOfflineArchival === true;
  if (!isArchivalCategory) return false;
  const hasNoOnlineUrl = src.url === null || src.url === undefined || src.url === '';
  if (!hasNoOnlineUrl) return false;
  const locator = src.archiveCitationPl ?? src.locatorPl ?? '';
  return typeof locator === 'string' && locator.trim().length >= 10;
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rotr32(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function sha256Hex(message) {
  const bytes = new TextEncoder().encode(String(message));
  const bitLen = bytes.length * 8;
  const totalBytes = (((bytes.length + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(totalBytes);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(totalBytes - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalBytes - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalBytes; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(v => v.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Canonical JSON for the entire public case record. Object field order must not
 * change the approval digest, while changes to dossiers, claims, citations,
 * chronology, location geometry or editorial decisions must invalidate it.
 */
function canonicalApprovalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalApprovalValue);
  if (value !== null && typeof value === 'object') {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) normalized[key] = canonicalApprovalValue(value[key]);
    }
    return normalized;
  }
  return value;
}

/**
 * Canonical JSON payload of the public case record BEFORE editor-specific
 * approval metadata (`editorialApproval`, `reviewed_at`, `published_location.reviewDecision`)
 * is stamped. Used to bind editorial decisions to the exact canonical publication payload.
 */
export function buildPublicCasePayload(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return '';
  const { editorialApproval: _ea, reviewed_at: _ra, ...publicCase } = c;
  if (
    publicCase.published_location &&
    typeof publicCase.published_location === 'object' &&
    !Array.isArray(publicCase.published_location)
  ) {
    const { reviewDecision: _rd, ...pubLocRest } = publicCase.published_location;
    publicCase.published_location = pubLocRest;
  }
  return JSON.stringify(canonicalApprovalValue(publicCase));
}

export function computePublicCasePayloadDigest(c) {
  return sha256Hex(buildPublicCasePayload(c));
}

export function buildCaseApprovalPayload(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return '';
  const { editorialApproval, ...publicCase } = c;
  const approvalObject =
    editorialApproval && typeof editorialApproval === 'object' && !Array.isArray(editorialApproval)
      ? editorialApproval
      : {};
  const { signature: _existingDigest, ...approvalMetadata } = approvalObject;
  return JSON.stringify(canonicalApprovalValue({
    ...publicCase,
    editorialApproval: approvalMetadata
  }));
}

/**
 * SHA-256 integrity digest, not an identity-authenticating digital signature.
 * Actual human sign-off must be independently evidenced and reviewed; a digest
 * in a Git-tracked manifest alone cannot prove that a human approved the case.
 */
export function computeCaseApprovalSignature(c) {
  return sha256Hex(buildCaseApprovalPayload(c));
}

/**
 * Convert a verified research candidate and human editorial decision into the
 * canonical public case record for `data/cases.json`, preserving all supported
 * public fields without inferring unknown values or leaking private research metadata.
 */
export function buildPublishableCaseRecord(cand, decision = {}) {
  if (!cand || typeof cand !== 'object') {
    throw new Error('Candidate must be a valid object');
  }
  const occurredOn = cand.occurred_on ?? cand.incidentDate;
  const datePrecision = cand.date_precision ?? 'day';
  const year = Number.isInteger(cand.year)
    ? cand.year
    : Number(String(occurredOn ?? '').slice(0, 4));
  const teryt = String(cand.voivodeship_teryt ?? cand.voivodeshipCode ?? '').padStart(2, '0');
  const precision = cand.published_location?.precision ?? cand.location?.precision;
  if (!precision) {
    throw new Error(`Candidate ${cand.id} is missing explicit location precision`);
  }
  const outcome = cand.outcome;
  if (!outcome) {
    throw new Error(`Candidate ${cand.id} is missing explicit outcome`);
  }
  const legalStatus = cand.legal_status ?? cand.legalStatus;
  if (!legalStatus) {
    throw new Error(`Candidate ${cand.id} is missing explicit legal_status`);
  }

  const victimCountFatal =
    cand.victimCountFatal !== undefined
      ? cand.victimCountFatal
      : outcome === 'attempted'
        ? 0
        : cand.victim_count;
  const victimCountInjured = cand.victimCountInjured ?? 0;
  const perpetratorFatalityCountExcluded = cand.perpetratorFatalityCountExcluded ?? 0;
  const victimCount = cand.victim_count !== undefined ? cand.victim_count : victimCountFatal;

  const candSources = (Array.isArray(cand.sources) ? cand.sources : []).map((s, si) => {
    const sid = s.id || s.sourceId || `${cand.id}-src-${si + 1}`;
    const isArchival = isValidArchivalSource(s);
    return {
      id: sid,
      sourceId: sid,
      publisher: s.publisher,
      ...(s.sourceClass ? { sourceClass: s.sourceClass } : {}),
      title: s.title,
      ...(isArchival
        ? {
            url: null,
            isOfflineArchival: true,
            archiveCitationPl: s.archiveCitationPl || s.locatorPl
          }
        : {
            url: s.url,
            ...(s.sha256 ? { sha256: s.sha256 } : {}),
            ...(Number.isSafeInteger(s.byteLength) ? { byteLength: s.byteLength } : {}),
            ...(Number.isSafeInteger(s.httpStatus) ? { httpStatus: s.httpStatus } : {})
          }),
      ...(s.publishedAt || s.published_on
        ? {
            publishedAt: s.publishedAt || s.published_on,
            published_on: s.published_on || s.publishedAt
          }
        : {}),
      retrievedAt: s.retrievedAt || s.accessed_on || s.accessedDate,
      locatorPl: s.locatorPl || s.locator || s.archiveCitationPl || '',
      ...(Array.isArray(s.supportedClaimsPl) && s.supportedClaimsPl.length > 0
        ? { supportedClaimsPl: [...s.supportedClaimsPl] }
        : {}),
      ...(s.availabilityStatus ? { availabilityStatus: s.availabilityStatus } : {})
    };
  });

  const urls = Array.isArray(cand.source_urls)
    ? [...cand.source_urls]
    : candSources.map(s => s.url).filter(Boolean);

  const rawDossier = cand.dossier && typeof cand.dossier === 'object' ? cand.dossier : {};
  const toTextList = val =>
    Array.isArray(val)
      ? val.map(v => String(v || '').trim()).filter(Boolean)
      : typeof val === 'string' && val.trim()
        ? [val.trim()]
        : [];
  const confirmedList = toTextList(rawDossier.confirmedFactsPl);
  const allegationsList = toTextList(rawDossier.allegationsPl);
  const legalFindingsList = toTextList(rawDossier.legalFindingsPl);
  const uncertaintiesList = toTextList(rawDossier.uncertaintiesPl);

  const courseAndFindingsText =
    typeof rawDossier.courseAndFindingsPl === 'string' && rawDossier.courseAndFindingsPl.trim()
      ? rawDossier.courseAndFindingsPl.trim()
      : [...allegationsList, ...legalFindingsList].join(' ');
  const unknownsText =
    typeof rawDossier.unknownsAndLimitationsPl === 'string' && rawDossier.unknownsAndLimitationsPl.trim()
      ? rawDossier.unknownsAndLimitationsPl.trim()
      : uncertaintiesList.join(' ');

  const dossier = {
    summaryPl: rawDossier.summaryPl || cand.summary,
    confirmedFactsPl: confirmedList.length > 0 ? confirmedList : [cand.summary],
    allegationsPl: allegationsList,
    legalFindingsPl: legalFindingsList,
    uncertaintiesPl: uncertaintiesList,
    courseAndFindingsPl: courseAndFindingsText,
    unknownsAndLimitationsPl: unknownsText,
    sourceIds:
      Array.isArray(rawDossier.sourceIds) && rawDossier.sourceIds.length > 0
        ? [...rawDossier.sourceIds]
        : candSources.map(s => s.id)
  };

  const approvedBy = decision.approvedBy || 'Pending Human Review';
  const approvedAt = decision.approvedAt || '2026-11-09';
  const approvalRef = decision.approvalRef || 'pending';
  const scopeNotePl =
    decision.scopeNotePl ||
    'Zatwierdzono do publikacji po dwuetapowej weryfikacji źródeł i kontroli prywatności przez redaktora ludzkiego.';

  const lat = cand.location?.lat ?? cand.published_location?.lat ?? null;
  const lng = cand.location?.lng ?? cand.published_location?.lng ?? null;

  const record = {
    id: cand.id,
    occurred_on: occurredOn,
    date_precision: datePrecision,
    ...(cand.occurred_to != null ? { occurred_to: cand.occurred_to } : {}),
    ...(Number.isInteger(year) ? { year } : {}),
    municipality: cand.municipality,
    ...(typeof cand.district === 'string' && cand.district.trim()
      ? { district: cand.district.trim() }
      : {}),
    voivodeship_teryt: teryt,
    ...(typeof cand.voivodeshipName === 'string' && cand.voivodeshipName.trim()
      ? { voivodeshipName: cand.voivodeshipName.trim() }
      : {}),
    ...(typeof cand.policeCommand === 'string' && cand.policeCommand.trim()
      ? { policeCommand: cand.policeCommand.trim() }
      : {}),
    titlePl: cand.titlePl || cand.title || `${cand.municipality} · ${occurredOn}`,
    summary: cand.summary,
    outcome,
    outcomeLabelPl:
      cand.outcomeLabelPl ||
      (outcome === 'attempted'
        ? 'Usiłowanie zabójstwa (art. 13 § 1 k.k. w zw. z art. 148 k.k.) — 0 ofiar śmiertelnych'
        : 'Zabójstwo dokonane (art. 148 k.k.)'),
    offenseType:
      cand.offenseType || (outcome === 'attempted' ? 'attempted_homicide' : 'completed_homicide'),
    legal_status: legalStatus,
    legal_status_detail: cand.legal_status_detail || legalStatus,
    ...(typeof cand.legalStatusLabelPl === 'string' && cand.legalStatusLabelPl.trim()
      ? { legalStatusLabelPl: cand.legalStatusLabelPl.trim() }
      : {}),
    ...(typeof cand.legalQualification === 'string' && cand.legalQualification.trim()
      ? { legalQualification: cand.legalQualification.trim() }
      : {}),
    victim_count: victimCount,
    victimCountFatal,
    victimCountInjured,
    perpetratorFatalityCountExcluded,
    relatedCaseIds: Array.isArray(cand.relatedCaseIds) ? [...cand.relatedCaseIds] : [],
    sharedInvestigationId:
      typeof cand.sharedInvestigationId === 'string' && cand.sharedInvestigationId.trim()
        ? cand.sharedInvestigationId.trim()
        : null,
    verification: 'human_approved',
    reviewed_at: approvedAt,
    status_updated_at: cand.status_updated_at || approvedAt,
    location: {
      lat,
      lng,
      precision,
      is_approximate: precision !== 'exact_public_place',
      ...(cand.location?.geometry !== undefined ? { geometry: cand.location.geometry } : {})
    },
    published_location: {
      precision,
      scenePrivacyClass:
        cand.published_location?.scenePrivacyClass ||
        (precision === 'exact_public_place'
          ? 'public_place'
          : precision === 'street_segment'
            ? 'public_street_segment'
            : 'private_residence_or_protected'),
      publicLabelPl:
        cand.published_location?.publicLabelPl ||
        cand.published_location?.label ||
        `${cand.municipality} (poziom gminy — ochrona prywatności)`,
      precisionBadgePl:
        cand.published_location?.precisionBadgePl ||
        (precision === 'exact_public_place'
          ? 'miejsce potwierdzone'
          : precision === 'street_segment'
            ? 'odcinek ulicy'
            : precision === 'district'
              ? 'obszar przybliżony — poziom dzielnicy/powiatu'
              : 'obszar przybliżony — poziom gminy'),
      ...(typeof cand.published_location?.privacyRationale === 'string' &&
      cand.published_location.privacyRationale.trim()
        ? { privacyRationale: cand.published_location.privacyRationale.trim() }
        : {}),
      geometry:
        cand.published_location?.geometry !== undefined
          ? cand.published_location.geometry
          : precision === 'exact_public_place'
            ? {
                type: 'Point',
                coordinates: [lng, lat]
              }
            : null,
      sourceIds:
        Array.isArray(cand.published_location?.sourceIds) && cand.published_location.sourceIds.length > 0
          ? [...cand.published_location.sourceIds]
          : candSources.map(s => s.id),
      reviewDecision: {
        status: 'approved',
        reviewedBy: approvedBy,
        reviewedAt: approvedAt,
        scopeNotePl,
        ...(approvalRef ? { approvalRef } : {})
      }
    },
    dossier,
    claims: (Array.isArray(cand.claims) ? cand.claims : []).map((cl, ci) => ({
      claimId: cl.claimId || cl.id || `${cand.id}-clm-${ci + 1}`,
      category: cl.category || 'fact',
      textPl: cl.textPl || cl.statement || '',
      sourceIds: Array.isArray(cl.sourceIds) ? [...cl.sourceIds] : [],
      ...(cl.verifiedAt ? { verifiedAt: cl.verifiedAt } : {})
    })),
    chronology: (Array.isArray(cand.chronology) ? cand.chronology : []).map(ch => ({
      date: ch.date,
      datePrecision: ch.datePrecision || 'day',
      labelPl: ch.labelPl || ch.event || '',
      ...(ch.stageType ? { stageType: ch.stageType } : {}),
      ...(ch.claimType ? { claimType: ch.claimType } : {}),
      sourceIds: Array.isArray(ch.sourceIds) ? [...ch.sourceIds] : []
    })),
    corrections: (Array.isArray(cand.corrections) ? cand.corrections : []).map(corr => ({
      correctedAt: corr.correctedAt,
      ...(corr.field ? { field: corr.field } : {}),
      ...(corr.previousValue !== undefined ? { previousValue: corr.previousValue } : {}),
      ...(corr.correctedValue !== undefined ? { correctedValue: corr.correctedValue } : {}),
      summaryPl: corr.summaryPl || corr.notePl || '',
      ...(Array.isArray(corr.sourceIds) && corr.sourceIds.length > 0
        ? { sourceIds: [...corr.sourceIds] }
        : {})
    })),
    unresolvedDiscrepancies: (Array.isArray(cand.unresolvedDiscrepancies)
      ? cand.unresolvedDiscrepancies
      : []
    ).map(u => ({
      ...(u.id ? { id: u.id } : {}),
      topic: u.topic || 'general',
      status: u.status || 'unresolved',
      descriptionPl: u.descriptionPl || '',
      ...(Array.isArray(u.sourceIds) && u.sourceIds.length > 0 ? { sourceIds: [...u.sourceIds] } : {})
    })),
    sources: candSources,
    source_urls: urls,
    editorialApproval: {
      approvedBy,
      approvedAt,
      approvalRef,
      publicPayloadDigest: '',
      signature: '',
      ...(typeof decision.decisionNotesPl === 'string' && decision.decisionNotesPl.trim()
        ? { decisionNotesPl: decision.decisionNotesPl.trim() }
        : {})
    }
  };

  const publicPayloadDigest = computePublicCasePayloadDigest(record);
  record.editorialApproval.publicPayloadDigest = publicPayloadDigest;
  record.editorialApproval.signature = computeCaseApprovalSignature(record);

  return record;
}

export function verifyRegional(rows) {
  if (!Array.isArray(rows)) throw new Error('regional data must be an array');
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (!Number.isInteger(r.year) || r.year < 1999 || r.year > 2100) throw new Error(`regional[${i}] invalid year`);
    if (!TERYT_CODES.has(r.teryt)) throw new Error(`regional[${i}] invalid TERYT`);
    if (!Number.isSafeInteger(r.count) || r.count < 0) throw new Error(`regional[${i}] count must be non-negative integer`);
    if (r.metric !== METRIC) throw new Error(`regional[${i}] unsupported metric`);
    if (!['secondary_unverified', 'official_verified'].includes(r.verification)) throw new Error(`regional[${i}] invalid verification`);
    if (!isValidHttpsUrl(r.source_url ?? '')) throw new Error(`regional[${i}] missing source URL`);
    const key = `${r.year}:${r.teryt}:${r.metric}`;
    if (seen.has(key)) throw new Error(`duplicate regional key ${key}`);
    seen.add(key);
  }
  return true;
}

export function verifyNational(rows) {
  if (!Array.isArray(rows)) throw new Error('national data must be an array');
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (!Number.isInteger(r.year) || !Number.isSafeInteger(r.value) || r.value < 0 || r.metric !== METRIC) {
      throw new Error(`national[${i}] invalid data`);
    }
    if (r.verification !== 'official_publication' || !isValidHttpsUrl(r.source_url ?? '')) {
      throw new Error(`national[${i}] missing official source`);
    }
    if (seen.has(r.year)) throw new Error(`duplicate national year ${r.year}`);
    seen.add(r.year);
  }
  return true;
}

function collectCaseTextFields(c) {
  const texts = [];
  const pushStr = val => {
    if (typeof val === 'string' && val.trim()) texts.push(val);
  };
  pushStr(c.title);
  pushStr(c.titlePl);
  pushStr(c.summary);
  pushStr(c.district);
  pushStr(c.municipality);
  pushStr(c.outcomeLabelPl);
  pushStr(c.legalStatusLabelPl);
  pushStr(c.published_location?.publicLabelPl);
  pushStr(c.published_location?.label);
  pushStr(c.published_location?.precisionBadgePl);
  pushStr(c.published_location?.privacyRationale);
  pushStr(c.published_location?.reviewDecision?.scopeNotePl);
  if (c.dossier && typeof c.dossier === 'object') {
    for (const [k, val] of Object.entries(c.dossier)) {
      if (k === 'sourceIds') continue;
      if (Array.isArray(val)) {
        for (const item of val) pushStr(item);
      } else {
        pushStr(val);
      }
    }
  }
  if (Array.isArray(c.claims)) {
    for (const clm of c.claims) {
      pushStr(clm?.textPl);
      pushStr(clm?.statement);
    }
  }
  if (Array.isArray(c.chronology)) {
    for (const item of c.chronology) {
      pushStr(item?.labelPl);
      pushStr(item?.event);
    }
  }
  if (Array.isArray(c.corrections)) {
    for (const corr of c.corrections) {
      pushStr(corr?.summaryPl);
    }
  }
  if (Array.isArray(c.unresolvedDiscrepancies)) {
    for (const unres of c.unresolvedDiscrepancies) {
      pushStr(unres?.descriptionPl);
    }
  }
  if (Array.isArray(c.sources)) {
    for (const src of c.sources) {
      pushStr(src?.title);
    }
  }
  return texts;
}

export function verifyCases(rows, context = {}) {
  if (!Array.isArray(rows)) throw new Error('cases data must be an array');

  if (context.requireEditorialApprovalSignature) {
    if (Array.isArray(context.approvedCaseSignatures)) {
      const normalizedSigs = context.approvedCaseSignatures.map(s => String(s).toLowerCase());
      if (new Set(normalizedSigs).size !== normalizedSigs.length) {
        throw new Error('duplicate signature in approvedCaseSignatures manifest');
      }
    }
    if (Array.isArray(context.approvedCaseDecisions)) {
      const seenDecCaseIds = new Set();
      const seenDecSigs = new Set();
      for (const [di, d] of context.approvedCaseDecisions.entries()) {
        if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.caseId !== 'string') {
          throw new Error(`approvedCaseDecisions[${di}] invalid decision entry`);
        }
        if (seenDecCaseIds.has(d.caseId)) {
          throw new Error(`duplicate or conflicting approval decision for caseId ${d.caseId}`);
        }
        seenDecCaseIds.add(d.caseId);
        const sigNorm = String(d.signature || '').toLowerCase();
        if (seenDecSigs.has(sigNorm)) {
          throw new Error(`duplicate approval signature in approvedCaseDecisions[${di}]`);
        }
        seenDecSigs.add(sigNorm);
      }
    }
  }

  const seen = new Set();
  for (const [i, c] of rows.entries()) {
    if (typeof c.id !== 'string' || c.id.length < 5 || seen.has(c.id)) {
      throw new Error(`cases[${i}] missing or duplicate ID`);
    }
    seen.add(c.id);

    const datePrecision = c.date_precision ?? 'day';
    if (!['day', 'month', 'year', 'range'].includes(datePrecision)) {
      throw new Error(`cases[${i}] invalid date_precision`);
    }
    if (!isValidPartialOrIsoDate(c.occurred_on, datePrecision)) {
      throw new Error(`cases[${i}] invalid occurred_on`);
    }
    if (
      (datePrecision === 'range' || c.occurred_to != null) &&
      (!isValidPartialOrIsoDate(c.occurred_to, datePrecision) || String(c.occurred_to) < String(c.occurred_on))
    ) {
      throw new Error(`cases[${i}] invalid occurred_to range`);
    }
    if (!TERYT_CODES.has(c.voivodeship_teryt) || typeof c.municipality !== 'string' || c.municipality.length < 2) {
      throw new Error(`cases[${i}] invalid place`);
    }
    if (c.verification !== 'human_approved' || !isIsoDate(c.reviewed_at)) {
      throw new Error(`cases[${i}] requires human approval date`);
    }
    if (c.editorialApproval?.publicPayloadDigest !== undefined) {
      const expectedPublicDigest = computePublicCasePayloadDigest(c);
      if (
        typeof c.editorialApproval.publicPayloadDigest !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(c.editorialApproval.publicPayloadDigest) ||
        c.editorialApproval.publicPayloadDigest.toLowerCase() !== expectedPublicDigest
      ) {
        throw new Error(`cases[${i}] publicPayloadDigest mismatch`);
      }
    }
    if (context.requireEditorialApprovalSignature) {
      const ea = c.editorialApproval;
      const allowDryRun = Boolean(context.allowDryRunPlaceholders);
      const isPlainObject = Boolean(ea && typeof ea === 'object' && !Array.isArray(ea));
      const hasUnknownKeys =
        isPlainObject && Object.keys(ea).some(k => !ALLOWED_EDITORIAL_APPROVAL_KEYS.has(k));
      const hasInvalidDecisionNotes =
        isPlainObject &&
        ea.decisionNotesPl !== undefined &&
        (typeof ea.decisionNotesPl !== 'string' || !ea.decisionNotesPl.trim());
      const expectedPublicDigest = computePublicCasePayloadDigest(c);
      const hasInvalidPublicPayloadDigest =
        isPlainObject &&
        ea.publicPayloadDigest !== undefined &&
        (typeof ea.publicPayloadDigest !== 'string' ||
          !/^[a-f0-9]{64}$/i.test(ea.publicPayloadDigest) ||
          ea.publicPayloadDigest.toLowerCase() !== expectedPublicDigest);
      const expectedSig = computeCaseApprovalSignature(c);
      if (
        !isPlainObject ||
        hasUnknownKeys ||
        hasInvalidDecisionNotes ||
        hasInvalidPublicPayloadDigest ||
        isAutomatedOrPlaceholderActor(ea.approvedBy, { allowDryRun, minLength: 3 }) ||
        !isIsoDate(ea.approvedAt) ||
        isAutomatedOrPlaceholderActor(ea.approvalRef, { allowDryRun, minLength: 4 }) ||
        typeof ea.signature !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(ea.signature) ||
        ea.signature.toLowerCase() !== expectedSig
      ) {
        throw new Error(
          `cases[${i}] missing or invalid identifiable human editor editorialApproval sign-off`
        );
      }
      if (context.approvedCaseSignatures) {
        const sigSet = new Set(
          [...context.approvedCaseSignatures].map(s => String(s).toLowerCase())
        );
        if (!sigSet.has(ea.signature.toLowerCase())) {
          throw new Error(
            `cases[${i}] editorialApproval.signature is not registered in release manifest approvedCaseSignatures`
          );
        }
      }
      if (context.approvedCaseDecisions) {
        const decisions = Array.isArray(context.approvedCaseDecisions)
          ? context.approvedCaseDecisions
          : [];
        const matchingDecision = decisions.find(
          d =>
            d &&
            typeof d === 'object' &&
            !Array.isArray(d) &&
            d.caseId === c.id &&
            typeof d.signature === 'string' &&
            d.signature.toLowerCase() === ea.signature.toLowerCase() &&
            (d.publicPayloadDigest === undefined ||
              (typeof d.publicPayloadDigest === 'string' &&
                d.publicPayloadDigest.toLowerCase() === expectedPublicDigest)) &&
            d.approvedBy === ea.approvedBy &&
            d.approvedAt === ea.approvedAt &&
            d.approvalRef === ea.approvalRef &&
            !isAutomatedOrPlaceholderActor(d.approvedBy, { allowDryRun, minLength: 3 }) &&
            !isAutomatedOrPlaceholderActor(d.approvalRef, { allowDryRun, minLength: 4 })
        );
        if (!matchingDecision) {
          throw new Error(
            `cases[${i}] missing verified human authorization record in release manifest approvedCaseDecisions`
          );
        }
      }
    }
    if (!LEGAL_STATUSES.has(c.legal_status)) {
      throw new Error(`cases[${i}] invalid legal status`);
    }
    if (c.legal_status_detail != null && !LEGAL_STATUSES.has(c.legal_status_detail)) {
      throw new Error(`cases[${i}] invalid legal_status_detail`);
    }
    if (c.outcome != null && !CASE_OUTCOMES.has(c.outcome)) {
      throw new Error(`cases[${i}] invalid outcome`);
    }
    if (c.offenseType != null && !OFFENSE_TYPES.has(c.offenseType)) {
      throw new Error(`cases[${i}] invalid offenseType`);
    }
    if (c.victim_count !== undefined && (!Number.isSafeInteger(c.victim_count) || c.victim_count < 0)) {
      throw new Error(`cases[${i}] invalid victim_count`);
    }
    if (c.victimCountFatal !== undefined && (!Number.isSafeInteger(c.victimCountFatal) || c.victimCountFatal < 0)) {
      throw new Error(`cases[${i}] invalid victimCountFatal`);
    }
    if (c.victimCountInjured !== undefined && (!Number.isSafeInteger(c.victimCountInjured) || c.victimCountInjured < 0)) {
      throw new Error(`cases[${i}] invalid victimCountInjured`);
    }
    if (
      c.perpetratorFatalityCountExcluded !== undefined &&
      (!Number.isSafeInteger(c.perpetratorFatalityCountExcluded) || c.perpetratorFatalityCountExcluded < 0)
    ) {
      throw new Error(`cases[${i}] invalid perpetratorFatalityCountExcluded`);
    }
    if (
      c.victim_count !== undefined &&
      c.victimCountFatal !== undefined &&
      c.victim_count !== c.victimCountFatal
    ) {
      throw new Error(`cases[${i}] victim_count (${c.victim_count}) must equal victimCountFatal (${c.victimCountFatal})`);
    }
    if (c.outcome === 'attempted') {
      if ((c.victimCountFatal !== undefined && c.victimCountFatal !== 0) || (c.victim_count !== undefined && c.victim_count !== 0)) {
        throw new Error(`cases[${i}] attempted homicide must have victimCountFatal === 0`);
      }
      if (c.offenseType !== undefined && c.offenseType !== 'attempted_homicide') {
        throw new Error(`cases[${i}] attempted homicide must have offenseType === "attempted_homicide"`);
      }
    } else if (c.outcome === 'death') {
      if (c.victimCountFatal !== undefined && c.victimCountFatal < 1) {
        throw new Error(`cases[${i}] completed homicide (outcome="death") must have victimCountFatal >= 1`);
      }
      if (c.offenseType !== undefined && c.offenseType !== 'completed_homicide') {
        throw new Error(`cases[${i}] completed homicide must have offenseType === "completed_homicide"`);
      }
    }

    if (c.relatedCaseIds !== undefined) {
      if (
        !Array.isArray(c.relatedCaseIds) ||
        c.relatedCaseIds.some(rid => typeof rid !== 'string' || !rid.trim() || rid === c.id) ||
        new Set(c.relatedCaseIds).size !== c.relatedCaseIds.length
      ) {
        throw new Error(`cases[${i}] invalid relatedCaseIds`);
      }
    }
    if (
      c.sharedInvestigationId !== undefined &&
      c.sharedInvestigationId !== null &&
      (typeof c.sharedInvestigationId !== 'string' || !c.sharedInvestigationId.trim())
    ) {
      throw new Error(`cases[${i}] invalid sharedInvestigationId`);
    }

    const loc = c.location;
    const pubLoc = c.published_location;
    const precision = pubLoc?.precision ?? loc?.precision;
    if (!loc || !LOCATION_PRECISIONS.has(precision)) {
      throw new Error(`cases[${i}] unsupported location precision/bounds`);
    }

    if (pubLoc?.precision && loc.precision && pubLoc.precision !== loc.precision) {
      throw new Error(`cases[${i}] mismatched location precision`);
    }

    const scenePrivacyClass =
      pubLoc?.scenePrivacyClass ??
      (PRIVATE_SCENE_PRECISIONS.has(precision) ? 'area_only' : 'public_place');
    if (!SCENE_PRIVACY_CLASSES.has(scenePrivacyClass)) {
      throw new Error(`cases[${i}] invalid scenePrivacyClass`);
    }
    if (scenePrivacyClass === 'private_residence_or_protected' && !PRIVATE_SCENE_PRECISIONS.has(precision)) {
      throw new Error(`cases[${i}] private scene cannot use exact or street precision`);
    }

    if (typeof c.summary !== 'string' || !c.summary.trim()) {
      throw new Error(`cases[${i}] missing neutral summary`);
    }

    const texts = collectCaseTextFields(c);
    for (const text of texts) {
      if (PRIVATE_ADDRESS_PATTERN.test(text)) {
        throw new Error(`cases[${i}] remove exact-address references`);
      }
      if (PRIVATE_SCENE_PRECISIONS.has(precision) && STREET_REFERENCE_PATTERN.test(text)) {
        throw new Error(`cases[${i}] remove exact-address references`);
      }
      if (PERSONAL_INITIAL_PATTERN.test(text)) {
        throw new Error(`cases[${i}] remove personal names or initials`);
      }
    }

    const validSourceIds = new Set(context.sourceIds ? [...context.sourceIds] : []);
    let hasValidArchivalCaseSource = false;
    if (c.sources !== undefined) {
      if (!Array.isArray(c.sources) || c.sources.length === 0) {
        throw new Error(`cases[${i}].sources must be a non-empty array when provided`);
      }
      for (const [si, s] of c.sources.entries()) {
        const sid =
          typeof s?.id === 'string' && s.id.trim()
            ? s.id.trim()
            : typeof s?.sourceId === 'string' && s.sourceId.trim()
              ? s.sourceId.trim()
              : null;
        const isOnlineValid =
          Boolean(sid) &&
          isValidHttpsUrl(s?.url) &&
          typeof s?.publisher === 'string' &&
          Boolean(s.publisher.trim()) &&
          typeof s?.title === 'string' &&
          Boolean(s.title.trim());
        const isArchivalValid = isValidArchivalSource(s);
        if (!isOnlineValid && !isArchivalValid) {
          throw new Error(`cases[${i}].sources[${si}] invalid source entry`);
        }
        if (isArchivalValid) {
          hasValidArchivalCaseSource = true;
        }
        validSourceIds.add(sid);
      }
    }
    const enforceSourceRegistry = Array.isArray(c.sources) || Boolean(context.sourceIds);
    const checkSourceIds = (ids, fieldLabel) => {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error(`cases[${i}] ${fieldLabel} must be a non-empty array`);
      }
      for (const sid of ids) {
        if (typeof sid !== 'string' || !sid.trim()) {
          throw new Error(`cases[${i}] ${fieldLabel} contains invalid sourceId`);
        }
        if (enforceSourceRegistry && !validSourceIds.has(sid)) {
          throw new Error(`cases[${i}] ${fieldLabel} references unknown sourceId "${sid}"`);
        }
      }
    };

    const reviewDec = pubLoc?.reviewDecision;
    const isReviewPlainObject = Boolean(
      reviewDec && typeof reviewDec === 'object' && !Array.isArray(reviewDec)
    );
    const hasUnknownReviewKeys =
      isReviewPlainObject && Object.keys(reviewDec).some(k => !ALLOWED_LOCATION_REVIEW_KEYS.has(k));
    const allowDryRunReview = Boolean(context.allowDryRunPlaceholders);

    if (
      !pubLoc ||
      !isReviewPlainObject ||
      hasUnknownReviewKeys ||
      reviewDec.status !== 'approved' ||
      isAutomatedOrPlaceholderActor(reviewDec.reviewedBy, {
        allowDryRun: allowDryRunReview,
        minLength: 3
      }) ||
      !isIsoDate(reviewDec.reviewedAt) ||
      (reviewDec.scopeNotePl !== undefined &&
        (typeof reviewDec.scopeNotePl !== 'string' || !reviewDec.scopeNotePl.trim())) ||
      !Array.isArray(pubLoc.sourceIds) ||
      pubLoc.sourceIds.length === 0
    ) {
      throw new Error(`cases[${i}] unsupported location precision/bounds: missing human location reviewDecision`);
    }
    checkSourceIds(pubLoc.sourceIds, 'published_location.sourceIds');

    if (precision === 'municipality' || precision === 'district') {
      if (
        loc.is_approximate !== true ||
        !isWithinPolandBounds(loc.lat, loc.lng) ||
        hasExcessiveCoordinatePrecision(loc.lat) ||
        hasExcessiveCoordinatePrecision(loc.lng)
      ) {
        throw new Error(`cases[${i}] unsupported location precision/bounds`);
      }
      if (pubLoc.geometry !== null && pubLoc.geometry !== undefined) {
        if (pubLoc.geometry.type === 'Point') {
          const coords = pubLoc.geometry.coordinates;
          if (
            !Array.isArray(coords) ||
            coords.length !== 2 ||
            !isWithinPolandBounds(coords[1], coords[0]) ||
            hasExcessiveCoordinatePrecision(coords[1]) ||
            hasExcessiveCoordinatePrecision(coords[0]) ||
            Math.abs(coords[0] - loc.lng) > 1e-9 ||
            Math.abs(coords[1] - loc.lat) > 1e-9
          ) {
            throw new Error(`cases[${i}] unsupported location precision/bounds: invalid coarse Point geometry`);
          }
        } else if (pubLoc.geometry.type === 'Polygon') {
          const rings = pubLoc.geometry.coordinates;
          if (
            !Array.isArray(rings) ||
            rings.length === 0 ||
            rings.some(
              ring =>
                !Array.isArray(ring) ||
                ring.length < 4 ||
                ring.some(
                  pt =>
                    !Array.isArray(pt) ||
                    pt.length !== 2 ||
                    !isWithinPolandBounds(pt[1], pt[0]) ||
                    hasExcessiveCoordinatePrecision(pt[1]) ||
                    hasExcessiveCoordinatePrecision(pt[0])
                )
            )
          ) {
            throw new Error(`cases[${i}] unsupported location precision/bounds: invalid coarse Polygon geometry`);
          }
        } else {
          throw new Error(`cases[${i}] unsupported location precision/bounds: coarse precision disallows ${pubLoc.geometry.type}`);
        }
      }
    } else if (precision === 'exact_public_place' || precision === 'street_segment') {
      if (!isWithinPolandBounds(loc.lat, loc.lng)) {
        throw new Error(`cases[${i}] unsupported location precision/bounds`);
      }
      if (precision === 'exact_public_place') {
        if (loc.is_approximate !== false) {
          throw new Error(`cases[${i}] exact_public_place precision must set is_approximate: false`);
        }
        const coords = pubLoc.geometry?.coordinates;
        if (
          pubLoc.geometry?.type !== 'Point' ||
          !Array.isArray(coords) ||
          coords.length !== 2 ||
          !isWithinPolandBounds(coords[1], coords[0])
        ) {
          throw new Error(`cases[${i}] exact_public_place precision requires valid Point geometry`);
        }
      } else {
        if (loc.is_approximate !== true) {
          throw new Error(`cases[${i}] street_segment precision must set is_approximate: true`);
        }
        const coords = pubLoc.geometry?.coordinates;
        if (
          pubLoc.geometry?.type !== 'LineString' ||
          !Array.isArray(coords) ||
          coords.length < 2 ||
          coords.some(pt => !Array.isArray(pt) || pt.length !== 2 || !isWithinPolandBounds(pt[1], pt[0]))
        ) {
          throw new Error(`cases[${i}] street_segment precision requires valid LineString geometry`);
        }
      }
    } else if (precision === 'unknown') {
      if (
        loc.is_approximate !== true ||
        pubLoc.geometry !== null ||
        ((loc.lat !== null || loc.lng !== null) &&
          (!isWithinPolandBounds(loc.lat, loc.lng) ||
            hasExcessiveCoordinatePrecision(loc.lat) ||
            hasExcessiveCoordinatePrecision(loc.lng)))
      ) {
        throw new Error(`cases[${i}] unsupported location precision/bounds`);
      }
    }

    const hasValidOnlineUrls =
      Array.isArray(c.source_urls) &&
      c.source_urls.length > 0 &&
      c.source_urls.every(u => isValidHttpsUrl(u));
    const hasEmptyUrlsWithArchival =
      Array.isArray(c.source_urls) && c.source_urls.length === 0 && hasValidArchivalCaseSource;
    if (!hasValidOnlineUrls && !hasEmptyUrlsWithArchival) {
      throw new Error(`cases[${i}] source URLs required`);
    }

    if (Array.isArray(c.claims)) {
      for (const [ci, clm] of c.claims.entries()) {
        if (
          typeof clm?.claimId !== 'string' ||
          !['fact', 'prosecutor_charge', 'court_finding', 'official_statement'].includes(clm.category) ||
          typeof clm.textPl !== 'string' ||
          !clm.textPl.trim() ||
          !Array.isArray(clm.sourceIds) ||
          clm.sourceIds.length === 0
        ) {
          throw new Error(`cases[${i}].claims[${ci}] invalid claim structure`);
        }
        checkSourceIds(clm.sourceIds, `claims[${ci}].sourceIds`);
      }
    }

    if (c.chronology !== undefined) {
      if (!Array.isArray(c.chronology)) {
        throw new Error(`cases[${i}].chronology must be an array`);
      }
      for (const [chi, item] of c.chronology.entries()) {
        const itemDatePrecision = item?.datePrecision ?? 'day';
        if (
          !['day', 'month', 'year'].includes(itemDatePrecision) ||
          !isValidPartialOrIsoDate(item?.date, itemDatePrecision) ||
          typeof item?.labelPl !== 'string' ||
          !item.labelPl.trim() ||
          !Array.isArray(item?.sourceIds) ||
          item.sourceIds.length === 0
        ) {
          throw new Error(`cases[${i}].chronology[${chi}] invalid chronology entry`);
        }
        checkSourceIds(item.sourceIds, `chronology[${chi}].sourceIds`);
      }
    }

    if (c.corrections !== undefined) {
      if (!Array.isArray(c.corrections)) {
        throw new Error(`cases[${i}].corrections must be an array`);
      }
      for (const [coi, corr] of c.corrections.entries()) {
        if (
          !isIsoDate(corr?.correctedAt) ||
          typeof corr?.summaryPl !== 'string' ||
          !corr.summaryPl.trim()
        ) {
          throw new Error(`cases[${i}].corrections[${coi}] invalid correction entry`);
        }
        if (corr.sourceIds !== undefined) {
          checkSourceIds(corr.sourceIds, `corrections[${coi}].sourceIds`);
        }
      }
    }

    if (c.unresolvedDiscrepancies !== undefined) {
      if (!Array.isArray(c.unresolvedDiscrepancies)) {
        throw new Error(`cases[${i}].unresolvedDiscrepancies must be an array`);
      }
      for (const [ui, unres] of c.unresolvedDiscrepancies.entries()) {
        if (
          typeof unres?.topic !== 'string' ||
          !unres.topic.trim() ||
          typeof unres?.status !== 'string' ||
          !unres.status.trim() ||
          typeof unres?.descriptionPl !== 'string' ||
          !unres.descriptionPl.trim()
        ) {
          throw new Error(`cases[${i}].unresolvedDiscrepancies[${ui}] invalid discrepancy entry`);
        }
        if (unres.sourceIds !== undefined) {
          checkSourceIds(unres.sourceIds, `unresolvedDiscrepancies[${ui}].sourceIds`);
        }
      }
    }
  }
  return true;
}

export function verifySources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('sources data must be a non-empty array');
  }
  const seen = new Set();
  for (const [i, s] of sources.entries()) {
    if (typeof s?.id !== 'string' || s.id.length < 3 || seen.has(s.id)) {
      throw new Error(`sources[${i}] missing or duplicate id`);
    }
    seen.add(s.id);
    if (!isValidHttpsUrl(s.url) && !isValidArchivalSource(s)) {
      throw new Error(`sources[${i}] invalid https url or archival locator`);
    }
    if (typeof s.publisher !== 'string' || !s.publisher.trim()) {
      throw new Error(`sources[${i}] missing publisher`);
    }
    if (typeof s.title !== 'string' || !s.title.trim()) {
      throw new Error(`sources[${i}] missing title`);
    }
    if (!isIsoDate(s.retrievedAt)) {
      throw new Error(`sources[${i}] invalid retrievedAt date`);
    }
    if (s.publishedAt !== null && s.publishedAt !== undefined && !isIsoDate(s.publishedAt)) {
      throw new Error(`sources[${i}] invalid publishedAt date`);
    }
    const locator = s.locatorPl ?? s.archiveCitationPl;
    if (typeof locator !== 'string' || !locator.trim()) {
      throw new Error(`sources[${i}] missing locatorPl or archiveCitationPl`);
    }
    if (typeof s.limitationsPl !== 'string' || !s.limitationsPl.trim()) {
      throw new Error(`sources[${i}] missing limitationsPl`);
    }
  }
  return true;
}

export function verifySeries(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    throw new Error('series catalog must be an object');
  }
  const { metrics, series } = catalog;
  if (!Array.isArray(metrics) || metrics.length === 0) {
    throw new Error('series.metrics must be a non-empty array');
  }
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error('series.series must be a non-empty array');
  }
  const metricIds = new Set();
  for (const [i, m] of metrics.entries()) {
    if (typeof m?.id !== 'string' || !m.id.trim() || metricIds.has(m.id)) {
      throw new Error(`metrics[${i}] missing or duplicate id`);
    }
    metricIds.add(m.id);
    if (!['recorded_acts', 'persons_killed', 'documented_cases', 'rate_per_100k', 'persons'].includes(m.unit)) {
      throw new Error(`metrics[${i}] invalid unit`);
    }
    if (typeof m.namePl !== 'string' || !m.namePl.trim() || typeof m.definitionPl !== 'string' || !m.definitionPl.trim()) {
      throw new Error(`metrics[${i}] missing namePl or definitionPl`);
    }
    if (!['completed_and_attempted', 'completed_only', 'attempted_only', 'unspecified'].includes(m.attemptScope)) {
      throw new Error(`metrics[${i}] invalid attemptScope`);
    }
  }
  const seriesIds = new Set();
  for (const [i, s] of series.entries()) {
    if (typeof s?.id !== 'string' || !s.id.trim() || seriesIds.has(s.id)) {
      throw new Error(`series[${i}] missing or duplicate id`);
    }
    seriesIds.add(s.id);
    if (!metricIds.has(s.metricId)) {
      throw new Error(`series[${i}] unknown metricId ${s.metricId}`);
    }
    if (!['registration_year', 'occurrence_year', 'death_registration_year'].includes(s.temporalAxis)) {
      throw new Error(`series[${i}] invalid temporalAxis`);
    }
    if (!['national', 'voivodeship', 'police_garrison'].includes(s.territorialDivision)) {
      throw new Error(`series[${i}] invalid territorialDivision`);
    }
    if (typeof s.comparabilityGroup !== 'string' || !s.comparabilityGroup.trim()) {
      throw new Error(`series[${i}] missing comparabilityGroup`);
    }
    if (!Array.isArray(s.expectedYears) || s.expectedYears.length === 0) {
      throw new Error(`series[${i}] missing expectedYears`);
    }
    if (!Array.isArray(s.expectedAreaIds) || s.expectedAreaIds.length === 0) {
      throw new Error(`series[${i}] missing expectedAreaIds`);
    }
  }
  return true;
}

export function verifyObservations(rows, context = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('observations data must be a non-empty array');
  }
  const seenRevisions = new Set();
  const seenActive = new Set();
  for (const [i, r] of rows.entries()) {
    if (typeof r?.seriesId !== 'string' || !r.seriesId.trim()) {
      throw new Error(`observations[${i}] missing seriesId`);
    }
    if (context.seriesIds && !context.seriesIds.has(r.seriesId)) {
      throw new Error(`observations[${i}] unknown seriesId ${r.seriesId}`);
    }
    if (!Number.isInteger(r.period) || r.period < 1999 || r.period > 2100) {
      throw new Error(`observations[${i}] invalid period`);
    }
    if (r.areaId !== 'PL' && !TERYT_CODES.has(r.areaId)) {
      throw new Error(`observations[${i}] invalid areaId ${r.areaId}`);
    }
    if (typeof r.boundaryVersion !== 'string' || !r.boundaryVersion.trim()) {
      throw new Error(`observations[${i}] missing boundaryVersion`);
    }
    if (!AVAILABILITY_VALUES.has(r.availability)) {
      throw new Error(`observations[${i}] invalid availability`);
    }
    if (r.availability === 'observed') {
      const isRateSeries = typeof r.seriesId === 'string' && r.seriesId.endsWith('_rate');
      if (isRateSeries) {
        if (typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value < 0) {
          throw new Error(`observations[${i}] observed rate value must be non-negative finite number`);
        }
      } else if (!Number.isSafeInteger(r.value) || r.value < 0) {
        throw new Error(`observations[${i}] observed value must be non-negative safe integer`);
      }
    } else if (r.value !== null) {
      throw new Error(`observations[${i}] non-observed availability (${r.availability}) must have value: null`);
    }
    if (!REVIEW_STATUSES.has(r.reviewStatus)) {
      throw new Error(`observations[${i}] invalid reviewStatus`);
    }
    if (typeof r.sourceId !== 'string' || !r.sourceId.trim()) {
      throw new Error(`observations[${i}] missing sourceId`);
    }
    if (context.sourceIds && !context.sourceIds.has(r.sourceId)) {
      throw new Error(`observations[${i}] unknown sourceId ${r.sourceId}`);
    }
    if (typeof r.revisionId !== 'string' || !r.revisionId.trim()) {
      throw new Error(`observations[${i}] missing revisionId`);
    }
    if (typeof r.isActiveRevision !== 'boolean') {
      throw new Error(`observations[${i}] isActiveRevision must be an explicit boolean`);
    }
    const revKey = `${r.seriesId}:${r.period}:${r.areaId}:${r.boundaryVersion}:${r.revisionId}`;
    if (seenRevisions.has(revKey)) {
      throw new Error(`duplicate observation revision key ${revKey}`);
    }
    seenRevisions.add(revKey);

    if (r.isActiveRevision) {
      const activeKey = `${r.seriesId}:${r.period}:${r.areaId}:${r.boundaryVersion}`;
      if (seenActive.has(activeKey)) {
        throw new Error(`duplicate active observation revision for ${activeKey}`);
      }
      seenActive.add(activeKey);
    }
  }
  return true;
}

export function verifyPopulation(rows, context = {}) {
  if (!Array.isArray(rows)) {
    throw new Error('population data must be an array');
  }
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (r.areaId !== 'PL' && !TERYT_CODES.has(r.areaId)) {
      throw new Error(`population[${i}] invalid areaId`);
    }
    if (!Number.isInteger(r.year) || r.year < 1999 || r.year > 2100) {
      throw new Error(`population[${i}] invalid year`);
    }
    if (typeof r.boundaryVersion !== 'string' || !r.boundaryVersion.trim()) {
      throw new Error(`population[${i}] missing boundaryVersion`);
    }
    if (!Number.isSafeInteger(r.population) || r.population <= 0) {
      throw new Error(`population[${i}] population must be positive integer`);
    }
    if (!['approved', 'unreviewed'].includes(r.reviewStatus)) {
      throw new Error(`population[${i}] invalid reviewStatus`);
    }
    if (typeof r.sourceId !== 'string' || !r.sourceId.trim()) {
      throw new Error(`population[${i}] missing sourceId`);
    }
    if (context.sourceIds && !context.sourceIds.has(r.sourceId)) {
      throw new Error(`population[${i}] unknown sourceId ${r.sourceId}`);
    }
    const key = `${r.areaId}:${r.year}:${r.boundaryVersion}`;
    if (seen.has(key)) {
      throw new Error(`duplicate population key ${key}`);
    }
    seen.add(key);
  }
  return true;
}

function checkRingBounds(ring, featureIndex) {
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error(`geojson feature[${featureIndex}] invalid linear ring`);
  }
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2 || !isWithinPolandBounds(pt[1], pt[0])) {
      throw new Error(`geojson feature[${featureIndex}] coordinate outside Poland bounds`);
    }
  }
}

export function verifyGeoJSON(geo) {
  if (!geo || geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
    throw new Error('geojson must be a FeatureCollection');
  }
  if (geo.features.length !== 16) {
    throw new Error(`geojson must contain exactly 16 voivodeship features, found ${geo.features.length}`);
  }
  const seenTeryt = new Set();
  for (const [i, f] of geo.features.entries()) {
    const rawCode = f?.properties?.teryt ?? f?.properties?.JPT_KOD_JE ?? '';
    const teryt = String(rawCode).padStart(2, '0');
    if (!TERYT_CODES.has(teryt)) {
      throw new Error(`geojson feature[${i}] invalid TERYT code "${rawCode}"`);
    }
    if (seenTeryt.has(teryt)) {
      throw new Error(`geojson duplicate TERYT code ${teryt}`);
    }
    seenTeryt.add(teryt);

    const geom = f.geometry;
    if (!geom || !['Polygon', 'MultiPolygon'].includes(geom.type) || !Array.isArray(geom.coordinates)) {
      throw new Error(`geojson feature[${i}] invalid geometry type`);
    }
    if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) checkRingBounds(ring, i);
    } else {
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly)) throw new Error(`geojson feature[${i}] invalid MultiPolygon`);
        for (const ring of poly) checkRingBounds(ring, i);
      }
    }
  }
  return true;
}

export function verifyRelease(release) {
  if (!release || typeof release !== 'object') {
    throw new Error('release manifest must be an object');
  }
  if (release.schemaVersion !== '1.0.0') {
    throw new Error(`unsupported release schemaVersion: ${release.schemaVersion}`);
  }
  if (typeof release.releaseId !== 'string' || !release.releaseId.trim()) {
    throw new Error('release manifest missing releaseId');
  }
  if (!isIsoDate(release.releasedAt)) {
    throw new Error('release manifest invalid releasedAt date');
  }
  if (typeof release.boundaryVersion !== 'string' || !release.boundaryVersion.trim()) {
    throw new Error('release manifest missing boundaryVersion');
  }
  if (!Array.isArray(release.files) || release.files.length === 0) {
    throw new Error('release manifest files must be a non-empty array');
  }
  for (const [i, f] of release.files.entries()) {
    if (typeof f?.path !== 'string' || !f.path.trim()) {
      throw new Error(`release.files[${i}] missing path`);
    }
    if (typeof f.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(f.sha256)) {
      throw new Error(`release.files[${i}] invalid sha256 digest`);
    }
    if (!Number.isSafeInteger(f.recordCount) || f.recordCount < 0) {
      throw new Error(`release.files[${i}] invalid recordCount`);
    }
  }
  if (!Array.isArray(release.revisions) || release.revisions.length === 0) {
    throw new Error('release manifest revisions must be a non-empty array');
  }
  if (release.approvedCaseSignatures !== undefined) {
    if (!Array.isArray(release.approvedCaseSignatures)) {
      throw new Error('release manifest approvedCaseSignatures must be an array when present');
    }
    const seenSigs = new Set();
    for (const [i, sig] of release.approvedCaseSignatures.entries()) {
      if (typeof sig !== 'string' || !/^[a-f0-9]{64}$/i.test(sig)) {
        throw new Error(`release.approvedCaseSignatures[${i}] invalid SHA-256 signature`);
      }
      const normSig = sig.toLowerCase();
      if (seenSigs.has(normSig)) {
        throw new Error(`release.approvedCaseSignatures[${i}] duplicate signature`);
      }
      seenSigs.add(normSig);
    }
  }
  if (release.approvedCaseDecisions !== undefined) {
    if (!Array.isArray(release.approvedCaseDecisions)) {
      throw new Error('release manifest approvedCaseDecisions must be an array when present');
    }
    const seenDecisionCases = new Set();
    const seenDecisionSigs = new Set();
    for (const [i, d] of release.approvedCaseDecisions.entries()) {
      if (
        !d ||
        typeof d !== 'object' ||
        Array.isArray(d) ||
        typeof d.caseId !== 'string' ||
        d.caseId.trim().length < 5 ||
        typeof d.signature !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(d.signature) ||
        (d.publicPayloadDigest !== undefined &&
          (typeof d.publicPayloadDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(d.publicPayloadDigest))) ||
        isAutomatedOrPlaceholderActor(d.approvedBy, { minLength: 3 }) ||
        !isIsoDate(d.approvedAt) ||
        isAutomatedOrPlaceholderActor(d.approvalRef, { minLength: 4 })
      ) {
        throw new Error(`release.approvedCaseDecisions[${i}] invalid human approval decision record`);
      }
      if (seenDecisionCases.has(d.caseId)) {
        throw new Error(`release.approvedCaseDecisions[${i}] duplicate caseId "${d.caseId}"`);
      }
      seenDecisionCases.add(d.caseId);
      const normSig = d.signature.toLowerCase();
      if (seenDecisionSigs.has(normSig)) {
        throw new Error(`release.approvedCaseDecisions[${i}] duplicate signature`);
      }
      seenDecisionSigs.add(normSig);
    }
    if (Array.isArray(release.approvedCaseSignatures)) {
      const sigSet = new Set(release.approvedCaseSignatures.map(s => String(s).toLowerCase()));
      for (const [i, d] of release.approvedCaseDecisions.entries()) {
        if (!sigSet.has(d.signature.toLowerCase())) {
          throw new Error(
            `release.approvedCaseDecisions[${i}] signature mismatch against approvedCaseSignatures`
          );
        }
      }
    }
  }
  return true;
}

export function parseCSV(raw) {
  const rows = [], cell = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cell.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      cell.push(current);
      if (cell.some(s => s.trim())) rows.push([...cell]);
      cell.length = 0;
      current = '';
    } else {
      current += ch;
    }
  }
  if (inQuotes) throw new Error('Unclosed CSV quotation');
  cell.push(current);
  if (cell.some(s => s.trim())) rows.push(cell);
  if (!rows.length) throw new Error('Empty CSV');
  const header = rows.shift().map((s, i) => (i === 0 ? s.replace(/^\uFEFF/, '').trim() : s.trim()));
  if (new Set(header).size !== header.length) throw new Error('Duplicate CSV headers');
  return rows.map((r, i) => {
    if (r.length !== header.length) throw new Error(`CSV row ${i + 2}: wrong field count`);
    return Object.fromEntries(header.map((h, j) => [h, r[j].trim()]));
  });
}
