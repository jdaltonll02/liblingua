import api from './client';

export const listCampaigns  = (params) => api.get('/campaigns', { params });
export const getCampaign    = (id)     => api.get(`/campaigns/${id}`);
export const createCampaign = (data)   => api.post('/campaigns', data);
export const updateCampaign = (id, data) => api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id)     => api.delete(`/campaigns/${id}`);
