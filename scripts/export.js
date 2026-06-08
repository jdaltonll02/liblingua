#!/usr/bin/env node
/**
 * CLI export tool
 *
 * Usage:
 *   node scripts/export.js --format csv --language kpelle --output ./out.csv
 *   node scripts/export.js --format json --language bassa
 *   node scripts/export.js --format huggingface --validated-only --output ./all.jsonl
 */

const fs   = require('fs');
const path = require('path');
const backendRoot = path.join(__dirname, '../backend');
require('dotenv').config({ path: path.join(backendRoot, '.env') });
const { PrismaClient } = require(path.join(backendRoot, 'node_modules/@prisma/client'));
const { stringify } = require(path.join(backendRoot, 'node_modules/csv-stringify/sync'));

const prisma = new PrismaClient();

const LANGUAGES = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    format: get('--format') || 'json',
    language: get('--language') || null,
    output: get('--output') || null,
    validatedOnly: args.includes('--validated-only'),
  };
}

async function fetchRecords(language, validatedOnly) {
  const where = {};
  if (language) where.target_language = language;
  if (validatedOnly) where.is_validated = true;

  const rows = await prisma.translation.findMany({
    where,
    include: {
      sample: true,
      contributor: { select: { region_of_origin: true, age_group: true, is_l1_speaker: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  return rows.map((t) => ({
    id: t.id,
    source_lang: 'en',
    target_lang: t.target_language,
    dialect: t.dialect || null,
    source_text: t.sample.text,
    target_text: t.translated_text,
    domain: t.sample.domain,
    difficulty: t.sample.difficulty,
    contributor_region: t.contributor.region_of_origin,
    contributor_age_group: t.contributor.age_group,
    is_l1_speaker: t.contributor.is_l1_speaker,
    is_validated: t.is_validated,
    quality_score: t.quality_score,
    audio_source_path: t.sample.audio_path || null,
    audio_target_path: t.audio_path || null,
  }));
}

async function main() {
  const { format, language, output, validatedOnly } = parseArgs();

  if (language && !LANGUAGES.includes(language)) {
    console.error(`Unknown language "${language}". Valid: ${LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  console.log(`Exporting format=${format} language=${language || 'all'} validated_only=${validatedOnly}`);
  const records = await fetchRecords(language, validatedOnly);
  console.log(`Found ${records.length} translations.`);

  let content;
  let defaultExt;

  switch (format) {
    case 'csv':
      content = stringify(records, { header: true });
      defaultExt = '.csv';
      break;
    case 'json':
      content = JSON.stringify(records, null, 2);
      defaultExt = '.json';
      break;
    case 'huggingface':
      content = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
      defaultExt = '.jsonl';
      break;
    default:
      console.error(`Unknown format "${format}". Use: csv | json | huggingface`);
      process.exit(1);
  }

  const outPath = output || path.join(
    process.cwd(),
    `liberian_${language || 'all'}_${Date.now()}${defaultExt}`
  );

  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`✅ Exported to: ${outPath}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
