'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useFolderContents,
  useFolderBreadcrumbs,
  useFolderTree,
  useCreateFolder,
  useUploadFile,
  useUploadZip,
  useDeleteFile,
  useDeleteFolder,
  useRenameFile,
  useRenameFolder,
  useUpdateFolderColor,
  useMoveFile,
  useMoveFolder,
  useStarFile,
  useStarFolder,
  useShareFile,
  useFileVersions,
  useUploadNewVersion,
  useRestoreVersion,
  useStorageStats,
  useRecentFiles,
  useStarredFiles,
  useTrashFiles,
  useSearchDocuments,
  useInitializeFolders,
  useRestoreFile,
  useRestoreFolder,
  usePermanentDeleteFile,
  usePermanentDeleteFolder,
  useBulkDeleteFiles,
  useBulkMoveFiles,
  useBulkDownloadUrls,
  useBulkDeleteFolders,
  useBulkMoveFolders,
  useBulkRestoreFiles,
  useBulkPermanentDeleteFiles,
  useBulkRestoreFolders,
  useBulkPermanentDeleteFolders,
  useFileDownloadUrl,
  File as DocFile,
  Folder,
  FileVersion,
} from '@/hooks/use-documents';
import { get } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatBytes, cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { UserAvatar } from '@/components/user-avatar';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { formatDistanceToNow, format, isValid } from 'date-fns';

// Safe date parsing helpers
function safeParseDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isValid(date) ? date : null;
}

function safeFormatDistanceToNow(dateValue: string | Date | null | undefined): string {
  const date = safeParseDate(dateValue);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown';
}

function safeFormat(dateValue: string | Date | null | undefined, formatStr: string): string {
  const date = safeParseDate(dateValue);
  return date ? format(date, formatStr) : 'Unknown';
}

