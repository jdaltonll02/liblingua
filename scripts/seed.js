/**
 * Seed script — populates the database with 50 diverse English samples
 * across all domains and difficulty levels, plus a few gold standard entries.
 *
 * Usage: node scripts/seed.js
 * (Run from the project root after `npm install` in /backend and running migrations)
 */

// Resolve modules from the backend package where they are installed.
// When running inside Docker the BACKEND_ROOT env var points to /app.
// When running locally it falls back to <project-root>/backend.
const path = require('path');
const backendRoot = process.env.BACKEND_ROOT || path.join(__dirname, '../backend');
require(path.join(backendRoot, 'node_modules/dotenv')).config({ path: path.join(backendRoot, '.env') });
const { PrismaClient } = require(path.join(backendRoot, 'node_modules/@prisma/client'));
const bcrypt = require(path.join(backendRoot, 'node_modules/bcryptjs'));

const prisma = new PrismaClient();

const SAMPLES = [
  // ── HEALTH (10 samples) ──────────────────────────────────────────────────
  { text: 'Wash your hands with soap and clean water for at least 20 seconds.', domain: 'health', difficulty: 'easy' },
  { text: 'Malaria is spread through the bite of an infected female Anopheles mosquito.', domain: 'health', difficulty: 'medium' },
  { text: 'Children under five should receive a full course of vaccinations according to the national immunization schedule.', domain: 'health', difficulty: 'hard' },
  { text: 'Drink plenty of clean water every day to stay healthy.', domain: 'health', difficulty: 'easy' },
  { text: 'If you have a fever lasting more than three days, please visit your nearest health clinic.', domain: 'health', difficulty: 'medium' },
  { text: 'Breastfeeding provides essential nutrients and antibodies that protect newborns from disease.', domain: 'health', difficulty: 'hard' },
  { text: 'Cover your mouth and nose when coughing or sneezing to prevent spreading germs.', domain: 'health', difficulty: 'easy' },
  { text: 'High blood pressure can be managed through diet, exercise, and medication if prescribed by a doctor.', domain: 'health', difficulty: 'medium' },
  { text: 'Pregnant women should attend antenatal care appointments regularly for the health of themselves and their baby.', domain: 'health', difficulty: 'medium' },
  { text: 'Community health workers play a vital role in extending healthcare services to remote areas.', domain: 'health', difficulty: 'hard' },

  // ── LEGAL (8 samples) ────────────────────────────────────────────────────
  { text: 'Every citizen has the right to a fair trial.', domain: 'legal', difficulty: 'easy' },
  { text: 'You have the right to remain silent and to have an attorney present during questioning.', domain: 'legal', difficulty: 'medium' },
  { text: 'Land disputes must be reported to the local magistrate court for resolution.', domain: 'legal', difficulty: 'medium' },
  { text: 'The constitution guarantees freedom of speech and peaceful assembly for all Liberian citizens.', domain: 'legal', difficulty: 'hard' },
  { text: 'A contract is a legally binding agreement between two or more parties.', domain: 'legal', difficulty: 'medium' },
  { text: 'Child marriage is illegal and harms the futures of young girls.', domain: 'legal', difficulty: 'easy' },
  { text: 'The judiciary must operate independently from executive and legislative interference.', domain: 'legal', difficulty: 'hard' },
  { text: 'Please bring your identification card when registering to vote.', domain: 'legal', difficulty: 'easy' },

  // ── EDUCATION (8 samples) ────────────────────────────────────────────────
  { text: 'Education is the key to a better future.', domain: 'education', difficulty: 'easy' },
  { text: 'All children between the ages of six and sixteen have the right to free primary education.', domain: 'education', difficulty: 'medium' },
  { text: 'Reading at least thirty minutes every day improves your vocabulary and comprehension skills.', domain: 'education', difficulty: 'easy' },
  { text: 'Scholarships are available for students who demonstrate academic excellence and financial need.', domain: 'education', difficulty: 'medium' },
  { text: 'Teachers should receive ongoing professional development to improve the quality of instruction.', domain: 'education', difficulty: 'hard' },
  { text: 'Mathematics and science skills are increasingly important in today\'s global economy.', domain: 'education', difficulty: 'medium' },
  { text: 'Inclusive education ensures that children with disabilities can learn alongside their peers.', domain: 'education', difficulty: 'hard' },
  { text: 'Always respect your teacher and your classmates in the classroom.', domain: 'education', difficulty: 'easy' },

  // ── NEWS (8 samples) ─────────────────────────────────────────────────────
  { text: 'Heavy rains caused flooding in several counties this week.', domain: 'news', difficulty: 'easy' },
  { text: 'The government announced a new infrastructure project to repair roads in rural areas.', domain: 'news', difficulty: 'medium' },
  { text: 'Agricultural production increased by twelve percent following improved seed distribution programs.', domain: 'news', difficulty: 'hard' },
  { text: 'The president signed a new trade agreement with neighboring countries.', domain: 'news', difficulty: 'medium' },
  { text: 'Community leaders called for peace and unity ahead of the upcoming elections.', domain: 'news', difficulty: 'easy' },
  { text: "Liberia's peacekeeping forces have been deployed to support regional stability efforts.", domain: 'news', difficulty: 'hard' },
  { text: 'A new market opened today, giving local farmers a place to sell their produce.', domain: 'news', difficulty: 'easy' },
  { text: 'The central bank reported a slight improvement in the country\'s inflation rate.', domain: 'news', difficulty: 'medium' },

  // ── CONVERSATIONAL (8 samples) ──────────────────────────────────────────
  { text: 'Good morning! How are you today?', domain: 'conversational', difficulty: 'easy' },
  { text: 'Where is the nearest market from here?', domain: 'conversational', difficulty: 'easy' },
  { text: 'Can you help me carry this to the car?', domain: 'conversational', difficulty: 'easy' },
  { text: 'We should leave early tomorrow to avoid the traffic.', domain: 'conversational', difficulty: 'easy' },
  { text: 'I haven\'t seen you in such a long time! What have you been doing?', domain: 'conversational', difficulty: 'medium' },
  { text: 'Could you please repeat that more slowly? I didn\'t understand.', domain: 'conversational', difficulty: 'easy' },
  { text: 'Do you know a good mechanic who can fix my motorcycle?', domain: 'conversational', difficulty: 'medium' },
  { text: 'My grandmother always said that hard work and patience are the foundation of success.', domain: 'conversational', difficulty: 'medium' },

  // ── GENERAL (8 samples) ─────────────────────────────────────────────────
  { text: 'The sun rises in the east and sets in the west.', domain: 'general', difficulty: 'easy' },
  { text: 'Water covers approximately 71 percent of the Earth\'s surface.', domain: 'general', difficulty: 'easy' },
  { text: "Liberia was founded in 1847 and is one of Africa's oldest republics.", domain: 'general', difficulty: 'medium' },
  { text: 'The rainy season in Liberia typically runs from May to October.', domain: 'general', difficulty: 'easy' },
  { text: 'Traditional storytelling is an important way of passing knowledge between generations.', domain: 'general', difficulty: 'medium' },
  { text: 'Biodiversity in tropical rainforests supports countless species of plants and animals.', domain: 'general', difficulty: 'hard' },
  { text: 'Technology is changing the way people communicate, work, and learn across the world.', domain: 'general', difficulty: 'medium' },
  { text: 'Sustainable farming practices can improve food security while protecting the natural environment.', domain: 'general', difficulty: 'hard' },
];

