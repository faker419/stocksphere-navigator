// API Client for DSMS Backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
}

let tokenStore: TokenStore = {
  accessToken: null,
  refreshToken: null,
};

export const setTokens = (access: string | null, refresh: string | null) => {
  tokenStore.accessToken = access;
  tokenStore.refreshToken = refresh;
  if (access) localStorage.setItem('access_token', access);
  else localStorage.removeItem('access_token');
  if (refresh) localStorage.setItem('refresh_token', refresh);
  else localStorage.removeItem('refresh_token');
};

export const getTokens = (): TokenStore => {
  if (!tokenStore.accessToken) {
    tokenStore.accessToken = localStorage.getItem('access_token');
    tokenStore.refreshToken = localStorage.getItem('refresh_token');
  }
  return tokenStore;
};

export const clearTokens = () => {
  tokenStore = { accessToken: null, refreshToken: null };
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role_id?: string;
  role?: Role;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  privileges?: Privilege[];
}

export interface Privilege {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface Item {
  id: string;
  name: string;
  code: string;
  description?: string;
  unit: string;
  min_quantity: number;
  category?: string;
  created_at: string;
}

export interface StockItem {
  item: Item;
  quantity: number;
  store_id: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  is_active: boolean;
}

export interface Request {
  id: string;
  request_number: string;
  requester_id: string;
  requester?: User;
  item_id: string;
  item?: Item;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Machinery {
  id: string;
  name: string;
  code: string;
  type_id: string;
  type?: MachineryType;
  location?: string;
  status: 'operational' | 'maintenance' | 'out_of_service';
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface MachineryType {
  id: string;
  name: string;
  description?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API Error
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

// Fetch wrapper with auth
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const { accessToken } = getTokens();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchWithAuth<T>(endpoint, options, false);
    }
    throw new ApiError(401, 'Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed', error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token || refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// Auth API
export const authApi = {
  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new ApiError(response.status, error.detail || 'Login failed');
    }

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    return fetchWithAuth<User>('/api/v1/auth/me');
  },

  async getUserPrivileges(userId: string): Promise<Privilege[]> {
    return fetchWithAuth<Privilege[]>(`/api/v1/users/${userId}/privileges`);
  },

  logout() {
    clearTokens();
  },
};

// Items API
export const itemsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    fetchWithAuth<PaginatedResponse<Item>>(`/api/v1/items?${new URLSearchParams(params as Record<string, string>)}`),
  
  create: (body: Partial<Item>) =>
    fetchWithAuth<Item>('/api/v1/items', { method: 'POST', body: JSON.stringify(body) }),
  
  update: (id: string, body: Partial<Item>) =>
    fetchWithAuth<Item>(`/api/v1/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  
  delete: (id: string) =>
    fetchWithAuth<void>(`/api/v1/items/${id}`, { method: 'DELETE' }),
};

// Requests API
export const requestsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    fetchWithAuth<PaginatedResponse<Request>>(`/api/v1/requests?${new URLSearchParams(params as Record<string, string>)}`),
  
  get: (id: string) =>
    fetchWithAuth<Request>(`/api/v1/requests/${id}`),
  
  create: (body: Partial<Request>) =>
    fetchWithAuth<Request>('/api/v1/requests', { method: 'POST', body: JSON.stringify(body) }),
  
  modify: (id: string, body: Partial<Request>) =>
    fetchWithAuth<Request>(`/api/v1/requests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  
  cancel: (id: string, reason?: string) =>
    fetchWithAuth<Request>(`/api/v1/requests/${id}/cancel`, { 
      method: 'POST', 
      body: JSON.stringify({ reason }) 
    }),
};

// Approval API
export const approvalApi = {
  listPending: () =>
    fetchWithAuth<Request[]>('/api/v1/approvals/pending'),
  
  getContext: (id: string) =>
    fetchWithAuth<{ request: Request; stock_available: number }>(`/api/v1/approvals/${id}/context`),
  
  approve: (id: string, expiry?: string) =>
    fetchWithAuth<Request>(`/api/v1/approvals/${id}/approve`, { 
      method: 'POST', 
      body: JSON.stringify({ expiry }) 
    }),
  
  reject: (id: string, reason: string) =>
    fetchWithAuth<Request>(`/api/v1/approvals/${id}/reject`, { 
      method: 'POST', 
      body: JSON.stringify({ reason }) 
    }),
};

// Fulfillment API
export const fulfillmentApi = {
  listTasks: (storeId?: string) =>
    fetchWithAuth<Request[]>(`/api/v1/fulfillment/tasks${storeId ? `?store_id=${storeId}` : ''}`),
  
  fulfill: (id: string) =>
    fetchWithAuth<Request>(`/api/v1/fulfillment/${id}/fulfill`, { method: 'POST' }),
};

// Stores API
export const storesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    fetchWithAuth<PaginatedResponse<Store>>(`/api/v1/stores?${new URLSearchParams(params as Record<string, string>)}`),
  
