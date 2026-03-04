'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Loader2,
  Check,
  Clock,
  Users,
  Lightbulb,
  Heart,
  Star,
  GraduationCap,
  Zap,
  Shield,
  Trophy,
  ThumbsUp,
  Code,
  Target,
  Flame,
} from 'lucide-react';
import { useBadges, useAssignBadge } from '@/hooks/use-badges';
import type { BadgeDefinition, BadgeCategory } from '@/lib/api/badges';

// ============================================================================
// ICON MAP - maps icon string names to Lucide components
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Clock,
  Users,
  Lightbulb,
  Heart,
  Star,
  GraduationCap,
  Zap,
  Shield,
  Trophy,
  ThumbsUp,
  Code,
  Target,
  Flame,
};

export function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] || Award;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  PERFORMANCE: 'Performance',
  ATTENDANCE: 'Attendance',
  TEAMWORK: 'Teamwork',
  LEADERSHIP: 'Leadership',
  INNOVATION: 'Innovation',
  LEARNING: 'Learning',
  MILESTONE: 'Milestone',
  SPECIAL: 'Special',
};

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
// COMPONENT
// ============================================================================

interface AssignBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}

export function AssignBadgeDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: AssignBadgeDialogProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [reason, setReason] = useState('');
  const [filterCategory, setFilterCategory] = useState<BadgeCategory | ''>('');

  const { data: badges, isLoading } = useBadges({ isActive: true });
  const assignMutation = useAssignBadge();

  const filteredBadges = badges?.filter(
    (b) => !filterCategory || b.category === filterCategory
  ) ?? [];

  const handleAssign = async () => {
    if (!selectedBadge) return;

    await assignMutation.mutateAsync({
      employeeId,
      badgeId: selectedBadge.id,
      reason: reason.trim() || undefined,
    });

    setSelectedBadge(null);
    setReason('');
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedBadge(null);
      setReason('');
      setFilterCategory('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Award Badge to {employeeName}
          </DialogTitle>
          <DialogDescription>
            Select a badge and optionally provide a reason for this recognition.
          </DialogDescription>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 pb-2">
          <Badge
            variant={filterCategory === '' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterCategory('')}
          >
            All
          </Badge>
          {(Object.keys(CATEGORY_LABELS) as BadgeCategory[]).map((cat) => (
            <Badge
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
            >
              {CATEGORY_LABELS[cat]}
            </Badge>
          ))}
        </div>

        {/* Badge selection */}
        <div className="h-[260px] border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredBadges.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-2">
              No badges available{filterCategory ? ' in this category' : ''}.
            </div>
          ) : (
            <div className="space-y-1.5 py-2 px-0">
              {filteredBadges.map((badge) => {
                const Icon = getIconComponent(badge.icon);
                const isSelected = selectedBadge?.id === badge.id;
                return (
                  <div
                    key={badge.id}
                    onClick={() => setSelectedBadge(isSelected ? null : badge)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mx-1 ${
                      isSelected
                        ? 'bg-primary/10 ring-2 ring-inset ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${badge.color} shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[badge.category]}`}>
                          {CATEGORY_LABELS[badge.category]}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {badge.points} pts
                        </span>
                      </div>
                      {badge.description && (
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="badge-reason">Reason (optional)</Label>
          <Textarea
            id="badge-reason"
            placeholder="e.g., Outstanding performance during Q4 sprint..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedBadge || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Awarding...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Award Badge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
