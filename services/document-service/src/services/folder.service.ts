/**
 * Folder Service - Folder management for documents
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateFolderInput {
  parentId?: string;
  name: string;
  description?: string;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string;
}

export interface FolderTree {
  id: string;
  name: string;
  path: string;
  children: FolderTree[];
  fileCount: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildPath(parentPath: string | null, name: string): string {
  return parentPath ? `${parentPath}/${name}` : `/${name}`;
}

async function updateChildPaths(
  prisma: PrismaClient,
  folderId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true, name: true, path: true },
  });
  
  for (const child of children) {
    const childNewPath = child.path.replace(oldPath, newPath);
    await prisma.folder.update({
      where: { id: child.id },
      data: { path: childNewPath },
    });
    await updateChildPaths(prisma, child.id, child.path, childNewPath);
  }
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * Create a folder
 */
export async function createFolder(
  prisma: PrismaClient,
  input: CreateFolderInput,
  userId: string
): Promise<any> {
  const id = uuidv4();
  
  // Validate name
  if (input.name.length > config.folder.maxNameLength) {
    throw new Error(`Folder name exceeds maximum length of ${config.folder.maxNameLength}`);
  }
  
  if (input.name.includes('/') || input.name.includes('\\')) {
    throw new Error('Folder name cannot contain / or \\');
  }
  
  let parentPath = '';
  let depth = 0;
  
  if (input.parentId) {
    const parent = await prisma.folder.findUnique({
      where: { id: input.parentId },
      select: { path: true, depth: true },
    });
    
    if (!parent) {
      throw new Error('Parent folder not found');
    }
    
    parentPath = parent.path;
    depth = parent.depth + 1;
    
    if (depth >= config.folder.maxDepth) {
      throw new Error(`Maximum folder depth of ${config.folder.maxDepth} reached`);
    }
  }
  
  const path = buildPath(parentPath, input.name);
  
  // Check for duplicate name in same parent
  const existing = await prisma.folder.findFirst({
    where: { parentId: input.parentId || null, name: input.name, isDeleted: false },
  });
  
  if (existing) {
    throw new Error('A folder with this name already exists in this location');
  }
  
  const folder = await prisma.folder.create({
    data: {
      id,
      parentId: input.parentId,
      name: input.name,
      path,
      depth,
      description: input.description,
      createdBy: userId,
    },
  });
  
  logger.info({ folderId: id, name: input.name, path }, 'Folder created');
  
  return folder;
}

/**
 * Get folder by ID
 */
export async function getFolderById(
  prisma: PrismaClient,
  id: string
): Promise<any | null> {
  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, path: true } },
      _count: { select: { children: true, files: true } },
    },
  });
  
  if (!folder) return null;
  
  return {
    ...folder,
    childCount: folder._count.children,
    fileCount: folder._count.files,
  };
}

/**
 * Get folder by path
 */
export async function getFolderByPath(
  prisma: PrismaClient,
  path: string
): Promise<any | null> {
  return prisma.folder.findFirst({
    where: { path, isDeleted: false },
    include: {
      parent: { select: { id: true, name: true, path: true } },
    },
  });
}

/**
 * Update folder
 */
export async function updateFolder(
  prisma: PrismaClient,
  id: string,
  input: UpdateFolderInput
): Promise<any> {
  const existing = await prisma.folder.findUnique({
    where: { id },
    select: { name: true, path: true, parentId: true },
  });
  
  if (!existing) {
    throw new Error('Folder not found');
  }
  
  const data: any = { updatedAt: new Date() };
  
  if (input.name && input.name !== existing.name) {
    // Validate new name
    if (input.name.length > config.folder.maxNameLength) {
      throw new Error(`Folder name exceeds maximum length of ${config.folder.maxNameLength}`);
    }
    
    // Check for duplicate
    const duplicate = await prisma.folder.findFirst({
      where: {
        parentId: existing.parentId,
        name: input.name,
        isDeleted: false,
        id: { not: id },
      },
    });
    
    if (duplicate) {
      throw new Error('A folder with this name already exists in this location');
    }
    
    data.name = input.name;
    
    // Update path
    const parentPath = existing.path.split('/').slice(0, -1).join('/');
    const newPath = buildPath(parentPath || null, input.name);
    data.path = newPath;
    
    // Update child paths
    await updateChildPaths(prisma, id, existing.path, newPath);
  }
  
  if (input.description !== undefined) {
    data.description = input.description;
  }
  
  return prisma.folder.update({ where: { id }, data });
}

/**
 * Move folder
 */
