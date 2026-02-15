import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from '@/lib/api/client';

// Helper to get tenant slug from hostname
function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();
  const localhostMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/);
  if (localhostMatch) return localhostMatch[1];
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

// Helper to get cookie value by name
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Document types
export interface File {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId?: string;
  uploadedById: string;
  uploadedBy?: { id: string; firstName: string; lastName: string; avatar?: string };
  thumbnails?: { small?: string; medium?: string; large?: string };
  downloadUrl?: string;
  description?: string;
  tags?: string[];
  currentVersion: number;
  isStarred: boolean;
  isShared: boolean;
  shareLink?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  changeNote?: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  depth: number;
  description?: string;
  color?: string;
  createdById: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  employee?: { id: string; firstName: string; lastName: string; avatar?: string };
  fileCount?: number;
  subfolderCount?: number;
  isStarred?: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  folderId?: string;
  search?: string;
  mimeType?: string;
  isStarred?: boolean;
  isDeleted?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// FILES
// ============================================================================

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

export function useRecentFiles() {
  return useQuery({
    queryKey: ['files', 'recent'],
    queryFn: () => get<File[]>('/api/documents/files/recent'),
  });
}

export function useStarredFiles() {
  return useQuery({
    queryKey: ['files', 'starred'],
    queryFn: () => get<{ files: File[]; folders: Folder[] }>('/api/documents/files/starred'),
  });
}

export function useTrashFiles() {
  return useQuery({
    queryKey: ['files', 'trash'],
    queryFn: () => get<{ files: File[]; folders: Folder[] }>('/api/documents/trash'),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      folderId, 
      onProgress 
    }: { 
      file: globalThis.File; 
      folderId?: string;
      onProgress?: (percent: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);

      // Build URL with query params (backend reads folderId from req.query)
      let url = '/api/documents/files/upload';
      if (folderId) {
        url += `?folderId=${encodeURIComponent(folderId)}`;
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.withCredentials = true;
        
        // Add auth headers
        const token = getCookieValue('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        const tenantSlug = getTenantSlugFromHost();
        if (tenantSlug) {
          xhr.setRequestHeader('X-Tenant-Slug', tenantSlug);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

export function useUploadZip() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      targetFolderId,
      autoOrganize,
      onProgress 
    }: { 
      file: globalThis.File; 
      targetFolderId?: string;
      autoOrganize?: boolean;
      onProgress?: (percent: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (targetFolderId) formData.append('targetFolderId', targetFolderId);
      if (autoOrganize) formData.append('autoOrganize', 'true');

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/documents/files/upload-zip');
        xhr.withCredentials = true;
        
        // Add auth headers
        const token = getCookieValue('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        const tenantSlug = getTenantSlugFromHost();
        if (tenantSlug) {
          xhr.setRequestHeader('X-Tenant-Slug', tenantSlug);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      patch<File>(`/api/documents/files/${id}`, { name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', variables.id] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      post(`/api/documents/files/${id}/move`, { targetFolderId: folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useStarFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      put(`/api/documents/files/${id}/star`, { isStarred: starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useStarFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      put(`/api/documents/folders/${id}/star`, { isStarred: starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useShareFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, shared, expiry }: { id: string; shared: boolean; expiry?: string }) =>
      post<{ shareLink?: string }>(`/api/documents/files/${id}/share`, { isShared: shared, expiry }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', variables.id] });
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
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

// ============================================================================
// BULK FILE OPERATIONS
// ============================================================================

export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileIds: string[]) => 
      post<{ deleted: number; failed: number }>('/api/documents/files/bulk-delete', { fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useBulkMoveFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileIds, targetFolderId }: { fileIds: string[]; targetFolderId: string | null }) =>
      post<{ moved: number; failed: number }>('/api/documents/files/bulk-move', { fileIds, targetFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useFileDownloadUrl(fileId: string | undefined, inline: boolean = false) {
  return useQuery({
    queryKey: ['file-download-url', fileId, inline],
    queryFn: async () => {
      const result = await get<{ url: string }>(`/api/documents/files/${fileId}/download`, { inline: inline.toString() });
      return result.url;
    },
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000, // 5 minutes (URLs are valid for longer but refresh occasionally)
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  });
}

export function useBulkDownloadUrls() {
  return useMutation({
    mutationFn: (fileIds: string[]) =>
      post<{ id: string; name: string; url: string }[]>('/api/documents/files/bulk-download-urls', { fileIds }),
  });
}

export function useBulkDeleteFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderIds, recursive = true }: { folderIds: string[]; recursive?: boolean }) =>
      post<{ deleted: number; failed: number }>('/api/documents/folders/bulk-delete', { folderIds, recursive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.refetchQueries({ queryKey: ['trash'] });
    },
  });
}

export function useBulkMoveFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderIds, targetFolderId }: { folderIds: string[]; targetFolderId: string | null }) =>
      post<{ moved: number; failed: number }>('/api/documents/folders/bulk-move', { folderIds, targetFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => post(`/api/documents/files/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function usePermanentDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/documents/files/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

// ============================================================================
// BULK TRASH OPERATIONS
// ============================================================================

export function useBulkRestoreFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileIds: string[]) =>
      post<{ restored: number; failed: number }>('/api/documents/files/bulk-restore', { fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useBulkPermanentDeleteFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileIds: string[]) =>
      post<{ deleted: number; failed: number }>('/api/documents/files/bulk-permanent-delete', { fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

export function useBulkRestoreFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderIds: string[]) =>
      post<{ restored: number; failed: number }>('/api/documents/folders/bulk-restore', { folderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useBulkPermanentDeleteFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderIds: string[]) =>
      post<{ deleted: number; failed: number }>('/api/documents/folders/bulk-permanent-delete', { folderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

// ============================================================================
// THUMBNAILS
// ============================================================================

export function useRegenerateThumbnails() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => post<{ thumbnails: Record<string, string> }>(`/api/documents/files/${id}/regenerate-thumbnails`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useFilesNeedingThumbnails(limit: number = 50) {
  return useQuery({
    queryKey: ['files-needing-thumbnails', limit],
    queryFn: () => get<{ id: string; name: string; mimeType: string }[]>('/api/documents/files-needing-thumbnails', { limit }),
  });
}

export function useBatchRegenerateThumbnails() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (limit: number = 20) => post<{ processed: number; successful: number; failed: number }>('/api/documents/regenerate-all-thumbnails', { limit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['files-needing-thumbnails'] });
    },
  });
}

// ============================================================================
// FILE VERSIONS
// ============================================================================

export function useFileVersions(fileId: string) {
  return useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: () => get<FileVersion[]>(`/api/documents/files/${fileId}/versions`),
    enabled: !!fileId,
  });
}

export function useUploadNewVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      fileId, 
      file,
      changeNote,
      onProgress 
    }: { 
      fileId: string;
      file: globalThis.File; 
      changeNote?: string;
      onProgress?: (percent: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (changeNote) formData.append('changeNote', changeNote);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/documents/files/${fileId}/versions`);
        xhr.withCredentials = true;
        
        // Add auth headers
        const token = getCookieValue('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        const tenantSlug = getTenantSlugFromHost();
        if (tenantSlug) {
          xhr.setRequestHeader('X-Tenant-Slug', tenantSlug);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['file-versions', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, version }: { fileId: string; version: number }) =>
      post(`/api/documents/files/${fileId}/versions/${version}/restore`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['file-versions', variables.fileId] });
    },
  });
}

// ============================================================================
// FOLDERS
// ============================================================================

export function useFolders(parentId?: string | null) {
  return useQuery({
    queryKey: ['folders', parentId ?? 'root'],
    queryFn: () => get<Folder[]>('/api/documents/folders', { parentId: parentId || undefined }),
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: () => get<Folder>(`/api/documents/folders/${id}`),
    enabled: !!id,
  });
}

export function useFolderContents(folderId?: string | null) {
  const queryKey = ['folder-contents', folderId || 'root'];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = folderId ? `/api/documents/folders/${folderId}/contents` : '/api/documents/folders/root/contents';
      try {
        const result = await get<{ folders: Folder[]; files: File[] }>(url);
        return result;
      } catch (error) {
        throw error;
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

export function useFolderBreadcrumbs(id: string) {
  return useQuery({
    queryKey: ['folder-breadcrumbs', id],
    queryFn: () => get<Folder[]>(`/api/documents/folders/${id}/breadcrumbs`),
    enabled: !!id,
  });
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folder-tree'],
    queryFn: async () => {
      const result = await get<Folder[]>('/api/documents/folders/tree');
      return result;
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: true,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; parentId?: string; description?: string; color?: string }) =>
      post<Folder>('/api/documents/folders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.refetchQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      patch<Folder>(`/api/documents/folders/${id}`, { name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.refetchQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useUpdateFolderColor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, color }: { id: string; color: string | null }) =>
      patch<Folder>(`/api/documents/folders/${id}`, { color: color || '' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      post(`/api/documents/folders/${id}/move`, { targetParentId: parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, recursive }: { id: string; recursive?: boolean }) => 
      del(`/api/documents/folders/${id}${recursive ? '?recursive=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      // Force refetch of folder tree immediately
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.refetchQueries({ queryKey: ['folder-tree'] });
      // Invalidate and refetch trash to show deleted items
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.refetchQueries({ queryKey: ['trash'] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => post(`/api/documents/folders/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function usePermanentDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => del(`/api/documents/folders/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });
}

// ============================================================================
// FOLDER INITIALIZATION
// ============================================================================

export function useInitializeFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => post('/api/documents/folders/initialize'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useInitializeCompanyFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => post('/api/documents/folders/initialize-company'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useInitializeEmployeeFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => post('/api/documents/folders/initialize-employees'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

export function useCreateEmployeeFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (employeeId: string) => post(`/api/documents/folders/employee/${employeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
    },
  });
}

// ============================================================================
// STORAGE STATS
// ============================================================================

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

// ============================================================================
// SEARCH
// ============================================================================

export function useSearchDocuments(query: string) {
  return useQuery({
    queryKey: ['search-documents', query],
    queryFn: () => get<{ files: File[]; folders: Folder[] }>('/api/documents/search', { q: query }),
    enabled: query.length >= 2,
  });
}
