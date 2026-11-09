const prisma = require('../src/utils/prisma');
const corpus = require('../src/data/curatedSourceCorpus');
const { initialSourceFields } = require('../src/services/sourceProvenanceService');

async function main() {
  const data = corpus.map((prompt, index) => ({
    ...prompt,
    is_gold_standard: false,
    ...initialSourceFields({
      text: prompt.text,
      domain: prompt.domain,
      source: {
        source_kind: 'SEEDED',
        source_dataset: 'LibLingua Curated Source Corpus',
        source_dataset_version: '1.0.0',
        source_record_id: `ll-source-v1-${String(index + 1).padStart(4, '0')}`,
        source_citation: 'LibLingua Curated Source Corpus v1.0.0',
        copyright_status: 'PERMISSION_GRANTED',
        source_usage_restrictions: 'Created for LibLingua research collection; subject to project governance terms',
        importer_version: process.env.GIT_COMMIT || 'curated-source-v1',
        provenance_metadata: { first_party: true, editorial_scope: 'clarity, privacy, non-specialist content' },
      },
    }),
    copyright_status: 'PERMISSION_GRANTED',
    source_release_eligible: true,
    specialist_review_status: 'NOT_REQUIRED',
  }));
  const result = await prisma.englishSample.createMany({ data, skipDuplicates: true });
  console.log(`Curated source corpus ready: ${result.count} added, ${data.length - result.count} already present.`);
}

main().catch((error) => {
  console.error('Curated source corpus seed failed:', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