export async function moveFolder(
  prisma: PrismaClient,
  id: string,
  targetParentId: string | null
): Promise<any> {
  const folder = await prisma.folder.findUnique({
    where: { id },
    select: { name: true, path: true, depth: true, parentId: true },
  });
  
  if (!folder) {
    throw new Error('Folder not found');
  }
  
  if (folder.parentId === targetParentId) {
    return prisma.folder.findUnique({ where: { id } });
  }
  
  let newParentPath = '';
  let newDepth = 0;
  
  if (targetParentId) {
    // Prevent moving into self or children
    const targetParent = await prisma.folder.findUnique({
      where: { id: targetParentId },
      select: { path: true, depth: true },
    });
    
    if (!targetParent) {
      throw new Error('Target folder not found');
    }
    
    if (targetParent.path.startsWith(folder.path)) {
      throw new Error('Cannot move folder into its own subfolder');
    }
    
    newParentPath = targetParent.path;
    newDepth = targetParent.depth + 1;
    
    // Check max depth including children
    const maxChildDepth = await getMaxChildDepth(prisma, id);
    if (newDepth + maxChildDepth >= config.folder.maxDepth) {
      throw new Error(`Move would exceed maximum folder depth of ${config.folder.maxDepth}`);
    }
  }
  
  // Check for duplicate name in target
  const duplicate = await prisma.folder.findFirst({
    where: {
      parentId: targetParentId,
      name: folder.name,
      isDeleted: false,
      id: { not: id },
    },
  });
  
  if (duplicate) {
    throw new Error('A folder with this name already exists in the target location');
  }
  
  const oldPath = folder.path;
  const newPath = buildPath(newParentPath, folder.name);
  
  // Update folder
  const updated = await prisma.folder.update({
    where: { id },
    data: {
      parentId: targetParentId,
      path: newPath,
      depth: newDepth,
      updatedAt: new Date(),
    },
  });
  
  // Update child paths
  await updateChildPaths(prisma, id, oldPath, newPath);
  
  logger.info({ folderId: id, from: oldPath, to: newPath }, 'Folder moved');
  
  return updated;
}

async function getMaxChildDepth(prisma: PrismaClient, folderId: string): Promise<number> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  
  if (children.length === 0) return 0;
  
  let maxDepth = 1;
  for (const child of children) {
    const childDepth = await getMaxChildDepth(prisma, child.id);
    maxDepth = Math.max(maxDepth, 1 + childDepth);
  }
  
  return maxDepth;
}

/**
 * Delete folder (soft delete)
 */
export async function deleteFolder(
  prisma: PrismaClient,
  id: string,
  recursive: boolean = false
): Promise<void> {
  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { _count: { select: { children: true, files: true } } },
  });
  
  if (!folder) {
    throw new Error('Folder not found');
  }
  
  if (!recursive && (folder._count.children > 0 || folder._count.files > 0)) {
    throw new Error('Folder is not empty. Use recursive delete to delete with contents.');
  }
  
  if (recursive) {
    // Recursively soft delete children
    await softDeleteRecursive(prisma, id);
  }
  
  await prisma.folder.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  
  logger.info({ folderId: id, recursive }, 'Folder deleted');
}

async function softDeleteRecursive(prisma: PrismaClient, folderId: string): Promise<void> {
  // Delete child folders
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  
  for (const child of children) {
    await softDeleteRecursive(prisma, child.id);
    await prisma.folder.update({
      where: { id: child.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
  
  // Delete files in folder
  await prisma.file.updateMany({
    where: { folderId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

/**
 * List root folders
 */
export async function listRootFolders(
  prisma: PrismaClient
): Promise<any[]> {
  return prisma.folder.findMany({
    where: { parentId: null, isDeleted: false },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { children: true, files: true } },
    },
  });
}

/**
 * List folder contents
 */
export async function listFolderContents(
  prisma: PrismaClient,
  folderId: string
): Promise<{ folders: any[]; files: any[] }> {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { parentId: folderId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: { _count: { select: { children: true, files: true } } },
    }),
    prisma.file.findMany({
      where: { folderId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  
  return { folders, files };
}

/**
 * Get folder tree
 */
export async function getFolderTree(
  prisma: PrismaClient,
  parentId?: string
): Promise<FolderTree[]> {
  const folders = await prisma.folder.findMany({
    where: { parentId: parentId || null, isDeleted: false },
    orderBy: { name: 'asc' },
    include: { _count: { select: { files: true } } },
  });
  
  const tree: FolderTree[] = [];
  
  for (const folder of folders) {
    const children = await getFolderTree(prisma, folder.id);
    tree.push({
      id: folder.id,
      name: folder.name,
      path: folder.path,
      children,
      fileCount: folder._count.files,
    });
  }
  
  return tree;
}

/**
 * Get breadcrumb path
 */
export async function getBreadcrumb(
  prisma: PrismaClient,
  folderId: string
): Promise<{ id: string; name: string }[]> {
  const breadcrumb: { id: string; name: string }[] = [];
  
  let currentId: string | null = folderId;
  
  while (currentId) {
    const folder: { id: string; name: string; parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    });
    
    if (!folder) break;
    
    breadcrumb.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  
  return breadcrumb;
}
