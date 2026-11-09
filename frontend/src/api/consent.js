import api from './client';

export const getActiveConsentPolicies = () => api.get('/consent/active');
export const getMyConsent = () => api.get('/consent/me');
export const recordConsent = (data) => api.post('/consent', data);
export const getAllResearchPolicies = () => api.get('/consent/admin/policies');
