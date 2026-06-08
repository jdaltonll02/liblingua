const express = require('express');
const prisma = require('../utils/prisma');

const router = express.Router();

// Public: all active researchers (featured first)
router.get('/', async (req, res, next) => {
  try {
    const researchers = await prisma.contributor.findMany({
      where: { role: 'RESEARCHER', is_active: true },
      select: {
        id: true,
        name: true,
        photo_url: true,
        affiliation: true,
        orcid_id: true,
        linkedin_url: true,
        researcher_bio: true,
        is_featured_researcher: true,
      },
      orderBy: [{ is_featured_researcher: 'desc' }, { created_at: 'asc' }],
    });
    res.json({ data: researchers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
