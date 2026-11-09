const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { assertGovernanceApprovals } = require('./linguisticMetadataService');

const SPLIT_ALGORITHM = 'sha256-connected-groups-v1';
const SCHEMA_VERSION = 'liblingua-release-1.0';
const PILOT_LICENSE = 'PILOT_RESTRICTED_1.0';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function splitForKey(key, seed) {
  const bucket = crypto.createHash('sha256').update(`${seed}:${key}`).digest().readUInt32BE(0) % 100;
  return bucket < 80 ? 'TRAIN' : bucket < 90 ? 'VALIDATION' : 'TEST';
}

function buildSplitAssignments(rows, seed, mode = 'SOURCE_GROUPED') {
  const parent = new Map();
  const find = (key) => {
    if (!parent.has(key)) parent.set(key, key);
    if (parent.get(key) !== key) parent.set(key, find(parent.get(key)));
    return parent.get(key);
  };
  const union = (left, right) => {
    const a = find(left); const b = find(right);
    if (a !== b) parent.set(b, a < b ? a : b);
  };

  for (const row of rows) {
    const source = `source:${row.source_group}`;
    find(source);
    if (mode === 'SOURCE_AND_SPEAKER_GROUPED') union(source, `speaker:${row.contributor_id}`);
  }
  return new Map(rows.map((row) => {
    const component = find(`source:${row.source_group}`);
    return [row.id, splitForKey(component, seed)];
  }));
}

async function assertRequiredPolicies() {
  const policies = await prisma.researchPolicy.findMany({
    where: { policy_key: { in: ['governance', 'participant_consent', 'acceptable_use', 'benefit_sharing'] }, status: 'ACTIVE' },
    select: { policy_key: true },
  });
  const active = new Set(policies.map((policy) => policy.policy_key));
  const missing = ['governance', 'participant_consent', 'acceptable_use', 'benefit_sharing'].filter((key) => !active.has(key));
  if (missing.length) {
    const error = new Error(`Activate required research policies before creating a release: ${missing.join(', ')}`);
    error.status = 409;
    throw error;
  }
}

async function createReleaseCandidate({ language, semanticVersion, splitSeed, splitMode = 'SOURCE_GROUPED', gitCommit, changelog, createdBy }) {
  await assertRequiredPolicies();
  if (!['SOURCE_GROUPED', 'SOURCE_AND_SPEAKER_GROUPED'].includes(splitMode)) {
    const error = new Error('split_mode must be SOURCE_GROUPED or SOURCE_AND_SPEAKER_GROUPED');
    error.status = 400; throw error;
  }
  const translations = await prisma.translation.findMany({
    where: {
      target_language: language,
      review_state: 'APPROVED',
      annotation_outcome: 'TRANSLATED',
      linguistic_metadata_complete: true,
      sample: { source_release_eligible: true },
      contributor: { consentStates: { some: {
        text_contribution: true, model_training: true, public_release: true,
        policy: { policy_key: 'participant_consent', status: 'ACTIVE' },
      } } },
    },
    include: {
      sample: true,
      languageVariety: true,
      orthography: true,
      guideline: true,
    },
    orderBy: { id: 'asc' },
  });
  if (!translations.length) {
    const error = new Error('No release-eligible translations match this language');
    error.status = 409; throw error;
  }

  const splitRows = translations.map((row) => ({
    id: row.id,
    contributor_id: row.contributor_id,
    source_group: row.sample.near_duplicate_group || row.sample_id,
  }));
  const assignments = buildSplitAssignments(splitRows, splitSeed, splitMode);

  return prisma.$transaction(async (tx) => {
    const release = await tx.datasetRelease.create({
      data: {
        language, semantic_version: semanticVersion, schema_version: SCHEMA_VERSION,
        git_commit: gitCommit, split_algorithm: SPLIT_ALGORITHM, split_seed: splitSeed,
        split_mode: splitMode, license_key: PILOT_LICENSE,
        inclusion_criteria: {
          review_state: 'APPROVED', source_release_eligible: true,
          linguistic_metadata_complete: true, annotation_outcome: 'TRANSLATED',
          consent: ['text_contribution', 'model_training', 'public_release'],
        },
        changelog: changelog?.trim() || null,
        created_by: createdBy,
      },
    });
    const contributorIds = [...new Set(translations.map((row) => row.contributor_id))];
    const pseudonyms = new Map(contributorIds.map((id) => [id, `spk_${crypto.randomBytes(12).toString('hex')}`]));
    await tx.releasePseudonym.createMany({
      data: contributorIds.map((contributorId) => ({
        release_id: release.id, contributor_id: contributorId, pseudonym: pseudonyms.get(contributorId),
      })),
    });

    const items = translations.map((row) => {
      const snapshot = {
        id: row.id,
        source_text: row.sample.text,
        target_text: row.translated_text,
        language: row.target_language,
        variety_code: row.languageVariety.code,
        variety_name: row.languageVariety.name,
        variety_autonym: row.languageVariety.autonym,
        iso639_3: row.languageVariety.iso639_3,
        glottocode: row.languageVariety.glottocode,
        bcp47: row.languageVariety.bcp47,
        orthography_code: row.orthography.code,
        script: row.orthography.script,
        orthography_version: row.orthography.version,
        guideline_version: row.guideline.version,
        register: row.register,
        contains_code_switching: row.contains_code_switching,
        uncertainty: row.uncertainty,
        alternative_translation: row.alternative_translation,
        domain: row.sample.domain,
        difficulty: row.sample.difficulty,
        source_dataset: row.sample.source_dataset,
        source_dataset_version: row.sample.source_dataset_version,
        source_record_id: row.sample.source_record_id,
        source_citation: row.sample.source_citation,
        source_license: row.sample.source_license,
        source_text_hash: row.sample.text_hash,
        quality_score: row.quality_score,
        speaker_id: pseudonyms.get(row.contributor_id),
        split: assignments.get(row.id).toLowerCase(),
      };
      return {
        release_id: release.id,
        translation_id: row.id,
        translation_revision_no: row.current_revision,
        source_group: row.sample.near_duplicate_group || row.sample_id,
        duplicate_group: row.sample.near_duplicate_group,
        speaker_pseudonym: pseudonyms.get(row.contributor_id),
        split: assignments.get(row.id),
        record_checksum: sha256(snapshot),
        record_snapshot: snapshot,
      };
    });
    await tx.datasetReleaseItem.createMany({ data: items });
    const manifestChecksum = sha256(items.map((item) => ({
      translation_id: item.translation_id, revision: item.translation_revision_no,
      split: item.split, checksum: item.record_checksum,
    })));
    const artifactChecksum = sha256(items.map((item) => stableStringify(item.record_snapshot)).join('\n') + '\n');
    return tx.datasetRelease.update({
      where: { id: release.id },
      data: { manifest_checksum: manifestChecksum, artifact_checksum: artifactChecksum, record_count: items.length },
    });
  }, { isolationLevel: 'Serializable' });
}

