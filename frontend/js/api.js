const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://localhost:4000/api',
  agentPanelUrl: '/pages/agent/dashboard.html',
  adminPanelUrl: '/pages/admin/login.html'
};

export const CONFIG = { ...DEFAULT_CONFIG, ...(window.__PICCO_CONFIG ?? {}) };

const API_BASE_URL = CONFIG.apiBaseUrl;
const ADMIN_TOKEN_KEY = 'picco_admin_token';

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (auth) {
    const token = getAdminToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let errorMessage = 'API request failed';
    try {
      const payload = await response.json();
      errorMessage = payload.error ?? payload.message ?? errorMessage;
    } catch (parseError) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// Agent APIs
export function fetchAgentProfile(telegramId) {
  return request(`/auth/agent/${telegramId}`);
}

export function fetchAgentProducts() {
  return request('/agent/products');
}

export function fetchAgentStores(agentId) {
  return request(`/agent/stores/${agentId}`);
}

export function createAgentStore(payload) {
  return request('/agent/stores', { method: 'POST', body: payload });
}

export function fetchAgentOrders(agentId) {
  return request(`/agent/orders/${agentId}`);
}

export function createAgentOrder(payload) {
  return request('/agent/orders', { method: 'POST', body: payload });
}

export function fetchAgentStats(agentId) {
  return request(`/agent/stats/${agentId}`);
}

// Admin APIs
export function loginAdmin(credentials) {
  return request('/auth/login', { method: 'POST', body: credentials });
}

export function fetchAdminProducts() {
  return request('/admin/products', { auth: true });
}

export function createAdminProduct(payload) {
  return request('/admin/products', { method: 'POST', body: payload, auth: true });
}

export function updateAdminProduct(id, payload) {
  return request(`/admin/products/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function deleteAdminProduct(id) {
  return request(`/admin/products/${id}`, { method: 'DELETE', auth: true });
}

export function fetchAdminStores() {
  return request('/admin/stores', { auth: true });
}

export function createAdminStore(payload) {
  return request('/admin/stores', { method: 'POST', body: payload, auth: true });
}

export function updateAdminStore(id, payload) {
  return request(`/admin/stores/${id}`, { method: 'PUT', body: payload, auth: true });
}

export function deleteAdminStore(id) {
  return request(`/admin/stores/${id}`, { method: 'DELETE', auth: true });
}

export function fetchAdminAgents() {
  return request('/admin/agents', { auth: true });
}

export function fetchAdminStats() {
  return request('/stats/admin', { auth: true });
}

export function exportAdminStats(format = 'excel') {
  return request(`/stats/export?format=${format}`, { auth: true, headers: { Accept: 'text/csv' } });
}

export function addAdmin(payload) {
  return request('/admin/admins/add', { method: 'POST', body: payload, auth: true });
}

export function changeAdminPassword(payload) {
  return request('/admin/admins/change-password', { method: 'PUT', body: payload, auth: true });
}

export function resetPlatform() {
  return request('/admin/reset', { method: 'DELETE', auth: true });
}
