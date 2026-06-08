import api from './client';

export const listResearchers = () => api.get('/researchers');
