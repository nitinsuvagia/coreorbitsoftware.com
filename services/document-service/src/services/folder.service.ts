/**
 * Folder Service - Folder management for documents
 */

import { PrismaClient } from '.prisma/tenant-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config';
import * as storageService from './storage.service';

// ============================================================================
// PROTECTED FOLDER CONSTANTS
// ============================================================================

// Root folders that are protected
const PROTECTED_ROOT_FOLDERS = ['Company Master', 'Employee Documents', 'On-Boarding'];

// Default subfolder names under Company Master
const COMPANY_MASTER_SUBFOLDERS = [
  'Policies',
  'Forms',
  'Templates',
  'Certifications',
  'Legal Documents',
  'Training Materials',
  'Company Assets',
];

// Default subfolder names under Employee folders
const EMPLOYEE_DOCUMENT_SUBFOLDERS = [
  'Personal Documents',
  'Joining Documents',
  'Payroll',
  'Performance Reviews',
  'Training Certificates',
  'Leave & Attendance',
  'Exit Documents',
];

/**
 * Check if a folder is a protected default folder
 */
export function isProtectedFolder(folder: { name: string; path?: string | null }): boolean {
  const folderName = folder.name;
  
  // Root folders are protected
  if (PROTECTED_ROOT_FOLDERS.includes(folderName)) {
    return true;
  }
  
  // Default subfolders under Company Master
  if (COMPANY_MASTER_SUBFOLDERS.includes(folderName)) {
    return true;
  }
  
  // Default subfolders under Employee folders
  if (EMPLOYEE_DOCUMENT_SUBFOLDERS.includes(folderName)) {
    return true;
  }
  
  // Employee folders (path contains /Employee Documents/ and folder name matches employee code pattern)
  if (folder.path?.includes('/Employee Documents/') && /^[A-Z]{2,5}\d{3,5}\s*-\s*.+$/.test(folderName)) {
    return true;
  }
  
  return false;
}

// ============================================================================
// TYPES
// ============================================================================

export interface CreateFolderInput {
  parentId?: string;
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string;
  color?: string;
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
    where: { parentId: input.parentId || null, name: input.name },
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
      color: input.color,
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
    where: { path },
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
  
