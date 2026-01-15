/**
 * Document Routes - API endpoints for file and folder operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Busboy from 'busboy';
import { getTenantPrisma } from '@oms/tenant-db-manager';
import * as fileService from '../services/file.service';
import * as folderService from '../services/folder.service';
import * as storageService from '../services/storage.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createFolderSchema = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1).max(config.folder.maxNameLength),
  description: z.string().max(1000).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(config.folder.maxNameLength).optional(),
  description: z.string().max(1000).optional(),
});

const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  folderId: z.string().uuid().optional().nullable().transform(v => v ?? undefined),
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
  const userId = req.headers['x-user-id'] as string;
  
  if (!tenantId || !tenantSlug) {
    throw new Error('Tenant context not found');
  }
  
  return { tenantId, tenantSlug, userId };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// FOLDER ENDPOINTS
// ============================================================================

// Create folder
router.post(
  '/folders',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, userId } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = createFolderSchema.parse(req.body) as folderService.CreateFolderInput;
    
    const folder = await folderService.createFolder(prisma, input, userId);
    
    res.status(201).json({ success: true, data: folder });
  })
);

// Get folder tree
router.get(
  '/folders/tree',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const parentId = req.query.parentId as string | undefined;
    const tree = await folderService.getFolderTree(prisma, parentId);
    
    res.json({ success: true, data: tree });
  })
);

// List root folders
router.get(
  '/folders/root',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const folders = await folderService.listRootFolders(prisma);
    
    res.json({ success: true, data: folders });
  })
);

// Get folder by ID
router.get(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const folder = await folderService.getFolderById(prisma, req.params.id);
    
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    
    res.json({ success: true, data: folder });
  })
);

// Get folder contents
router.get(
  '/folders/:id/contents',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const contents = await folderService.listFolderContents(prisma, req.params.id);
    
    res.json({ success: true, data: contents });
  })
);

// Get folder breadcrumb
router.get(
  '/folders/:id/breadcrumb',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const breadcrumb = await folderService.getBreadcrumb(prisma, req.params.id);
    
    res.json({ success: true, data: breadcrumb });
  })
);

// Update folder
router.patch(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const input = updateFolderSchema.parse(req.body);
    
    const folder = await folderService.updateFolder(prisma, req.params.id, input);
    
    res.json({ success: true, data: folder });
  })
);

// Move folder
router.post(
  '/folders/:id/move',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const { targetParentId } = req.body;
    
    const folder = await folderService.moveFolder(prisma, req.params.id, targetParentId || null);
    
    res.json({ success: true, data: folder });
  })
);

// Delete folder
router.delete(
  '/folders/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const recursive = req.query.recursive === 'true';
    
    await folderService.deleteFolder(prisma, req.params.id, recursive);
    
    res.json({ success: true, message: 'Folder deleted' });
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
    const prisma = getTenantPrisma();
    
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
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const filters = fileFiltersSchema.parse(req.query);
    
    const result = await fileService.listFiles(prisma, filters);
    
    res.json({ success: true, ...result });
  })
);

// Get file by ID
router.get(
  '/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
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
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const inline = req.query.inline === 'true';
    const url = await fileService.getFileDownloadUrl(prisma, req.params.id, inline);
    
    res.json({ success: true, data: { url } });
  })
);

// Get thumbnail URL
router.get(
  '/files/:id/thumbnail/:size',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const size = req.params.size as 'small' | 'medium' | 'large';
    const url = await fileService.getThumbnailUrl(prisma, req.params.id, size);
    
    if (!url) {
      return res.status(404).json({ success: false, error: 'Thumbnail not available' });
    }
    
    res.json({ success: true, data: { url } });
  })
);

// Update file
router.patch(
  '/files/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
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
    const prisma = getTenantPrisma();
    
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
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
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
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const file = await fileService.restoreFile(prisma, req.params.id);
    
    res.json({ success: true, data: file });
  })
);

// Get entity files
router.get(
  '/entity/:entityType/:entityId/files',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    const prisma = getTenantPrisma();
    
    const files = await fileService.getEntityFiles(
      prisma,
      req.params.entityType,
      req.params.entityId
    );
    
    res.json({ success: true, data: files });
  })
);

// Get storage usage
router.get(
  '/storage/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug } = getTenantContext(req);
    
    const usage = await storageService.getTenantStorageUsage(tenantSlug);
    
    res.json({ success: true, data: usage });
  })
);

export default router;
