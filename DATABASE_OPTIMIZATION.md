# Database Performance Guide

## Query Optimization

### Pagination (Required for all list endpoints)

Always use `take` and `skip` to prevent loading entire datasets:

```javascript
// ✓ Good: Paginated query
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
const skip = (Math.max(parseInt(req.query.page) || 1, 1) - 1) * limit;

const [items, total] = await Promise.all([
  prisma.table.findMany({ take: limit, skip, orderBy: { id: 'desc' } }),
  prisma.table.count(),
]);

res.json({ data: items, meta: { total, page, limit } });

// ✗ Bad: Loading entire dataset
const allItems = await prisma.table.findMany();
res.json(allItems);
```

### Preventing N+1 Queries

Use `include` or `select` to fetch related data in a single query:

```javascript
// ✓ Good: Single query with relationships
const translations = await prisma.translation.findMany({
  include: {
    contributor: { select: { id: true, name: true } },
    sample: { select: { id: true, text: true } },
  },
});

// ✗ Bad: N+1 queries (1 main + N for each relation)
const translations = await prisma.translation.findMany();
const withContributors = await Promise.all(
  translations.map(t => prisma.contributor.findUnique({ where: { id: t.contributor_id } }))
);
```

### Field Selection (Reducing payload size)

Use `select` to fetch only needed fields:

```javascript
// ✓ Good: Select only needed fields
const contributors = await prisma.contributor.findMany({
  select: { id: true, name: true, native_language: true },
  take: 50,
});

// ✗ Bad: Fetches all fields including large objects
const contributors = await prisma.contributor.findMany({ take: 50 });
```

### Filtering Early

Filter in the query, not in application code:

```javascript
// ✓ Good: Filter in database
const approved = await prisma.translation.findMany({
  where: { is_validated: true, quality_score: { gte: 4.0 } },
});

// ✗ Bad: Filter in application
const all = await prisma.translation.findMany();
const approved = all.filter(t => t.is_validated && t.quality_score >= 4.0);
```

## Indexes

### Existing Indexes (from schema)

Current indexes optimized for common queries:

```sql
-- Translations
CREATE INDEX idx_translation_contributor_id ON translation(contributor_id);
CREATE INDEX idx_translation_sample_id ON translation(sample_id);
CREATE INDEX idx_translation_created_at_desc ON translation(created_at DESC);

-- Contributors
CREATE INDEX idx_contributor_email ON contributor(email);
CREATE INDEX idx_contributor_native_language ON contributor(native_language);

-- Samples
CREATE INDEX idx_sample_language ON sample(language);
CREATE INDEX idx_sample_domain ON sample(domain);
```

### Adding New Indexes

Before adding an index, check:

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM translation 
WHERE contributor_id = 'uuid' AND created_at > NOW() - INTERVAL '7 days';

-- If "Seq Scan", consider adding index:
CREATE INDEX idx_translation_contributor_created 
ON translation(contributor_id, created_at DESC);
```

## Query Patterns

### Counting Related Records

```javascript
// ✓ Efficient: Use count with where
const stats = await prisma.contributor.findUnique({
  where: { id: contributorId },
  select: {
    id: true,
    name: true,
    _count: { select: { translations: true } },
  },
});

console.log(stats._count.translations);

// ✗ Inefficient: Fetch all relations
const contributor = await prisma.contributor.findUnique({
  where: { id: contributorId },
  include: { translations: true },
});
console.log(contributor.translations.length);
```

### Batch Operations

```javascript
// ✓ Good: Single batch update
await prisma.translation.updateMany({
  where: { contributor_id: userId, is_validated: false },
  data: { is_validated: true, quality_score: 4.5 },
});

// ✗ Bad: Individual updates in a loop
for (const translationId of translationIds) {
  await prisma.translation.update({
    where: { id: translationId },
    data: { is_validated: true },
  });
}
```

### Atomic Transactions

Use transactions for operations that must succeed together:

```javascript
const result = await prisma.$transaction(async (tx) => {
  const translation = await tx.translation.create({
    data: { /* ... */ },
  });

  const contributor = await tx.contributor.update({
    where: { id: contributorId },
    data: { reputation_score: { increment: 10 } },
  });

  return { translation, contributor };
});
```

## Monitoring

### Finding Slow Queries

```sql
-- Top 10 slowest queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Long-running queries
SELECT pid, usename, query_start, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY query_start;
```

### Table Size Analysis

```sql
-- Size of each table
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size DESC;

-- Unused indexes
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
ORDER BY pg_relation_size DESC;
```

## Connection Pooling

Configure Prisma's connection pool:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pool settings
  // Format: postgresql://user:pass@host/db?schema=public&connection_limit=5
}
```

Recommended settings:
- `connection_limit=20` for development
- `connection_limit=5-10` per application instance in production
- Total pool size = (connections_per_instance × num_instances) + buffer

## Caching Strategies

### In-Memory Cache for Read-Heavy Data

```javascript
const cache = new Map();

async function getLanguages() {
  if (cache.has('languages')) {
    return cache.get('languages');
  }

  const languages = await prisma.language.findMany();
  cache.set('languages', languages);
  
  // Invalidate every hour
  setTimeout(() => cache.delete('languages'), 60 * 60 * 1000);
  
  return languages;
}
```

## Common Performance Issues

### Issue: Timeout on large exports
**Solution**: Stream results instead of loading all at once
```javascript
// Use cursor-based pagination for exports
let cursor = null;
while (true) {
  const batch = await prisma.translation.findMany({
    take: 1000,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
  });
  if (batch.length === 0) break;
  writeToStream(batch);
  cursor = batch[batch.length - 1].id;
}
```

### Issue: High database load from aggregations
**Solution**: Denormalize frequently-accessed stats
```javascript
// Periodically update stats table
REFRESH MATERIALIZED VIEW CONCURRENTLY translation_stats;

// Query becomes simple
SELECT * FROM translation_stats WHERE language = 'Krio';
```

### Issue: Memory spikes on large array operations
**Solution**: Use `findMany` with cursors for pagination
```javascript
// Instead of loading 100k records into memory:
// Use cursor-based pagination to process in chunks
```

## Performance Benchmarks

Target metrics (single server, 8GB RAM):

| Query | Target | Threshold |
|-------|--------|-----------|
| GET /api/samples | < 200ms | > 500ms = alert |
| POST /api/translations | < 300ms | > 1000ms = alert |
| GET /api/contributors | < 150ms | > 500ms = alert |
| List admin dashboard | < 500ms | > 2000ms = alert |

Run daily performance tests:
```bash
npm run test:performance
```
