import api from './client';

export const register            = (data)  => api.post('/auth/register', data);
export const login               = (data)  => api.post('/auth/login', data);
export const getMe               = ()      => api.get('/auth/me');
export const verifyEmail         = (token) => api.get(`/auth/verify/${token}`);
export const resendVerification  = (email) => api.post('/auth/resend-verification', { email });
export const completeProfile     = (data)  => api.patch('/auth/complete-profile', data);
export const updateProfile       = (data)  =>
  api.patch('/auth/profile', data, data instanceof FormData
    ? { headers: { 'Content-Type': undefined } }  // let browser set multipart boundary
    : {});
export const changeEmail         = (email) => api.post('/auth/change-email', { email });
export const forgotPassword      = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword       = (data)  => api.post('/auth/reset-password', data);
export const changePassword      = (data)  => api.post('/auth/change-password', data);
export const setup2FA            = ()      => api.post('/auth/2fa/setup');
export const verify2FA           = (code)  => api.post('/auth/2fa/verify', { code });
export const disable2FA          = (code)  => api.post('/auth/2fa/disable', { code });
