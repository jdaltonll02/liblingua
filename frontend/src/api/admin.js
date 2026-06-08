import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

// User management
export const listUsers = (page = 1, limit = 20, filters = {}) =>
  api.get('/admin/users', { params: { page, limit, ...filters } });

export const getUserDetail = (id) =>
  api.get(`/admin/users/${id}`);

export const createUser = (data) =>
  api.post('/admin/users', data);

export const updateUser = (id, data) =>
  api.patch(`/admin/users/${id}`, data);

export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

export const deactivateUser = (id, reason) =>
  api.patch(`/admin/users/${id}/deactivate`, { reason });

export const activateUser = (id) =>
  api.patch(`/admin/users/${id}/activate`);

export const deleteUser = (id, cascade = false) =>
  api.delete(`/admin/users/${id}`, { params: { cascade } });

// Audit logging
export const listAuditLogs = (page = 1, limit = 50, filters = {}) =>
  api.get('/admin/audit-logs', { params: { page, limit, ...filters } });

// Admin manual translations
export const createManualTranslation = (data)     => api.post('/admin/manual-translations', data);
export const listManualTranslations  = (params)   => api.get('/admin/manual-translations', { params });
export const deleteManualTranslation = (id)        => api.delete(`/admin/manual-translations/${id}`);
