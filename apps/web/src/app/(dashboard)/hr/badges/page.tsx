'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Trophy,
  TrendingUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  useBadges,
  useBadgeStats,
  useCreateBadge,
  useUpdateBadge,
  useDeleteBadge,
} from '@/hooks/use-badges';
import { seedBadges } from '@/lib/api/badges';
import { getIconComponent } from '@/components/badges/AssignBadgeDialog';
import type { BadgeDefinition, BadgeCategory, CreateBadgeInput } from '@/lib/api/badges';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES: { value: BadgeCategory; label: string }[] = [
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'TEAMWORK', label: 'Teamwork' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'INNOVATION', label: 'Innovation' },
  { value: 'LEARNING', label: 'Learning' },
  { value: 'MILESTONE', label: 'Milestone' },
  { value: 'SPECIAL', label: 'Special' },
];

const ICON_OPTIONS = [
  'Award', 'Clock', 'Users', 'Lightbulb', 'Heart', 'Star',
  'GraduationCap', 'Zap', 'Shield', 'Trophy', 'ThumbsUp',
  'Code', 'Target', 'Flame',
];

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-cyan-500', label: 'Cyan' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-slate-500', label: 'Slate' },
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-emerald-500', label: 'Emerald' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-rose-500', label: 'Rose' },
  { value: 'bg-teal-500', label: 'Teal' },
];

const CATEGORY_COLORS: Record<BadgeCategory, string> = {
  PERFORMANCE: 'bg-amber-100 text-amber-800',
  ATTENDANCE: 'bg-blue-100 text-blue-800',
  TEAMWORK: 'bg-green-100 text-green-800',
  LEADERSHIP: 'bg-purple-100 text-purple-800',
  INNOVATION: 'bg-orange-100 text-orange-800',
  LEARNING: 'bg-cyan-100 text-cyan-800',
  MILESTONE: 'bg-yellow-100 text-yellow-800',
  SPECIAL: 'bg-pink-100 text-pink-800',
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function BadgesPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<BadgeCategory | 'ALL'>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateBadgeInput>({
    name: '',
    description: '',
    icon: 'Award',
    color: 'bg-blue-500',
    category: 'SPECIAL',
    points: 10,
    isActive: true,
  });

  // Queries
  const { data: badges, isLoading, refetch } = useBadges(
    filterCategory === 'ALL' ? { search: search || undefined } : { search: search || undefined, category: filterCategory }
  );
  const { data: stats, refetch: refetchStats } = useBadgeStats();

  // Mutations
  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();
  const deleteMutation = useDeleteBadge();

  const handleOpenCreate = () => {
    setEditingBadge(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Award',
      color: 'bg-blue-500',
      category: 'SPECIAL',
      points: 10,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (badge: BadgeDefinition) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description || '',
      icon: badge.icon,
      color: badge.color,
      category: badge.category,
      points: badge.points,
      isActive: badge.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Badge name is required');
      return;
    }

    try {
      if (editingBadge) {
        await updateMutation.mutateAsync({ id: editingBadge.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleSeedBadges = async () => {
    try {
      setSeeding(true);
      const result = await seedBadges();
      if (result.created && result.created > 0) {
        toast.success(`${result.created} default badges created`);
        refetch();
        refetchStats();
      } else if (result.existingCount && result.existingCount > 0) {
        toast.info(`Default badges already exist (${result.existingCount} badges)`);
      } else {
        toast.info('Default badges already exist');
      }
    } catch (error: any) {
      toast.error('Failed to seed default badges');
    } finally {
      setSeeding(false);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Badges & Achievements</h2>
          <p className="text-muted-foreground">
            Manage badge definitions and recognize employee achievements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeedBadges} disabled={seeding || isLoading}>
            <Sparkles className={`h-4 w-4 mr-2 ${seeding ? 'animate-pulse' : ''}`} />
            {seeding ? 'Seeding...' : 'Seed Defaults'}
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Badge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Badges</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_badges ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Times Awarded</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_assignments ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees Recognized</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.employees_with_badges ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Givers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unique_givers ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search badges..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge
                variant={filterCategory === 'ALL' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterCategory('ALL')}
              >
                All
              </Badge>
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={filterCategory === cat.value ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterCategory(cat.value)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !badges || badges.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No badges found</p>
              <p className="text-sm mb-4">Create your first badge or seed default badges to start recognizing employees.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleSeedBadges} disabled={seeding}>
                  <Sparkles className={`h-4 w-4 mr-2 ${seeding ? 'animate-pulse' : ''}`} />
                  Seed Default Badges
                </Button>
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Badge
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="text-center">Awarded</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges.map((badge) => {
                  const Icon = getIconComponent(badge.icon);
                  return (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${badge.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{badge.name}</div>
                          {badge.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {badge.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${CATEGORY_COLORS[badge.category]}`}>
                          {CATEGORIES.find(c => c.value === badge.category)?.label || badge.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{badge.points}</TableCell>
                      <TableCell className="text-center">{badge.times_awarded}x</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={badge.is_active ? 'default' : 'secondary'}>
                          {badge.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(badge)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(badge.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBadge ? 'Edit Badge' : 'Create Badge'}</DialogTitle>
            <DialogDescription>
              {editingBadge
                ? 'Update the badge definition.'
                : 'Create a new badge that can be awarded to employees.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${formData.color}`}>
                {(() => {
                  const Icon = getIconComponent(formData.icon || 'Award');
                  return <Icon className="h-6 w-6 text-white" />;
                })()}
              </div>
              <div>
                <h4 className="font-medium">{formData.name || 'Badge Name'}</h4>
                <p className="text-xs text-muted-foreground">{formData.description || 'Badge description'}</p>
              </div>
              <Badge className="ml-auto" variant="secondary">{formData.points} pts</Badge>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Star Performer"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this badge awarded for?"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Row: Category + Points */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as BadgeCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>

            {/* Row: Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => {
                      const IconComp = getIconComponent(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full ${color.value}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active (available for awarding)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingBadge ? 'Update Badge' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Badge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this badge and all its assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
