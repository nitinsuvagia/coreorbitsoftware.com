'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileQuestion,
  ListChecks,
  ToggleLeft,
  Type,
  Download,
  RefreshCw,
  Zap,
  Database,
  Settings,
} from 'lucide-react';
import { assessmentApi, AIGeneratedQuestion, AssessmentDifficulty } from '@/lib/api/assessments';
import Link from 'next/link';

interface AIImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

const difficultyColors: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
  EXPERT: 'bg-purple-100 text-purple-700',
};

const questionTypeIcons: Record<string, typeof ListChecks> = {
  MULTIPLE_CHOICE: ListChecks,
  MULTIPLE_SELECT: ListChecks,
  TRUE_FALSE: ToggleLeft,
  SHORT_ANSWER: Type,
};

export function AIImportDialog({ open, onOpenChange, onImportSuccess }: AIImportDialogProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AssessmentDifficulty>('MEDIUM');
  const [questionCount, setQuestionCount] = useState('5');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['MULTIPLE_CHOICE']);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIGeneratedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [questionSource, setQuestionSource] = useState<'openai' | 'predefined' | null>(null);

  // Fetch AI categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const result = await assessmentApi.getAICategories();
        const cats = result.categories;
        setCategories(Array.isArray(cats) ? cats : []);
        setOpenaiEnabled(result.openaiEnabled);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      } catch (error) {
        console.error('Failed to fetch AI categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setGeneratedQuestions([]);
      setSelectedQuestions(new Set());
      setQuestionSource(null);
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await assessmentApi.generateAIQuestions(
        selectedCategory,
        selectedDifficulty,
        parseInt(questionCount),
        selectedQuestionTypes
      );
      const questions = result.questions;
      setGeneratedQuestions(Array.isArray(questions) ? questions : []);
      setQuestionSource(result.source);
      // Select all by default
      setSelectedQuestions(new Set(questions.map((_, i) => i)));
      
      if (questions.length === 0) {
        toast.info('No questions found for this category and difficulty. Try different settings.');
      } else {
        const sourceLabel = result.source === 'openai' ? 'OpenAI' : 'Question Database';
        toast.success(`Generated ${questions.length} questions from ${sourceLabel}`);
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      toast.error('Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    const questionsToImport = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
    
    if (questionsToImport.length === 0) {
      toast.error('Please select at least one question to import');
      return;
    }

    try {
      setIsImporting(true);
      const result = await assessmentApi.bulkImportQuestions(questionsToImport);
      
      if (result.duplicates > 0) {
        toast.success(
          `Imported ${result.imported} questions. ${result.duplicates} duplicates were skipped.`,
          { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> }
        );
      } else {
        toast.success(`Successfully imported ${result.imported} questions`);
      }
      
      onImportSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to import questions:', error);
      toast.error('Failed to import questions');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleQuestion = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleAll = () => {
    if (selectedQuestions.size === generatedQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
    }
  };

  const getTypeIcon = (type: string) => {
    const Icon = questionTypeIcons[type] || FileQuestion;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Question Generator
            {openaiEnabled ? (
              <Badge className="bg-green-100 text-green-700 ml-2">
                <Zap className="h-3 w-3 mr-1" />
                OpenAI Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                <Database className="h-3 w-3 mr-1" />
                Using Question Database
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {openaiEnabled ? (
              <>Generate unique questions using OpenAI. Questions are tailored to your selected category and difficulty.</>
            ) : (
              <>
                Generate questions from our predefined database. 
                <Link href="/organization?tab=integrations" className="text-primary hover:underline ml-1">
                  Connect OpenAI
                </Link> for AI-generated custom questions.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* OpenAI Status Banner */}
        {!openaiEnabled && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-blue-800">Want AI-generated questions?</span>
              <span className="text-blue-600 ml-1">
                Configure your OpenAI API key in Organization Settings to unlock unlimited custom questions.
              </span>
            </div>
            <Link href="/organization?tab=integrations">
              <Button variant="outline" size="sm" className="shrink-0">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </Link>
          </div>
        )}

        {/* Generation Controls */}
        <div className="flex flex-wrap gap-4 py-4 border-b">
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
              disabled={loadingCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm font-medium mb-2 block">Difficulty</label>
            <Select 
              value={selectedDifficulty} 
              onValueChange={(v) => setSelectedDifficulty(v as AssessmentDifficulty)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
                <SelectItem value="EXPERT">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[100px]">
            <label className="text-sm font-medium mb-2 block">Count</label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Question Types Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Types</label>
          {[
            { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
            { value: 'TRUE_FALSE', label: 'True/False' },
            { value: 'SHORT_ANSWER', label: 'Short Answer' },
            { value: 'MULTIPLE_SELECT', label: 'Multiple Select' },
          ].map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedQuestionTypes.includes(type.value)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <Checkbox
                checked={selectedQuestionTypes.includes(type.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedQuestionTypes([...selectedQuestionTypes, type.value]);
                  } else {
                    setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.value));
                  }
                }}
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
          
          {/* Generate Button - Right aligned */}
          <div className="ml-auto">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedCategory || selectedQuestionTypes.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Questions Preview */}
        <div className="flex-1 min-h-0 flex flex-col border-t border-b -mx-6" style={{ maxHeight: '400px' }}>
          {generatedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-6">
              <Brain className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No questions generated yet</p>
              <p className="text-sm">Select a category and difficulty, then click Generate</p>
            </div>
          ) : (
            <>
              {/* Source Indicator - Fixed at top */}
              {questionSource && (
                <div className="px-6 pt-4 pb-2">
                  <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    questionSource === 'openai' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {questionSource === 'openai' ? (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>Questions generated by <strong>OpenAI</strong></span>
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        <span>Questions from <strong>Predefined Database</strong></span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Select All Header - Sticky */}
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedQuestions.size === generatedQuestions.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedQuestions.size === generatedQuestions.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {selectedQuestions.size} of {generatedQuestions.length} selected
                  </span>
                </div>
              </div>

              {/* Scrollable Question List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {generatedQuestions.map((question, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-colors ${
                        selectedQuestions.has(index)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestions.has(index)}
                          onCheckedChange={() => toggleQuestion(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-muted-foreground">{getTypeIcon(question.type)}</span>
                            <Badge variant="outline" className="text-xs">
                              {question.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={difficultyColors[question.difficulty]}>
                              {question.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {question.points} pts
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{question.question}</p>
                          
                          {/* Options Preview */}
                          {question.options && question.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {question.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`text-xs px-2 py-1 rounded ${
                                    opt.isCorrect
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {opt.isCorrect && <CheckCircle className="h-3 w-3 inline mr-1" />}
                                  {opt.text}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Short Answer Correct Answer */}
                          {question.type === 'SHORT_ANSWER' && question.correctAnswer && (
                            <div className="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              {question.correctAnswer}
                            </div>
                          )}

                          {/* Explanation */}
                          {question.explanation && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              💡 {question.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {generatedQuestions.length > 0 && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                {selectedQuestions.size} questions selected for import
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedQuestions.size === 0}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import {selectedQuestions.size > 0 ? selectedQuestions.size : ''} Questions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