  getStock: (id: string) =>
    fetchWithAuth<StockItem[]>(`/api/v1/stores/${id}/stock`),
  
  getLowStock: () =>
    fetchWithAuth<StockItem[]>('/api/v1/stock/low'),
  
  checkAvailability: (itemId: string) =>
    fetchWithAuth<{ available: number; stores: { store: Store; quantity: number }[] }>(`/api/v1/stock/availability/${itemId}`),
  
  getMovements: (params?: { page?: number; page_size?: number; item_id?: string; store_id?: string }) =>
    fetchWithAuth<PaginatedResponse<{ id: string; item_id: string; store_id: string; quantity_change: number; reason: string; created_at: string }>>(`/api/v1/stock/movements?${new URLSearchParams(params as Record<string, string>)}`),
  
  adjust: (itemId: string, storeId: string, quantity: number, reason: string) =>
    fetchWithAuth<void>(`/api/v1/stock/adjust?item_id=${itemId}&store_id=${storeId}`, { 
      method: 'POST', 
      body: JSON.stringify({ quantity, reason }) 
    }),
};

// Machinery API
export const machineryApi = {
  listTypes: (params?: { page?: number; page_size?: number }) =>
    fetchWithAuth<PaginatedResponse<MachineryType>>(`/api/v1/machinery-types?${new URLSearchParams(params as Record<string, string>)}`),
  
  createType: (body: Partial<MachineryType>) =>
    fetchWithAuth<MachineryType>('/api/v1/machinery-types', { method: 'POST', body: JSON.stringify(body) }),
  
  listByType: (typeId: string, params?: { page?: number; page_size?: number }) =>
    fetchWithAuth<PaginatedResponse<Machinery>>(`/api/v1/machinery-types/${typeId}/machinery?${new URLSearchParams(params as Record<string, string>)}`),
  
  get: (id: string) =>
    fetchWithAuth<Machinery>(`/api/v1/machinery/${id}`),
  
  create: (body: Partial<Machinery>) =>
    fetchWithAuth<Machinery>('/api/v1/machinery', { method: 'POST', body: JSON.stringify(body) }),
  
  update: (id: string, body: Partial<Machinery>) =>
    fetchWithAuth<Machinery>(`/api/v1/machinery/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  
  delete: (id: string) =>
    fetchWithAuth<void>(`/api/v1/machinery/${id}`, { method: 'DELETE' }),
  
  getHistory: (id: string) =>
    fetchWithAuth<{ id: string; machinery_id: string; action: string; notes?: string; performed_at: string; performed_by: string }[]>(`/api/v1/machinery/${id}/history`),
};

// Roles API
export const rolesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    fetchWithAuth<PaginatedResponse<Role>>(`/api/v1/roles?${new URLSearchParams(params as Record<string, string>)}`),
  
  create: (body: Partial<Role>) =>
    fetchWithAuth<Role>('/api/v1/roles', { method: 'POST', body: JSON.stringify(body) }),
  
  update: (id: string, body: Partial<Role>) =>
    fetchWithAuth<Role>(`/api/v1/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  
  delete: (id: string) =>
    fetchWithAuth<void>(`/api/v1/roles/${id}`, { method: 'DELETE' }),
  
  getPrivileges: (id: string) =>
    fetchWithAuth<Privilege[]>(`/api/v1/roles/${id}/privileges`),
  
  assignPrivileges: (id: string, privilegeIds: string[]) =>
    fetchWithAuth<void>(`/api/v1/roles/${id}/privileges`, { 
      method: 'POST', 
      body: JSON.stringify({ privilege_ids: privilegeIds }) 
    }),
};

// Privileges API
export const privilegesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    fetchWithAuth<PaginatedResponse<Privilege>>(`/api/v1/privileges?${new URLSearchParams(params as Record<string, string>)}`),
  
  listCategories: () =>
    fetchWithAuth<string[]>('/api/v1/privileges/categories'),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    fetchWithAuth<PaginatedResponse<User>>(`/api/v1/users?${new URLSearchParams(params as Record<string, string>)}`),
  
  create: (body: Partial<User> & { password: string }) =>
    fetchWithAuth<User>('/api/v1/users', { method: 'POST', body: JSON.stringify(body) }),
  
  update: (id: string, body: Partial<User>) =>
    fetchWithAuth<User>(`/api/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// Notifications API
export const notificationsApi = {
  list: () =>
    fetchWithAuth<Notification[]>('/api/v1/notifications'),
  
  markRead: (id: string) =>
    fetchWithAuth<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
  
  markAllRead: () =>
    fetchWithAuth<void>('/api/v1/notifications/read-all', { method: 'POST' }),
};
