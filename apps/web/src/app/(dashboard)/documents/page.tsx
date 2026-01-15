'use client';

import { useState, useCallback } from 'react';
import {
  useFolders,
  useFiles,
  useCreateFolder,
  useUploadFile,
  useDeleteFile,
  useDeleteFolder,
  useFolderBreadcrumbs,
  useStorageStats,
  File,
  Folder,
} from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import {
  FolderPlus,
  Upload,
  Search,
  MoreVertical,
  Folder as FolderIcon,
  File as FileIcon,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  ChevronRight,
  Home,
  Download,
  Trash2,
  Grid,
  List,
} from 'lucide-react';

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return FileIcon;
}

export default function DocumentsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  const { data: folders, isLoading: foldersLoading } = useFolders(currentFolderId);
  const { data: filesData, isLoading: filesLoading } = useFiles({
    folderId: currentFolderId,
    search,
  });
  const { data: breadcrumbs } = useFolderBreadcrumbs(currentFolderId || '');
  const { data: storageStats } = useStorageStats();

  const createFolderMutation = useCreateFolder();
  const uploadFileMutation = useUploadFile();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderMutation = useDeleteFolder();

  const files = filesData?.items || [];
  const isLoading = foldersLoading || filesLoading;

  const onDrop = useCallback(
    async (acceptedFiles: globalThis.File[]) => {
      for (const file of acceptedFiles) {
        try {
          await uploadFileMutation.mutateAsync({ file, folderId: currentFolderId });
          toast.success(`Uploaded ${file.name}`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [currentFolderId, uploadFileMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName,
        parentId: currentFolderId,
      });
      toast.success('Folder created');
      setNewFolderName('');
      setShowNewFolderDialog(false);
    } catch {
      toast.error('Failed to create folder');
    }
  }

  async function handleDeleteFile(id: string) {
    try {
      await deleteFileMutation.mutateAsync(id);
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolderMutation.mutateAsync(id);
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete folder');
    }
  }

  return (
    <div className="space-y-6" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Drop overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 border-2 border-dashed border-primary">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-xl font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            Manage your files and folders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background">
                <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <label>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  onDrop(Array.from(e.target.files));
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage Used</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(storageStats.used)} / {formatBytes(storageStats.limit)}
              </span>
            </div>
            <Progress value={storageStats.usedPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Breadcrumbs & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(undefined)}
          >
            <Home className="h-4 w-4" />
          </Button>
          {breadcrumbs?.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setView('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Grid View */}
          {view === 'grid' && (
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
              {/* Folders */}
              {folders?.map((folder) => (
                <Card
                  key={folder.id}
                  className="group cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <FolderIcon className="h-12 w-12 text-yellow-500" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="font-medium text-sm mt-2 truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {folder.fileCount || 0} files
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Files */}
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <Card key={file.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Icon className="h-12 w-12 text-blue-500" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="font-medium text-sm mt-2 truncate" title={file.originalName}>
                        {file.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Size</th>
                      <th className="text-left p-4 font-medium">Modified</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folders?.map((folder) => (
                      <tr
                        key={folder.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <FolderIcon className="h-5 w-5 text-yellow-500" />
                            <span className="font-medium">{folder.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {folder.fileCount || 0} files
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(folder.updatedAt)}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {files.map((file) => {
                      const Icon = getFileIcon(file.mimeType);
                      return (
                        <tr key={file.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">{file.originalName}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {formatBytes(file.size)}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {formatDate(file.updatedAt)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {(folders?.length === 0 && files.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No files or folders</h3>
              <p className="text-muted-foreground mb-4">
                Create a folder or upload files to get started
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
                <label>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Files
                  </Button>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        onDrop(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
