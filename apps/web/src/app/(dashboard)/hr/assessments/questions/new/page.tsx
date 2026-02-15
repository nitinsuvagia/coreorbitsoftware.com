'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Code,
  FileText,
  ListChecks,
  ToggleLeft,
  Type,
  Save,
  Eye,
  X,
  Paperclip,
  HelpCircle,
  Lightbulb,
  Upload,
} from 'lucide-react';
import { assessmentApi, AssessmentQuestionType, AssessmentDifficulty } from '@/lib/api/assessments';

// ============================================================================
// TYPES
// ============================================================================

type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'short_text' | 'long_text' | 'code';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

interface QuestionFormData {
  question: string;
  type: QuestionType;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  explanation: string;
  // For MCQ / Multi Select
  options: Option[];
  // For True/False
  correctAnswer: boolean | null;
  // For Coding
  codeTemplate: string;
  language: string;
  testCases: TestCase[];
  // For Text answers
  sampleAnswer: string;
  wordLimit: number;
  // Attachments
  attachments: File[];
}

const questionTypeConfig = [
  { value: 'mcq', label: 'Multiple Choice', icon: ListChecks, description: 'Single correct answer from options' },
  { value: 'multi_select', label: 'Multi Select', icon: ListChecks, description: 'Multiple correct answers' },
  { value: 'true_false', label: 'True/False', icon: ToggleLeft, description: 'Binary choice question' },
  { value: 'short_text', label: 'Short Answer', icon: Type, description: 'Brief text response' },
  { value: 'long_text', label: 'Long Answer', icon: FileText, description: 'Detailed text response' },
  { value: 'code', label: 'Coding', icon: Code, description: 'Programming challenge with test cases' },
];

const categories = [
  'Data Structures',
  'Algorithms',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'Database',
  'System Design',
  'Web Development',
  'DevOps',
  'General Aptitude',
  'Logical Reasoning',
  'Communication',
];

const programmingLanguages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

// ============================================================================
// OPTIONS EDITOR COMPONENT
// ============================================================================

interface OptionsEditorProps {
  options: Option[];
  onChange: (options: Option[]) => void;
  isMultiSelect: boolean;
}