async function getReleaseArtifact(releaseId) {
  const release = await prisma.datasetRelease.findUnique({ where: { id: releaseId } });
  if (!release) { const error = new Error('Release not found'); error.status = 404; throw error; }
  if (release.status !== 'PUBLISHED') { const error = new Error('This release is not available for download'); error.status = 403; throw error; }
  const items = await prisma.datasetReleaseItem.findMany({
    where: { release_id: releaseId }, orderBy: { translation_id: 'asc' }, select: { record_snapshot: true },
  });
  const body = items.map((item) => stableStringify(item.record_snapshot)).join('\n') + '\n';
  if (sha256(body) !== release.artifact_checksum) {
    const error = new Error('Release artifact integrity check failed'); error.status = 500; throw error;
  }
  return { release, body };
}

async function publishRelease(releaseId, publishedBy) {
  await assertRequiredPolicies();
  const release = await prisma.datasetRelease.findUnique({ where: { id: releaseId } });
  if (!release) { const error = new Error('Release not found'); error.status = 404; throw error; }
  if (release.status !== 'DRAFT') { const error = new Error('Only a draft release can be published'); error.status = 409; throw error; }
  if (release.license_key === PILOT_LICENSE) {
    const error = new Error('Pilot-restricted candidates cannot be publicly published until Manual Gate 2 approves a final licence');
    error.status = 409; throw error;
  }
  await assertGovernanceApprovals('DATASET_RELEASE', releaseId);
  return prisma.datasetRelease.update({
    where: { id: releaseId },
    data: { status: 'PUBLISHED', published_by: publishedBy, published_at: new Date() },
  });
}

async function listReleases({ includeDrafts = false } = {}) {
  return prisma.datasetRelease.findMany({
    where: includeDrafts ? {} : { status: { in: ['PUBLISHED', 'RESTRICTED', 'RETRACTED', 'DEPRECATED'] } },
    include: { corrections: { orderBy: { created_at: 'desc' } } },
    orderBy: { created_at: 'desc' },
  });
}

async function getReleaseData(releaseId, { split, skip = 0, take = 1000 } = {}) {
  const release = await prisma.datasetRelease.findUnique({ where: { id: releaseId } });
  if (!release) { const error = new Error('Release not found'); error.status = 404; throw error; }
  if (release.status !== 'PUBLISHED') { const error = new Error('This release is not available for download'); error.status = 403; throw error; }
  const where = { release_id: releaseId, ...(split ? { split: split.toUpperCase() } : {}) };
  const [items, total] = await Promise.all([
    prisma.datasetReleaseItem.findMany({ where, orderBy: { translation_id: 'asc' }, skip, take }),
    prisma.datasetReleaseItem.count({ where }),
  ]);
  return { release, records: items.map((item) => item.record_snapshot), total };
}

module.exports = {
  SPLIT_ALGORITHM, SCHEMA_VERSION, PILOT_LICENSE, stableStringify, sha256,
  splitForKey, buildSplitAssignments, createReleaseCandidate, publishRelease,
  listReleases, getReleaseData, getReleaseArtifact,
};
