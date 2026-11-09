import api from './client';

export const listPublished     = ()     => api.get('/dataset/published');
export const publishLanguage   = (lang) => api.post('/dataset/publish', { language: lang });
export const unpublishLanguage  = (lang) => api.delete(`/dataset/publish/${lang}`);
export const deletePublication  = (lang) => api.delete(`/dataset/record/${lang}`);
export const syncHuggingFace   = (data) => api.post('/samples/sync-huggingface', data);
export const listReleases      = () => api.get('/releases');
export const listReleasesAdmin = () => api.get('/releases/admin');
export const createReleaseCandidate = (data) => api.post('/releases', data);
export const publishRelease = (id) => api.post(`/releases/${id}/publish`);
