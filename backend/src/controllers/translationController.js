const prisma = require('../utils/prisma');
const {
  submitTranslation:  _submit,
  validateTranslation: _validate,
} = require('../services/translationService');
const { resolveAudioPaths } = require('../middleware/upload');

async function submitTranslation(req, res, next) {
  try {
    const { audioPath, englishAudioPath } = resolveAudioPaths(req.files);

    const result = await _submit({
      contributorId:   req.user.id,
      sampleId:        req.body.sample_id,
      targetLanguage:  req.body.target_language,
      dialect:         req.body.dialect,
      translatedText:  req.body.translated_text,
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
          sample: { select: { id: true, text: true, domain: true, difficulty: true, iaa_score: true } },
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
  try {
    const updated = await _validate(req.params.id, {
      is_validated:  req.body.is_validated,
      quality_score: req.body.quality_score,
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { submitTranslation, getTranslations, getContributorTranslations, validateTranslation };
