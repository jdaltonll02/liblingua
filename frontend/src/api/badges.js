import api from './client';

export const listBadgeDefinitions = ()   => api.get('/badges/definitions');
export const myBadges             = ()   => api.get('/badges/mine');
export const myStreak             = ()   => api.get('/badges/streak');
export const contributorBadges    = (id) => api.get(`/badges/contributor/${id}`);
