import api from './client';

export const listContributors = (page = 1, limit = 24, language = '', sort = 'reputation') =>
  api.get('/contributors', { params: { page, limit, language: language || undefined, sort } });

export const listContributorsAdmin = (page = 1, limit = 20, search = '') =>
  api.get('/contributors/admin/list', { params: { page, limit, search } });

export const deleteContributor = (id) =>
  api.delete(`/contributors/admin/${id}`);
