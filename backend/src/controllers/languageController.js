const prisma = require('../utils/prisma');

async function getLanguages(req, res, next) {
  try {
    const where = req.query.all === 'true' ? {} : { is_active: true };
    const languages = await prisma.language.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });
    res.json(languages);
  } catch (err) {
    next(err);
  }
}

async function createLanguage(req, res, next) {
  try {
    const { value, label, sort_order } = req.body;
    if (!value || !label) return res.status(400).json({ error: 'value and label are required' });

    const slug = String(value).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug) return res.status(400).json({ error: 'value must contain letters or digits' });

    const lang = await prisma.language.create({
      data: {
        value: slug,
        label: String(label).trim(),
        sort_order: parseInt(sort_order, 10) || 0,
      },
    });
    res.status(201).json(lang);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A language with that value already exists' });
    next(err);
  }
}

async function updateLanguage(req, res, next) {
  try {
    const { label, is_active, sort_order } = req.body;
    const lang = await prisma.language.findUnique({ where: { id: req.params.id } });
    if (!lang) return res.status(404).json({ error: 'Language not found' });

    const updated = await prisma.language.update({
      where: { id: req.params.id },
      data: {
        label:      label      != null ? String(label).trim()    : undefined,
        is_active:  is_active  != null ? Boolean(is_active)      : undefined,
        sort_order: sort_order != null ? parseInt(sort_order, 10) : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteLanguage(req, res, next) {
  try {
    const lang = await prisma.language.findUnique({ where: { id: req.params.id } });
    if (!lang) return res.status(404).json({ error: 'Language not found' });

    // Check for existing translations before deleting
    const translationCount = await prisma.translation.count({
      where: { target_language: lang.value },
    });
    if (translationCount > 0) {
      return res.status(409).json({
        error: `Cannot delete — ${translationCount} translation(s) exist for this language. Deactivate it instead.`,
      });
    }

    await prisma.language.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLanguages, createLanguage, updateLanguage, deleteLanguage };