// Gold standard reference translations — cover all 8 languages across multiple domains
// so the 5% injection rate actually triggers meaningful quality checks.
const GOLD_STANDARDS = [
  // ── Kpelle ──
  { sampleIndex: 0,  target_language: 'kpelle', reference_translation: 'Kpuu ye la wuu gbi ee, meni tia lo paa kɛ tɛɛSeconds 20.',          created_by: 'Dr. Abena Mensah' },
  { sampleIndex: 10, target_language: 'kpelle', reference_translation: 'Kɔni tɔɔ meni gbɛ kɛ pɛɛ lɔɔ tia.',                                  created_by: 'Dr. Abena Mensah' },
  { sampleIndex: 18, target_language: 'kpelle', reference_translation: 'Kpelle-wulo kɛ pɛlɛ tia gbi.',                                        created_by: 'Dr. Abena Mensah' },

  // ── Bassa ──
  { sampleIndex: 4,  target_language: 'bassa',  reference_translation: 'Bi ɓolo ɖe nyu ɓe kɔ ɖae naanin, gba kɔ health clinic.',              created_by: 'Prof. James K. Flomo' },
  { sampleIndex: 11, target_language: 'bassa',  reference_translation: 'Mu ɖe kpa kɔ nyu ɓo ɖe ni pɛɛ.',                                      created_by: 'Prof. James K. Flomo' },
  { sampleIndex: 26, target_language: 'bassa',  reference_translation: 'Dyéɖé ɓe kɔ nyu ɖe bɔ ɖi ɓo wɛ.',                                    created_by: 'Prof. James K. Flomo' },

  // ── Grebo ──
  { sampleIndex: 1,  target_language: 'grebo',  reference_translation: 'Malaria nya ka wɔ nɛ ɓo anopheles nyɛ nyɛ dɛ.',                       created_by: 'Ms. Comfort Wleh' },
  { sampleIndex: 15, target_language: 'grebo',  reference_translation: 'Wɛ gbo nɛ dɛ ko kɔ pɛɛ.',                                            created_by: 'Ms. Comfort Wleh' },
  { sampleIndex: 34, target_language: 'grebo',  reference_translation: 'Ŋwɛ dɛ nya ka gbo pɛɛ wlɔ.',                                         created_by: 'Ms. Comfort Wleh' },

  // ── Vai ──
  { sampleIndex: 2,  target_language: 'vai',    reference_translation: 'ꕉꕞꕐ ꗱ ꔳꗜ ꔳꕯ ꕎ ꕉꖷ ꔳ ꗏꔴꕮ ꕎ ꖄꖷ.',                               created_by: 'Mr. Sao Kpoto' },
  { sampleIndex: 19, target_language: 'vai',    reference_translation: 'ꕎꖷ ꕞꗩ ꔳ ꕉꕞꕐ ꗱ ꔳ ꕯ ꖀ.',                                         created_by: 'Mr. Sao Kpoto' },
  { sampleIndex: 42, target_language: 'vai',    reference_translation: 'ꕉꖷ ꖀꗡ ꔳꕯ ꕎꖷ ꕞ.',                                                  created_by: 'Mr. Sao Kpoto' },

  // ── Mende ──
  { sampleIndex: 3,  target_language: 'mende',  reference_translation: 'Ndɔi gɔyɛ yɛla ngi mbɛlɛ sia kɔ gɛmɛ.',                             created_by: 'Dr. Sia Koroma' },
  { sampleIndex: 20, target_language: 'mende',  reference_translation: 'Kɛlɛ mbɛi wɛlɛ ngi nɔngɔ.',                                         created_by: 'Dr. Sia Koroma' },
  { sampleIndex: 36, target_language: 'mende',  reference_translation: 'Mbɛi ndɔi gɔyɛ yɛla ɔ lɔ.',                                         created_by: 'Dr. Sia Koroma' },

  // ── Loma ──
  { sampleIndex: 5,  target_language: 'loma',   reference_translation: 'Lɔɔ kɛlɛ zɔlɔ kɛ mɛni tia gbɛ nyi.',                                 created_by: 'Mr. Fofana Lamine' },
  { sampleIndex: 21, target_language: 'loma',   reference_translation: 'Kɛlɛ tia wɔlɔ lɔɔ zɔ.',                                             created_by: 'Mr. Fofana Lamine' },
  { sampleIndex: 43, target_language: 'loma',   reference_translation: 'Wɔlɔ kɛlɛ nyi tia lɔɔ kɛ gbɛ.',                                     created_by: 'Mr. Fofana Lamine' },

  // ── Krahn ──
  { sampleIndex: 6,  target_language: 'krahn',  reference_translation: 'Ɓle waa de gbo nɛ mi wa dɛ kɔ.',                                     created_by: 'Ms. Nyema Doe' },
  { sampleIndex: 22, target_language: 'krahn',  reference_translation: 'Kɔni mi wa dɛ kɔ pɛɛ tia.',                                         created_by: 'Ms. Nyema Doe' },
  { sampleIndex: 44, target_language: 'krahn',  reference_translation: 'Waa de gbo mi kɔ nɛ pɛɛ.',                                          created_by: 'Ms. Nyema Doe' },

  // ── Dan (Gio) ──
  { sampleIndex: 7,  target_language: 'dan',    reference_translation: 'Bɛ yaa ɓo kɔ gbɛ nyi wɔ wa.',                                       created_by: 'Mr. Gio Thomas' },
  { sampleIndex: 23, target_language: 'dan',    reference_translation: 'Kɔni gbɛ nyi wɔ wa ɓo.',                                            created_by: 'Mr. Gio Thomas' },
  { sampleIndex: 45, target_language: 'dan',    reference_translation: 'Bɛ yaa kɔ gbɛ tia wɔ.',                                            created_by: 'Mr. Gio Thomas' },
];

