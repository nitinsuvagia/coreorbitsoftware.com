/**
 * Document Routes - API endpoints for file and folder operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Busboy from 'busboy';
import * as fileService from '../services/file.service';
import * as folderService from '../services/folder.service';
import * as storageService from '../services/storage.service';
import * as versionService from '../services/version.service';
import * as folderInitService from '../services/folder-init.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import path from 'path';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createFolderSchema = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1).max(config.folder.maxNameLength),
  description: z.string().max(1000).optional(),
  color: z.string().max(50).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(config.folder.maxNameLength).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().max(50).optional(),
});

const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  folderId: z.string().uuid().optional().nullable().transform(v => v ?? undefined),
});

const starFileSchema = z.object({
  isStarred: z.boolean(),
});

const shareFileSchema = z.object({
  isShared: z.boolean(),
  expiry: z.string().datetime().optional(),
});

const fileFiltersSchema = z.object({
  folderId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  tags: z.string().optional().transform(v => v?.split(',').filter(Boolean)),
  search: z.string().max(200).optional(),
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function getTenantContext(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const tenantSlug = req.headers['x-tenant-slug'] as string;
  const userIdHeader = req.headers['x-user-id'] as string;
  const userId = userIdHeader && userIdHeader.length > 0 ? userIdHeader : 'system';
  const userRolesHeader = req.headers['x-user-roles'] as string;
  const userRoles = userRolesHeader ? userRolesHeader.split(',').map(r => r.trim()).filter(Boolean) : [];

  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }

  return { tenantId, tenantSlug, userId, userRoles };
}

// Roles that can see all document folders (Company Master, all Employee Documents, On-Boarding)
const PRIVILEGED_ROLES = ['tenant_admin', 'hr_manager', 'owner', 'super_admin'];

function isPrivilegedUser(roles: string[]): boolean {
  return roles.some(role => PRIVILEGED_ROLES.includes(role));
}

/**
 * Get the current user's employee info (employeeCode + name) for folder matching
 */
async function getUserEmployeeInfo(prisma: any, userId: string): Promise<{ employeeId: string; employeeCode: string; folderName: string; employeeFolderId: string | null } | null> {
  if (!userId || userId === 'system') return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true },
    });
    
    if (!user?.employeeId) return null;
    
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    
    if (!employee) return null;
    
    const folderName = `${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`;
    
    // Find the employee's folder ID by employee code prefix (more robust than exact name)
    const employeeFolder = await prisma.folder.findFirst({
      where: {
        isDeleted: false,
        path: { startsWith: '/Employee Documents/' },
        name: { startsWith: `${employee.employeeCode} - ` },
      },
      select: { id: true, name: true },
    });
    
    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      folderName: employeeFolder?.name || folderName,
      employeeFolderId: employeeFolder?.id || null,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user employee info for document access');
    return null;
  }
}

/**
 * Check if a file belongs to the current user's employee folder
 * Non-privileged users can only access files in their own Employee Documents folder
 */
async function canAccessFile(prisma: any, fileId: string, userId: string, userRoles: string[]): Promise<boolean> {
  if (isPrivilegedUser(userRoles)) return true;
  
  const employeeInfo = await getUserEmployeeInfo(prisma, userId);
  if (!employeeInfo) return false;
  
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { folderId: true },
  });
  
  if (!file?.folderId) return false;
  
  // Get the folder and check if it's under the user's employee folder
  const folder = await prisma.folder.findUnique({
    where: { id: file.folderId },
    select: { path: true },
  });
  
  if (!folder?.path) return false;
  
  // Check if the file is in the user's employee folder path (match by employee code)
  // Path format: /Employee Documents/EMP001 - John Doe/subfolder
  const pathParts = folder.path.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'Employee Documents') {
    const employeeFolderName = pathParts[1];
    const folderCode = employeeFolderName.split(' - ')[0].trim();
    return folderCode === employeeInfo.employeeCode;
  }
  
  return false;
}

/**
 * Check if a folder belongs to the current user's employee folder
 * Non-privileged users can only access folders in their own Employee Documents folder
 */
async function canAccessFolder(prisma: any, folderId: string, userId: string, userRoles: string[]): Promise<boolean> {
  if (isPrivilegedUser(userRoles)) return true;
  
  const employeeInfo = await getUserEmployeeInfo(prisma, userId);
  if (!employeeInfo) return false;
  
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { name: true, path: true },
  });
  
  if (!folder) return false;
  
  // Allow access to "Employee Documents" root (user sees filtered contents)
  if (folder.name === 'Employee Documents' && folder.path === '/Employee Documents') {
    return true;
  }
  
  // Check if the folder is under the user's employee folder path (match by employee code)
  if (folder.path?.startsWith('/Employee Documents/')) {
    const pathParts = folder.path.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const employeeFolderName = pathParts[1];
      const folderCode = employeeFolderName.split(' - ')[0].trim();
      return folderCode === employeeInfo.employeeCode;
    }
  }
  
  return false;
}

