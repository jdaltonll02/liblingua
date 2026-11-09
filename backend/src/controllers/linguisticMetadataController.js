const service = require('../services/linguisticMetadataService');

function handle(action) {
  return async (req, res, next) => {
    try { await action(req, res); } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 'P2002') return res.status(409).json({ error: 'That code or version already exists' });
      next(error);
    }
  };
}

const listActive = handle(async (req, res) => res.json(await service.listActiveMetadata(req.query.language)));
const listAll = handle(async (_req, res) => res.json(await service.listAllMetadata()));
const listApprovals = handle(async (req, res) => res.json({ approvals: await service.listGovernanceApprovals({
  resourceType: req.query.resource_type,
  resourceId: req.query.resource_id,
}) }));
const listAuthorities = handle(async (_req, res) => res.json(await service.listGovernanceAuthorities()));
const assignAuthority = handle(async (req, res) => res.json(await service.assignGovernanceAuthority({
  authorityRole: req.body.authority_role,
  contributorId: req.body.contributor_id,
  assignedBy: req.user.id,
})));
const createVariety = handle(async (req, res) => res.status(201).json(await service.createVariety(req.body)));
const createOrthography = handle(async (req, res) => res.status(201).json(await service.createOrthography(req.body)));
const createGuideline = handle(async (req, res) => res.status(201).json(await service.createGuideline(req.body)));
const approve = handle(async (req, res) => res.status(201).json(await service.recordApproval({
  resourceType: req.body.resource_type,
  resourceId: req.body.resource_id,
  authorityRole: req.body.authority_role,
  decision: req.body.decision,
  notes: req.body.notes,
  approverId: req.user.id,
})));
const activate = handle(async (req, res) => res.json(await service.activateResource({
  resourceType: req.body.resource_type,
  resourceId: req.body.resource_id,
  activatedBy: req.user.id,
})));
const myProfiles = handle(async (req, res) => res.json(await service.getContributorProfiles(req.user.id)));
const upsertMyProfile = handle(async (req, res) => res.json(await service.upsertContributorProfile(req.user.id, req.body)));

module.exports = { listActive, listAll, listApprovals, listAuthorities, assignAuthority, createVariety, createOrthography, createGuideline, approve, activate, myProfiles, upsertMyProfile };
