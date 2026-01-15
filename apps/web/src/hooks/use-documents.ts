import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api/client';

// Document types
export interface File {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId?: string;
  uploadedById: string;
  uploadedBy?: { firstName: string; lastName: string };
  thumbnails?: { small?: string; medium?: string; large?: string };
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  createdById: string;
  createdBy?: { firstName: string; lastName: string };
  fileCount?: number;
  subfolderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  folderId?: string;
  search?: string;
  mimeType?: string;
  page?: number;
  limit?: number;
}

// Files
export function useFiles(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: ['files', filters],
    queryFn: () => get<{ items: File[]; total: number }>('/api/documents/files', filters),
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: () => get<File>(`/api/documents/files/${id}`),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, folderId }: { file: globalThis.File; folderId?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }
      
      const response = await fetch('/api/documents/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/documents/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Folders
export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: ['folders', parentId],
    queryFn: () => get<Folder[]>('/api/documents/folders', { parentId }),
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: () => get<Folder>(`/api/documents/folders/${id}`),
    enabled: !!id,
  });
}

export function useFolderBreadcrumbs(id: string) {
  return useQuery({
    queryKey: ['folder-breadcrumbs', id],
    queryFn: () => get<Folder[]>(`/api/documents/folders/${id}/breadcrumbs`),
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      post<Folder>('/api/documents/folders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      put<Folder>(`/api/documents/folders/${id}`, { name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder', variables.id] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/documents/folders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

// Storage stats
export interface StorageStats {
  used: number;
  limit: number;
  usedPercent: number;
  byType: { mimeType: string; size: number; count: number }[];
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn: () => get<StorageStats>('/api/documents/storage/stats'),
  });
}
