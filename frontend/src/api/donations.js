import api from './client';

// Stripe
export const createStripeSession  = (data) => api.post('/donations/stripe/session', data);
export const confirmStripeSession = (session_id) => api.get('/donations/stripe/confirm', { params: { session_id } });

// MTN MoMo
export const initiateMtnMomo  = (data)         => api.post('/donations/mtn/initiate', data);
export const checkMtnStatus   = (reference_id) => api.get(`/donations/mtn/status/${reference_id}`);

// Public stats
export const getDonationStats = () => api.get('/donations/stats');

// Admin
export const listDonations = (params) => api.get('/donations', { params });
