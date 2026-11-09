const prisma = require('../utils/prisma');

const RESOURCE_MODELS = {
  LANGUAGE_VARIETY: 'languageVariety',
  ORTHOGRAPHY: 'orthography',
  ANNOTATION_GUIDELINE: 'annotationGuideline',
  RESEARCH_POLICY: 'researchPolicy',
  DATASET_RELEASE: 'datasetRelease',
};

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listActiveMetadata(languageValue) {
  return prisma.language.findMany({
    where: {
      is_active: true,
      ...(languageValue ? { value: languageValue } : {}),
    },
    select: {
      id: true, value: true, label: true, autonym: true, iso639_3: true,
      glottocode: true, default_script: true, metadata_version: true,
      varieties: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        include: {
          orthographies: { where: { status: 'ACTIVE' }, orderBy: [{ is_default: 'desc' }, { name: 'asc' }] },
          guidelines: { where: { status: 'ACTIVE' }, orderBy: { effective_at: 'desc' } },
        },
      },
    },
    orderBy: { sort_order: 'asc' },
  });
}

async function listAllMetadata() {
  return prisma.language.findMany({
    include: {
      varieties: {
        include: { orthographies: true, guidelines: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { sort_order: 'asc' },
  });
}

async function createVariety(input) {
  const language = await prisma.language.findUnique({ where: { id: input.language_id } });
  if (!language) throw httpError('Language not found', 404);
  return prisma.languageVariety.create({
    data: {
      language_id: input.language_id,
      code: input.code.trim(),
      name: input.name.trim(),
      autonym: input.autonym?.trim() || null,
      dialect_group: input.dialect_group?.trim() || null,
      iso639_3: input.iso639_3?.trim() || null,
      glottocode: input.glottocode?.trim() || null,
      bcp47: input.bcp47?.trim() || null,
      region: input.region?.trim() || null,
      description: input.description?.trim() || null,
    },
  });
}

async function createOrthography(input) {
  const variety = await prisma.languageVariety.findUnique({ where: { id: input.variety_id } });
  if (!variety) throw httpError('Language variety not found', 404);
  return prisma.orthography.create({
    data: {
      variety_id: input.variety_id,
      code: input.code.trim(),
      name: input.name.trim(),
      script: input.script.trim(),
      version: input.version?.trim() || null,
      authority: input.authority?.trim() || null,
      description: input.description?.trim() || null,
      is_default: Boolean(input.is_default),
    },
  });
}

async function createGuideline(input) {
  const variety = await prisma.languageVariety.findUnique({ where: { id: input.variety_id } });
  if (!variety) throw httpError('Language variety not found', 404);
  if (input.orthography_id) {
    const orthography = await prisma.orthography.findUnique({ where: { id: input.orthography_id } });
    if (!orthography || orthography.variety_id !== input.variety_id) {
      throw httpError('Orthography does not belong to this language variety');
    }
  }
  return prisma.annotationGuideline.create({
    data: {
      variety_id: input.variety_id,
      orthography_id: input.orthography_id || null,
      version: input.version.trim(),
      title: input.title.trim(),
      content_hash: input.content_hash.trim(),
      content_url: input.content_url.trim(),
    },
  });
}

async function recordApproval({ resourceType, resourceId, authorityRole, decision, notes, approverId }) {
  const model = RESOURCE_MODELS[resourceType];
  let resource;
  if (resourceType === 'DATASET_RELEASE_CANDIDATE') {
    resource = await prisma.language.findUnique({ where: { value: resourceId } });
  } else if (model) {
    resource = await prisma[model].findUnique({ where: { id: resourceId } });
  } else {
    throw httpError('Unsupported governance resource type');
  }
  if (!resource) throw httpError('Governance resource not found', 404);
  const normalizedRole = authorityRole.trim().toUpperCase();
  if (!['COMMUNITY', 'RESEARCH'].includes(normalizedRole)) {
    throw httpError('authority_role must be COMMUNITY or RESEARCH');
  }
  return prisma.governanceApproval.create({
    data: {
      resource_type: resourceType,
      resource_id: resourceId,
      language: resourceType === 'DATASET_RELEASE_CANDIDATE'
        ? resource.value
        : (resource.code || resource.language || null),
      approver_id: approverId,
      authority_role: normalizedRole,
      decision,
      notes: notes?.trim() || null,
    },
  });
}

async function assertGovernanceApprovals(resourceType, resourceId, { since } = {}) {
  const approvals = await prisma.governanceApproval.findMany({
    where: {
      resource_type: resourceType,
      resource_id: resourceId,
      ...(since ? { decided_at: { gt: since } } : {}),
    },
    orderBy: { decided_at: 'desc' },
  });
  const latestByRole = new Map();
  for (const approval of approvals) {
    if (!latestByRole.has(approval.authority_role)) latestByRole.set(approval.authority_role, approval);
  }
  for (const role of ['COMMUNITY', 'RESEARCH']) {
    if (latestByRole.get(role)?.decision !== 'APPROVED') {
      throw httpError(`An APPROVED ${role.toLowerCase()} governance decision is required`, 409);
    }
  }
  return Object.fromEntries(latestByRole);
}

async function activateResource({ resourceType, resourceId, activatedBy }) {
  const model = RESOURCE_MODELS[resourceType];
  if (!model) throw httpError('Unsupported governance resource type');
  const resource = await prisma[model].findUnique({ where: { id: resourceId } });
  if (!resource) throw httpError('Governance resource not found', 404);

  await assertGovernanceApprovals(resourceType, resourceId);

  if (resourceType === 'ORTHOGRAPHY') {
    const parent = await prisma.languageVariety.findUnique({ where: { id: resource.variety_id } });
    if (parent?.status !== 'ACTIVE') throw httpError('Activate the parent language variety first', 409);
  }
  if (resourceType === 'ANNOTATION_GUIDELINE') {
    const parent = await prisma.languageVariety.findUnique({ where: { id: resource.variety_id } });
    if (parent?.status !== 'ACTIVE') throw httpError('Activate the parent language variety first', 409);
    if (resource.orthography_id) {
      const orthography = await prisma.orthography.findUnique({ where: { id: resource.orthography_id } });
      if (orthography?.status !== 'ACTIVE') throw httpError('Activate the guideline orthography first', 409);
    }
  }

  if (resourceType === 'RESEARCH_POLICY') {
    return prisma.$transaction(async (tx) => {
      await tx.researchPolicy.updateMany({
        where: { policy_key: resource.policy_key, status: 'ACTIVE', id: { not: resourceId } },
        data: { status: 'RETIRED', retired_at: new Date() },
      });
      return tx.researchPolicy.update({
        where: { id: resourceId },
        data: { status: 'ACTIVE', effective_at: new Date(), retired_at: null },
      });
    });
  }

  return prisma[model].update({
    where: { id: resourceId },
    data: {
      status: 'ACTIVE',
      approved_by: activatedBy,
      approved_at: new Date(),
      ...(resourceType === 'ANNOTATION_GUIDELINE' ? { effective_at: new Date() } : {}),
    },
  });
}

async function upsertContributorProfile(contributorId, input) {
  const variety = await prisma.languageVariety.findUnique({ where: { id: input.variety_id } });
  if (!variety || variety.status !== 'ACTIVE') throw httpError('Select an active language variety', 409);
  const data = {
    speaking_proficiency: input.speaking_proficiency,
    reading_proficiency: input.reading_proficiency,
    writing_proficiency: input.writing_proficiency,
    usage_frequency: input.usage_frequency,
    age_of_acquisition: input.age_of_acquisition == null ? null : Number(input.age_of_acquisition),
    place_learned: input.place_learned?.trim() || null,
    current_use_region: input.current_use_region?.trim() || null,
    literacy_training: input.literacy_training?.trim() || null,
    is_first_language: Boolean(input.is_first_language),
    self_reported: true,
    notes: input.notes?.trim() || null,
  };
  return prisma.contributorLanguageProfile.upsert({
    where: { contributor_id_variety_id: { contributor_id: contributorId, variety_id: input.variety_id } },
    create: { contributor_id: contributorId, variety_id: input.variety_id, ...data },
    update: data,
    include: { variety: true },
  });
}

async function getContributorProfiles(contributorId) {
  return prisma.contributorLanguageProfile.findMany({
    where: { contributor_id: contributorId },
    include: { variety: { include: { language: true } } },
    orderBy: { updated_at: 'desc' },
  });
}

async function validateSubmissionMetadata(tx, { contributorId, targetLanguage, varietyId, orthographyId, guidelineId }) {
  const variety = await tx.languageVariety.findUnique({
    where: { id: varietyId },
    include: { language: true },
  });
  if (!variety || variety.status !== 'ACTIVE' || variety.language.value !== targetLanguage) {
    throw httpError('Language variety is not active for the selected target language', 409);
  }
  const orthography = await tx.orthography.findUnique({ where: { id: orthographyId } });
  if (!orthography || orthography.status !== 'ACTIVE' || orthography.variety_id !== varietyId) {
    throw httpError('Orthography is not active for the selected language variety', 409);
  }
  const guideline = await tx.annotationGuideline.findUnique({ where: { id: guidelineId } });
  if (!guideline || guideline.status !== 'ACTIVE' || guideline.variety_id !== varietyId ||
      (guideline.orthography_id && guideline.orthography_id !== orthographyId)) {
    throw httpError('Annotation guideline is not active for the selected variety and orthography', 409);
  }
  const profile = await tx.contributorLanguageProfile.findUnique({
    where: { contributor_id_variety_id: { contributor_id: contributorId, variety_id: varietyId } },
  });
  if (!profile) throw httpError('Complete your language profile for this variety before contributing', 409);
  return { variety, orthography, guideline, profile };
}

module.exports = {
  listActiveMetadata, listAllMetadata, createVariety, createOrthography, createGuideline,
  recordApproval, activateResource, upsertContributorProfile, getContributorProfiles,
  validateSubmissionMetadata,
  assertGovernanceApprovals,
};
