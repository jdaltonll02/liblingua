const prisma = require('../utils/prisma');

const REVIEWER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'RESEARCHER']);
const RUBRIC_FIELDS = [
  'adequacy',
  'fluency',
  'orthography',
  'dialect_fit',
  'cultural_appropriateness',
];

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validateReviewInput(input, hasAudio = false) {
  if (!['APPROVE', 'REQUEST_CHANGES', 'REJECT', 'ABSTAIN'].includes(input.decision)) {
    throw httpError('Invalid review decision', 400);
  }
  const fields = hasAudio ? [...RUBRIC_FIELDS, 'audio_intelligibility'] : RUBRIC_FIELDS;
  const scores = {};
  for (const field of fields) {
    const value = input[field];
    if (input.decision === 'APPROVE' && value == null) {
      throw httpError(`${field} is required for approval`, 400);
    }
    if (value != null) {
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
        throw httpError(`${field} must be an integer from 1 to 5`, 400);
      }
      scores[field] = numeric;
    }
  }
  if (['REQUEST_CHANGES', 'REJECT'].includes(input.decision) && !input.comments?.trim()) {
    throw httpError('Comments are required when requesting changes or rejecting', 400);
  }
  return scores;
}

function reviewQuality(review) {
  const values = [...RUBRIC_FIELDS, 'audio_intelligibility']
    .map((field) => review[field])
    .filter((value) => value != null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length / 5 : null;
}

function deriveReviewOutcome(reviews) {
  const substantive = reviews.filter((review) => review.decision !== 'ABSTAIN');
  if (substantive.length < 2) {
    return { review_state: 'IN_REVIEW', is_validated: false, quality_score: null };
  }
  const decisions = new Set(substantive.map((review) => review.decision));
  if (decisions.size > 1) {
    return { review_state: 'ADJUDICATION_REQUIRED', is_validated: false, quality_score: null };
  }
  const decision = substantive[0].decision;
  if (decision === 'APPROVE') {
    const scores = substantive.map(reviewQuality).filter((value) => value != null);
    return {
      review_state: 'APPROVED',
      is_validated: true,
      quality_score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
    };
  }
  if (decision === 'REQUEST_CHANGES') {
    return { review_state: 'CHANGES_REQUESTED', is_validated: false, quality_score: null };
  }
  return { review_state: 'REJECTED', is_validated: false, quality_score: null };
}

async function assignReviewers({ translationId, reviewerIds, assignedBy, isBlind = true }) {
  const uniqueIds = [...new Set(reviewerIds || [])];
  if (uniqueIds.length < 2) throw httpError('At least two independent reviewers are required', 400);

  return prisma.$transaction(async (tx) => {
    const translation = await tx.translation.findUnique({ where: { id: translationId } });
    if (!translation) throw httpError('Translation not found', 404);
    if (uniqueIds.includes(translation.contributor_id)) {
      throw httpError('A contributor cannot review their own translation', 409);
    }
    const reviewers = await tx.contributor.findMany({
      where: { id: { in: uniqueIds }, is_active: true },
      select: { id: true, role: true },
    });
    if (reviewers.length !== uniqueIds.length || reviewers.some((user) => !REVIEWER_ROLES.has(user.role))) {
      throw httpError('Every reviewer must be active and hold a qualified reviewer role', 400);
    }
    await tx.reviewAssignment.createMany({
      data: uniqueIds.map((reviewerId) => ({
        translation_id: translation.id,
        revision_no: translation.current_revision,
        reviewer_id: reviewerId,
        assigned_by: assignedBy,
        is_blind: Boolean(isBlind),
      })),
      skipDuplicates: true,
    });
    await tx.translation.update({
      where: { id: translation.id },
      data: { review_state: 'IN_REVIEW', is_validated: false, quality_score: null },
    });
    return { translation_id: translation.id, revision_no: translation.current_revision, reviewer_ids: uniqueIds };
  }, { isolationLevel: 'Serializable' });
}

async function submitReview({ translationId, reviewerId, input }) {
  return prisma.$transaction(async (tx) => {
    const translation = await tx.translation.findUnique({ where: { id: translationId } });
    if (!translation) throw httpError('Translation not found', 404);
    if (translation.contributor_id === reviewerId) throw httpError('Self-review is prohibited', 409);

    const assignment = await tx.reviewAssignment.findUnique({
      where: {
        translation_id_revision_no_reviewer_id: {
          translation_id: translation.id,
          revision_no: translation.current_revision,
          reviewer_id: reviewerId,
        },
      },
    });
    if (!assignment || assignment.status !== 'ASSIGNED') {
      throw httpError('No active review assignment for this revision', 403);
    }

    const scores = validateReviewInput(input, Boolean(translation.audio_path));
    const review = await tx.translationReview.create({
      data: {
        translation_id: translation.id,
        revision_no: translation.current_revision,
        reviewer_id: reviewerId,
        decision: input.decision,
        ...scores,
        error_labels: Array.isArray(input.error_labels) ? input.error_labels : [],
        comments: input.comments?.trim() || null,
      },
    });
    await tx.reviewAssignment.update({
      where: { id: assignment.id },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });
    const reviews = await tx.translationReview.findMany({
      where: { translation_id: translation.id, revision_no: translation.current_revision },
    });
    const outcome = deriveReviewOutcome(reviews);
    await tx.translation.update({ where: { id: translation.id }, data: outcome });
    return { review, outcome };
  }, { isolationLevel: 'Serializable' });
}

async function adjudicate({ translationId, adjudicatorId, input }) {
  if (!['APPROVE', 'REJECT', 'RETURN_FOR_REVISION'].includes(input.decision)) {
    throw httpError('Invalid adjudication decision', 400);
  }
  if (!input.notes?.trim()) throw httpError('Adjudication notes are required', 400);
  if (input.decision === 'APPROVE' && input.final_score == null) {
    throw httpError('final_score is required when approving an adjudication', 400);
  }
  if (input.final_score != null && (Number(input.final_score) < 0 || Number(input.final_score) > 1)) {
    throw httpError('final_score must be between 0 and 1', 400);
  }

  return prisma.$transaction(async (tx) => {
    const translation = await tx.translation.findUnique({ where: { id: translationId } });
    if (!translation) throw httpError('Translation not found', 404);
    if (translation.review_state !== 'ADJUDICATION_REQUIRED') {
      throw httpError('Translation is not awaiting adjudication', 409);
    }
    if (translation.contributor_id === adjudicatorId) throw httpError('Self-adjudication is prohibited', 409);
    const priorReview = await tx.translationReview.findFirst({
      where: {
        translation_id: translation.id,
        revision_no: translation.current_revision,
        reviewer_id: adjudicatorId,
      },
    });
    if (priorReview) throw httpError('A prior reviewer cannot adjudicate the same revision', 409);

    const adjudication = await tx.translationAdjudication.create({
      data: {
        translation_id: translation.id,
        revision_no: translation.current_revision,
        adjudicator_id: adjudicatorId,
        decision: input.decision,
        final_score: input.final_score == null ? null : Number(input.final_score),
        notes: input.notes.trim(),
      },
    });
    const state = input.decision === 'APPROVE'
      ? { review_state: 'APPROVED', is_validated: true, quality_score: Number(input.final_score) }
      : input.decision === 'REJECT'
        ? { review_state: 'REJECTED', is_validated: false, quality_score: null }
        : { review_state: 'CHANGES_REQUESTED', is_validated: false, quality_score: null };
    await tx.translation.update({ where: { id: translation.id }, data: state });
    return { adjudication, outcome: state };
  }, { isolationLevel: 'Serializable' });
}

async function reviseTranslation({ translationId, contributorId, translatedText, dialect, changeReason }) {
  if (!translatedText?.trim()) throw httpError('translated_text is required', 400);
  if (!changeReason?.trim()) throw httpError('change_reason is required', 400);
  return prisma.$transaction(async (tx) => {
    const translation = await tx.translation.findUnique({ where: { id: translationId } });
    if (!translation) throw httpError('Translation not found', 404);
    if (translation.contributor_id !== contributorId) throw httpError('Only the author can revise this translation', 403);
    const currentState = translation.review_state || 'PENDING_REVIEW';
    if (!['PENDING_REVIEW', 'CHANGES_REQUESTED'].includes(currentState)) {
      throw httpError('This translation cannot be revised in its current review state', 409);
    }
    const revisionNo = translation.current_revision + 1;
    const updated = await tx.translation.update({
      where: { id: translation.id },
      data: {
        translated_text: translatedText.trim(),
        dialect: dialect?.trim() || null,
        current_revision: revisionNo,
        review_state: 'PENDING_REVIEW',
        is_validated: false,
        quality_score: null,
      },
    });
    await tx.translationRevision.create({
      data: {
        translation_id: translation.id,
        revision_no: revisionNo,
        translated_text: translatedText.trim(),
        dialect: dialect?.trim() || null,
        audio_path: translation.audio_path,
        english_audio_path: translation.english_audio_path,
        guideline_version: translation.guideline_id
          ? (await tx.annotationGuideline.findUnique({ where: { id: translation.guideline_id }, select: { version: true } }))?.version
          : null,
        language_variety_id: translation.language_variety_id,
        orthography_id: translation.orthography_id,
        guideline_id: translation.guideline_id,
        register: translation.register,
        contains_code_switching: translation.contains_code_switching,
        code_switching_notes: translation.code_switching_notes,
        uncertainty: translation.uncertainty,
        annotation_outcome: translation.annotation_outcome,
        alternative_translation: translation.alternative_translation,
        annotation_notes: translation.annotation_notes,
        change_reason: changeReason.trim(),
        created_by: contributorId,
      },
    });
    return updated;
  }, { isolationLevel: 'Serializable' });
}

module.exports = {
  RUBRIC_FIELDS,
  validateReviewInput,
  reviewQuality,
  deriveReviewOutcome,
  assignReviewers,
  submitReview,
  adjudicate,
  reviseTranslation,
};
