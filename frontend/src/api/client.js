import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true, // send the httpOnly cookie on every request
  // No default Content-Type — axios sets application/json for plain objects
  // and multipart/form-data (with boundary) automatically for FormData.
});

// No Authorization header interceptor needed — the browser sends the cookie automatically.

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only hard-redirect on 401 for non-auth endpoints, and never if we're
    // already on an auth page (prevents the /auth/me session-check loop).
    if (
      err.response?.status === 401 &&
      !err.config?.url?.endsWith('/auth/me') &&
      !window.location.pathname.startsWith('/auth')
    ) {
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
