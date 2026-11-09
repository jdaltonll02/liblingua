const crypto = require('crypto');

const COPYRIGHT_STATUSES = [
  'UNKNOWN',
  'LICENSED',
  'PUBLIC_DOMAIN',
  'PERMISSION_GRANTED',
  'RESTRICTED',
];
const REVIEW_STATUSES = ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'];
const SOURCE_KINDS = ['LEGACY_UNKNOWN', 'MANUAL', 'SEEDED', 'DATASET_IMPORT'];
const SPECIALIST_DOMAINS = new Set(['health', 'legal']);

function normaliseSourceText(text) {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

function exactTextHash(text) {
  const canonical = normaliseSourceText(text).toLocaleLowerCase('en');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function initialSourceFields({ text, domain, source = {}, importedBy = null }) {
  const sourceKind = SOURCE_KINDS.includes(source.source_kind) ? source.source_kind : 'MANUAL';
  const copyrightStatus = COPYRIGHT_STATUSES.includes(source.copyright_status)
    ? source.copyright_status
    : 'UNKNOWN';
  return {
    text_hash: exactTextHash(text),
    near_duplicate_group: source.near_duplicate_group || null,
    source_kind: sourceKind,
    source_dataset: source.source_dataset || null,
    source_dataset_version: source.source_dataset_version || null,
    source_record_id: source.source_record_id || null,
    source_url: source.source_url || null,
    source_citation: source.source_citation || null,
    source_license: source.source_license || null,
    source_license_url: source.source_license_url || null,
    copyright_status: copyrightStatus,
    source_usage_restrictions: source.source_usage_restrictions || null,
    source_release_eligible: false,
    original_text: source.original_text || String(text),
    importer_version: source.importer_version || process.env.APP_VERSION || process.env.GIT_COMMIT || 'unknown',
    imported_by: importedBy,
    imported_at: new Date(),
    provenance_metadata: source.provenance_metadata || null,
    specialist_review_status: SPECIALIST_DOMAINS.has(domain) ? 'PENDING' : 'NOT_REQUIRED',
  };
}

function evaluateSourceEligibility(sample) {
  if (!sample.text_hash || !sample.original_text) return { eligible: false, reason: 'Missing source text provenance' };
  if (['UNKNOWN', 'RESTRICTED'].includes(sample.copyright_status)) {
    return { eligible: false, reason: 'Source rights are unknown or restricted' };
  }
  if (!sample.source_citation) return { eligible: false, reason: 'Source citation is required' };
  if (sample.copyright_status === 'LICENSED' && (!sample.source_license || !sample.source_license_url)) {
    return { eligible: false, reason: 'Licensed sources require license name and URL' };
  }
  if (SPECIALIST_DOMAINS.has(sample.domain) && sample.specialist_review_status !== 'APPROVED') {
    return { eligible: false, reason: `${sample.domain} content requires specialist approval` };
  }
  if (sample.specialist_review_status === 'REJECTED') {
    return { eligible: false, reason: 'Specialist review rejected this source' };
  }
  return { eligible: true, reason: null };
}

function validateProvenancePatch(input = {}) {
  const patch = {};
  const textFields = [
    'source_dataset', 'source_dataset_version', 'source_record_id', 'source_url',
    'source_citation', 'source_license', 'source_license_url',
    'source_usage_restrictions', 'specialist_review_notes', 'near_duplicate_group',
  ];
  for (const field of textFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = input[field]?.trim() || null;
  }
  if (input.source_kind != null) {
    if (!SOURCE_KINDS.includes(input.source_kind)) throw new Error('Invalid source_kind');
    patch.source_kind = input.source_kind;
  }
  if (input.copyright_status != null) {
    if (!COPYRIGHT_STATUSES.includes(input.copyright_status)) throw new Error('Invalid copyright_status');
    patch.copyright_status = input.copyright_status;
  }
  if (input.specialist_review_status != null) {
    if (!REVIEW_STATUSES.includes(input.specialist_review_status)) throw new Error('Invalid specialist_review_status');
    patch.specialist_review_status = input.specialist_review_status;
  }
  if (input.provenance_metadata != null) patch.provenance_metadata = input.provenance_metadata;
  return patch;
}

module.exports = {
  COPYRIGHT_STATUSES,
  REVIEW_STATUSES,
  SOURCE_KINDS,
  exactTextHash,
  initialSourceFields,
  evaluateSourceEligibility,
  validateProvenancePatch,
};
