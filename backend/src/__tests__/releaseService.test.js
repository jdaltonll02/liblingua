jest.mock('../utils/prisma', () => ({}));

const { stableStringify, sha256, buildSplitAssignments } = require('../services/releaseService');

describe('immutable release helpers', () => {
  test('stable serialization and checksum do not depend on object key order', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });

  test('all translations in a source or near-duplicate family share one split', () => {
    const rows = [
      { id: 'a', contributor_id: 'speaker-1', source_group: 'duplicate-family-1' },
      { id: 'b', contributor_id: 'speaker-2', source_group: 'duplicate-family-1' },
      { id: 'c', contributor_id: 'speaker-3', source_group: 'source-2' },
    ];
    const assignments = buildSplitAssignments(rows, 'a-long-reproducible-seed', 'SOURCE_GROUPED');
    expect(assignments.get('a')).toBe(assignments.get('b'));
    expect(buildSplitAssignments(rows, 'a-long-reproducible-seed').get('c')).toBe(assignments.get('c'));
  });

  test('speech mode keeps a speaker and connected source families in one split', () => {
    const rows = [
      { id: 'a', contributor_id: 'speaker-1', source_group: 'source-1' },
      { id: 'b', contributor_id: 'speaker-1', source_group: 'source-2' },
      { id: 'c', contributor_id: 'speaker-2', source_group: 'source-2' },
    ];
    const assignments = buildSplitAssignments(rows, 'a-long-reproducible-seed', 'SOURCE_AND_SPEAKER_GROUPED');
    expect(new Set(assignments.values()).size).toBe(1);
  });
});