/**
 * Get folder IDs that the non-privileged user can access
 * This returns the employee's folder and all its descendants
 */
async function getUserAccessibleFolderIds(prisma: any, userId: string, userRoles: string[]): Promise<string[]> {
  if (isPrivilegedUser(userRoles)) return []; // Empty means no restriction
  
  const employeeInfo = await getUserEmployeeInfo(prisma, userId);
  if (!employeeInfo?.employeeFolderId) return ['__none__']; // Return impossible ID to filter out everything
  
  // Get the employee folder and all its descendants by employee code prefix
  const folders = await prisma.folder.findMany({
    where: {
      isDeleted: false,
      OR: [
        { id: employeeInfo.employeeFolderId },
        { path: { startsWith: `/Employee Documents/${employeeInfo.employeeCode} - ` } },
      ],
    },
    select: { id: true },
  });
  
  return folders.map((f: any) => f.id);
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// FOLDER ENDPOINTS
// ============================================================================

// Initialize default folder structure
router.post(
  '/folders/initialize',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeDefaultFolderStructure(prisma, userId);
    
    res.status(201).json({ success: true, message: 'Default folder structure initialized' });
  })
);

// Initialize Company Master folders only
router.post(
  '/folders/initialize-company',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeCompanyMasterFolders(prisma, userId);
    
    res.status(201).json({ success: true, message: 'Company Master folders initialized' });
  })
);

// Initialize Employee Documents folders
router.post(
  '/folders/initialize-employees',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeEmployeeDocumentsFolders(prisma, userId);
    
    res.status(201).json({ success: true, message: 'Employee Documents folders initialized' });
  })
);

// Create folders for a specific employee
router.post(
  '/folders/employee/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.createEmployeeFolders(prisma, req.params.employeeId, userId);
    
    res.status(201).json({ success: true, message: 'Employee folders created' });
  })
);

// Create folders for employee directly by employee ID (used by import)
router.post(
  '/folders/employee-direct/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.createFoldersForEmployeeDirectly(prisma, req.params.employeeId, userId);
    
    res.status(201).json({ success: true, message: 'Employee folders created' });
  })
);

// Upload employee profile photo — auto-places it under
// Employee Documents/<employee>/Profile Photo/ folder
router.post(
  '/files/upload-avatar/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    const { employeeId } = req.params;

    // Resolve (or create) the Profile Photo folder for this employee
    const avatarFolderId = await folderInitService.getEmployeeAvatarFolderId(prisma, employeeId, userId);

    let uploadedFile: any = null;
    let uploadError: string | null = null;

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: config.file.maxSizeBytes, files: 1 },
    });

    const filePromise = new Promise<void>((resolve) => {
      let fileProcessing = false;

      busboy.on('file', (_fieldname, file, info) => {
        fileProcessing = true;
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          const content = Buffer.concat(chunks);
          fileService.uploadFile(
            prisma,
            {
              folderId: avatarFolderId || undefined,
              filename,
              content,
              mimeType,
              entityType: 'employee',
              entityId: employeeId,
            },
            userId,
            tenantSlug
          )
            .then((f) => { uploadedFile = f; resolve(); })
            .catch((err) => { uploadError = err.message; resolve(); });
        });
        file.on('error', (err) => { uploadError = err.message; resolve(); });
      });
      // Only resolve on finish if no file was found in the multipart payload
      busboy.on('finish', () => { if (!fileProcessing) resolve(); });
    });

    req.pipe(busboy);
    await filePromise;

    if (uploadError) {
      return res.status(400).json({ success: false, error: uploadError });
    }

    res.status(201).json({
      success: true,
      data: { uploaded: [uploadedFile], errors: [] },
    });
  })
);

// Create folder
router.post(
  '/folders',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const input = createFolderSchema.parse(req.body) as folderService.CreateFolderInput;
    
    const folder = await folderService.createFolder(prisma, input, userId);
    
    res.status(201).json({ success: true, data: folder });
  })
);

// Get folder tree
router.get(
  '/folders/tree',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { userId, userRoles } = getTenantContext(req);
    
    const parentId = req.query.parentId as string | undefined;
    let tree = await folderService.getFolderTree(prisma, parentId);
    
    // Non-privileged users: filter the tree
    if (!isPrivilegedUser(userRoles)) {
      const employeeInfo = await getUserEmployeeInfo(prisma, userId);
      
      // At root level, only show "Employee Documents"
      tree = tree.filter(node => node.name === 'Employee Documents');
      
      // Inside "Employee Documents", only show the user's own employee folder
      if (employeeInfo && tree.length > 0) {
        const empDocsNode = tree[0];
        if (empDocsNode.children && Array.isArray(empDocsNode.children)) {
          empDocsNode.children = empDocsNode.children.filter((child: any) => {
            const folderCode = child.name.split(' - ')[0].trim();
            return folderCode === employeeInfo.employeeCode;
          });
        }
      } else if (tree.length > 0) {
        // No employee record — hide all employee folders
        tree[0].children = [];
      }
    }
    
    res.json({ success: true, data: tree });
  })
);

