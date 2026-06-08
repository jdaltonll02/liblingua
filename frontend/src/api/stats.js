import api from './client';

export const getStats = () => api.get('/stats');
