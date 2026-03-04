'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Star, Search, Loader2 } from 'lucide-react';
import { SKILL_CATEGORIES, SKILL_SUGGESTIONS, type SkillLevel } from '@/lib/api/skills';

interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkillNames: string[];
  onAddSkill: (skill: { name: string; category: string; level: SkillLevel }) => Promise<void>;
  isAdding?: boolean;
}

// Map 1-5 stars to skill levels
const STAR_TO_LEVEL: Record<number, SkillLevel> = {
  1: 'beginner',
  2: 'beginner',
  3: 'intermediate',
  4: 'advanced',
  5: 'expert',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Learning',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export function AddSkillDialog({
  open,
  onOpenChange,
  existingSkillNames,
  onAddSkill,
  isAdding,
}: AddSkillDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);

  // Normalize existing skill names for comparison (lowercase)
  const existingNormalized = useMemo(
    () => new Set(existingSkillNames.map((n) => n.toLowerCase())),
    [existingSkillNames]
  );

  // Get all available skills filtered by category and search, excluding already added
  const availableSkills = useMemo(() => {
    const result: { name: string; category: string; isCustom?: boolean }[] = [];

    const categories = selectedCategory
      ? [selectedCategory]
      : (SKILL_CATEGORIES as unknown as string[]);

    // Check if search query is a custom skill (not in any predefined list)
    const allPredefinedSkills = new Set(
      Object.values(SKILL_SUGGESTIONS).flat().map((s) => s.toLowerCase())
    );
    const searchTrimmed = searchQuery.trim();
    const isCustomSkill =
      searchTrimmed.length >= 2 &&
      !allPredefinedSkills.has(searchTrimmed.toLowerCase()) &&
      !existingNormalized.has(searchTrimmed.toLowerCase());

    // Add custom skill at top if applicable
    if (isCustomSkill) {
      result.push({
        name: searchTrimmed,
        category: selectedCategory || 'General',
        isCustom: true,
      });
    }

    for (const cat of categories) {
      const suggestions = SKILL_SUGGESTIONS[cat] || [];
      for (const skill of suggestions) {
        if (existingNormalized.has(skill.toLowerCase())) continue;
        if (
          searchQuery &&
          !skill.toLowerCase().includes(searchQuery.toLowerCase())
        )
          continue;
        result.push({ name: skill, category: cat });
      }
    }

    return result;
  }, [selectedCategory, searchQuery, existingNormalized]);

  const handleAddSkill = async (skillName: string, category: string, stars: number) => {
    setAddingSkill(skillName);
    try {
      await onAddSkill({
        name: skillName,
        category,
        level: STAR_TO_LEVEL[stars],
      });
    } finally {
      setAddingSkill(null);
      setHoveredSkill(null);
      setHoveredStars(0);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedCategory('');
      setSearchQuery('');
      setHoveredSkill(null);
      setHoveredStars(0);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Skills & Expertise</DialogTitle>
          <DialogDescription>
            Select a skill and rate your proficiency (1-5 stars)
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedCategory === '' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedCategory('')}
          >
            All
          </Badge>
          {(SKILL_CATEGORIES as unknown as string[]).map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Skills list */}
        <ScrollArea className="h-[300px] border rounded-lg">
          {availableSkills.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
              {searchQuery
                ? existingNormalized.has(searchQuery.trim().toLowerCase())
                  ? 'This skill is already added'
                  : 'Type at least 2 characters to add a custom skill'
                : 'All skills in this category have been added!'}
            </div>
          ) : (
            <div className="divide-y">
              {availableSkills.map(({ name, category, isCustom }) => {
                const isHovered = hoveredSkill === name;
                const isBeingAdded = addingSkill === name;

                return (
                  <div
                    key={`${category}-${name}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    onMouseLeave={() => {
                      if (!isBeingAdded) {
                        setHoveredSkill(null);
                        setHoveredStars(0);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{name}</p>
                        {isCustom && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{category}</p>
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {isBeingAdded ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground w-20 text-right mr-1">
                            {isHovered && hoveredStars > 0 ? LEVEL_LABELS[hoveredStars] : ''}
                          </span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              className="p-0.5 transition-transform hover:scale-110"
                              onMouseEnter={() => {
                                setHoveredSkill(name);
                                setHoveredStars(star);
                              }}
                              onClick={() => handleAddSkill(name, category, star)}
                              title={LEVEL_LABELS[star]}
                            >
                              <Star
                                className={`h-5 w-5 transition-colors ${
                                  isHovered && star <= hoveredStars
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Help text */}
        <p className="text-xs text-muted-foreground text-center">
          Click stars to rate proficiency and add skill. Type to search or add custom skills.
        </p>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