// List root folders
router.get(
  '/folders/root',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { userId, userRoles } = getTenantContext(req);
    
    let folders = await folderService.listRootFolders(prisma);
    
    // Non-privileged users only see "Employee Documents" root folder
    if (!isPrivilegedUser(userRoles)) {
      folders = folders.filter(f => f.name === 'Employee Documents');
    }
    
    res.json({ success: true, data: folders });
  })
);

// Get root folder contents - MUST BE BEFORE /folders/:id/contents to prevent route conflict!
router.get(
  '/folders/root/contents',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { userId, userRoles } = getTenantContext(req);
    
    if (!prisma) {
      console.error('[/folders/root/contents] ERROR: No Prisma client attached to request!');
      return res.status(500).json({ success: false, error: 'Database connection not available' });
    }
    
    const contents = await folderService.listFolderContents(prisma, null);
    
    // Non-privileged users: only show "Employee Documents" at root level
    if (!isPrivilegedUser(userRoles)) {
      contents.folders = contents.folders.filter(f => f.name === 'Employee Documents');
      contents.files = []; // No files at root for non-privileged users
    }
    
    res.json({ success: true, data: contents });
  })
);

// Get folder by ID
router.get(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { userId, userRoles } = getTenantContext(req);
    
    const folder = await folderService.getFolderById(prisma, req.params.id);
    
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    
    // Non-privileged users: block access to restricted folders
    if (!isPrivilegedUser(userRoles)) {
      const restrictedRoots = ['Company Master', 'Company Documents', 'On-Boarding'];
      
      // Block restricted root folders
      if (restrictedRoots.includes(folder.name) && !folder.parentId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      // Block folders under restricted roots
      if (folder.path) {
        const isUnderRestricted = restrictedRoots.some((root: string) => 
          folder.path.startsWith(`/${root}/`) || folder.path === `/${root}`
        );
        if (isUnderRestricted) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
      
      // If under Employee Documents, verify it belongs to the user
      if (folder.path?.includes('/Employee Documents/')) {
        const employeeInfo = await getUserEmployeeInfo(prisma, userId);
        if (employeeInfo) {
          const pathParts = folder.path.split('/').filter(Boolean);
          const empDocsIdx = pathParts.indexOf('Employee Documents');
          if (empDocsIdx >= 0 && empDocsIdx + 1 < pathParts.length) {
            const employeeFolderName = pathParts[empDocsIdx + 1];
            const folderCode = employeeFolderName.split(' - ')[0].trim();
            if (folderCode !== employeeInfo.employeeCode) {
              return res.status(403).json({ success: false, error: 'Access denied' });
            }
          }
        } else {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
    }
    
    res.json({ success: true, data: folder });
  })
);

// Get folder contents
router.get(
  '/folders/:id/contents',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const folderId = req.params.id;
    const { userId, userRoles } = getTenantContext(req);
    
    // For non-privileged users, check folder access
    if (!isPrivilegedUser(userRoles)) {
      // Get the folder being accessed and its ancestry
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true, name: true, parentId: true, path: true },
      });
      
      if (!folder) {
        return res.status(404).json({ success: false, error: 'Folder not found' });
      }
      
      // Block access to Company Master and On-Boarding root folders and their children
      const restrictedRoots = ['Company Master', 'Company Documents', 'On-Boarding'];
      if (restrictedRoots.includes(folder.name) && !folder.parentId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      // Check if the folder is nested under a restricted root
      if (folder.path) {
        const isUnderRestricted = restrictedRoots.some(root => 
          folder.path!.startsWith(`/${root}/`) || folder.path === `/${root}`
        );
        if (isUnderRestricted) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
      
      // If navigating into "Employee Documents", filter to only show the user's own folder
      if (folder.name === 'Employee Documents' && !folder.parentId) {
        const employeeInfo = await getUserEmployeeInfo(prisma, userId);
        const contents = await folderService.listFolderContents(prisma, folderId);
        
        if (employeeInfo) {
          // Only show the folder matching the current user's employee code
          contents.folders = contents.folders.filter(f => {
            const folderCode = f.name.split(' - ')[0].trim();
            return folderCode === employeeInfo.employeeCode;
          });
        } else {
          // No employee record found — show no folders
          contents.folders = [];
        }
        contents.files = [];
        
        return res.json({ success: true, data: contents });
      }
      
      // If inside an employee subfolder, verify it belongs to the current user
      if (folder.path?.includes('/Employee Documents/')) {
        const employeeInfo = await getUserEmployeeInfo(prisma, userId);
        if (employeeInfo) {
          // Extract employee code from the first subfolder after "Employee Documents"
          const pathParts = folder.path.split('/').filter(Boolean);
          const empDocsIdx = pathParts.indexOf('Employee Documents');
          if (empDocsIdx >= 0 && empDocsIdx + 1 < pathParts.length) {
            const employeeFolderName = pathParts[empDocsIdx + 1];
            const folderCode = employeeFolderName.split(' - ')[0].trim();
            if (folderCode !== employeeInfo.employeeCode) {
              return res.status(403).json({ success: false, error: 'Access denied' });
            }
          }
        } else {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
      }
    }
    
    const contents = await folderService.listFolderContents(prisma, folderId);
    
    res.json({ success: true, data: contents });
  })
);

