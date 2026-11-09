const service = require('../services/releaseService');

function respondError(error, res, next) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === 'P2002') return res.status(409).json({ error: 'That release version already exists' });
  return next(error);
}

async function createCandidate(req, res, next) {
  try {
    const release = await service.createReleaseCandidate({
      language: req.body.language,
      semanticVersion: req.body.semantic_version,
      splitSeed: req.body.split_seed,
      splitMode: req.body.split_mode,
      gitCommit: req.body.git_commit,
      changelog: req.body.changelog,
      createdBy: req.user.id,
    });
    res.status(201).json(release);
  } catch (error) { respondError(error, res, next); }
}

async function publish(req, res, next) {
  try { res.json(await service.publishRelease(req.params.id, req.user.id)); }
  catch (error) { respondError(error, res, next); }
}

async function listPublic(_req, res, next) {
  try { res.json({ releases: await service.listReleases() }); }
  catch (error) { next(error); }
}

async function listAdmin(_req, res, next) {
  try { res.json({ releases: await service.listReleases({ includeDrafts: true }) }); }
  catch (error) { next(error); }
}

async function data(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const take = Math.min(5000, Math.max(1, Number(req.query.limit) || 1000));
    const result = await service.getReleaseData(req.params.id, {
      split: req.query.split,
      skip: (page - 1) * take,
      take,
    });
    res.json({ data: result.records, meta: { release: result.release, total: result.total, page, limit: take } });
  } catch (error) { respondError(error, res, next); }
}

async function artifact(req, res, next) {
  try {
    const { release, body } = await service.getReleaseArtifact(req.params.id);
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="liblingua-${release.language}-${release.semantic_version}.jsonl"`);
    res.setHeader('ETag', `"${release.artifact_checksum}"`);
    res.setHeader('X-Checksum-SHA256', release.artifact_checksum);
    res.send(body);
  } catch (error) { respondError(error, res, next); }
}

module.exports = { createCandidate, publish, listPublic, listAdmin, data, artifact };
