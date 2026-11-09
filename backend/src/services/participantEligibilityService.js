const prisma = require('../utils/prisma');

const ADULT_FORM_AGE_GROUPS = Object.freeze(['18_35', '36_55', '56_plus']);
const ADULT_STORED_AGE_GROUPS = Object.freeze(['age_18_35', 'age_36_55', 'age_56_plus']);

const AGE_GROUP_MAP = Object.freeze({
  '18_35': 'age_18_35',
  '36_55': 'age_36_55',
  '56_plus': 'age_56_plus',
  age_18_35: 'age_18_35',
  age_36_55: 'age_36_55',
  age_56_plus: 'age_56_plus',
});

function normaliseAdultAgeGroup(value) {
  const ageGroup = AGE_GROUP_MAP[value];
  if (!ageGroup) {
    const error = new Error('LibLingua research participation is limited to adults aged 18 or older');
    error.status = 422;
    throw error;
  }
  return ageGroup;
}

async function assertAdultParticipant(contributorId, db = prisma) {
  const contributor = await db.contributor.findUnique({
    where: { id: contributorId },
    select: { id: true, age_group: true },
  });
  if (!contributor) {
    const error = new Error('Contributor not found');
    error.status = 404;
    throw error;
  }
  if (!ADULT_STORED_AGE_GROUPS.includes(contributor.age_group)) {
    const error = new Error(contributor.age_group === 'under_18'
      ? 'LibLingua research participation is limited to adults aged 18 or older'
      : 'Complete your age-group profile before participating in research');
    error.status = 403;
    throw error;
  }
  return contributor;
}

module.exports = {
  ADULT_FORM_AGE_GROUPS,
  ADULT_STORED_AGE_GROUPS,
  normaliseAdultAgeGroup,
  assertAdultParticipant,
};
