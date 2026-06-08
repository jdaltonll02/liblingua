import api from './client';

export const createApiKey = (data) => api.post('/keys', data);
export const listApiKeys  = ()     => api.get('/keys');
export const revokeApiKey = (id)   => api.delete(`/keys/${id}`);
