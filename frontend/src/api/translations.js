import api from './client';

export const submitTranslation = (formData) =>
  api.post('/translations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getTranslations = (params) => api.get('/translations', { params });
export const getMyTranslations = () => api.get('/translations/mine');
export const validateTranslation = (id, data) => api.patch(`/translations/${id}/validate`, data);
