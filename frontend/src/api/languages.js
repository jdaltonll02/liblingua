import api from './client';

export const getLanguages   = (params)  => api.get('/languages', { params });
export const createLanguage = (data)    => api.post('/languages', data);
export const updateLanguage = (id, data)=> api.patch(`/languages/${id}`, data);
export const deleteLanguage = (id)      => api.delete(`/languages/${id}`);