// Get folder breadcrumb
router.get(
  '/folders/:id/breadcrumb',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const breadcrumb = await folderService.getBreadcrumb(prisma, req.params.id);
    
    res.json({ success: true, data: breadcrumb });
  })
);

// Update folder
router.patch(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const input = updateFolderSchema.parse(req.body);
    
    const folder = await folderService.updateFolder(prisma, req.params.id, input);
    
    res.json({ success: true, data: folder });
  })
);

// Move folder
router.post(
  '/folders/:id/move',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const { targetParentId } = req.body;
    
    const folder = await folderService.moveFolder(prisma, req.params.id, targetParentId || null);
    
    res.json({ success: true, data: folder });
  })
);

// Delete folder
router.delete(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any folders
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete folders' });
    }
    
    const recursive = req.query.recursive === 'true';
    
    await folderService.deleteFolder(prisma, req.params.id, recursive);
    
    res.json({ success: true, message: 'Folder deleted' });
  })
);

// Restore folder
router.post(
  '/folders/:id/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const folder = await folderService.restoreFolder(prisma, req.params.id);
    
    res.json({ success: true, data: folder });
  })
);

// Permanently delete folder
router.delete(
  '/folders/:id/permanent',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any folders
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete folders' });
    }
    
    await folderService.permanentlyDeleteFolder(prisma, req.params.id);
    
    res.json({ success: true, message: 'Folder permanently deleted' });
  })
);

// ============================================================================
// BULK FOLDER OPERATIONS
// ============================================================================

// Bulk delete folders (soft delete)
router.post(
  '/folders/bulk-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any folders
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete folders' });
    }
    
    const { folderIds, recursive } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'folderIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of folderIds) {
      try {
        await folderService.deleteFolder(prisma, id, recursive ?? true);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        deleted: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Bulk move folders
router.post(
  '/folders/bulk-move',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { folderIds, targetFolderId } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'folderIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of folderIds) {
      try {
        await folderService.moveFolder(prisma, id, targetFolderId || null);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        moved: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Bulk restore folders
router.post(
  '/folders/bulk-restore',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { folderIds } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'folderIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of folderIds) {
      try {
        await folderService.restoreFolder(prisma, id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        restored: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Bulk permanent delete folders
router.post(
  '/folders/bulk-permanent-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any folders
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete folders' });
    }
    
    const { folderIds } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'folderIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of folderIds) {
      try {
        await folderService.permanentlyDeleteFolder(prisma, id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        deleted: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// ============================================================================
// FILE ENDPOINTS
// ============================================================================

// Upload file(s)
router.post(
  '/files/upload',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const uploadedFiles: any[] = [];
    const errors: { filename: string; error: string }[] = [];
    
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: config.file.maxSizeBytes,
        files: config.file.maxFilesPerUpload,
      },
    });
    
    const folderId = req.query.folderId as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    
    const filePromises: Promise<any>[] = [];
    
    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        const content = Buffer.concat(chunks);
        
        const promise = fileService.uploadFile(
          prisma,
          {
            folderId: folderId || undefined,
            filename,
            content,
            mimeType,
            entityType,
            entityId,
          },
          userId,
          tenantSlug
        )
          .then(file => uploadedFiles.push(file))
          .catch(err => errors.push({ filename, error: err.message }));
        
        filePromises.push(promise);
      });
      
      file.on('error', (err) => {
        errors.push({ filename, error: err.message });
      });
    });
    
    busboy.on('finish', async () => {
      await Promise.all(filePromises);
      
      res.status(201).json({
        success: true,
        data: { uploaded: uploadedFiles, errors },
      });
    });
    
    req.pipe(busboy);
  })
);

// List files
router.get(
  '/files',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const filters = fileFiltersSchema.parse(req.query);
    
    const result = await fileService.listFiles(prisma, filters);
    
    res.json({ success: true, ...result });
  })
);

