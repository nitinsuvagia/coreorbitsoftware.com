'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PreviewTestDialog } from '../../../_components/PreviewTestDialog';
import { assessmentApi, AssessmentTest, BankQuestion, UpdateTestDto } from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  FileQuestion,
  ListChecks,
  Code,
  Type,
  FileText,
  ToggleLeft,
  Upload,
  Search,
  Check,
  X,
  Shuffle,
  Save,
  ChevronUp,
  ChevronDown,
  Percent,
  HelpCircle,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Question {
  id: string;
  question: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  tags: string[];
}

interface Section {
  id: string;
  category: string;
  selectionMode: 'random' | 'fixed';
  randomCount: number;
  selectedQuestions: Question[];
  weightage: number;
  shuffleQuestions: boolean;
}

interface TestFormData {
  name: string;
  description: string;
  instructions: string;
  duration: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScore: boolean;
  showAnswers: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  enableProctoring: boolean;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  webcamRequired: boolean;
  fullscreen: boolean;
  tabSwitchLimit: number;
  sections: Section[];
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const typeIcons: Record<string, React.ElementType> = {
  mcq: ListChecks,
  multi_select: ListChecks,
  true_false: ToggleLeft,
  short_text: Type,
  long_text: FileText,
  code: Code,
  file_upload: Upload,
};

// ============================================================================
// QUESTION SELECTOR DIALOG
// ============================================================================

interface QuestionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  selectedIds: string[];
  onSelect: (questions: Question[]) => void;
  questionsBank: Question[];
}

