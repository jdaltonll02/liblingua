import api from './client';

export const submitTicket  = (data)   => api.post('/tickets', data);
export const listTickets   = (params) => api.get('/tickets', { params });
export const getTicket     = (id)     => api.get(`/tickets/${id}`);
export const updateTicket  = (id, data) => api.patch(`/tickets/${id}`, data);
export const getTicketStats = ()      => api.get('/tickets/stats');