import {
  FolderPlus,
  Upload,
  Search,
  MoreVertical,
  Folder as FolderIcon,
  File as FileIcon,
  FileText,
  ChevronRight,
  ChevronDown,
  Home,
  Download,
  Trash2,
  Star,
  StarOff,
  Clock,
  Share2,
  Eye,
  FileArchive,
  FileCode,
  Presentation,
  Image as ImageIcon,
  Music,
  Video,
  UploadCloud,
  Plus,
  X,
  Check,
  Copy,
  Link2,
  History,
  RotateCcw,
  Move,
  HardDrive,
  FolderOpen,
  ChevronLeft,
  Pencil,
  RefreshCw,
  FileSpreadsheet,
  Palette,
  Lock,
  LayoutGrid,
  LayoutList,
  SortAsc,
  SortDesc,
  FileUp,
  Users,
  Info,
  Building2,
  FolderCog,
} from 'lucide-react';

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const FOLDER_COLORS = [
  { name: 'Default', value: null, class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
  { name: 'Red', value: 'red', class: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' },
  { name: 'Green', value: 'green', class: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' },
];

function getFolderColorClass(color?: string | null) {
  return FOLDER_COLORS.find(c => c.value === color)?.class || FOLDER_COLORS[0].class;
}

// Check if folder is Company Master
function isCompanyMasterFolder(folderName: string): boolean {
  return folderName === 'Company Master';
}

// Check if folder is Employee Documents
function isEmployeeDocumentsFolder(folderName: string): boolean {
  return folderName === 'Employee Documents';
}

// Check if folder is a system subfolder (under Company Master or Employee folders)
function isSystemSubfolder(folderName: string): boolean {
  return COMPANY_MASTER_SUBFOLDERS.includes(folderName) || EMPLOYEE_DOCUMENT_SUBFOLDERS.includes(folderName);
}

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

// Check if a folder is a protected default folder that cannot be moved, deleted, or renamed
function isProtectedDefaultFolder(folder: { name: string; employee?: any; path?: string }): boolean {
  const folderName = folder.name;
  
  // Root folders are protected
  if (isCompanyMasterFolder(folderName) || isEmployeeDocumentsFolder(folderName)) {
    return true;
  }
  
  // Employee folders (folders with employee data) are protected
  if (folder.employee) {
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
  
  return false;
}

function getFileTypeInfo(mimeType: string, fileName?: string) {
  if (mimeType.startsWith('image/')) return { icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30', label: 'Image' };
  if (mimeType.startsWith('video/')) return { icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', label: 'Video' };
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', label: 'Audio' };
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: 'PDF' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || fileName?.match(/\.xlsx?$/)) 
    return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', label: 'Excel' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || fileName?.endsWith('.pptx'))
    return { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', label: 'PPT' };
  if (mimeType.includes('document') || mimeType.includes('word') || fileName?.match(/\.docx?$/))
    return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', label: 'Word' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive') || mimeType.includes('compressed'))
    return { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Archive' };
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html') || mimeType.includes('css'))
    return { icon: FileCode, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-950/30', label: 'Code' };
  return { icon: FileIcon, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/30', label: 'File' };
}

// ============================================================================
// SIDEBAR NAVIGATION ITEM
// ============================================================================

function SidebarItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  badge,
  collapsed 
}: { 
  icon: any; 
  label: string; 
  active?: boolean; 
  onClick?: () => void; 
  badge?: number;
  collapsed?: boolean;
}) {
  const handleClick = () => {
    if (onClick) onClick();
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
            active 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{label}</span>
              {badge !== undefined && badge > 0 && (
                <Badge variant={active ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
                  {badge}
                </Badge>
              )}
            </>
          )}
        </button>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}

// ============================================================================
// FOLDER TREE ITEM
// ============================================================================

function FolderTreeItem({ 
  folder, 
  level = 0, 
  selectedId, 
  onSelect, 
  expandedIds, 
  onToggle,
}: { 
  folder: Folder & { children?: Folder[] }; 
  level?: number; 
  selectedId?: string; 
  onSelect: (id: string) => void; 
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;
  const hasChildren = folder.subfolderCount != null && folder.subfolderCount > 0;

  // Extract employee code and name for better display
  const getDisplayName = () => {
    if (folder.employee) {
      // Folder name format: "SQT001 - John Doe" - just show employee name for cleaner tree
      const parts = folder.name.split(' - ');
      return parts.length > 1 ? parts.slice(1).join(' - ') : folder.name;
    }
    return folder.name;
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors group",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button
          className="p-0.5 hover:bg-accent rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(folder.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>
        {/* Show employee avatar for employee folders, special icons for root/system folders, otherwise folder icon */}
        {folder.employee ? (
          <UserAvatar
            id={folder.employee.id}
            firstName={folder.employee.firstName}
            lastName={folder.employee.lastName}
            avatar={folder.employee.avatar}
            size="sm"
          />
        ) : isCompanyMasterFolder(folder.name) ? (
          <Building2 className="h-4 w-4 text-blue-600" />
        ) : isEmployeeDocumentsFolder(folder.name) ? (
          <Users className="h-4 w-4 text-green-600" />
        ) : isSystemSubfolder(folder.name) ? (
          <FolderCog className={cn("h-4 w-4", getFolderColorClass(folder.color).split(' ').pop())} />
        ) : (
          <FolderIcon className={cn("h-4 w-4", getFolderColorClass(folder.color).split(' ').pop())} />
        )}
        <span className={cn(
          "text-sm truncate flex-1",
          (isCompanyMasterFolder(folder.name) || isEmployeeDocumentsFolder(folder.name)) && "font-semibold"
        )} title={folder.name}>{getDisplayName()}</span>
      </div>
      
      {/* Render children when expanded */}
      {isExpanded && hasChildren && folder.children && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={(level || 0) + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FILE CARD COMPONENT
// ============================================================================

function FileCard({ 
  file, 
  view, 
  selected,
  isTrash,
  onSelect,
  onOpen,
  onStar,
  onShare,
  onDelete,
  onRename,
  onMove,
  onVersions,
  onDownload,
  onDetails,
  onRestore,
  onPermanentDelete,
}: { 
  file: DocFile; 
  view: 'grid' | 'list'; 
  selected?: boolean;
  isTrash?: boolean;
  onSelect?: (id: string, multi?: boolean) => void;
  onOpen?: () => void;
  onStar?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onVersions?: () => void;
  onDownload?: () => void;
  onDetails?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}) {
  const fileInfo = getFileTypeInfo(file.mimeType, file.name);
  const Icon = fileInfo.icon;
  
  // Check if file has a thumbnail (works for images, PDFs, and Office documents)
  const hasThumbnail = file.thumbnails?.medium || file.thumbnails?.small || file.thumbnails?.large;
  const thumbnailUrl = file.thumbnails?.medium || file.thumbnails?.large || file.thumbnails?.small;

  const contextMenuContent = isTrash ? (
    <>
      <ContextMenuItem onClick={onRestore}>
        <RotateCcw className="mr-2 h-4 w-4" /> Restore
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onPermanentDelete} className="text-destructive">
        <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
      </ContextMenuItem>
    </>
  ) : (
    <>
      <ContextMenuItem onClick={onOpen}>
        <Eye className="mr-2 h-4 w-4" /> Preview
      </ContextMenuItem>
      <ContextMenuItem onClick={onDownload}>
        <Download className="mr-2 h-4 w-4" /> Download
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onStar}>
        {file.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
        {file.isStarred ? 'Remove from starred' : 'Add to starred'}
      </ContextMenuItem>
      <ContextMenuItem onClick={onRename}>
        <Pencil className="mr-2 h-4 w-4" /> Rename
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Move className="mr-2 h-4 w-4" /> Move to
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={onMove}>Choose destination...</ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onShare}>
        <Share2 className="mr-2 h-4 w-4" /> Share
      </ContextMenuItem>
      <ContextMenuItem onClick={onVersions}>
        <History className="mr-2 h-4 w-4" /> Version history
      </ContextMenuItem>
      <ContextMenuItem onClick={onDetails}>
        <Info className="mr-2 h-4 w-4" /> Details
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onDelete} className="text-destructive">
        <Trash2 className="mr-2 h-4 w-4" /> Move to trash
      </ContextMenuItem>
    </>
  );

  if (view === 'list') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <tr 
            className={cn(
              "border-b hover:bg-muted/50 transition-colors group cursor-pointer",
              selected && "bg-primary/5"
            )}
            onClick={(e) => onSelect?.(file.id, e.shiftKey || e.metaKey)}
            onDoubleClick={onOpen}
          >
            <td className="p-3 w-8">
              <Checkbox 
                checked={selected} 
                onCheckedChange={() => onSelect?.(file.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </td>
            <td className="p-3">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden", fileInfo.bg)}>
                  {hasThumbnail && thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <Icon className={cn("h-5 w-5", fileInfo.color, hasThumbnail && thumbnailUrl ? "hidden" : "")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    {file.isStarred && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    {file.isShared && <Users className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{fileInfo.label}</p>
                </div>
              </div>
            </td>
            <td className="p-3 text-sm">
              {file.uploadedBy && (
                <div className="flex items-center gap-2">
                  <UserAvatar
                    id={file.uploadedBy.id}
                    firstName={file.uploadedBy.firstName}
                    lastName={file.uploadedBy.lastName}
                    avatar={file.uploadedBy.avatar}
                    size="sm"
                  />
                  <span className="text-muted-foreground">{file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                </div>
              )}
            </td>
            <td className="p-3 text-sm text-muted-foreground">{safeFormatDistanceToNow(file.updatedAt)}</td>
            <td className="p-3 text-sm text-muted-foreground">{formatBytes(file.size)}</td>
            <td className="p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isTrash ? (
                    <>
                      <DropdownMenuItem onClick={onRestore}><RotateCcw className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onPermanentDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete permanently</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={onOpen}><Eye className="mr-2 h-4 w-4" /> Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={onDownload}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onStar}>
                        {file.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {file.isStarred ? 'Unstar' : 'Star'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onRename}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={onMove}><Move className="mr-2 h-4 w-4" /> Move</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onShare}><Share2 className="mr-2 h-4 w-4" /> Share</DropdownMenuItem>
                      <DropdownMenuItem onClick={onVersions}><History className="mr-2 h-4 w-4" /> Versions</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        </ContextMenuTrigger>
        <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card 
          className={cn(
            "group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden",
            selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
          )}
          onClick={(e) => onSelect?.(file.id, e.shiftKey || e.metaKey)}
          onDoubleClick={onOpen}
        >
          <div className="relative">
            <div className={cn("h-32 flex items-center justify-center relative overflow-hidden", fileInfo.bg)}>
              {hasThumbnail && thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if thumbnail fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "flex items-center justify-center",
                hasThumbnail && thumbnailUrl ? "hidden" : ""
              )}>
                <Icon className={cn("h-14 w-14", fileInfo.color)} />
              </div>
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" onClick={(e) => { e.stopPropagation(); onOpen?.(); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" onClick={(e) => { e.stopPropagation(); onDownload?.(); }}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="absolute top-2 left-2 flex gap-1">
              {selected && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            <div className="absolute top-2 right-2 flex gap-1">
              {file.isStarred && (
                <div className="h-6 w-6 rounded-full bg-white/90 dark:bg-black/50 flex items-center justify-center">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                </div>
              )}
              {file.isShared && (
                <div className="h-6 w-6 rounded-full bg-white/90 dark:bg-black/50 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span className="truncate">{safeFormatDistanceToNow(file.updatedAt)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isTrash ? (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore?.(); }}><RotateCcw className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete permanently</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(); }}><Eye className="mr-2 h-4 w-4" /> Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload?.(); }}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStar?.(); }}>
                        {file.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {file.isStarred ? 'Unstar' : 'Star'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename?.(); }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare?.(); }}><Share2 className="mr-2 h-4 w-4" /> Share</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onVersions?.(); }}><History className="mr-2 h-4 w-4" /> Versions</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================================
// FOLDER CARD COMPONENT
// ============================================================================

function FolderCard({ 
  folder, 
  view, 
  selected,
  isTrash,
  onSelect,
  onOpen,
  onStar,
  onDelete,
  onRename,
  onMove,
  onChangeColor,
  onRestore,
  onPermanentDelete,
}: { 
  folder: Folder; 
  view: 'grid' | 'list'; 
  selected?: boolean;
  isTrash?: boolean;
  onSelect?: (id: string, multi?: boolean) => void;
  onOpen?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onChangeColor?: (color: string | null) => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}) {
  // Defensive check - return null if folder is invalid
  if (!folder || !folder.id) {
    console.warn('FolderCard: Invalid folder data', folder);
    return null;
  }
  
  const colorClass = getFolderColorClass(folder.color);
  const isProtected = isProtectedDefaultFolder(folder);

  const contextMenuContent = isTrash ? (
    <>
      <ContextMenuItem onClick={onRestore}>
        <RotateCcw className="mr-2 h-4 w-4" /> Restore
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onPermanentDelete} className="text-destructive">
        <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
      </ContextMenuItem>
    </>
  ) : (
    <>
      <ContextMenuItem onClick={onOpen}>
        <FolderOpen className="mr-2 h-4 w-4" /> Open
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onStar}>
        {folder.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
        {folder.isStarred ? 'Remove from starred' : 'Add to starred'}
      </ContextMenuItem>
      {!isProtected && (
        <ContextMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" /> Rename
        </ContextMenuItem>
      )}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Palette className="mr-2 h-4 w-4" /> Change color
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {FOLDER_COLORS.map((color) => (
            <ContextMenuItem key={color.value || 'default'} onClick={() => onChangeColor?.(color.value)}>
              <div className={cn("h-4 w-4 rounded mr-2", color.class.split(' ').slice(0, 2).join(' '))} />
              {color.name}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {!isProtected && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Move className="mr-2 h-4 w-4" /> Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onMove}>Choose destination...</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {!isProtected && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Move to trash
          </ContextMenuItem>
        </>
      )}
    </>
  );

  if (view === 'list') {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <tr 
            className={cn(
              "border-b hover:bg-muted/50 transition-colors cursor-pointer group",
              selected && "bg-primary/5"
            )}
            onClick={(e) => onSelect?.(folder.id, e.shiftKey || e.metaKey)}
            onDoubleClick={onOpen}
          >
            <td className="p-3 w-8">
              <Checkbox 
                checked={selected} 
                onCheckedChange={() => onSelect?.(folder.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </td>
            <td className="p-3">
              <div className="flex items-center gap-3">
                {folder.employee ? (
                  <UserAvatar
                    id={folder.employee.id}
                    firstName={folder.employee.firstName}
                    lastName={folder.employee.lastName}
                    avatar={folder.employee.avatar}
                    size="md"
                  />
                ) : isCompanyMasterFolder(folder.name) ? (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                ) : isEmployeeDocumentsFolder(folder.name) ? (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                ) : isSystemSubfolder(folder.name) ? (
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClass.split(' ').slice(0, 2).join(' '))}>
                    <FolderCog className={cn("h-5 w-5", colorClass.split(' ').pop())} />
                  </div>
                ) : (
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClass.split(' ').slice(0, 2).join(' '))}>
                    <FolderIcon className={cn("h-5 w-5", colorClass.split(' ').pop())} />
                  </div>
                )}
                {folder.employee ? (
                  <div className="flex flex-col">
                    <p className="font-medium text-sm">{folder.employee.firstName} {folder.employee.lastName}</p>
                    <p className="text-xs text-muted-foreground">{folder.name.split(' - ')[0]}</p>
                  </div>
                ) : (
                  <p className="font-medium text-sm">{folder.name}</p>
                )}
              </div>
            </td>
            <td className="p-3 text-sm text-muted-foreground">{folder.createdBy?.firstName} {folder.createdBy?.lastName}</td>
            <td className="p-3 text-sm text-muted-foreground">{safeFormatDistanceToNow(folder.updatedAt)}</td>
            <td className="p-3 text-sm text-muted-foreground">{folder.fileCount || 0} items</td>
            <td className="p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isTrash ? (
                    <>
                      <DropdownMenuItem onClick={onRestore}><RotateCcw className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onPermanentDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete permanently</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={onOpen}><FolderOpen className="mr-2 h-4 w-4" /> Open</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onStar}>
                        {folder.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                        {folder.isStarred ? 'Unstar' : 'Star'}
                      </DropdownMenuItem>
                      {!isProtected && (
                        <DropdownMenuItem onClick={onRename}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                      )}
                      {!isProtected && (
                        <DropdownMenuItem onClick={onMove}><Move className="mr-2 h-4 w-4" /> Move</DropdownMenuItem>
                      )}
                      {!isProtected && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        </ContextMenuTrigger>
        <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card 
          className={cn(
            "group cursor-pointer hover:shadow-lg transition-all duration-300",
            selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
          )}
          onClick={(e) => onSelect?.(folder.id, e.shiftKey || e.metaKey)}
          onDoubleClick={onOpen}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              {folder.employee ? (
                <UserAvatar
                  id={folder.employee.id}
                  firstName={folder.employee.firstName}
                  lastName={folder.employee.lastName}
                  avatar={folder.employee.avatar}
                  size="lg"
                  className="group-hover:scale-105 transition-transform duration-300"
                />
              ) : isCompanyMasterFolder(folder.name) ? (
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 bg-blue-100 dark:bg-blue-900/30">
                  <Building2 className="h-7 w-7 text-blue-600" />
                </div>
              ) : isEmployeeDocumentsFolder(folder.name) ? (
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 bg-green-100 dark:bg-green-900/30">
                  <Users className="h-7 w-7 text-green-600" />
                </div>
              ) : isSystemSubfolder(folder.name) ? (
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300",
                  colorClass.split(' ').slice(0, 2).join(' ')
                )}>
                  <FolderCog className={cn("h-7 w-7", colorClass.split(' ').pop())} />
                </div>
              ) : (
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300",
                  colorClass.split(' ').slice(0, 2).join(' ')
                )}>
                  <FolderIcon className={cn("h-7 w-7", colorClass.split(' ').pop())} />
                </div>
              )}
              <div className="flex items-center gap-1">
                {selected && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center mr-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isTrash ? (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore?.(); }}><RotateCcw className="mr-2 h-4 w-4" /> Restore</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete permanently</DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen?.(); }}><FolderOpen className="mr-2 h-4 w-4" /> Open</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStar?.(); }}>
                          {folder.isStarred ? <StarOff className="mr-2 h-4 w-4" /> : <Star className="mr-2 h-4 w-4" />}
                          {folder.isStarred ? 'Unstar' : 'Star'}
                        </DropdownMenuItem>
                        {!isProtected && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename?.(); }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                        )}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}><Palette className="mr-2 h-4 w-4" /> Change color</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {FOLDER_COLORS.map((color) => (
                              <DropdownMenuItem key={color.value || 'default'} onClick={(e) => { e.stopPropagation(); onChangeColor?.(color.value); }}>
                                <div className={cn("h-4 w-4 rounded mr-2", color.class.split(' ').slice(0, 2).join(' '))} />
                                {color.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {!isProtected && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove?.(); }}><Move className="mr-2 h-4 w-4" /> Move</DropdownMenuItem>
                        )}
                        {!isProtected && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {folder.employee ? (
              // For employee folders, show name nicely formatted
              <>
                <h4 className="font-semibold text-sm truncate" title={`${folder.employee.firstName} ${folder.employee.lastName}`}>
                  {folder.employee.firstName} {folder.employee.lastName}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {folder.name.split(' - ')[0]}
                </p>
              </>
            ) : (
              <h4 className="font-semibold text-sm truncate" title={folder.name}>{folder.name}</h4>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {folder.fileCount || 0} items
            </p>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================================
// UPLOAD PROGRESS COMPONENT
// ============================================================================

function UploadProgress({ 
  uploads 
}: { 
  uploads: { id: string; name: string; progress: number; error?: string }[] 
}) {
  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 border-b bg-muted/50">
        <h4 className="text-sm font-medium">Uploading {uploads.length} file(s)</h4>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {uploads.map((upload) => (
          <div key={upload.id} className="p-3 border-b last:border-0">
            <div className="flex items-center gap-2 mb-2">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate flex-1">{upload.name}</span>
              {upload.error ? (
                <X className="h-4 w-4 text-destructive" />
              ) : upload.progress === 100 ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <span className="text-xs text-muted-foreground">{upload.progress}%</span>
              )}
            </div>
            <Progress value={upload.progress} className="h-1" />
            {upload.error && (
              <p className="text-xs text-destructive mt-1">{upload.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DocumentsPage() {
  // Navigation state
  const [currentView, setCurrentView] = useState<'drive' | 'recent' | 'starred' | 'trash'>('drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string | null>(null);
  
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [newName, setNewName] = useState('');
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [moveDestination, setMoveDestination] = useState<string | null>(null);
  
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareTarget, setShareTarget] = useState<DocFile | null>(null);
  
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [versionsTarget, setVersionsTarget] = useState<DocFile | null>(null);
  
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState(false);
  const [versionChangeNote, setVersionChangeNote] = useState('');
  
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocFile | null>(null);
  
  const [detailsFile, setDetailsFile] = useState<DocFile | null>(null);
  
  // Upload state
  const [uploads, setUploads] = useState<{ id: string; name: string; progress: number; error?: string }[]>([]);
  
  // Folder tree state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Data hooks
  const { data: folderContents, isLoading: contentsLoading, refetch: refetchContents } = useFolderContents(currentFolderId);
  const { data: breadcrumbs } = useFolderBreadcrumbs(currentFolderId || '');
  const { data: folderTree } = useFolderTree();
  const { data: storageStats } = useStorageStats();
  const { data: recentFiles } = useRecentFiles();
  const { data: starredFiles } = useStarredFiles();
  const { data: trashData } = useTrashFiles();
  const { data: searchResults } = useSearchDocuments(search);
  const { data: fileVersions } = useFileVersions(versionsTarget?.id || '');
  
  // Preview file URL (with inline=true for viewing)
  const { data: previewFileUrl, isLoading: previewUrlLoading } = useFileDownloadUrl(
    showPreviewDialog ? previewFile?.id : undefined,
    true // inline for viewing
  );
  
  // Mutations
  const createFolderMutation = useCreateFolder();
  const uploadFileMutation = useUploadFile();
  const uploadZipMutation = useUploadZip();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderMutation = useDeleteFolder();
  const renameFileMutation = useRenameFile();
  const renameFolderMutation = useRenameFolder();
  const updateFolderColorMutation = useUpdateFolderColor();
  const moveFileMutation = useMoveFile();
  const moveFolderMutation = useMoveFolder();
  const starFileMutation = useStarFile();
  const starFolderMutation = useStarFolder();
  const shareFileMutation = useShareFile();
  const uploadVersionMutation = useUploadNewVersion();
  const restoreVersionMutation = useRestoreVersion();
  const restoreFileMutation = useRestoreFile();
  const restoreFolderMutation = useRestoreFolder();
  const permanentDeleteFileMutation = usePermanentDeleteFile();
  const permanentDeleteFolderMutation = usePermanentDeleteFolder();
  
  // Bulk mutations
  const bulkDeleteFilesMutation = useBulkDeleteFiles();
  const bulkMoveFilesMutation = useBulkMoveFiles();
  const bulkDownloadUrlsMutation = useBulkDownloadUrls();
  const bulkDeleteFoldersMutation = useBulkDeleteFolders();
  const bulkMoveFoldersMutation = useBulkMoveFolders();
  
  // Bulk trash mutations
  const bulkRestoreFilesMutation = useBulkRestoreFiles();
  const bulkPermanentDeleteFilesMutation = useBulkPermanentDeleteFiles();
  const bulkRestoreFoldersMutation = useBulkRestoreFolders();
  const bulkPermanentDeleteFoldersMutation = useBulkPermanentDeleteFolders();
  
  // Folder initialization
  const initializeFoldersMutation = useInitializeFolders();
  
  // Computed data
  const folders = folderContents?.folders || [];
  const files = folderContents?.files || [];
  const isLoading = contentsLoading;
  
  // Get current view data
  const getCurrentViewData = () => {
    switch (currentView) {
      case 'recent':
        return { folders: [], files: recentFiles || [] };
      case 'starred':
        return starredFiles || { folders: [], files: [] };
      case 'trash':
        return trashData || { folders: [], files: [] };
      default:
        if (search && searchResults) {
          return searchResults;
        }
        return { folders, files };
    }
  };
  
  const viewData = getCurrentViewData();
  
  // hasItems should be based on viewData, not folderContents
  const hasItems = (viewData.folders?.length || 0) > 0 || (viewData.files?.length || 0) > 0;
  
  // Sort items
  const sortedFolders = useMemo(() => {
    return [...(viewData.folders || [])].filter(f => f && f.id).sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = (safeParseDate(a.updatedAt)?.getTime() || 0) - (safeParseDate(b.updatedAt)?.getTime() || 0);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [viewData.folders, sortBy, sortOrder]);
  
  const sortedFiles = useMemo(() => {
    return [...(viewData.files || [])].filter(f => f && f.id).sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = (safeParseDate(a.updatedAt)?.getTime() || 0) - (safeParseDate(b.updatedAt)?.getTime() || 0);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [viewData.files, sortBy, sortOrder]);
  
  // Handlers
  const onDrop = useCallback(async (acceptedFiles: globalThis.File[]) => {
    for (const file of acceptedFiles) {
      const uploadId = `${Date.now()}-${file.name}`;
      
      // Check if it's a zip file for auto-organization
      const isZip = file.type.includes('zip') || file.name.endsWith('.zip');
      
      setUploads(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);
      
      try {
        if (isZip) {
          await uploadZipMutation.mutateAsync({
            file,
            targetFolderId: currentFolderId || undefined,
            autoOrganize: true,
            onProgress: (progress) => {
              setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress } : u));
            },
          });
        } else {
          await uploadFileMutation.mutateAsync({
            file,
            folderId: currentFolderId || undefined,
            onProgress: (progress) => {
              setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress } : u));
            },
          });
        }
        
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100 } : u));
        toast.success(`Uploaded ${file.name}`);
        
        // Remove from list after delay
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 2000);
        
      } catch (error) {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, error: 'Upload failed' } : u));
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    refetchContents();
  }, [currentFolderId, uploadFileMutation, uploadZipMutation, refetchContents]);
  
  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });
  
  const handleSelect = (id: string, multi?: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    // Only clear if clicking directly on the container (not on items)
    if (e.target === e.currentTarget) {
      setSelectedItems(new Set());
    }
  };
  
  const handleSelectAll = () => {
    if (selectedItems.size === sortedFiles.length + sortedFolders.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set([...sortedFolders.map(f => f.id), ...sortedFiles.map(f => f.id)]));
    }
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName,
        parentId: currentFolderId || undefined,
        color: newFolderColor || undefined,
      });
      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderColor(null);
      setShowNewFolderDialog(false);
      refetchContents();
    } catch {
      toast.error('Failed to create folder');
    }
  };
  
  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    try {
      if (renameTarget.type === 'file') {
        await renameFileMutation.mutateAsync({ id: renameTarget.id, name: newName });
      } else {
        await renameFolderMutation.mutateAsync({ id: renameTarget.id, name: newName });
      }
      toast.success('Renamed successfully');
      setShowRenameDialog(false);
      setRenameTarget(null);
      setNewName('');
      refetchContents();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to rename';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to rename');
      }
    }
  };
  
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'file') {
        await deleteFileMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteFolderMutation.mutateAsync({ id: deleteTarget.id, recursive: true });
      }
      toast.success('Moved to trash');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      refetchContents();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to delete';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to delete');
      }
    }
  };
  
  const handleMove = async () => {
    if (!moveTarget) return;
    try {
      if (moveTarget.type === 'file') {
        await moveFileMutation.mutateAsync({ id: moveTarget.id, folderId: moveDestination });
      } else {
        await moveFolderMutation.mutateAsync({ id: moveTarget.id, parentId: moveDestination });
      }
      toast.success('Moved successfully');
      setShowMoveDialog(false);
      setMoveTarget(null);
      setMoveDestination(null);
      refetchContents();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to move';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to move');
      }
    }
  };
  
  const handleChangeColor = async (folderId: string, color: string | null) => {
    try {
      await updateFolderColorMutation.mutateAsync({ id: folderId, color });
      toast.success('Folder color updated');
      refetchContents();
    } catch {
      toast.error('Failed to update folder color');
    }
  };
  
  const handleStar = async (file: DocFile) => {
    try {
      await starFileMutation.mutateAsync({ id: file.id, starred: !file.isStarred });
      toast.success(file.isStarred ? 'Removed from starred' : 'Added to starred');
      refetchContents();
    } catch {
      toast.error('Failed to update star');
    }
  };

  const handleStarFolder = async (folder: Folder) => {
    try {
      await starFolderMutation.mutateAsync({ id: folder.id, starred: !folder.isStarred });
      toast.success(folder.isStarred ? 'Removed from starred' : 'Added to starred');
      refetchContents();
    } catch {
      toast.error('Failed to update star');
    }
  };
  
  const handleShare = async (shared: boolean) => {
    if (!shareTarget) return;
    try {
      const result = await shareFileMutation.mutateAsync({ id: shareTarget.id, shared });
      if (shared && result.shareLink) {
        navigator.clipboard.writeText(result.shareLink);
        toast.success('Share link copied to clipboard');
      } else {
        toast.success(shared ? 'File shared' : 'Sharing disabled');
      }
      setShowShareDialog(false);
      refetchContents();
    } catch {
      toast.error('Failed to update sharing');
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const result = await get<{ url: string }>(`/api/documents/files/${fileId}/download`);
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch {
      toast.error('Failed to get download link');
    }
  };
  
  const handleUploadVersion = async (file: globalThis.File) => {
    if (!versionsTarget) return;
    try {
      await uploadVersionMutation.mutateAsync({
        fileId: versionsTarget.id,
        file,
        changeNote: versionChangeNote,
      });
      toast.success('New version uploaded');
      setShowUploadVersionDialog(false);
      setVersionChangeNote('');
    } catch {
      toast.error('Failed to upload version');
    }
  };
  
  const handleRestoreVersion = async (version: number) => {
    if (!versionsTarget) return;
    try {
      await restoreVersionMutation.mutateAsync({ fileId: versionsTarget.id, version });
      toast.success(`Restored to version ${version}`);
    } catch {
      toast.error('Failed to restore version');
    }
  };

  const handleRestoreFile = async (file: DocFile) => {
    try {
      await restoreFileMutation.mutateAsync(file.id);
      toast.success('File restored successfully');
    } catch {
      toast.error('Failed to restore file');
    }
  };

  const handleRestoreFolder = async (folder: Folder) => {
    try {
      await restoreFolderMutation.mutateAsync(folder.id);
      toast.success('Folder restored successfully');
    } catch {
      toast.error('Failed to restore folder');
    }
  };

  const handlePermanentDeleteFile = async (file: DocFile) => {
    try {
      await permanentDeleteFileMutation.mutateAsync(file.id);
      toast.success('File permanently deleted');
    } catch {
      toast.error('Failed to delete file permanently');
    }
  };

  const handlePermanentDeleteFolder = async (folder: Folder) => {
    try {
      await permanentDeleteFolderMutation.mutateAsync(folder.id);
      toast.success('Folder permanently deleted');
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to delete folder permanently';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to delete folder permanently');
      }
    }
  };
  
  const openFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
    setCurrentView('drive');
    setSelectedItems(new Set());
    setExpandedFolders(prev => new Set([...prev, folderId]));
  };
  
  const navigateToBreadcrumb = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set());
  };
  
  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const storageUsedPercent = storageStats?.usedPercent || 0;

  // Auto-initialize folder structure on first load if no folders exist
  // Disabled for now - use manual initialization via menu instead
  // useEffect(() => {
  //   if (!isLoading && folders.length === 0 && files.length === 0 && !currentFolderId && currentView === 'drive') {
  //     const hasInitialized = localStorage.getItem('folders-initialized');
  //     if (!hasInitialized) {
  //       initializeFoldersMutation.mutate(undefined, {
  //         onSuccess: () => {
  //           localStorage.setItem('folders-initialized', 'true');
  //           toast.success('Default folder structure created');
  //           refetchContents();
  //         },
  //         onError: (error) => {
  //           console.error('Failed to initialize folders:', error);
  //         },
  //       });
  //     }
  //   }
  // }, [isLoading, folders.length, files.length, currentFolderId, currentView]);

  const handleInitializeFolders = async () => {
    try {
      await initializeFoldersMutation.mutateAsync();
      localStorage.setItem('folders-initialized', 'true');
      toast.success('Folder structure initialized successfully');
      refetchContents();
    } catch (error) {
      toast.error('Failed to initialize folder structure');
    }
  };

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================
  
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    // Separate files and folders
    const selectedFileIds = Array.from(selectedItems).filter(id => 
      sortedFiles.some(f => f.id === id)
    );
    const selectedFolderIds = Array.from(selectedItems).filter(id => 
      sortedFolders.some(f => f.id === id)
    );
    
    try {
      let deletedCount = 0;
      
      if (selectedFileIds.length > 0) {
        const result = await bulkDeleteFilesMutation.mutateAsync(selectedFileIds);
        deletedCount += result.deleted;
      }
      
      if (selectedFolderIds.length > 0) {
        const result = await bulkDeleteFoldersMutation.mutateAsync({ folderIds: selectedFolderIds, recursive: true });
        deletedCount += result.deleted;
      }
      
      toast.success(`${deletedCount} item(s) moved to trash`);
      setSelectedItems(new Set());
      refetchContents();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to delete some items';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to delete some items');
      }
    }
  };
  
  const handleBulkMove = async (targetFolderId: string | null) => {
    if (selectedItems.size === 0) return;
    
    // Separate files and folders
    const selectedFileIds = Array.from(selectedItems).filter(id => 
      sortedFiles.some(f => f.id === id)
    );
    const selectedFolderIds = Array.from(selectedItems).filter(id => 
      sortedFolders.some(f => f.id === id)
    );
    
    try {
      let movedCount = 0;
      
      if (selectedFileIds.length > 0) {
        const result = await bulkMoveFilesMutation.mutateAsync({ fileIds: selectedFileIds, targetFolderId });
        movedCount += result.moved;
      }
      
      if (selectedFolderIds.length > 0) {
        const result = await bulkMoveFoldersMutation.mutateAsync({ folderIds: selectedFolderIds, targetFolderId });
        movedCount += result.moved;
      }
      
      toast.success(`${movedCount} item(s) moved successfully`);
      setSelectedItems(new Set());
      setShowBulkMoveDialog(false);
      refetchContents();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to move some items';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to move some items');
      }
    }
  };
  
  const handleBulkDownload = async () => {
    if (selectedItems.size === 0) return;
    
    // Only download files, not folders
    const selectedFileIds = Array.from(selectedItems).filter(id => 
      sortedFiles.some(f => f.id === id)
    );
    
    if (selectedFileIds.length === 0) {
      toast.error('Please select files to download (folders cannot be downloaded)');
      return;
    }
    
    try {
      const urls = await bulkDownloadUrlsMutation.mutateAsync(selectedFileIds);
      
      // Download each file
      for (const { name, url } of urls) {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast.success(`${urls.length} file(s) downloaded`);
    } catch (error) {
      toast.error('Failed to download files');
    }
  };
  
  // Bulk restore items from trash
  const handleBulkRestore = async () => {
    if (selectedItems.size === 0) return;
    
    // Separate files and folders
    const selectedFileIds = Array.from(selectedItems).filter(id => 
      sortedFiles.some(f => f.id === id)
    );
    const selectedFolderIds = Array.from(selectedItems).filter(id => 
      sortedFolders.some(f => f.id === id)
    );
    
    try {
      let restoredCount = 0;
      
      if (selectedFileIds.length > 0) {
        const result = await bulkRestoreFilesMutation.mutateAsync(selectedFileIds);
        restoredCount += result.restored;
      }
      
      if (selectedFolderIds.length > 0) {
        const result = await bulkRestoreFoldersMutation.mutateAsync(selectedFolderIds);
        restoredCount += result.restored;
      }
      
      toast.success(`${restoredCount} item(s) restored`);
      setSelectedItems(new Set());
    } catch (error) {
      toast.error('Failed to restore some items');
    }
  };
  
  // Bulk permanent delete items from trash
  const handleBulkPermanentDelete = async () => {
    if (selectedItems.size === 0) return;
    
    // Separate files and folders
    const selectedFileIds = Array.from(selectedItems).filter(id => 
      sortedFiles.some(f => f.id === id)
    );
    const selectedFolderIds = Array.from(selectedItems).filter(id => 
      sortedFolders.some(f => f.id === id)
    );
    
    try {
      let deletedCount = 0;
      
      if (selectedFileIds.length > 0) {
        const result = await bulkPermanentDeleteFilesMutation.mutateAsync(selectedFileIds);
        deletedCount += result.deleted;
      }
      
      if (selectedFolderIds.length > 0) {
        const result = await bulkPermanentDeleteFoldersMutation.mutateAsync(selectedFolderIds);
        deletedCount += result.deleted;
      }
      
      toast.success(`${deletedCount} item(s) permanently deleted`);
      setSelectedItems(new Set());
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.error || 'Failed to permanently delete some items';
      if (message.includes('PROTECTED_FOLDER')) {
        toast.error(message.replace('PROTECTED_FOLDER:', '').trim(), { duration: 5000 });
      } else {
        toast.error('Failed to permanently delete some items');
      }
    }
  };
  
  // State for bulk move dialog
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [bulkMoveDestination, setBulkMoveDestination] = useState<string | null>(null);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed inset-0 top-16 flex bg-background overflow-hidden" {...getRootProps()}>
        <input {...getInputProps()} />
        
        {/* Drag Overlay */}
        {isDragActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="text-center animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <UploadCloud className="h-14 w-14 text-primary animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Drop files to upload</h2>
              <p className="text-muted-foreground">
                {currentFolderId ? 'Files will be uploaded to this folder' : 'Files will be uploaded to My Drive'}
              </p>
            </div>
          </div>
        )}
        
        {/* Sidebar */}
        <div className={cn(
          "border-r bg-muted/30 flex flex-col transition-all duration-300 h-full",
          sidebarCollapsed ? "w-16" : "w-64"
        )}>
          {/* New Button */}
          <div className="p-3 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className={cn(
                    "w-full gap-2 shadow-md",
                    sidebarCollapsed && "px-0"
                  )}
                >
                  <Plus className="h-5 w-5" />
                  {!sidebarCollapsed && <span>New</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => setShowNewFolderDialog(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" /> New folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openFileDialog}>
                  <FileUp className="mr-2 h-4 w-4" /> Upload file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openFileDialog}>
                  <FolderOpen className="mr-2 h-4 w-4" /> Upload folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openFileDialog}>
                  <FileArchive className="mr-2 h-4 w-4" /> Upload & extract ZIP
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleInitializeFolders}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Initialize Default Folders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Navigation */}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              <SidebarItem 
                icon={HardDrive} 
                label="My Drive" 
                active={currentView === 'drive' && !currentFolderId} 
                onClick={() => { setCurrentView('drive'); setCurrentFolderId(null); }}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem 
                icon={Clock} 
                label="Recent" 
                active={currentView === 'recent'} 
                onClick={() => { setCurrentView('recent'); setCurrentFolderId(null); }}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem 
                icon={Star} 
                label="Starred" 
                active={currentView === 'starred'} 
                onClick={() => { setCurrentView('starred'); setCurrentFolderId(null); }}
                collapsed={sidebarCollapsed}
              />
              <SidebarItem 
                icon={Trash2} 
                label="Trash" 
                active={currentView === 'trash'} 
                onClick={() => { setCurrentView('trash'); setCurrentFolderId(null); }}
                collapsed={sidebarCollapsed}
              />
            </div>
            
            {!sidebarCollapsed && (
              <>
                <Separator className="my-3" />
                
                {/* Folder Tree */}
                <div className="space-y-1">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Folders
                  </p>
                  {folderTree && (folderTree as any[]).map((folder: any) => (
                    <FolderTreeItem
                      key={folder.id}
                      folder={folder}
                      selectedId={currentFolderId || undefined}
                      onSelect={openFolder}
                      expandedIds={expandedFolders}
                      onToggle={toggleFolderExpand}
                    />
                  ))}
                </div>
              </>
            )}
          </ScrollArea>
          
          {/* Storage */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t">
              <div className="text-xs text-muted-foreground mb-2">
                {formatBytes(storageStats?.used || 0)} of {formatBytes(storageStats?.limit || 0)} used
              </div>
              <Progress value={storageUsedPercent} className="h-1.5" />
            </div>
          )}
          
          {/* Collapse Button */}
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-center"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <div className="border-b p-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1.5"
                  onClick={() => navigateToBreadcrumb(null)}
                >
                  <Home className="h-4 w-4" />
                  <span>My Drive</span>
                </Button>
                {breadcrumbs && (breadcrumbs as any[]).map((crumb: any) => (
                  <div key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => navigateToBreadcrumb(crumb.id)}
                    >
                      {crumb.name}
                    </Button>
                  </div>
                ))}
              </nav>
              
              {/* Right-aligned controls: Search | Grid/List | Reload | Sort */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Search */}
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in Drive"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/50"
                  />
                  {search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearch('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              
                {/* Grid/List toggle */}
                <div className="flex items-center border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('list')}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => refetchContents()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                      <Check className={cn("mr-2 h-4 w-4", sortBy !== 'name' && "opacity-0")} />
                      Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }}>
                      <Check className={cn("mr-2 h-4 w-4", sortBy !== 'date' && "opacity-0")} />
                      Date modified
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('size'); setSortOrder('desc'); }}>
                      <Check className={cn("mr-2 h-4 w-4", sortBy !== 'size' && "opacity-0")} />
                      Size
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                      {sortOrder === 'asc' ? <SortAsc className="mr-2 h-4 w-4" /> : <SortDesc className="mr-2 h-4 w-4" />}
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          {/* Selection Bar */}
          {selectedItems.size > 0 && (
            <div className="border-b bg-primary/5 p-2 flex items-center gap-4 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems(new Set())}>
                <X className="mr-2 h-4 w-4" /> Clear selection
              </Button>
              <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>
              <Separator orientation="vertical" className="h-5" />
              
              {currentView === 'trash' ? (
                // Trash view - show Restore and Permanently Delete options
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleBulkRestore}
                    disabled={bulkRestoreFilesMutation.isPending || bulkRestoreFoldersMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> 
                    {bulkRestoreFilesMutation.isPending || bulkRestoreFoldersMutation.isPending 
                      ? 'Restoring...' 
                      : selectedItems.size === 1 ? 'Restore' : 'Restore All'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={handleBulkPermanentDelete}
                    disabled={bulkPermanentDeleteFilesMutation.isPending || bulkPermanentDeleteFoldersMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> 
                    {bulkPermanentDeleteFilesMutation.isPending || bulkPermanentDeleteFoldersMutation.isPending 
                      ? 'Deleting...' 
                      : selectedItems.size === 1 ? 'Delete Permanently' : 'Delete All Permanently'}
                  </Button>
                </>
              ) : (() => {
                // Check if any selected folder is protected
                const selectedFolderIds = Array.from(selectedItems).filter(id => 
                  sortedFolders.some(f => f.id === id)
                );
                const hasProtectedFolder = selectedFolderIds.some(id => {
                  const folder = sortedFolders.find(f => f.id === id);
                  return folder && isProtectedDefaultFolder(folder);
                });
                
                return (
                  // Normal view - show Download, Move, Delete options
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleBulkDownload}
                      disabled={bulkDownloadUrlsMutation.isPending}
                    >
                      <Download className="mr-2 h-4 w-4" /> 
                      {bulkDownloadUrlsMutation.isPending ? 'Downloading...' : 'Download'}
                    </Button>
                    {!hasProtectedFolder && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setBulkMoveDestination(null); setShowBulkMoveDialog(true); }}
                      >
                        <Move className="mr-2 h-4 w-4" /> Move
                      </Button>
                    )}
                    {!hasProtectedFolder && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteFilesMutation.isPending || bulkDeleteFoldersMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 
                        {bulkDeleteFilesMutation.isPending || bulkDeleteFoldersMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          
          {/* Content */}
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 min-h-full" onClick={handleClearSelection}>
              {isLoading ? (
                <div className={cn(
                  "gap-4",
                  viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "space-y-2"
                )}>
                  {[...Array(8)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className={viewMode === 'grid' ? "h-32" : "h-16"} />
                      <CardContent className="p-3">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !hasItems && !search ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-6">
                    {currentView === 'recent' ? (
                      <Clock className="h-16 w-16 text-muted-foreground/50" />
                    ) : currentView === 'starred' ? (
                      <Star className="h-16 w-16 text-muted-foreground/50" />
                    ) : currentView === 'trash' ? (
                      <Trash2 className="h-16 w-16 text-muted-foreground/50" />
                    ) : (
                      <FolderOpen className="h-16 w-16 text-muted-foreground/50" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {currentView === 'recent' 
                      ? 'No recent files' 
                      : currentView === 'starred'
                      ? 'No starred items'
                      : currentView === 'trash'
                      ? 'Trash is empty'
                      : currentFolderId 
                      ? 'This folder is empty' 
                      : 'Welcome to Drive'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    {currentView === 'recent'
                      ? 'Files you open or upload will appear here for quick access'
                      : currentView === 'starred'
                      ? 'Add files to starred by right-clicking and selecting "Add to starred"'
                      : currentView === 'trash'
                      ? 'Items you delete will appear here. They will be permanently deleted after 30 days.'
                      : currentFolderId 
                      ? 'Upload files or create folders to get started' 
                      : 'Drop files here or use the "New" button to create folders and upload files'
                    }
                  </p>
                  {currentView === 'drive' && (
                    <div className="flex gap-3">
                      <Button onClick={() => setShowNewFolderDialog(true)} variant="outline">
                        <FolderPlus className="mr-2 h-4 w-4" /> New folder
                      </Button>
                      <Button onClick={openFileDialog}>
                        <Upload className="mr-2 h-4 w-4" /> Upload files
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Folders Section */}
                  {sortedFolders.length > 0 && (
                    <div className="mb-6" onClick={handleClearSelection}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Folders</h3>
                      {viewMode === 'list' ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr className="text-left text-xs text-muted-foreground uppercase">
                                <th className="p-3 w-8">
                                  <Checkbox 
                                    checked={selectedItems.size > 0}
                                    onCheckedChange={handleSelectAll}
                                  />
                                </th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Owner</th>
                                <th className="p-3">Modified</th>
                                <th className="p-3">Size</th>
                                <th className="p-3 w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedFolders.map((folder) => (
                                <FolderCard
                                  key={folder.id}
                                  folder={folder}
                                  view="list"
                                  selected={selectedItems.has(folder.id)}
                                  isTrash={currentView === 'trash'}
                                  onSelect={handleSelect}
                                  onOpen={() => openFolder(folder.id)}
                                  onDelete={() => { setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name }); setShowDeleteDialog(true); }}
                                  onRename={() => { setRenameTarget({ type: 'folder', id: folder.id, name: folder.name }); setNewName(folder.name); setShowRenameDialog(true); }}
                                  onMove={() => { setMoveTarget({ type: 'folder', id: folder.id }); setShowMoveDialog(true); }}
                                  onChangeColor={(color) => handleChangeColor(folder.id, color)}
                                  onStar={() => handleStarFolder(folder)}
                                  onRestore={() => handleRestoreFolder(folder)}
                                  onPermanentDelete={() => handlePermanentDeleteFolder(folder)}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" onClick={handleClearSelection}>
                          {sortedFolders.map((folder) => (
                            <FolderCard
                              key={folder.id}
                              folder={folder}
                              view="grid"
                              selected={selectedItems.has(folder.id)}
                              isTrash={currentView === 'trash'}
                              onSelect={handleSelect}
                              onOpen={() => openFolder(folder.id)}
                              onDelete={() => { setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name }); setShowDeleteDialog(true); }}
                              onRename={() => { setRenameTarget({ type: 'folder', id: folder.id, name: folder.name }); setNewName(folder.name); setShowRenameDialog(true); }}
                              onMove={() => { setMoveTarget({ type: 'folder', id: folder.id }); setShowMoveDialog(true); }}
                              onChangeColor={(color) => handleChangeColor(folder.id, color)}
                              onStar={() => handleStarFolder(folder)}
                              onRestore={() => handleRestoreFolder(folder)}
                              onPermanentDelete={() => handlePermanentDeleteFolder(folder)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Files Section */}
                  {sortedFiles.length > 0 && (
                    <div onClick={handleClearSelection}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Files</h3>
                      {viewMode === 'list' ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            {sortedFolders.length === 0 && (
                              <thead className="bg-muted/50">
                                <tr className="text-left text-xs text-muted-foreground uppercase">
                                  <th className="p-3 w-8">
                                    <Checkbox 
                                      checked={selectedItems.size > 0}
                                      onCheckedChange={handleSelectAll}
                                    />
                                  </th>
                                  <th className="p-3">Name</th>
                                  <th className="p-3">Owner</th>
                                  <th className="p-3">Modified</th>
                                  <th className="p-3">Size</th>
                                  <th className="p-3 w-12"></th>
                                </tr>
                              </thead>
                            )}
                            <tbody>
                              {sortedFiles.map((file) => (
                                <FileCard
                                  key={file.id}
                                  file={file}
                                  view="list"
                                  selected={selectedItems.has(file.id)}
                                  isTrash={currentView === 'trash'}
                                  onSelect={handleSelect}
                                  onOpen={() => { setPreviewFile(file); setShowPreviewDialog(true); }}
                                  onStar={() => handleStar(file)}
                                  onShare={() => { setShareTarget(file); setShowShareDialog(true); }}
                                  onDelete={() => { setDeleteTarget({ type: 'file', id: file.id, name: file.name }); setShowDeleteDialog(true); }}
                                  onRename={() => { setRenameTarget({ type: 'file', id: file.id, name: file.name }); setNewName(file.name); setShowRenameDialog(true); }}
                                  onMove={() => { setMoveTarget({ type: 'file', id: file.id }); setShowMoveDialog(true); }}
                                  onVersions={() => { setVersionsTarget(file); setShowVersionsDialog(true); }}
                                  onDownload={() => handleDownload(file.id)}
                                  onDetails={() => setDetailsFile(file)}
                                  onRestore={() => handleRestoreFile(file)}
                                  onPermanentDelete={() => handlePermanentDeleteFile(file)}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" onClick={handleClearSelection}>
                          {sortedFiles.map((file) => (
                            <FileCard
                              key={file.id}
                              file={file}
                              view="grid"
                              selected={selectedItems.has(file.id)}
                              isTrash={currentView === 'trash'}
                              onSelect={handleSelect}
                              onOpen={() => { setPreviewFile(file); setShowPreviewDialog(true); }}
                              onStar={() => handleStar(file)}
                              onShare={() => { setShareTarget(file); setShowShareDialog(true); }}
                              onDelete={() => { setDeleteTarget({ type: 'file', id: file.id, name: file.name }); setShowDeleteDialog(true); }}
                              onRename={() => { setRenameTarget({ type: 'file', id: file.id, name: file.name }); setNewName(file.name); setShowRenameDialog(true); }}
                              onMove={() => { setMoveTarget({ type: 'file', id: file.id }); setShowMoveDialog(true); }}
                              onVersions={() => { setVersionsTarget(file); setShowVersionsDialog(true); }}
                              onDownload={() => handleDownload(file.id)}
                              onDetails={() => setDetailsFile(file)}
                              onRestore={() => handleRestoreFile(file)}
                              onPermanentDelete={() => handlePermanentDeleteFile(file)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Details Panel */}
        <Sheet open={!!detailsFile} onOpenChange={() => setDetailsFile(null)}>
          <SheetContent className="w-80">
            <SheetHeader>
              <SheetTitle className="truncate">{detailsFile?.name}</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-4">
              <div className={cn("h-40 rounded-lg flex items-center justify-center overflow-hidden", detailsFile && getFileTypeInfo(detailsFile.mimeType, detailsFile.name).bg)}>
                {(() => {
                  if (!detailsFile) return null;
                  const info = getFileTypeInfo(detailsFile.mimeType, detailsFile.name);
                  const Icon = info.icon;
                  const thumbUrl = detailsFile.thumbnails?.large || detailsFile.thumbnails?.medium || detailsFile.thumbnails?.small;
                  
                  if (thumbUrl) {
                    return (
                      <img 
                        src={thumbUrl} 
                        alt={detailsFile.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    );
                  }
                  return <Icon className={cn("h-16 w-16", info.color)} />;
                })()}
                {/* Fallback icon (hidden by default, shown if thumbnail fails) */}
                {detailsFile && (
                  <div className="hidden">
                    {(() => {
                      const info = getFileTypeInfo(detailsFile.mimeType, detailsFile.name);
                      const Icon = info.icon;
                      return <Icon className={cn("h-16 w-16", info.color)} />;
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{detailsFile && getFileTypeInfo(detailsFile.mimeType, detailsFile.name).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span>{detailsFile && formatBytes(detailsFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  {detailsFile?.uploadedBy && (
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        id={detailsFile.uploadedBy.id}
                        firstName={detailsFile.uploadedBy.firstName}
                        lastName={detailsFile.uploadedBy.lastName}
                        avatar={detailsFile.uploadedBy.avatar}
                        size="sm"
                      />
                      <span>{detailsFile.uploadedBy.firstName} {detailsFile.uploadedBy.lastName}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modified</span>
                  <span>{detailsFile && safeFormat(detailsFile.updatedAt, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{detailsFile && safeFormat(detailsFile.createdAt, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>v{detailsFile?.currentVersion}</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Upload Progress */}
        <UploadProgress uploads={uploads} />
        
        {/* New Folder Dialog */}
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Folder name</Label>
                <Input
                  placeholder="Untitled folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Color (optional)</Label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.value || 'default'}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all",
                        color.class.split(' ').slice(0, 2).join(' '),
                        newFolderColor === color.value ? "border-primary scale-110" : "border-transparent hover:scale-105"
                      )}
                      onClick={() => setNewFolderColor(color.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
                {createFolderMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Rename Dialog */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
              <Button onClick={handleRename}>Rename</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move to trash?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteTarget?.name}" will be moved to trash. You can restore it from trash within 30 days.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Move to trash
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Move Dialog */}
        <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ScrollArea className="h-60 border rounded-lg p-2">
                <button
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left",
                    moveDestination === null ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                  onClick={() => setMoveDestination(null)}
                >
                  <HardDrive className="h-4 w-4" />
                  <span>My Drive</span>
                </button>
                {folderTree && (folderTree as any[]).map((folder: any) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    selectedId={moveDestination || undefined}
                    onSelect={(id) => setMoveDestination(id)}
                    expandedIds={expandedFolders}
                    onToggle={toggleFolderExpand}
                  />
                ))}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Cancel</Button>
              <Button onClick={handleMove}>Move</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Bulk Move Dialog */}
        <Dialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move {selectedItems.size} item(s) to</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ScrollArea className="h-60 border rounded-lg p-2">
                <button
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left",
                    bulkMoveDestination === null ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                  onClick={() => setBulkMoveDestination(null)}
                >
                  <HardDrive className="h-4 w-4" />
                  <span>My Drive</span>
                </button>
                {folderTree && (folderTree as any[]).map((folder: any) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    selectedId={bulkMoveDestination || undefined}
                    onSelect={(id) => setBulkMoveDestination(id)}
                    expandedIds={expandedFolders}
                    onToggle={toggleFolderExpand}
                  />
                ))}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkMoveDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => handleBulkMove(bulkMoveDestination)}
                disabled={bulkMoveFilesMutation.isPending || bulkMoveFoldersMutation.isPending}
              >
                {bulkMoveFilesMutation.isPending || bulkMoveFoldersMutation.isPending ? 'Moving...' : 'Move'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share "{shareTarget?.name}"</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {shareTarget?.isShared && shareTarget?.shareLink && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Anyone with this link can view</p>
                  <div className="flex gap-2">
                    <Input value={shareTarget.shareLink} readOnly className="text-sm" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(shareTarget.shareLink || '');
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>Cancel</Button>
              {shareTarget?.isShared ? (
                <Button variant="destructive" onClick={() => handleShare(false)}>
                  <Lock className="mr-2 h-4 w-4" /> Disable sharing
                </Button>
              ) : (
                <Button onClick={() => handleShare(true)}>
                  <Link2 className="mr-2 h-4 w-4" /> Get shareable link
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Versions Dialog */}
        <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Version history</DialogTitle>
              <DialogDescription>
                View and restore previous versions of "{versionsTarget?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowUploadVersionDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload new version
                </Button>
              </div>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {fileVersions && (fileVersions as any[]).map((version: any) => (
                    <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          id={version.uploadedBy.id}
                          firstName={version.uploadedBy.firstName}
                          lastName={version.uploadedBy.lastName}
                          size="md"
                        />
                        <div>
                          <p className="text-sm font-medium">Version {version.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {version.uploadedBy.firstName} {version.uploadedBy.lastName} • {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                          </p>
                          {version.changeNote && (
                            <p className="text-xs text-muted-foreground mt-1">"{version.changeNote}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatBytes(version.size)}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRestoreVersion(version.version)}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Upload Version Dialog */}
        <Dialog open={showUploadVersionDialog} onOpenChange={setShowUploadVersionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload new version</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Change note (optional)</Label>
                <Textarea
                  placeholder="Describe what changed in this version..."
                  value={versionChangeNote}
                  onChange={(e) => setVersionChangeNote(e.target.value)}
                />
              </div>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm mb-2">Drop file here or click to browse</p>
                <label>
                  <Button variant="outline" size="sm">
                    Select file
                  </Button>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleUploadVersion(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Preview Dialog - Full Screen */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 rounded-none border-0 bg-black/80 backdrop-blur-sm flex flex-col">
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {(() => {
                  const info = previewFile ? getFileTypeInfo(previewFile.mimeType, previewFile.name) : null;
                  const Icon = info?.icon || FileIcon;
                  return <Icon className={cn("h-6 w-6 flex-shrink-0", info?.color)} />;
                })()}
                <span className="font-medium truncate text-foreground">{previewFile?.name}</span>
                {previewFile?.isStarred && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => previewFileUrl && handleDownload(previewFile!.id)}
                  disabled={!previewFileUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowPreviewDialog(false)}
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Content Area - Transparent */}
            <div className="flex-1 flex items-center justify-center overflow-hidden mt-14 mb-12">
              {previewUrlLoading ? (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                  <p className="text-sm text-white/70">Loading preview...</p>
                </div>
              ) : previewFile?.mimeType.startsWith('image/') && previewFileUrl ? (
                <img 
                  src={previewFileUrl} 
                  alt={previewFile.name} 
                  className="max-w-full max-h-full object-contain" 
                />
              ) : previewFile?.mimeType.includes('pdf') && previewFileUrl ? (
                <iframe 
                  src={previewFileUrl} 
                  className="w-full h-full border-0 bg-white"
                  title={previewFile.name}
                />
              ) : (
                <div className="text-center p-8">
                  {(() => {
                    const info = previewFile ? getFileTypeInfo(previewFile.mimeType, previewFile.name) : null;
                    const Icon = info?.icon || FileIcon;
                    return (
                      <>
                        <Icon className={cn("h-24 w-24 mx-auto mb-4 text-white/70", info?.color)} />
                        <p className="text-lg font-medium mb-2 text-white">Preview not available</p>
                        <p className="text-sm text-white/70 mb-4">This file type cannot be previewed</p>
                        <Button onClick={() => previewFile && handleDownload(previewFile.id)}>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* Fixed Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <FileIcon className="h-4 w-4" />
                  {previewFile?.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                </span>
                <span>{previewFile && formatBytes(previewFile.size)}</span>
                <span>Version {previewFile?.currentVersion}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Uploaded by {previewFile?.uploadedBy?.firstName} {previewFile?.uploadedBy?.lastName}</span>
                <span>{previewFile && formatDistanceToNow(new Date(previewFile.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

