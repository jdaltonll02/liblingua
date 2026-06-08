const prisma = require('../utils/prisma');

const DOMAINS     = ['general', 'health', 'legal', 'education', 'news', 'conversational'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LANGUAGES   = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

/**
 * Admin-only: create or update a manual translation.
 *
 * Unlike the contributor flow this endpoint:
 *   - Accepts both the source text and the translation in one request
 *   - Finds or creates the English sample automatically
 *   - Marks the translation as validated immediately (quality_score defaults to 1.0)
 *   - Allows updating the admin's own previous translation for the same sample+language
 */
async function createManualTranslation(req, res, next) {
  try {
    const {
      source_text, domain, difficulty = 'medium',
      target_language, dialect, translated_text,
      quality_score = 1.0, is_gold_standard = false,
    } = req.body;

    // ── Validate inputs ────────────────────────────────────────────────────────
    if (!source_text?.trim())
      return res.status(400).json({ error: 'Source text is required.' });
    if (!DOMAINS.includes(domain))
      return res.status(400).json({ error: `domain must be one of: ${DOMAINS.join(', ')}` });
    if (!LANGUAGES.includes(target_language))
      return res.status(400).json({ error: `target_language must be one of: ${LANGUAGES.join(', ')}` });
    if (!translated_text?.trim())
      return res.status(400).json({ error: 'Translated text is required.' });

    const qs = parseFloat(quality_score);
    if (isNaN(qs) || qs < 0 || qs > 1)
      return res.status(400).json({ error: 'quality_score must be a number between 0 and 1.' });

    // ── Find or create the English sample ──────────────────────────────────────
    let sample = await prisma.englishSample.findFirst({
      where: { text: source_text.trim() },
    });

    if (!sample) {
      sample = await prisma.englishSample.create({
        data: {
          text:             source_text.trim(),
          domain,
          difficulty:       DIFFICULTIES.includes(difficulty) ? difficulty : 'medium',
          is_gold_standard: Boolean(is_gold_standard),
        },
      });
    } else if (is_gold_standard && !sample.is_gold_standard) {
      sample = await prisma.englishSample.update({
        where: { id: sample.id },
        data:  { is_gold_standard: true },
      });
    }

    // ── Upsert translation ─────────────────────────────────────────────────────
    const existing = await prisma.translation.findUnique({
      where: {
        sample_id_contributor_id_target_language: {
          sample_id:      sample.id,
          contributor_id: req.user.id,
          target_language,
        },
      },
    });

    let translation;
    const isNew = !existing;

    if (existing) {
      // Update the admin's existing translation for this sample+language
      translation = await prisma.translation.update({
        where: { id: existing.id },
        data:  {
          translated_text: translated_text.trim(),
          dialect:         dialect?.trim() || null,
          is_validated:    true,
          quality_score:   qs,
        },
      });
    } else {
      translation = await prisma.translation.create({
        data: {
          sample_id:       sample.id,
          contributor_id:  req.user.id,
          target_language,
          dialect:         dialect?.trim() || null,
          translated_text: translated_text.trim(),
          is_validated:    true,
          quality_score:   qs,
        },
      });

      // Increment sample translation count for new translations only
      await prisma.englishSample.update({
        where: { id: sample.id },
        data:  { translation_count: { increment: 1 } },
      });
    }

    res.status(isNew ? 201 : 200).json({
      sample,
      translation,
      updated: !isNew,
      message: isNew
        ? 'Translation saved and validated.'
        : 'Existing translation updated.',
    });
  } catch (err) {
    next(err);
  }
}

/** List the admin's own manual translations (most recent first). */
async function listManualTranslations(req, res, next) {
  try {
    const { page = 1, limit = 25, language } = req.query;
    const where = { contributor_id: req.user.id };
    if (language) where.target_language = language;

    const skip = (Math.max(parseInt(page, 10), 1) - 1) * Math.min(parseInt(limit, 10), 100);
    const take = Math.min(parseInt(limit, 10), 100);

    const [translations, total] = await Promise.all([
      prisma.translation.findMany({
        where,
        include: {
          sample: {
            select: { id: true, text: true, domain: true, difficulty: true, is_gold_standard: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      prisma.translation.count({ where }),
    ]);

    res.json({ translations, total, page: parseInt(page, 10) });
  } catch (err) {
    next(err);
  }
}

/** Delete the admin's own translation (does NOT delete the sample). */
async function deleteManualTranslation(req, res, next) {
  try {
    const translation = await prisma.translation.findUnique({
      where: { id: req.params.id },
    });
    if (!translation) return res.status(404).json({ error: 'Translation not found.' });
    if (translation.contributor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own translations.' });
    }
    await prisma.translation.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createManualTranslation, listManualTranslations, deleteManualTranslation };