// Get recent files (must be before /files/:id to avoid route conflict)
router.get(
  '/files/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // For non-privileged users, only show files from their own employee folder
    const accessibleFolderIds = await getUserAccessibleFolderIds(prisma, userId, userRoles);
    const hasRestrictions = accessibleFolderIds.length > 0;
    
    const files = await prisma.file.findMany({
      where: {
        isDeleted: false,
        ...(hasRestrictions ? { folderId: { in: accessibleFolderIds } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    
    // Map uploader to uploadedBy for frontend compatibility
    const mappedFiles = files.map((f: any) => ({ ...f, uploadedBy: f.uploader }));
    
    res.json({ success: true, data: mappedFiles });
  })
);

// Get starred files (must be before /files/:id to avoid route conflict)
router.get(
  '/files/starred',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // For non-privileged users, only show starred items from their own employee folder
    const accessibleFolderIds = await getUserAccessibleFolderIds(prisma, userId, userRoles);
    const hasRestrictions = accessibleFolderIds.length > 0;
    
    const [files, folders] = await Promise.all([
      prisma.file.findMany({
        where: {
          isStarred: true,
          isDeleted: false,
          ...(hasRestrictions ? { folderId: { in: accessibleFolderIds } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      prisma.folder.findMany({
        where: {
          isStarred: true,
          isDeleted: false,
          ...(hasRestrictions ? { id: { in: accessibleFolderIds } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { children: true, files: true } },
        },
      }),
    ]);
    
    const mappedFiles = files.map((f: any) => ({ ...f, uploadedBy: f.uploader }));
    const mappedFolders = folders.map((f: any) => ({ 
      ...f, 
      createdBy: f.creator,
      fileCount: f._count?.files || 0,
      subfolderCount: f._count?.children || 0,
    }));
    
    res.json({ success: true, data: { files: mappedFiles, folders: mappedFolders } });
  })
);

// Get file by ID
router.get(
  '/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Check access before returning file
    if (!await canAccessFile(prisma, req.params.id, userId, userRoles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const file = await fileService.getFileById(prisma, req.params.id);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    res.json({ success: true, data: file });
  })
);

// Get file download URL
router.get(
  '/files/:id/download',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Check access before allowing download
    if (!await canAccessFile(prisma, req.params.id, userId, userRoles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const inline = req.query.inline === 'true';
    const url = await fileService.getFileDownloadUrl(prisma, req.params.id, inline);
    
    res.json({ success: true, data: { url } });
  })
);

// Get thumbnail URL
router.get(
  '/files/:id/thumbnail/:size',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Check access before returning thumbnail
    if (!await canAccessFile(prisma, req.params.id, userId, userRoles)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const size = req.params.size as 'small' | 'medium' | 'large';
    const url = await fileService.getThumbnailUrl(prisma, req.params.id, size);
    
    if (!url) {
      return res.status(404).json({ success: false, error: 'Thumbnail not available' });
    }
    
    res.json({ success: true, data: { url } });
  })
);

// Regenerate thumbnails for a file
router.post(
  '/files/:id/regenerate-thumbnails',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const result = await fileService.regenerateThumbnails(prisma, req.params.id, tenantSlug);
    
    res.json({ success: result.success, data: { thumbnails: result.thumbnails } });
  })
);

// Get files that need thumbnail regeneration
router.get(
  '/files-needing-thumbnails',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const files = await fileService.getFilesNeedingThumbnails(prisma, limit);
    
    res.json({ success: true, data: files });
  })
);

// Batch regenerate thumbnails for multiple files
router.post(
  '/regenerate-all-thumbnails',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = (req as any).prisma;
    const limit = parseInt(req.body.limit as string) || 20;
    
    const files = await fileService.getFilesNeedingThumbnails(prisma, limit);
    const results: { id: string; name: string; success: boolean }[] = [];
    
    for (const file of files) {
      try {
        const result = await fileService.regenerateThumbnails(prisma, file.id, tenantSlug);
        results.push({ id: file.id, name: file.name, success: result.success });
      } catch (error: any) {
        results.push({ id: file.id, name: file.name, success: false });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        processed: results.length, 
        successful: successCount,
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Update file
router.patch(
  '/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const input = updateFileSchema.parse(req.body);
    
    const file = await fileService.updateFile(prisma, req.params.id, input);
    
    res.json({ success: true, data: file });
  })
);

// Copy file
router.post(
  '/files/:id/copy',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const { targetFolderId } = req.body;
    
    const file = await fileService.copyFile(
      prisma,
      req.params.id,
      targetFolderId || null,
      userId,
      tenantSlug
    );
    
    res.status(201).json({ success: true, data: file });
  })
);

// Delete file
router.delete(
  '/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any files
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete files' });
    }
    
    const permanent = req.query.permanent === 'true';
    
    if (permanent) {
      await fileService.permanentlyDeleteFile(prisma, req.params.id);
    } else {
      await fileService.deleteFile(prisma, req.params.id);
    }
    
    res.json({ success: true, message: 'File deleted' });
  })
);

// Restore file
router.post(
  '/files/:id/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const file = await fileService.restoreFile(prisma, req.params.id);
    
    res.json({ success: true, data: file });
  })
);

