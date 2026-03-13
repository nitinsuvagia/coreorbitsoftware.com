import axios, { AxiosError, AxiosInstance } from 'axios';
import { getTenantSlugFromHostname } from '@/lib/domain-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Custom cookie getter that reliably reads cookies from document.cookie
 * Replaces cookies-next getCookie which can have issues in some environments
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Extract tenant slug from the current hostname
 * For subdomain.localhost:3000 pattern, extracts "subdomain"
 * Returns null if no tenant subdomain is detected (security: no default tenant)
 */
function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;

  return getTenantSlugFromHostname(window.location.hostname);
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Public API instance - no auth headers, for candidate-facing endpoints
export const publicApi: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for public API - only add tenant slug, no auth
publicApi.interceptors.request.use(
  (config) => {
    // Add tenant slug header if on a tenant subdomain
    const tenantSlug = getTenantSlugFromHost();
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
    
    // Forward the original hostname to the API gateway for domain resolution
    if (typeof window !== 'undefined') {
      config.headers['X-Forwarded-Host'] = window.location.host;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for public API
publicApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token and tenant context
api.interceptors.request.use(
  (config) => {
    const token = getCookie('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant slug header if on a tenant subdomain
    const tenantSlug = getTenantSlugFromHost();
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
    
    // Forward the original hostname to the API gateway for domain resolution
    // This is critical for determining if it's main domain vs tenant subdomain
    if (typeof window !== 'undefined') {
      config.headers['X-Forwarded-Host'] = window.location.host;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle maintenance mode (503 Service Unavailable)
    if (error.response?.status === 503) {
      const data = error.response.data as any;
      if (data?.maintenanceMode) {
        // Store maintenance message for the maintenance page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('maintenanceMessage', data.message || 'System is under maintenance');
          window.location.href = '/maintenance';
        }
        return Promise.reject(error);
      }
    }
    
    // Prevent infinite retry loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = getCookie('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          }, { withCredentials: true });

          const accessToken =
            response.data?.tokens?.accessToken ||
            response.data?.data?.accessToken ||
            response.data?.accessToken;
          const newRefreshToken =
            response.data?.tokens?.refreshToken ||
            response.data?.data?.refreshToken ||
            response.data?.refreshToken;

          if (!accessToken) {
            throw new Error('Missing access token in refresh response');
          }

          document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
          if (newRefreshToken) {
            document.cookie = `refreshToken=${newRefreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Only redirect if we're in the browser and refresh completely failed
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Extracts a human-readable message from an Axios error response
export function extractErrorMessage(error: any): string {
  const data = error?.response?.data as any;
  if (data) {
    const msg =
      data.error?.message ||
      (typeof data.error === 'string' ? data.error : undefined) ||
      data.message ||
      data.detail;
    if (msg && typeof msg === 'string') return msg;
  }
  return error?.message || 'An unexpected error occurred';
}

// API helper functions
export async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  const response = await api.get<{ success: boolean; data: T }>(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: any): Promise<T> {
  const response = await api.post<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

export async function put<T>(url: string, data?: any): Promise<T> {
  const response = await api.put<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

export async function patch<T>(url: string, data?: any): Promise<T> {
  const response = await api.patch<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const response = await api.delete<{ success: boolean; data: T }>(url);
  return response.data.data;
}

// Public API helper functions (no auth required)
export async function publicGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  const response = await publicApi.get<{ success: boolean; data: T }>(url, { params });
  return response.data.data;
}

export async function publicPost<T>(url: string, data?: any): Promise<T> {
  const response = await publicApi.post<{ success: boolean; data: T }>(url, data);
  return response.data.data;
}

// API Response type for more detailed responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;  // Success/info message from backend
  error?: {
    code?: string;
    message: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// API client with full response access (useful for checking success/error)
export const apiClient = {
  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const response = await api.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      return { success: false, error: { message: 'Network error' } };
    }
  },

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await api.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      return { success: false, error: { message: 'Network error' } };
    }
  },

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await api.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      return { success: false, error: { message: 'Network error' } };
    }
  },

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await api.patch<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      return { success: false, error: { message: 'Network error' } };
    }
  },

  async delete<T>(url: string, config?: { data?: any }): Promise<ApiResponse<T>> {
    try {
      const response = await api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      return { success: false, error: { message: 'Network error' } };
    }
  },
};