const LANGUAGES = [
  { value: 'kpelle', label: 'Kpelle',    sort_order: 1 },
  { value: 'bassa',  label: 'Bassa',     sort_order: 2 },
  { value: 'grebo',  label: 'Grebo',     sort_order: 3 },
  { value: 'vai',    label: 'Vai',       sort_order: 4 },
  { value: 'mende',  label: 'Mende',     sort_order: 5 },
  { value: 'loma',   label: 'Loma',      sort_order: 6 },
  { value: 'krahn',  label: 'Krahn',     sort_order: 7 },
  { value: 'dan',    label: 'Dan (Gio)', sort_order: 8 },
];

async function seed() {
  console.log('🌱 Seeding database…');

  // Seed languages
  let langsCreated = 0;
  for (const lang of LANGUAGES) {
    const existing = await prisma.language.findUnique({ where: { value: lang.value } });
    if (!existing) {
      await prisma.language.create({ data: lang });
      langsCreated++;
    }
  }
  console.log(`  ✓ Languages: ${langsCreated} created, ${LANGUAGES.length - langsCreated} already existed`);

  // Create an admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'changeme123';
  const existing = await prisma.contributor.findUnique({ where: { email: adminEmail } });

  let admin;
  if (!existing) {
    admin = await prisma.contributor.create({
      data: {
        name: 'Admin User',
        email: adminEmail,
        password_hash: await bcrypt.hash(adminPwd, 12),
        native_language: 'English',
        region_of_origin: 'Monrovia',
        age_group: 'age_18_35',
        is_l1_speaker: false,
        is_admin: true,
        role: 'SUPER_ADMIN',
        email_verified: true,
        is_profile_complete: true,
      },
    });
    console.log(`  ✓ Created admin: ${adminEmail} / ${adminPwd}`);
  } else {
    // Ensure existing admin always has the correct role (fixes installs seeded before this was added)
    admin = await prisma.contributor.update({
      where: { email: adminEmail },
      data:  { is_admin: true, role: 'SUPER_ADMIN' },
    });
    console.log(`  • Admin already exists: ${adminEmail} (role ensured: SUPER_ADMIN)`);
  }

  // Bulk-insert samples, skipping duplicates — single DB round-trip instead of N findFirst calls
  const result = await prisma.englishSample.createMany({ data: SAMPLES, skipDuplicates: true });
  console.log(`  ✓ Samples: ${result.count} created, ${SAMPLES.length - result.count} already existed`);

  // Re-fetch all inserted samples to get their IDs for gold standard linking
  const insertedSamples = await prisma.englishSample.findMany({
    where: { text: { in: SAMPLES.map((s) => s.text) } },
    orderBy: { created_at: 'asc' },
  });

  // Build a text → sample map for gold standard index lookup
  const sampleByText = Object.fromEntries(insertedSamples.map((s) => [s.text, s]));
  const orderedSamples = SAMPLES.map((s) => sampleByText[s.text]).filter(Boolean);

  // Mark 10% of samples as gold standard
  const goldCount = Math.floor(orderedSamples.length * 0.1);
  for (let i = 0; i < goldCount; i++) {
    await prisma.englishSample.update({
      where: { id: orderedSamples[i].id },
      data:  { is_gold_standard: true },
    });
  }
  console.log(`  ✓ Marked ${goldCount} samples as gold standard`);

  // Create gold standard reference translations
  let gsCreated = 0;
  for (const gs of GOLD_STANDARDS) {
    const sample = orderedSamples[gs.sampleIndex];
    if (!sample) continue;
    const existingGs = await prisma.goldStandard.findFirst({
      where: { sample_id: sample.id, target_language: gs.target_language },
    });
    if (!existingGs) {
      await prisma.goldStandard.create({
        data: {
          sample_id:             sample.id,
          target_language:       gs.target_language,
          reference_translation: gs.reference_translation,
          created_by:            gs.created_by,
        },
      });
      gsCreated++;
    }
  }
  console.log(`  ✓ Gold standard references: ${gsCreated} created (${GOLD_STANDARDS.length - gsCreated} already existed)`);
  console.log('\n✅ Seed complete.');
}

seed()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
