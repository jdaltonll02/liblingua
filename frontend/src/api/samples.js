import api from './client';

export const getRandomSample = (language) => api.get(`/samples/random?language=${language}`);
export const getSample = (id) => api.get(`/samples/${id}`);
export const getProgress = (language) => api.get(`/samples/progress?language=${language}`);
export const createSample = (data) => api.post('/samples', data);
export const bulkCreateSamples = (data) => api.post('/samples/bulk', data);