// Permanently delete file
router.delete(
  '/files/:id/permanent',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any files
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete files' });
    }
    
    await fileService.permanentlyDeleteFile(prisma, req.params.id);
    
    res.json({ success: true, message: 'File permanently deleted' });
  })
);

// ============================================================================
// BULK FILE OPERATIONS
// ============================================================================

// Bulk delete files (soft delete)
router.post(
  '/files/bulk-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any files
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete files' });
    }
    
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of fileIds) {
      try {
        await fileService.deleteFile(prisma, id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        deleted: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Bulk move files
router.post(
  '/files/bulk-move',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { fileIds, targetFolderId } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of fileIds) {
      try {
        await fileService.updateFile(prisma, id, { folderId: targetFolderId || null });
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        moved: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Get download URLs for multiple files (for bulk download)
router.post(
  '/files/bulk-download-urls',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds array is required' });
    }
    
    const results: { id: string; name: string; url: string }[] = [];
    
    for (const id of fileIds) {
      try {
        const file = await prisma.file.findUnique({
          where: { id },
          select: { name: true }
        });
        if (file) {
          const url = await fileService.getFileDownloadUrl(prisma, id);
          results.push({ id, name: file.name, url });
        }
      } catch (error) {
        // Skip files that fail
      }
    }
    
    res.json({ success: true, data: results });
  })
);

// Bulk restore files
router.post(
  '/files/bulk-restore',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of fileIds) {
      try {
        await fileService.restoreFile(prisma, id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        restored: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Bulk permanent delete files
router.post(
  '/files/bulk-permanent-delete',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete any files
    if (!isPrivilegedUser(userRoles)) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete files' });
    }
    
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, error: 'fileIds array is required' });
    }
    
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const id of fileIds) {
      try {
        await fileService.permanentlyDeleteFile(prisma, id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      data: { 
        deleted: successCount, 
        failed: results.length - successCount,
        results 
      } 
    });
  })
);

// Get entity files
router.get(
  '/entity/:entityType/:entityId/files',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const files = await fileService.getEntityFiles(
      prisma,
      req.params.entityType,
      req.params.entityId
    );
    
    res.json({ success: true, data: files });
  })
);

// Get folder breadcrumbs
router.get(
  '/folders/:id/breadcrumbs',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const breadcrumbs = await folderService.getBreadcrumb(prisma, req.params.id);
    
    res.json({ success: true, data: breadcrumbs });
  })
);

// ============================================================================
// TRASH
// ============================================================================

// Get trash (deleted files and folders)
router.get(
  '/trash',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    // Non-privileged users cannot delete files, so they won't have trash
    // Return empty trash for them
    if (!isPrivilegedUser(userRoles)) {
      return res.json({ success: true, data: { files: [], folders: [] } });
    }
    
    // Get all deleted folders first
    const allDeletedFolders = await prisma.folder.findMany({
      where: { isDeleted: true },
      select: { id: true, parentId: true },
    });
    
    // Create a set of deleted folder IDs
    const deletedFolderIds = new Set(allDeletedFolders.map((f: any) => f.id));
    
    // Find top-level deleted folders (parent is not deleted OR parent is null)
    const topLevelDeletedFolderIds = allDeletedFolders
      .filter((f: any) => !f.parentId || !deletedFolderIds.has(f.parentId))
      .map((f: any) => f.id);
    
    // Similarly for files - only show files whose folder is not deleted
    // (files in deleted folders are implicitly in trash via their parent)
    const [files, folders] = await Promise.all([
      prisma.file.findMany({
        where: { 
          isDeleted: true,
          // Only show files that are directly deleted, not those in deleted folders
          OR: [
            { folderId: null },
            { folder: { isDeleted: false } },
          ],
        },
        orderBy: { deletedAt: 'desc' },
        include: {
          uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      prisma.folder.findMany({
        where: { 
          id: { in: topLevelDeletedFolderIds },
        },
        orderBy: { deletedAt: 'desc' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { children: true, files: true } },
        },
      }),
    ]);
    
    const mappedFiles = files.map((f: any) => ({ ...f, uploadedBy: f.uploader }));
    const mappedFolders = folders.map((f: any) => ({ 
      ...f, 
      createdBy: f.creator,
      fileCount: f._count?.files || 0,
      subfolderCount: f._count?.children || 0,
    }));
    
    res.json({ success: true, data: { files: mappedFiles, folders: mappedFolders } });
  })
);

// ============================================================================
// STAR & SHARE
// ============================================================================

// Star/unstar file
router.put(
  '/files/:id/star',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const input = starFileSchema.parse(req.body);
    
    const file = await prisma.file.update({
      where: { id: req.params.id },
      data: { isStarred: input.isStarred },
    });
    
    res.json({ success: true, data: file });
  })
);

