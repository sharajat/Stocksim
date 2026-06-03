import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const stocksApi = {
  getInfo: (symbol: string) => api.get(`/api/stocks/info/${symbol}`),
  getOHLCV: (symbol: string, period = '60d', interval = '1d') =>
    api.get(`/api/stocks/ohlcv/${symbol}`, { params: { period, interval } }),
  getRegime: (symbol: string) => api.get(`/api/stocks/regime/${symbol}`),
  getMarketBreadth: () => api.get('/api/stocks/market-breadth'),
  getUniverse: () => api.get('/api/stocks/universe'),
  search: (q: string) => api.get('/api/stocks/search', { params: { q } }),
  getUniverseList: () => api.get('/api/stocks/universe/list'),
};

export const predictionsApi = {
  predict: (symbol: string, investment_amount: number) =>
    api.post('/api/predictions/predict', { symbol, investment_amount }),
  getHistory: (symbol?: string, limit = 50) =>
    api.get('/api/predictions/history', { params: { symbol, limit } }),
  verify: (id: number) => api.post(`/api/predictions/${id}/verify`),
  getAuditStats: () => api.get('/api/predictions/audit/stats'),
};

export const backtestApi = {
  run: (data: any) => api.post('/api/backtest/run', data),
  getHistory: () => api.get('/api/backtest/history'),
  getResult: (id: number) => api.get(`/api/backtest/${id}`),
};

export const paperTradeApi = {
  open: (data: any) => api.post('/api/papertrade/open', data),
  close: (id: number, exit_price?: number) =>
    api.post(`/api/papertrade/${id}/close`, { exit_price }),
  list: (status?: string) => api.get('/api/papertrade/', { params: { status } }),
  getStats: () => api.get('/api/papertrade/portfolio/stats'),
};

export const newsApi = {
  getNews: (symbol?: string) => api.get('/api/news/', { params: { symbol } }),
  getSentiment: (symbol: string) => api.get(`/api/news/sentiment/${symbol}`),
  getMarketNews: () => api.get('/api/news/market'),
};

export const signalsApi = {
  getSignals: (symbol: string) => api.get(`/api/signals/${symbol}`),
};

export const featuresApi = {
  getFeatures: (symbol: string) => api.get(`/api/features/${symbol}`),
  getFeatureHistory: (symbol: string, feature: string) =>
    api.get(`/api/features/${symbol}/history`, { params: { feature } }),
  listFeatures: () => api.get('/api/features/list/all'),
};

export const modelsApi = {
  train: (symbol: string, period = '2y') => api.post('/api/models/train', { symbol, period }),
  getFeatureImportance: (symbol: string) => api.get(`/api/models/feature-importance/${symbol}`),
  listModels: () => api.get('/api/models/list'),
  getPerformance: () => api.get('/api/models/performance'),
};

export const reportsApi = {
  getDashboard: () => api.get('/api/reports/dashboard'),
  getOpportunities: (investment?: number) =>
    api.get('/api/reports/opportunities', { params: { investment } }),
};

export const simulationApi = {
  run: (num_trades: number, amount_per_trade: number, seed?: number) =>
    api.post('/api/simulation/run', { num_trades, amount_per_trade, seed }, { timeout: 120000 }),
};

export const authApi = {
  login: (username: string, password: string) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    return api.post('/api/auth/token', form);
  },
  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),
  me: () => api.get('/api/auth/me'),
};