function OptionsEditor({ options, onChange, isMultiSelect }: OptionsEditorProps) {
  const addOption = () => {
    onChange([
      ...options,
      { id: `opt-${Date.now()}`, text: '', isCorrect: false },
    ]);
  };

  const removeOption = (id: string) => {
    onChange(options.filter((opt) => opt.id !== id));
  };

  const updateOption = (id: string, updates: Partial<Option>) => {
    onChange(
      options.map((opt) => {
        if (opt.id === id) {
          return { ...opt, ...updates };
        }
        // For single select, uncheck other options when one is selected
        if (!isMultiSelect && updates.isCorrect) {
          return { ...opt, isCorrect: false };
        }
        return opt;
      })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Answer Options</Label>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-4 w-4 mr-1" />
          Add Option
        </Button>
      </div>
      
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={option.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              option.isCorrect ? 'border-green-500 bg-green-50' : 'border-border'
            }`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
              {String.fromCharCode(65 + index)}
            </div>
            <Input
              value={option.text}
              onChange={(e) => updateOption(option.id, { text: e.target.value })}
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              className="flex-1"
            />
            <Button
              type="button"
              variant={option.isCorrect ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateOption(option.id, { isCorrect: !option.isCorrect })}
              className={option.isCorrect ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(option.id)}
              disabled={options.length <= 2}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {options.length < 2 && (
        <p className="text-sm text-destructive">At least 2 options are required</p>
      )}
      {!options.some((opt) => opt.isCorrect) && (
        <p className="text-sm text-amber-600">Please mark at least one correct answer</p>
      )}
    </div>
  );
}

// ============================================================================
// TEST CASES EDITOR COMPONENT
// ============================================================================

interface TestCasesEditorProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
}

function TestCasesEditor({ testCases, onChange }: TestCasesEditorProps) {
  const addTestCase = () => {
    onChange([
      ...testCases,
      { id: `tc-${Date.now()}`, input: '', expectedOutput: '', isHidden: false, points: 10 },
    ]);
  };

  const removeTestCase = (id: string) => {
    onChange(testCases.filter((tc) => tc.id !== id));
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    onChange(testCases.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Test Cases</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
          <Plus className="h-4 w-4 mr-1" />
          Add Test Case
        </Button>
      </div>

      <div className="space-y-4">
        {testCases.map((testCase, index) => (
          <Card key={testCase.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Test Case {index + 1}</Badge>
                  {testCase.isHidden && (
                    <Badge variant="secondary">Hidden</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={testCase.isHidden}
                      onCheckedChange={(checked) =>
                        updateTestCase(testCase.id, { isHidden: checked })
                      }
                    />
                    <Label className="text-sm">Hidden</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTestCase(testCase.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Input</Label>
                  <Textarea
                    value={testCase.input}
                    onChange={(e) =>
                      updateTestCase(testCase.id, { input: e.target.value })
                    }
                    placeholder="Enter input..."
                    className="font-mono text-sm"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Output</Label>
                  <Textarea
                    value={testCase.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(testCase.id, { expectedOutput: e.target.value })
                    }
                    placeholder="Enter expected output..."
                    className="font-mono text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={testCase.points}
                  onChange={(e) =>
                    updateTestCase(testCase.id, { points: parseInt(e.target.value) || 0 })
                  }
                  className="w-24 mt-1"
                  min={0}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {testCases.length === 0 && (
        <p className="text-sm text-amber-600">Add at least one test case for code validation</p>
      )}
    </div>
  );
}

// ============================================================================
// TAGS INPUT COMPONENT
// ============================================================================

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagsInput({ tags, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2 p-3 rounded-lg border min-h-[42px]">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Type and press Enter..."
          className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter to add tags</p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewQuestionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [formData, setFormData] = useState<QuestionFormData>({
    question: '',
    type: 'mcq',
    category: '',
    difficulty: 'medium',
    points: 10,
    tags: [],
    explanation: '',
    options: [
      { id: 'opt-1', text: '', isCorrect: false },
      { id: 'opt-2', text: '', isCorrect: false },
      { id: 'opt-3', text: '', isCorrect: false },
      { id: 'opt-4', text: '', isCorrect: false },
    ],
    correctAnswer: null,
    codeTemplate: '',
    language: 'javascript',
    testCases: [],
    sampleAnswer: '',
    wordLimit: 500,
    attachments: [],
  });
  
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const updateFormData = (updates: Partial<QuestionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Map frontend question types to API types
  const typeMapping: Record<QuestionType, AssessmentQuestionType> = {
    'mcq': 'MULTIPLE_CHOICE',
    'multi_select': 'MULTIPLE_SELECT',
    'true_false': 'TRUE_FALSE',
    'short_text': 'SHORT_ANSWER',
    'long_text': 'ESSAY',
    'code': 'CODING',
  };

  // Map frontend difficulty to API difficulty
  const difficultyMapping: Record<string, AssessmentDifficulty> = {
    'easy': 'EASY',
    'medium': 'MEDIUM',
    'hard': 'HARD',
  };

  const handleSave = async (asDraft = false) => {
    // Validate required fields
    if (!formData.question.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    // Validate options for MCQ/Multi-select
    if ((formData.type === 'mcq' || formData.type === 'multi_select') && formData.options.length < 2) {
      toast.error('At least 2 options are required');
      return;
    }

    if ((formData.type === 'mcq' || formData.type === 'multi_select') && !formData.options.some(opt => opt.isCorrect)) {
      toast.error('Please mark at least one correct answer');
      return;
    }

    setIsLoading(true);
    try {
      // Build correct answer based on type
      let correctAnswer: string | undefined;
      if (formData.type === 'true_false') {
        correctAnswer = formData.correctAnswer === true ? 'true' : formData.correctAnswer === false ? 'false' : undefined;
      }

      await assessmentApi.createBankQuestion({
        type: typeMapping[formData.type],
        question: formData.question.trim(),
        category: formData.category,
        difficulty: difficultyMapping[formData.difficulty],
        points: formData.points,
        explanation: formData.explanation || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        options: (formData.type === 'mcq' || formData.type === 'multi_select') 
          ? formData.options.map(opt => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }))
          : undefined,
        correctAnswer,
        code: formData.type === 'code' ? formData.codeTemplate : undefined,
        codeLanguage: formData.type === 'code' ? formData.language : undefined,
      });
      
      toast.success('Question created successfully');
      router.push('/hr/assessments?tab=questions');
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast.error(error.message || 'Failed to save question');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypeConfig = questionTypeConfig.find((t) => t.value === formData.type);

  // Skeleton Loading UI
  if (isPageLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Question Type Selection Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <Skeleton className="h-8 w-8 mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto mb-1" />
                  <Skeleton className="h-3 w-24 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Question Content Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-24 w-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Answer Options Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Settings Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions Skeleton */}
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/hr/assessments?tab=questions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Question Bank
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create Question</h1>
          <p className="text-muted-foreground mt-2">Add a new question to your question bank</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isLoading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Question
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Question Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Question Type</CardTitle>
            <CardDescription>Select the type of question you want to create</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {questionTypeConfig.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateFormData({ type: type.value as QuestionType })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.type === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <type.icon className={`h-6 w-6 mx-auto mb-2 ${
                    formData.type === type.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <p className="text-sm font-medium">{type.label}</p>
                </button>
              ))}
            </div>
            {selectedTypeConfig && (
              <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {selectedTypeConfig.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Question Content */}
        <Card>
          <CardHeader>
            <CardTitle>Question Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={formData.question}
                onChange={(e) => updateFormData({ question: e.target.value })}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateFormData({ category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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

              <div className="space-y-2">
                <Label>Difficulty *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    updateFormData({ difficulty: value as 'easy' | 'medium' | 'hard' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Points *</Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => updateFormData({ points: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <TagsInput tags={formData.tags} onChange={(tags) => updateFormData({ tags })} />
          </CardContent>
        </Card>

        {/* Answer Options - MCQ / Multi Select */}
        {(formData.type === 'mcq' || formData.type === 'multi_select') && (
          <Card>
            <CardHeader>
              <CardTitle>Answer Options</CardTitle>
              <CardDescription>
                {formData.type === 'mcq'
                  ? 'Add options and mark one as correct'
                  : 'Add options and mark all correct answers'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptionsEditor
                options={formData.options}
                onChange={(options) => updateFormData({ options })}
                isMultiSelect={formData.type === 'multi_select'}
              />
            </CardContent>
          </Card>
        )}

        {/* True/False Answer */}
        {formData.type === 'true_false' && (
          <Card>
            <CardHeader>
              <CardTitle>Correct Answer</CardTitle>
              <CardDescription>Select the correct answer for this statement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.correctAnswer === true ? 'default' : 'outline'}
                  className={`flex-1 h-20 text-lg ${
                    formData.correctAnswer === true ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}
                  onClick={() => updateFormData({ correctAnswer: true })}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  True
                </Button>
                <Button
                  type="button"
                  variant={formData.correctAnswer === false ? 'default' : 'outline'}
                  className={`flex-1 h-20 text-lg ${
                    formData.correctAnswer === false ? 'bg-red-600 hover:bg-red-700' : ''
                  }`}
                  onClick={() => updateFormData({ correctAnswer: false })}
                >
                  <X className="h-6 w-6 mr-2" />
                  False
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coding Question */}
        {formData.type === 'code' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Code Template</CardTitle>
                <CardDescription>
                  Provide starter code for candidates (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Programming Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => updateFormData({ language: value })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {programmingLanguages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Starter Code Template</Label>
                  <Textarea
                    value={formData.codeTemplate}
                    onChange={(e) => updateFormData({ codeTemplate: e.target.value })}
                    placeholder={`// Write your ${formData.language} code here...\nfunction solution(input) {\n  // Your code\n}`}
                    className="font-mono text-sm"
                    rows={10}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Cases</CardTitle>
                <CardDescription>
                  Define test cases to validate the code. Hidden test cases are not shown to
                  candidates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestCasesEditor
                  testCases={formData.testCases}
                  onChange={(testCases) => updateFormData({ testCases })}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Text Answer Settings */}
        {(formData.type === 'short_text' || formData.type === 'long_text') && (
          <Card>
            <CardHeader>
              <CardTitle>Answer Settings</CardTitle>
              <CardDescription>Configure text answer requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Word Limit</Label>
                <Input
                  type="number"
                  value={formData.wordLimit}
                  onChange={(e) =>
                    updateFormData({ wordLimit: parseInt(e.target.value) || 100 })
                  }
                  min={10}
                  max={5000}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of words allowed in the answer
                </p>
              </div>

              <div className="space-y-2">
                <Label>Sample Answer (for grading reference)</Label>
                <Textarea
                  value={formData.sampleAnswer}
                  onChange={(e) => updateFormData({ sampleAnswer: e.target.value })}
                  placeholder="Provide a sample answer to help with grading..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Explanation
            </CardTitle>
            <CardDescription>
              Provide an explanation that will be shown after the test is submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.explanation}
              onChange={(e) => updateFormData({ explanation: e.target.value })}
              placeholder="Explain the correct answer and reasoning..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attachments
            </CardTitle>
            <CardDescription>
              Add images, documents, or files to support the question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isLoading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Question
          </Button>
        </div>
      </div>
    </div>
  );
}