// Star/unstar folder
router.put(
  '/folders/:id/star',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const input = starFileSchema.parse(req.body); // Same schema works
    
    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data: { isStarred: input.isStarred },
    });
    
    res.json({ success: true, data: folder });
  })
);

// Share/unshare file
router.post(
  '/files/:id/share',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const input = shareFileSchema.parse(req.body);
    
    let shareLink: string | null = null;
    
    if (input.isShared) {
      // Generate unique share link
      shareLink = `${config.baseUrl}/share/${randomUUID()}`;
    }
    
    const file = await prisma.file.update({
      where: { id: req.params.id },
      data: {
        isShared: input.isShared,
        shareLink: shareLink,
        shareExpiry: input.expiry ? new Date(input.expiry) : null,
      },
    });
    
    res.json({ success: true, data: { shareLink: file.shareLink } });
  })
);

// Move file
router.post(
  '/files/:id/move',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const { targetFolderId } = req.body;
    
    const file = await prisma.file.update({
      where: { id: req.params.id },
      data: { folderId: targetFolderId || null },
    });
    
    res.json({ success: true, data: file });
  })
);

// ============================================================================
// FILE VERSIONS
// ============================================================================

// Get file versions
router.get(
  '/files/:id/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    const versions = await versionService.getFileVersions(prisma, req.params.id);
    
    res.json({ success: true, data: versions });
  })
);

// Upload new version
router.post(
  '/files/:id/versions',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    let changeNote: string | undefined;
    const fileId = req.params.id;
    
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: config.file.maxSizeBytes, files: 1 },
    });
    
    const filePromise = new Promise<any>((resolve, reject) => {
      busboy.on('field', (name, value) => {
        if (name === 'changeNote') changeNote = value;
      });
      
      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];
        
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', async () => {
          try {
            const content = Buffer.concat(chunks);
            const version = await versionService.createNewVersion(
              prisma, 
              fileId, 
              { filename, content, mimeType },
              userId,
              tenantSlug,
              changeNote
            );
            resolve(version);
          } catch (err) {
            reject(err);
          }
        });
      });
      
      busboy.on('error', reject);
    });
    
    req.pipe(busboy);
    
    const version = await filePromise;
    res.status(201).json({ success: true, data: version });
  })
);

// Restore file version
router.post(
  '/files/:id/versions/:version/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const versionNum = parseInt(req.params.version, 10);
    const file = await versionService.restoreVersion(prisma, req.params.id, versionNum, userId, tenantSlug);
    
    res.json({ success: true, data: file });
  })
);

// ============================================================================
// ZIP UPLOAD
// ============================================================================

// Upload and extract ZIP file
router.post(
  '/files/upload-zip',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: config.file.maxSizeBytes * 10, files: 1 }, // Allow larger ZIP
    });
    
    let targetFolderId: string | undefined;
    let autoOrganize = false;
    
    const uploadResult = new Promise<any>((resolve, reject) => {
      busboy.on('field', (name, value) => {
        if (name === 'targetFolderId') targetFolderId = value;
        if (name === 'autoOrganize') autoOrganize = value === 'true';
      });
      
      busboy.on('file', async (fieldname, file, info) => {
        const chunks: Buffer[] = [];
        
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', async () => {
          try {
            const zipBuffer = Buffer.concat(chunks);
            const zip = new AdmZip(zipBuffer);
            const entries = zip.getEntries();
            
            const uploadedFiles: any[] = [];
            const createdFolders = new Map<string, string>(); // path -> folderId
            
            // First pass: create folders
            for (const entry of entries) {
              if (entry.isDirectory) {
                const folderPath = entry.entryName.replace(/\/$/, '');
                const pathParts = folderPath.split('/');
                
                let parentId = targetFolderId;
                let currentPath = '';
                
                for (const part of pathParts) {
                  currentPath = currentPath ? `${currentPath}/${part}` : part;
                  
                  if (!createdFolders.has(currentPath)) {
                    const folder = await folderService.createFolder(prisma, {
                      name: part,
                      parentId: parentId,
                    }, userId);
                    createdFolders.set(currentPath, folder.id);
                    parentId = folder.id;
                  } else {
                    parentId = createdFolders.get(currentPath);
                  }
                }
              }
            }
            
            // Second pass: upload files
            for (const entry of entries) {
              if (!entry.isDirectory) {
                const content = entry.getData();
                const fileName = path.basename(entry.entryName);
                const dirPath = path.dirname(entry.entryName);
                
                // Get folder ID for this file
                let folderId = targetFolderId;
                if (autoOrganize && dirPath !== '.') {
                  // Create parent folders if not exist
                  const pathParts = dirPath.split('/');
                  let parentId = targetFolderId;
                  let currentPath = '';
                  
                  for (const part of pathParts) {
                    if (!part) continue;
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    
                    if (!createdFolders.has(currentPath)) {
                      const folder = await folderService.createFolder(prisma, {
                        name: part,
                        parentId: parentId,
                      }, userId);
                      createdFolders.set(currentPath, folder.id);
                      parentId = folder.id;
                    } else {
                      parentId = createdFolders.get(currentPath);
                    }
                  }
                  folderId = parentId;
                }
                
                // Determine mime type from extension
                const ext = path.extname(fileName).toLowerCase();
                const mimeTypes: Record<string, string> = {
                  '.pdf': 'application/pdf',
                  '.doc': 'application/msword',
                  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  '.xls': 'application/vnd.ms-excel',
                  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  '.ppt': 'application/vnd.ms-powerpoint',
                  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.gif': 'image/gif',
                  '.txt': 'text/plain',
                  '.csv': 'text/csv',
                  '.json': 'application/json',
                  '.zip': 'application/zip',
                };
                
                const mimeType = mimeTypes[ext] || 'application/octet-stream';
                
                const file = await fileService.uploadFile(
                  prisma,
                  { folderId, filename: fileName, content, mimeType },
                  userId,
                  tenantSlug
                );
                
                uploadedFiles.push(file);
              }
            }
            
            resolve({ uploaded: uploadedFiles.length, files: uploadedFiles });
          } catch (err) {
            reject(err);
          }
        });
      });
      
      busboy.on('error', reject);
    });
    
    req.pipe(busboy);
    
    const result = await uploadResult;
    res.status(201).json({ success: true, data: result });
  })
);