function QuestionSelectorDialog({ open, onOpenChange, category, selectedIds, onSelect, questionsBank }: QuestionSelectorProps) {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const categoryQuestions = questionsBank.filter((q) => q.category === category);

  const filteredQuestions = categoryQuestions.filter((q) => {
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const toggleQuestion = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedQuestions = questionsBank.filter((q) => selected.includes(q.id));
    onSelect(selectedQuestions);
    onOpenChange(false);
  };

  const totalPoints = questionsBank
    .filter((q) => selected.includes(q.id))
    .reduce((acc, q) => acc + q.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Questions from {category}</DialogTitle>
          <DialogDescription>
            Choose specific questions to include in this section
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] border rounded-lg">
          <div className="p-2 space-y-2">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No questions found in this category</p>
              </div>
            ) : (
              filteredQuestions.map((question) => {
                const TypeIcon = typeIcons[question.type] || FileQuestion;
                const isSelected = selected.includes(question.id);

                return (
                  <div
                    key={question.id}
                    onClick={() => toggleQuestion(question.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} className="mt-1" />
                    <div className="p-2 rounded-lg bg-muted">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-2">{question.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={difficultyColors[question.difficulty]}
                          variant="secondary"
                        >
                          {question.difficulty}
                        </Badge>
                        <span className="text-sm font-medium">{question.points} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm">
            <span className="font-medium">{selected.length}</span> questions selected •{' '}
            <span className="font-medium">{totalPoints}</span> total points
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Confirm Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SECTION CARD COMPONENT
// ============================================================================

interface SectionCardProps {
  section: Section;
  index: number;
  onUpdate: (updates: Partial<Section>) => void;
  onRemove: () => void;
  onSelectQuestions: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  questionsBank: Question[];
  categories: string[];
}

function SectionCard({
  section,
  index,
  onUpdate,
  onRemove,
  onSelectQuestions,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  questionsBank,
  categories,
}: SectionCardProps) {
  const categoryQuestions = questionsBank.filter((q) => q.category === section.category);
  const totalCategoryQuestions = categoryQuestions.length;
  
  const getQuestionsCount = () => {
    if (section.selectionMode === 'random') {
      return Math.min(section.randomCount, totalCategoryQuestions);
    }
    return section.selectedQuestions.length;
  };

  const getTotalPoints = () => {
    if (section.selectionMode === 'fixed') {
      return section.selectedQuestions.reduce((acc, q) => acc + q.points, 0);
    }
    const avgPoints = categoryQuestions.reduce((acc, q) => acc + q.points, 0) / totalCategoryQuestions;
    return Math.round(avgPoints * section.randomCount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <Badge variant="outline">Section {index + 1}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={section.category}
              onValueChange={(value) => onUpdate({ 
                category: value, 
                selectedQuestions: [],
                randomCount: 5 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({questionsBank.filter(q => q.category === cat).length} questions)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Weightage (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={section.weightage}
                onChange={(e) => onUpdate({ weightage: parseInt(e.target.value) || 0 })}
                min={0}
                max={100}
                className="flex-1"
              />
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {section.category && (
          <>
            <div className="space-y-3">
              <Label>Question Selection</Label>
              <RadioGroup
                value={section.selectionMode}
                onValueChange={(value: 'random' | 'fixed') => onUpdate({ 
                  selectionMode: value,
                  selectedQuestions: value === 'random' ? [] : section.selectedQuestions
                })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="random" id={`random-${section.id}`} />
                  <Label htmlFor={`random-${section.id}`} className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      Random Questions
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id={`fixed-${section.id}`} />
                  <Label htmlFor={`fixed-${section.id}`} className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Fixed Questions
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {section.selectionMode === 'random' && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Number of questions to pick randomly</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={section.randomCount}
                      onChange={(e) => onUpdate({ 
                        randomCount: Math.min(parseInt(e.target.value) || 0, totalCategoryQuestions)
                      })}
                      min={1}
                      max={totalCategoryQuestions}
                      className="w-20 h-8"
                    />
                    <span className="text-sm text-muted-foreground">
                      of {totalCategoryQuestions}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Questions will be randomly selected from the &quot;{section.category}&quot; category for each candidate
                </p>
              </div>
            )}

            {section.selectionMode === 'fixed' && (
              <div className="border rounded-lg">
                {section.selectedQuestions.length > 0 ? (
                  <div className="divide-y">
                    {section.selectedQuestions.map((question, qIndex) => {
                      const TypeIcon = typeIcons[question.type] || FileQuestion;
                      return (
                        <div
                          key={question.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50"
                        >
                          <span className="text-sm text-muted-foreground w-6">{qIndex + 1}.</span>
                          <div className="p-1.5 rounded bg-muted">
                            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <p className="flex-1 text-sm line-clamp-1">{question.question}</p>
                          <Badge
                            className={difficultyColors[question.difficulty]}
                            variant="secondary"
                          >
                            {question.difficulty}
                          </Badge>
                          <span className="text-sm font-medium">{question.points} pts</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdate({
                              selectedQuestions: section.selectedQuestions.filter(q => q.id !== question.id)
                            })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No questions selected</p>
                  </div>
                )}

                <div className="p-3 border-t bg-muted/30">
                  <Button variant="outline" size="sm" className="w-full" onClick={onSelectQuestions}>
                    <Plus className="h-4 w-4 mr-1" />
                    Select Questions from Bank
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{getQuestionsCount()}</span> questions 
                {section.selectionMode === 'random' && ' (random)'}
              </span>
              <span className="text-muted-foreground">
                ~<span className="font-medium text-foreground">{getTotalPoints()}</span> points
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.shuffleQuestions}
                  onCheckedChange={(checked) => onUpdate({ shuffleQuestions: checked })}
                />
                <Label className="text-sm font-normal">Shuffle order</Label>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionSelectorOpen, setQuestionSelectorOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Question bank state
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState<TestFormData>({
    name: '',
    description: '',
    instructions: '',
    duration: 60,
    passingScore: 70,
    shuffleQuestions: false,
    shuffleOptions: false,
    showScore: true,
    showAnswers: false,
    allowRetake: false,
    maxAttempts: 1,
    enableProctoring: false,
    preventTabSwitch: true,
    preventCopyPaste: true,
    webcamRequired: false,
    fullscreen: true,
    tabSwitchLimit: 3,
    sections: [],
  });

  // Fetch question bank data from API
  useEffect(() => {
    const loadQuestionBank = async () => {
      try {
        setLoadingQuestions(true);
        const [questionsData, categoriesData] = await Promise.all([
          assessmentApi.getAllQuestions(),
          assessmentApi.getQuestionCategories(),
        ]);
        
        // Map API questions to local Question format
        const mappedQuestions: Question[] = questionsData.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          category: q.category || 'Uncategorized',
          points: q.points,
          tags: q.tags || [],
        }));
        
        setBankQuestions(mappedQuestions);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load question bank:', error);
        toast.error('Failed to load question bank');
      } finally {
        setLoadingQuestions(false);
      }
    };
    
    loadQuestionBank();
  }, []);

  // Load existing test data
  useEffect(() => {
    const loadTest = async () => {
      setIsLoading(true);
      try {
        const testData = await assessmentApi.getTestById(testId);
        
        // Map API test data to form data
        setFormData({
          name: testData.name,
          description: testData.description || '',
          instructions: testData.instructions || '',
          duration: testData.duration,
          passingScore: testData.passingScore,
          shuffleQuestions: testData.shuffleQuestions,
          shuffleOptions: testData.shuffleOptions,
          showScore: testData.showResults,
          showAnswers: false,
          allowRetake: testData.maxAttempts > 1,
          maxAttempts: testData.maxAttempts,
          enableProctoring: testData.proctoring,
          preventTabSwitch: testData.tabSwitchLimit > 0,
          preventCopyPaste: testData.fullscreen,
          webcamRequired: testData.webcamRequired,
          fullscreen: testData.fullscreen,
          tabSwitchLimit: testData.tabSwitchLimit,
          sections: (testData.sections || []).map((s) => ({
            id: s.id,
            category: s.category || s.name,
            selectionMode: (s.selectionMode as 'random' | 'fixed') || 'fixed',
            randomCount: s.randomCount ?? 5,
            selectedQuestions: (s.questions || []).map((q) => ({
              id: q.id,
              question: q.question,
              type: q.type,
              difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
              category: s.category || s.name,
              points: q.points,
              tags: [],
            })),
            weightage: s.weightage ?? (100 / Math.max(1, testData.sections?.length || 1)),
            shuffleQuestions: s.shuffleQuestions ?? testData.shuffleQuestions,
          })),
        });
      } catch (error) {
        console.error('Failed to load test:', error);
        toast.error('Failed to load test');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    loadTest();
  }, [testId, router]);

  const updateFormData = (updates: Partial<TestFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      category: '',
      selectionMode: 'random',
      randomCount: 5,
      selectedQuestions: [],
      weightage: 0,
      shuffleQuestions: false,
    };
    updateFormData({ sections: [...formData.sections, newSection] });
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    updateFormData({
      sections: formData.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const removeSection = (sectionId: string) => {
    updateFormData({
      sections: formData.sections.filter((s) => s.id !== sectionId),
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const sections = [...formData.sections];
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    updateFormData({ sections });
  };

  const handleSelectQuestions = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setQuestionSelectorOpen(true);
  };

  const handleQuestionsSelected = (questions: Question[]) => {
    if (activeSectionId) {
      updateSection(activeSectionId, { selectedQuestions: questions });
    }
    setActiveSectionId(null);
  };

  const totalQuestions = formData.sections.reduce((acc, section) => {
    if (section.selectionMode === 'random') {
      const categoryCount = bankQuestions.filter(q => q.category === section.category).length;
      return acc + Math.min(section.randomCount, categoryCount);
    }
    return acc + section.selectedQuestions.length;
  }, 0);

  const totalWeightage = formData.sections.reduce((acc, s) => acc + s.weightage, 0);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    if (formData.sections.length === 0) {
      toast.error('Please add at least one section');
      return;
    }

    const emptySections = formData.sections.filter(s => !s.category);
    if (emptySections.length > 0) {
      toast.error('Please select a category for all sections');
      return;
    }

    const fixedSectionsWithoutQuestions = formData.sections.filter(
      s => s.selectionMode === 'fixed' && s.selectedQuestions.length === 0
    );
    if (fixedSectionsWithoutQuestions.length > 0) {
      toast.error('Please select questions for fixed sections');
      return;
    }

    if (totalWeightage !== 100) {
      toast.error(`Total weightage must equal 100%. Currently: ${totalWeightage}%`);
      return;
    }

    setIsSaving(true);
    try {
      // Build the update data
      const updateData: UpdateTestDto = {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        duration: formData.duration,
        passingScore: formData.passingScore,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        showResults: formData.showScore,
        maxAttempts: formData.maxAttempts,
        proctoring: formData.enableProctoring,
        webcamRequired: formData.webcamRequired,
        fullscreen: formData.fullscreen || formData.preventCopyPaste,
        tabSwitchLimit: formData.preventTabSwitch ? (formData.tabSwitchLimit || 3) : 0,
        // Include sections with their weightage and questions
        sections: formData.sections.map((section, index) => ({
          name: section.category,
          description: section.selectionMode === 'random' 
            ? `Random ${section.randomCount} questions from ${section.category}` 
            : `${section.selectedQuestions.length} fixed questions from ${section.category}`,
          order: index,
          weightage: section.weightage,
          // Selection mode fields
          selectionMode: section.selectionMode,
          category: section.category,
          randomCount: section.selectionMode === 'random' ? section.randomCount : undefined,
          shuffleQuestions: section.shuffleQuestions,
          // Send question IDs for fixed selections
          questionIds: section.selectionMode === 'fixed' 
            ? section.selectedQuestions.map(q => q.id)
            : undefined,
        })),
      };
      
      await assessmentApi.updateTest(testId, updateData);
      toast.success('Test updated successfully');
      router.push(`/hr/assessments/tests/${testId}`);
    } catch (error) {
      console.error('Failed to save test:', error);
      toast.error('Failed to save test');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSection = formData.sections.find(s => s.id === activeSectionId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>

            {/* Sections Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Settings Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Proctoring Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Summary Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/assessments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Test</h1>
          <p className="text-muted-foreground mt-2">Update assessment test details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/hr/assessments')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Test Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="e.g., Frontend Developer Assessment"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => updateFormData({ description: value })}
                  placeholder="Brief description of what this test covers..."
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    updateFormData({ duration: parseInt(e.target.value) || 60 })
                  }
                  min={5}
                  max={300}
                  className="w-32"
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions</Label>
                <RichTextEditor
                  value={formData.instructions}
                  onChange={(value) => updateFormData({ instructions: value })}
                  placeholder="Instructions that will be shown to candidates before starting the test..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
              <CardDescription>
                Add sections by category. For each section, choose to pick random questions or select specific ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections.length === 0 ? (
                <div className="p-8 text-center border rounded-lg border-dashed">
                  <FileQuestion className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-1">No sections added</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add sections to organize your test by category
                  </p>
                  <Button onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {formData.sections.map((section, index) => (
                      <SectionCard
                        key={section.id}
                        section={section}
                        index={index}
                        onUpdate={(updates) => updateSection(section.id, updates)}
                        onRemove={() => removeSection(section.id)}
                        onSelectQuestions={() => handleSelectQuestions(section.id)}
                        onMoveUp={() => moveSection(index, 'up')}
                        onMoveDown={() => moveSection(index, 'down')}
                        canMoveUp={index > 0}
                        canMoveDown={index < formData.sections.length - 1}
                        questionsBank={bankQuestions}
                        categories={categories}
                      />
                    ))}
                  </div>

                  <Button variant="outline" className="w-full" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>

                  {formData.sections.length > 0 && totalWeightage !== 100 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                      <HelpCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Total weightage: <strong>{totalWeightage}%</strong>. Must equal 100%.
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-medium">{formData.sections.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Weightage</span>
                <span className={`font-medium ${totalWeightage === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {totalWeightage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{formData.duration} min</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Passing Score</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) =>
                      updateFormData({ passingScore: parseInt(e.target.value) || 0 })
                    }
                    className="w-16 h-8"
                    min={0}
                    max={100}
                  />
                  <span>%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Accordion type="single" collapsible defaultValue="display">
            <AccordionItem value="display">
              <AccordionTrigger>Display Settings</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Shuffle Questions</Label>
                  <Switch
                    checked={formData.shuffleQuestions}
                    onCheckedChange={(checked) =>
                      updateFormData({ shuffleQuestions: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Shuffle Options</Label>
                  <Switch
                    checked={formData.shuffleOptions}
                    onCheckedChange={(checked) =>
                      updateFormData({ shuffleOptions: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Score After</Label>
                  <Switch
                    checked={formData.showScore}
                    onCheckedChange={(checked) => updateFormData({ showScore: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Answers After</Label>
                  <Switch
                    checked={formData.showAnswers}
                    onCheckedChange={(checked) =>
                      updateFormData({ showAnswers: checked })
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="retake">
              <AccordionTrigger>Retake Settings</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow Retake</Label>
                  <Switch
                    checked={formData.allowRetake}
                    onCheckedChange={(checked) =>
                      updateFormData({ allowRetake: checked })
                    }
                  />
                </div>
                {formData.allowRetake && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Max Attempts</Label>
                    <Input
                      type="number"
                      value={formData.maxAttempts}
                      onChange={(e) =>
                        updateFormData({ maxAttempts: parseInt(e.target.value) || 1 })
                      }
                      className="w-16 h-8"
                      min={1}
                      max={10}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="proctoring">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Proctoring
                  {formData.enableProctoring && (
                    <Badge variant="secondary" className="text-xs">
                      Enabled
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable Proctoring</Label>
                  <Switch
                    checked={formData.enableProctoring}
                    onCheckedChange={(checked) =>
                      updateFormData({ enableProctoring: checked })
                    }
                  />
                </div>
                {formData.enableProctoring && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Detect Tab Switch</Label>
                      <Switch
                        checked={formData.preventTabSwitch}
                        onCheckedChange={(checked) =>
                          updateFormData({ preventTabSwitch: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Prevent Copy/Paste</Label>
                      <Switch
                        checked={formData.preventCopyPaste}
                        onCheckedChange={(checked) =>
                          updateFormData({ preventCopyPaste: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Require Webcam</Label>
                      <Switch
                        checked={formData.webcamRequired}
                        onCheckedChange={(checked) =>
                          updateFormData({ webcamRequired: checked })
                        }
                      />
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Preview Button */}
          <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Test
          </Button>
        </div>
      </div>

      {/* Question Selector Dialog */}
      {activeSection && (
        <QuestionSelectorDialog
          open={questionSelectorOpen}
          onOpenChange={setQuestionSelectorOpen}
          category={activeSection.category}
          selectedIds={activeSection.selectedQuestions.map((q) => q.id)}
          onSelect={handleQuestionsSelected}
          questionsBank={bankQuestions}
        />
      )}

      {/* Preview Test Dialog */}
      <PreviewTestDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        testData={formData}
      />
    </div>
  );
}