  // Check if folder is protected and trying to rename
  if (input.name && input.name !== existing.name && isProtectedFolder(existing)) {
    throw new Error(`PROTECTED_FOLDER: The folder "${existing.name}" is a system default folder and cannot be renamed.`);
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
  
  if (input.color !== undefined) {
    data.color = input.color;
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
  
  // Check if folder is protected
  if (isProtectedFolder(folder)) {
    throw new Error(`PROTECTED_FOLDER: The folder "${folder.name}" is a system default folder and cannot be moved.`);
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
  
  // Check if folder is protected
  if (isProtectedFolder(folder)) {
    throw new Error(`PROTECTED_FOLDER: The folder "${folder.name}" is a system default folder and cannot be deleted.`);
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

/**
 * Restore deleted folder
 */
export async function restoreFolder(
  prisma: PrismaClient,
  id: string
): Promise<any> {
  return prisma.folder.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
}

/**
 * Permanently delete folder
 */
export async function permanentlyDeleteFolder(
  prisma: PrismaClient,
  id: string
): Promise<void> {
  // Check if folder is protected
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (folder && isProtectedFolder(folder)) {
    throw new Error(`PROTECTED_FOLDER: The folder "${folder.name}" is a system default folder and cannot be permanently deleted.`);
  }
  
  // First delete all files in the folder permanently (including versions)
  const files = await prisma.file.findMany({
    where: { folderId: id },
    select: { 
      id: true, 
      storageKey: true, 
      thumbnails: true,
      versions: {
        select: { storageKey: true }
      }
    },
  });
  
  // Import storage service
  const storageService = await import('./storage.service');
  
  for (const file of files) {
    const keysToDelete: string[] = [];
    
    // Main file
    if (file.storageKey) {
      keysToDelete.push(file.storageKey);
    }
    
    // Thumbnails
    const thumbnails = file.thumbnails as Record<string, string> | null;
    if (thumbnails) {
      for (const key of Object.values(thumbnails)) {
        if (key) keysToDelete.push(key);
      }
    }
    
    // File versions
    for (const version of file.versions) {
      if (version.storageKey) {
        keysToDelete.push(version.storageKey);
      }
    }
    
    if (keysToDelete.length > 0) {
      await storageService.deleteFiles(keysToDelete);
    }
    await prisma.file.delete({ where: { id: file.id } });
  }
  
  // Delete child folders recursively
  const children = await prisma.folder.findMany({
    where: { parentId: id },
    select: { id: true },
  });
  
  for (const child of children) {
    await permanentlyDeleteFolder(prisma, child.id);
  }
  
  // Delete the folder itself
  await prisma.folder.delete({ where: { id } });
  
  logger.info({ folderId: id }, 'Folder permanently deleted');
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
  folderId: string | null
): Promise<{ folders: any[]; files: any[] }> {
  // Check if the parent folder is "Employee Documents"
  let isEmployeeDocumentsFolder = false;
  if (folderId) {
    const parentFolder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { name: true },
    });
    isEmployeeDocumentsFolder = parentFolder?.name === 'Employee Documents';
  }
  
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { parentId: folderId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: { 
        _count: { select: { children: true, files: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.file.findMany({
      where: { folderId: folderId, isDeleted: false },
      orderBy: { name: 'asc' },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    }),
  ]);
  
  // If parent is "Employee Documents", fetch employee info for each folder
  let employeeMap: Map<string, { id: string; firstName: string; lastName: string; avatar?: string }> = new Map();
  
  if (isEmployeeDocumentsFolder) {
    // Extract employee codes from folder names (format: "SQT001 - John Doe")
    const employeeCodes = folders
      .map(f => f.name.split(' - ')[0])
      .filter(code => code);
    
    if (employeeCodes.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { employeeCode: { in: employeeCodes } },
        select: { id: true, employeeCode: true, firstName: true, lastName: true, avatar: true },
      });
      
      employees.forEach(emp => {
        employeeMap.set(emp.employeeCode, {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          avatar: emp.avatar || undefined,
        });
      });
    }
  }
  
  // Transform folders to include counts and map relation names for frontend
  const foldersWithCounts = folders.map(f => {
    const employeeCode = f.name.split(' - ')[0];
    const employee = isEmployeeDocumentsFolder ? employeeMap.get(employeeCode) : undefined;
    
    return {
      ...f,
      createdBy: f.creator,
      fileCount: f._count.files,
      subfolderCount: f._count.children,
      employee,
    };
  });
  
  // Map uploader to uploadedBy for frontend and convert thumbnail keys to URLs
  const mappedFiles = await Promise.all(files.map(async (f) => {
    const thumbnailKeys = f.thumbnails as Record<string, string> | null;
    let thumbnailUrls: Record<string, string> = {};
    
    if (thumbnailKeys) {
      const sizes = ['small', 'medium', 'large'] as const;
      for (const size of sizes) {
        if (thumbnailKeys[size]) {
          try {
            thumbnailUrls[size] = await storageService.getDownloadUrl({ key: thumbnailKeys[size] });
          } catch (error) {
            // Skip if thumbnail URL generation fails
          }
        }
      }
    }
    
    return {
      ...f,
      uploadedBy: f.uploader,
      thumbnails: Object.keys(thumbnailUrls).length > 0 ? thumbnailUrls : undefined,
    };
  }));
  
  return { folders: foldersWithCounts, files: mappedFiles };
}

/**
 * Get folder tree
 */
export async function getFolderTree(
  prisma: PrismaClient,
  parentId?: string,
  parentName?: string
): Promise<any[]> {
  const folders = await prisma.folder.findMany({
    where: { parentId: parentId || null, isDeleted: false },
    orderBy: { name: 'asc' },
    include: { 
      _count: { select: { files: true, children: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
      parent: { select: { id: true, name: true } },
    },
  });
  
  const tree: any[] = [];
  
  // If parent is "Employee Documents", fetch employee info for each folder
  const isEmployeeDocumentsParent = parentName === 'Employee Documents';
  let employeeMap: Map<string, { id: string; firstName: string; lastName: string; avatar?: string }> = new Map();
  
  if (isEmployeeDocumentsParent) {
    // Extract employee codes from folder names (format: "SQT001 - John Doe")
    const employeeCodes = folders
      .map(f => f.name.split(' - ')[0])
      .filter(code => code);
    
    if (employeeCodes.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { employeeCode: { in: employeeCodes } },
        select: { id: true, employeeCode: true, firstName: true, lastName: true, avatar: true },
      });
      
      employees.forEach(emp => {
        employeeMap.set(emp.employeeCode, {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          avatar: emp.avatar || undefined,
        });
      });
    }
  }
  
  for (const folder of folders) {
    const children = await getFolderTree(prisma, folder.id, folder.name);
    
    // Check if this folder represents an employee
    let employee = undefined;
    if (isEmployeeDocumentsParent) {
      const employeeCode = folder.name.split(' - ')[0];
      employee = employeeMap.get(employeeCode);
    }
    
    tree.push({
      id: folder.id,
      name: folder.name,
      path: folder.path,
      color: folder.color,
      children,
      fileCount: folder._count.files,
      subfolderCount: folder._count.children,
      createdBy: folder.creator,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      employee,
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
