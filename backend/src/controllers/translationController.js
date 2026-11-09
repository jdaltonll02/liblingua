const prisma = require('../utils/prisma');
const {
  submitTranslation:  _submit,
} = require('../services/translationService');
const { resolveAudioPaths } = require('../middleware/upload');
const reviewService = require('../services/reviewService');

async function submitTranslation(req, res, next) {
  try {
    const { audioPath, englishAudioPath } = resolveAudioPaths(req.files);

    const result = await _submit({
      contributorId:   req.user.id,
      sampleId:        req.body.sample_id,
      targetLanguage:  req.body.target_language,
      dialect:         req.body.dialect,
      translatedText:  req.body.translated_text,
      languageVarietyId: req.body.language_variety_id,
      orthographyId: req.body.orthography_id,
      guidelineId: req.body.guideline_id,
      register: req.body.register,
      containsCodeSwitching: req.body.contains_code_switching === true || req.body.contains_code_switching === 'true',
      codeSwitchingNotes: req.body.code_switching_notes,
      uncertainty: req.body.uncertainty,
      annotationOutcome: req.body.annotation_outcome,
      alternativeTranslation: req.body.alternative_translation,
      annotationNotes: req.body.annotation_notes,
      audioPath,
      englishAudioPath,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'You have already submitted a translation for this sample in this language' });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function getTranslations(req, res, next) {
  try {
    const { sample_id, language, has_audio, page = '1', limit = '50' } = req.query;
    const where = {};
    if (sample_id)           where.sample_id       = sample_id;
    if (language)            where.target_language = language;
    if (has_audio === 'true')  where.audio_path    = { not: null };
    if (has_audio === 'false') where.audio_path    = null;

    const take = Math.min(parseInt(limit, 10) || 50, 200); // hard cap at 200 per page
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [translations, total] = await Promise.all([
      prisma.translation.findMany({
        where,
        include: {
          contributor: {
            select: { id: true, name: true, native_language: true, region_of_origin: true, is_l1_speaker: true },
          },
          sample: { select: {
            id: true, text: true, domain: true, difficulty: true,
            surfaceSimilaritySignals: {
              select: { target_language: true, method: true, score: true },
            },
          } },
        },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
      prisma.translation.count({ where }),
    ]);

    res.json({
      data: translations,
      meta: { total, page: parseInt(page, 10) || 1, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

async function getContributorTranslations(req, res, next) {
  try {
    const { page = '1', limit = '50' } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [translations, total] = await Promise.all([
      prisma.translation.findMany({
        where:   { contributor_id: req.user.id },
        include: { sample: { select: { id: true, text: true, domain: true, difficulty: true } } },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
      prisma.translation.count({ where: { contributor_id: req.user.id } }),
    ]);

    res.json({
      data: translations,
      meta: { total, page: parseInt(page, 10) || 1, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
}

async function validateTranslation(req, res, next) {
  return res.status(410).json({
    error: 'Direct validation has been retired. Assign two reviewers and submit structured reviews.',
  });
}

async function assignReviewers(req, res, next) {
  try {
    const result = await reviewService.assignReviewers({
      translationId: req.params.id,
      reviewerIds: req.body.reviewer_ids,
      assignedBy: req.user.id,
      isBlind: req.body.is_blind !== false,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function submitReview(req, res, next) {
  try {
    const result = await reviewService.submitReview({
      translationId: req.params.id,
      reviewerId: req.user.id,
      input: req.body,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'You already reviewed this revision' });
    next(err);
  }
}

async function adjudicateTranslation(req, res, next) {
  try {
    const result = await reviewService.adjudicate({
      translationId: req.params.id,
      adjudicatorId: req.user.id,
      input: req.body,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'This revision has already been adjudicated' });
    next(err);
  }
}

async function reviseTranslation(req, res, next) {
  try {
    const updated = await reviewService.reviseTranslation({
      translationId: req.params.id,
      contributorId: req.user.id,
      translatedText: req.body.translated_text,
      dialect: req.body.dialect,
      changeReason: req.body.change_reason,
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function reviewQueue(req, res, next) {
  try {
    const assignments = await prisma.reviewAssignment.findMany({
      where: { reviewer_id: req.user.id, status: 'ASSIGNED' },
      include: {
        translation: {
          select: {
            id: true, current_revision: true, target_language: true, dialect: true,
            translated_text: true, audio_path: true, review_state: true,
            register: true, contains_code_switching: true, code_switching_notes: true,
            uncertainty: true, annotation_outcome: true, alternative_translation: true,
            annotation_notes: true,
            languageVariety: { select: { code: true, name: true, autonym: true } },
            orthography: { select: { code: true, name: true, script: true, version: true } },
            guideline: { select: { version: true, title: true, content_url: true } },
            sample: { select: { id: true, text: true, domain: true, difficulty: true } },
          },
        },
      },
      orderBy: { assigned_at: 'asc' },
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
}

async function reviewHistory(req, res, next) {
  try {
    const [reviews, adjudications] = await Promise.all([
      prisma.translationReview.findMany({
        where: { translation_id: req.params.id },
        orderBy: [{ revision_no: 'asc' }, { created_at: 'asc' }],
      }),
      prisma.translationAdjudication.findMany({
        where: { translation_id: req.params.id },
        orderBy: { revision_no: 'asc' },
      }),
    ]);
    res.json({ reviews, adjudications });
  } catch (err) {
    next(err);
  }
}

async function eligibleReviewers(req, res, next) {
  try {
    const reviewers = await prisma.contributor.findMany({
      where: {
        is_active: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'RESEARCHER'] },
      },
      select: {
        id: true, name: true, role: true,
        native_language: true, native_dialect: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ reviewers });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitTranslation,
  getTranslations,
  getContributorTranslations,
  validateTranslation,
  assignReviewers,
  submitReview,
  adjudicateTranslation,
  reviseTranslation,
  reviewQueue,
  reviewHistory,
  eligibleReviewers,
};
