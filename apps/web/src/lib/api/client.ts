import axios, { AxiosError, AxiosInstance } from 'axios';
import { getCookie } from 'cookies-next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Extract tenant slug from the current hostname
 * For subdomain.localhost:3000 pattern, extracts "subdomain"
 */
function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname.toLowerCase();
  
  // Check for subdomain.localhost pattern (development)
  const localhostMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/);
  if (localhostMatch) {
    return localhostMatch[1];
  }
  
  // Check for subdomain.domain.com pattern (production)
  // Assumes main domain doesn't have www prefix in this check
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    // e.g., ["acme", "youroms", "com"] -> "acme"
    return parts[0];
  }
  
  return null;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
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

// API Response type for more detailed responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
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