// ============================================================================
// SEARCH
// ============================================================================

// Search files and folders
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, userRoles } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    const query = (req.query.q as string) || '';
    
    if (query.length < 2) {
      return res.json({ success: true, data: { files: [], folders: [] } });
    }
    
    // For non-privileged users, only search within their own employee folder
    const accessibleFolderIds = await getUserAccessibleFolderIds(prisma, userId, userRoles);
    const hasRestrictions = accessibleFolderIds.length > 0;
    
    const [files, folders] = await Promise.all([
      prisma.file.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          ...(hasRestrictions ? { folderId: { in: accessibleFolderIds } } : {}),
        },
        take: 50,
        orderBy: { updatedAt: 'desc' },
        include: {
          uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      prisma.folder.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
          isDeleted: false,
          ...(hasRestrictions ? { id: { in: accessibleFolderIds } } : {}),
        },
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);
    
    const mappedFiles = files.map(f => ({ ...f, uploadedBy: f.uploader }));
    const mappedFolders = folders.map(f => ({ ...f, createdBy: f.creator }));
    
    res.json({ success: true, data: { files: mappedFiles, folders: mappedFolders } });
  })
);

// ============================================================================
// FOLDER INITIALIZATION
// ============================================================================

// Initialize complete default folder structure
router.post(
  '/folders/initialize',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeDefaultFolderStructure(prisma, userId);
    
    res.json({ success: true, message: 'Default folder structure initialized' });
  })
);

// Initialize Company Master folders only
router.post(
  '/folders/initialize-company',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeCompanyMasterFolders(prisma, userId);
    
    res.json({ success: true, message: 'Company Master folders initialized' });
  })
);

// Initialize Employee Documents folders
router.post(
  '/folders/initialize-employees',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    
    await folderInitService.initializeEmployeeDocumentsFolders(prisma, userId);
    
    res.json({ success: true, message: 'Employee Documents folders initialized' });
  })
);

// Create folders for a specific employee
router.post(
  '/folders/employee/:employeeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getTenantContext(req);
    const prisma = (req as any).prisma;
    const { employeeId } = req.params;
    
    await folderInitService.createEmployeeFolders(prisma, employeeId, userId);
    
    res.json({ success: true, message: `Folders created for employee ${employeeId}` });
  })
);

// ============================================================================
// STORAGE STATS
// ============================================================================
router.get(
  '/storage/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantSlug = (req.headers['x-tenant-slug'] as string) || '';
    
    const usage = await storageService.getTenantStorageUsage(tenantSlug);
    
    res.json({ success: true, data: usage });
  })
);

// Get storage stats with breakdown
router.get(
  '/storage/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma;
    
    // Get total used storage
    const totalUsed = await prisma.file.aggregate({
      where: { isDeleted: false },
      _sum: { size: true },
    });
    
    // Get storage by type
    const byType = await prisma.file.groupBy({
      by: ['mimeType'],
      where: { isDeleted: false },
      _sum: { size: true },
      _count: true,
    });
    
    const storageLimit = config.storage?.tenantLimitBytes || 10 * 1024 * 1024 * 1024; // 10GB default
    const used = totalUsed._sum.size || 0;
    
    res.json({
      success: true,
      data: {
        used,
        limit: storageLimit,
        usedPercent: Math.round((used / storageLimit) * 100),
        byType: byType.map(t => ({
          mimeType: t.mimeType,
          size: t._sum.size || 0,
          count: t._count,
        })),
      },
    });
  })
);

export default router;
