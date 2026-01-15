'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { CURRENCIES } from '@/lib/format';

interface JobDescriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: JobFormData) => void;
  initialData?: JobFormData;
  mode?: 'create' | 'edit';
}

export interface JobFormData {
  title: string;
  department: string;
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin: number;
  salaryMax: number;
  currency: string;
  status: 'open' | 'closed' | 'on-hold' | 'completed';
  closingDate: string;
  openings: number;
  experienceMin: number;
  experienceMax: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  techStack: string[];
}

const getDefaultFormData = (currency: string): JobFormData => ({
  title: '',
  department: '',
  location: '',
  employmentType: 'full-time',
  salaryMin: 0,
  salaryMax: 0,
  currency: currency,
  status: 'open',
  closingDate: '',
  openings: 1,
  experienceMin: 0,
  experienceMax: 0,
  description: '',
  requirements: [],
  responsibilities: [],
  benefits: [],
  techStack: [],
});

export function JobDescriptionForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create',
}: JobDescriptionFormProps) {
  const orgSettings = useOrgSettings();
  const defaultFormData = getDefaultFormData(orgSettings.currency);
  const [formData, setFormData] = useState<JobFormData>(initialData || defaultFormData);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(getDefaultFormData(orgSettings.currency));
    }
  }, [initialData, open]);

  // Update default currency when org settings load (only for new jobs)
  useEffect(() => {
    if (!initialData && orgSettings.currency) {
      setFormData(prev => ({ ...prev, currency: orgSettings.currency }));
    }
  }, [orgSettings.currency, initialData]);
  const [currentRequirement, setCurrentRequirement] = useState('');
  const [currentResponsibility, setCurrentResponsibility] = useState('');
  const [currentBenefit, setCurrentBenefit] = useState('');
  const [currentTechStack, setCurrentTechStack] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validations
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.closingDate) {
      newErrors.closingDate = 'Closing date is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Salary validations
    if (isNaN(formData.salaryMin) || formData.salaryMin <= 0) {
      newErrors.salaryMin = 'Valid minimum salary is required';
    }
    if (isNaN(formData.salaryMax) || formData.salaryMax <= 0) {
      newErrors.salaryMax = 'Valid maximum salary is required';
    }
    if (!isNaN(formData.salaryMin) && !isNaN(formData.salaryMax) && formData.salaryMin >= formData.salaryMax) {
      newErrors.salaryMax = 'Maximum salary must be greater than minimum salary';
    }

    // Openings validation
    if (isNaN(formData.openings) || formData.openings < 1) {
      newErrors.openings = 'Number of openings must be at least 1';
    }

    // Experience validations
    if (isNaN(formData.experienceMin) || formData.experienceMin < 0) {
      newErrors.experienceMin = 'Valid minimum experience is required';
    }
    if (isNaN(formData.experienceMax) || formData.experienceMax < 0) {
      newErrors.experienceMax = 'Valid maximum experience is required';
    }
    if (!isNaN(formData.experienceMin) && !isNaN(formData.experienceMax) && formData.experienceMax < formData.experienceMin) {
      newErrors.experienceMax = 'Maximum experience must be greater than or equal to minimum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset errors and form when closing
      setErrors({});
      if (!initialData) {
        setFormData(defaultFormData);
      }
    } else {
      // Reset form to initial data when opening
      setFormData(initialData || defaultFormData);
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  const addItem = (type: 'requirements' | 'responsibilities' | 'benefits' | 'techStack', value: string) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], value.trim()],
    }));
    if (type === 'requirements') setCurrentRequirement('');
    if (type === 'responsibilities') setCurrentResponsibility('');
    if (type === 'benefits') setCurrentBenefit('');
    if (type === 'techStack') setCurrentTechStack('');
  };

  const removeItem = (type: 'requirements' | 'responsibilities' | 'benefits' | 'techStack', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{mode === 'create' ? 'Create New' : 'Edit'} Job Opening</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Fill in the details to create a new job opening'
              : 'Update the job opening details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Senior Full Stack Developer"
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger className={errors.department ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-xs text-destructive mt-1">{errors.department}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Remote, New York, NY"
                  className={errors.location ? 'border-destructive' : ''}
                />
                {errors.location && (
                  <p className="text-xs text-destructive mt-1">{errors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value: any) => setFormData({ ...formData, employmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="space-y-4">
            <h3 className="font-semibold">Compensation</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Min Salary *</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  required
                  value={formData.salaryMin || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryMin: parseInt(e.target.value) || 0 })
                  }
                  placeholder="80000"
                  className={errors.salaryMin ? 'border-destructive' : ''}
                />
                {errors.salaryMin && (
                  <p className="text-xs text-destructive mt-1">{errors.salaryMin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryMax">Max Salary *</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  required
                  value={formData.salaryMax || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryMax: parseInt(e.target.value) || 0 })
                  }
                  placeholder="120000"
                  className={errors.salaryMax ? 'border-destructive' : ''}
                />
                {errors.salaryMax && (
                  <p className="text-xs text-destructive mt-1">{errors.salaryMax}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-center font-medium">{currency.symbol}</span>
                          <span>{currency.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Position Details</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="openings">Number of Openings *</Label>
                <Input
                  id="openings"
                  type="number"
                  required
                  min="1"
                  value={formData.openings || ''}
                  onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                  className={errors.openings ? 'border-destructive' : ''}
                />
                {errors.openings && (
                  <p className="text-xs text-destructive mt-1">{errors.openings}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingDate">Closing Date *</Label>
                <Input
                  id="closingDate"
                  type="date"
                  required
                  value={formData.closingDate}
                  onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                  className={errors.closingDate ? 'border-destructive' : ''}
                />
                {errors.closingDate && (
                  <p className="text-xs text-destructive mt-1">{errors.closingDate}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experienceMin">Min Experience (years) *</Label>
                <Input
                  id="experienceMin"
                  type="number"
                  required
                  min="0"
                  value={formData.experienceMin || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceMin: parseInt(e.target.value) || 0 })
                  }
                  className={errors.experienceMin ? 'border-destructive' : ''}
                />
                {errors.experienceMin && (
                  <p className="text-xs text-destructive mt-1">{errors.experienceMin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceMax">Max Experience (years) *</Label>
                <Input
                  id="experienceMax"
                  type="number"
                  required
                  min="0"
                  value={formData.experienceMax || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceMax: parseInt(e.target.value) || 0 })
                  }
                  className={errors.experienceMax ? 'border-destructive' : ''}
                />
                {errors.experienceMax && (
                  <p className="text-xs text-destructive mt-1">{errors.experienceMax}</p>
                )}
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-4">
            <h3 className="font-semibold">Job Description</h3>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of the role..."
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1">{errors.description}</p>
              )}
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label>Requirements</Label>
              <div className="flex gap-2">
                <Input
                  value={currentRequirement}
                  onChange={(e) => setCurrentRequirement(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('requirements', currentRequirement);
                    }
                  }}
                  placeholder="Add a requirement and press Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addItem('requirements', currentRequirement)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.requirements.map((req, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {req}
                    <button
                      type="button"
                      onClick={() => removeItem('requirements', index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <div className="flex gap-2">
                <Input
                  value={currentResponsibility}
                  onChange={(e) => setCurrentResponsibility(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('responsibilities', currentResponsibility);
                    }
                  }}
                  placeholder="Add a responsibility and press Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addItem('responsibilities', currentResponsibility)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.responsibilities.map((resp, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {resp}
                    <button
                      type="button"
                      onClick={() => removeItem('responsibilities', index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label>Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={currentBenefit}
                  onChange={(e) => setCurrentBenefit(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('benefits', currentBenefit);
                    }
                  }}
                  placeholder="Add a benefit and press Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addItem('benefits', currentBenefit)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.benefits.map((benefit, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {benefit}
                    <button
                      type="button"
                      onClick={() => removeItem('benefits', index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Technology Stack */}
            <div className="space-y-2">
              <Label>Technology Stack</Label>
              <div className="flex gap-2">
                <Input
                  value={currentTechStack}
                  onChange={(e) => setCurrentTechStack(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('techStack', currentTechStack);
                    }
                  }}
                  placeholder="Add a technology and press Enter (e.g., React, Node.js)"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addItem('techStack', currentTechStack)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.techStack.map((tech, index) => (
                  <Badge key={index} variant="default" className="pr-1">
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeItem('techStack', index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === 'create' ? 'Create' : 'Update'} Job Opening</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
