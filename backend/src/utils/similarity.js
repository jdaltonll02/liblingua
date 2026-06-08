/**
 * Character n-gram overlap similarity (Jaccard) for gold standard checking.
 * Returns a value in [0, 1].
 */
function ngramSimilarity(a, b, n = 3) {
  const ngrams = (str) => {
    const s = str.toLowerCase().replace(/\s+/g, ' ').trim();
    const set = new Set();
    for (let i = 0; i <= s.length - n; i++) set.add(s.slice(i, i + n));
    return set;
  };

  const setA = ngrams(a);
  const setB = ngrams(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const gram of setA) if (setB.has(gram)) intersection++;

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

module.exports = { ngramSimilarity };
