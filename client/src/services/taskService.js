import api from './api';

export const getTasksByDate = (date) => api.get(`/tasks?date=${date}`);
export const createTask = (task) => api.post('/tasks', task);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const submitTask = (id, submission) => api.post(`/tasks/${id}/submit`, submission); 