import api from './client';

export const getLinguisticMetadata = (language) =>
  api.get('/linguistic-metadata', { params: { language } });
export const getMyLanguageProfiles = () => api.get('/linguistic-metadata/profiles/mine');
export const saveMyLanguageProfile = (data) => api.put('/linguistic-metadata/profiles/mine', data);
export const getAllLinguisticMetadata = () => api.get('/linguistic-metadata/admin');
export const getGovernanceApprovals = (params) => api.get('/linguistic-metadata/approvals', { params });
export const getGovernanceAuthorities = () => api.get('/linguistic-metadata/authorities');
export const assignGovernanceAuthority = (role, contributorId) =>
  api.put(`/linguistic-metadata/authorities/${role}`, { contributor_id: contributorId });
export const createLanguageVariety = (data) => api.post('/linguistic-metadata/varieties', data);
export const createOrthography = (data) => api.post('/linguistic-metadata/orthographies', data);
export const createAnnotationGuideline = (data) => api.post('/linguistic-metadata/guidelines', data);
export const recordGovernanceApproval = (data) => api.post('/linguistic-metadata/approvals', data);
export const activateGovernanceResource = (data) => api.post('/linguistic-metadata/activate', data);
