import api from './client';

export const submitTranslation = (formData) =>
  api.post('/translations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getTranslations = (params) => api.get('/translations', { params });
export const getMyTranslations = () => api.get('/translations/mine');
export const getReviewQueue = () => api.get('/translations/review-queue');
export const getEligibleReviewers = () => api.get('/translations/reviewers');
export const assignReviewers = (id, data) => api.post(`/translations/${id}/review-assignments`, data);
export const submitReview = (id, data) => api.post(`/translations/${id}/reviews`, data);
export const getReviewHistory = (id) => api.get(`/translations/${id}/reviews`);
export const adjudicateTranslation = (id, data) => api.post(`/translations/${id}/adjudications`, data);
export const reviseTranslation = (id, data) => api.patch(`/translations/${id}/revise`, data);
