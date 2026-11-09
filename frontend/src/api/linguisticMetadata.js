import api from './client';

export const getLinguisticMetadata = (language) =>
  api.get('/linguistic-metadata', { params: { language } });
export const getMyLanguageProfiles = () => api.get('/linguistic-metadata/profiles/mine');
export const saveMyLanguageProfile = (data) => api.put('/linguistic-metadata/profiles/mine', data);
