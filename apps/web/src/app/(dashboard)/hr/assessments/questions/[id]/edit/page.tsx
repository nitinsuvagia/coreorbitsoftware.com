'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  X,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { assessmentApi, AssessmentQuestionType, AssessmentDifficulty, BankQuestion } from '@/lib/api/assessments';

// ============================================================================
// TYPES
// ============================================================================

type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'short_text' | 'long_text' | 'code';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionFormData {
  question: string;
  type: QuestionType;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  explanation: string;
  options: Option[];
  correctAnswer: boolean | null;
  codeTemplate: string;
  language: string;
  sampleAnswer: string;
  wordLimit: number;
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

// Type mappings
const apiTypeToFormType: Record<string, QuestionType> = {
  'MULTIPLE_CHOICE': 'mcq',
  'MULTIPLE_SELECT': 'multi_select',
  'TRUE_FALSE': 'true_false',
  'SHORT_ANSWER': 'short_text',
  'ESSAY': 'long_text',
  'CODING': 'code',
};

const formTypeToApiType: Record<QuestionType, AssessmentQuestionType> = {
  'mcq': 'MULTIPLE_CHOICE',
  'multi_select': 'MULTIPLE_SELECT',
  'true_false': 'TRUE_FALSE',
  'short_text': 'SHORT_ANSWER',
  'long_text': 'ESSAY',
  'code': 'CODING',
};

const difficultyMapping: Record<string, AssessmentDifficulty> = {
  'easy': 'EASY',
  'medium': 'MEDIUM',
  'hard': 'HARD',
};

const apiDifficultyToForm: Record<string, 'easy' | 'medium' | 'hard'> = {
  'EASY': 'easy',
  'MEDIUM': 'medium',
  'HARD': 'hard',
};

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
              className="text-destructive hover:text-destructive"
              disabled={options.length <= 2}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {options.length < 2 && (
        <p className="text-sm text-destructive">At least 2 options are required</p>
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
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag and press Enter"
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;
  
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
    sampleAnswer: '',
    wordLimit: 500,
  });

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setIsPageLoading(true);
        const question = await assessmentApi.getQuestionById(questionId);
        
        // Map API data to form data
        setFormData({
          question: question.question || '',
          type: apiTypeToFormType[question.type] || 'mcq',
          category: question.category || '',
          difficulty: apiDifficultyToForm[question.difficulty || 'MEDIUM'] || 'medium',
          points: question.points || 10,
          tags: question.tags || [],
          explanation: question.explanation || '',
          options: question.options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })) || [
            { id: 'opt-1', text: '', isCorrect: false },
            { id: 'opt-2', text: '', isCorrect: false },
          ],
          correctAnswer: question.correctAnswer === 'true' ? true : question.correctAnswer === 'false' ? false : null,
          codeTemplate: question.code || '',
          language: question.codeLanguage || 'javascript',
          sampleAnswer: '',
          wordLimit: 500,
        });
      } catch (error) {
        console.error('Failed to fetch question:', error);
        toast.error('Failed to load question');
        router.push('/hr/assessments?tab=questions');
      } finally {
        setIsPageLoading(false);
      }
    };

    if (questionId) {
      fetchQuestion();
    }
  }, [questionId, router]);

  const updateFormData = (updates: Partial<QuestionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
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

      await assessmentApi.updateQuestion(questionId, {
        type: formTypeToApiType[formData.type],
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
      
      toast.success('Question updated successfully');
      router.push('/hr/assessments?tab=questions');
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast.error(error.message || 'Failed to update question');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypeConfig = questionTypeConfig.find((t) => t.value === formData.type);

  // Skeleton Loading UI
  if (isPageLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

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
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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

        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-24" />
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Question</h1>
          <p className="text-muted-foreground mt-2">Update the question details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/hr/assessments?tab=questions')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Question Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Question Type</CardTitle>
            <CardDescription>Select the type of question</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                  placeholder={`// Write your ${formData.language} code here...`}
                  className="font-mono text-sm"
                  rows={10}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
