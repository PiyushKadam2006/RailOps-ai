import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.response.use(
  r => r,
  err => {
    console.error('API Error:', err.message);
    return Promise.reject(err);
  }
);

export default api;
