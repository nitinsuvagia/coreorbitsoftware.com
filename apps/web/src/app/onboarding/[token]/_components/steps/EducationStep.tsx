'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface EducationEntry {
  id: string;
  // Core fields matching Employee Education schema
  educationType: string;
  institutionType?: string;
  institutionName: string;
  boardUniversity?: string;
  degree?: string;
  fieldOfStudy?: string;
  specialization?: string;
  enrollmentYear: number;
  completionYear?: number;
  isOngoing?: boolean;
  gradeType?: string;
  grade?: string;
  percentage?: number;
}

interface EducationStepProps {
  data: EducationEntry[];
  onChange: (data: EducationEntry[]) => void;
}

const EDUCATION_TYPES = [
  { value: 'HIGH_SCHOOL', label: '10th / SSC / High School' },
  { value: 'INTERMEDIATE', label: '12th / HSC / Intermediate' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'BACHELORS', label: "Bachelor's Degree" },
  { value: 'MASTERS', label: "Master's Degree" },
  { value: 'DOCTORATE', label: 'Doctorate / PhD' },
  { value: 'POST_DOCTORATE', label: 'Post Doctorate' },
  { value: 'CERTIFICATION', label: 'Professional Certification' },
  { value: 'VOCATIONAL', label: 'Vocational Training' },
  { value: 'OTHER', label: 'Other' },
];

const INSTITUTION_TYPES = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'INSTITUTE', label: 'Institute' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OTHER', label: 'Other' },
];

const GRADE_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'CGPA_10', label: 'CGPA (out of 10)' },
  { value: 'CGPA_4', label: 'CGPA (out of 4)' },
  { value: 'GRADE_LETTER', label: 'Grade Letter (A, B, C...)' },
  { value: 'DIVISION', label: 'Division (First, Second...)' },
  { value: 'PASS_FAIL', label: 'Pass / Fail' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export default function EducationStep({ data, onChange }: EducationStepProps) {
  const addEducation = () => {
    const newEntry: EducationEntry = {
      id: Date.now().toString(),
      educationType: '',
      institutionType: 'UNIVERSITY',
      institutionName: '',
      boardUniversity: '',
      degree: '',
      fieldOfStudy: '',
      specialization: '',
      enrollmentYear: CURRENT_YEAR - 4,
      completionYear: CURRENT_YEAR,
      isOngoing: false,
      gradeType: 'PERCENTAGE',
      grade: '',
      percentage: undefined,
    };
    onChange([...data, newEntry]);
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: any) => {
    onChange(
      data.map((entry) => {
        if (entry.id !== id) return entry;
        
        // If toggling isOngoing, clear completionYear if ongoing
        if (field === 'isOngoing' && value === true) {
          return { ...entry, [field]: value, completionYear: undefined };
        }
        
        return { ...entry, [field]: value };
      })
    );
  };

  const removeEducation = (id: string) => {
    onChange(data.filter((entry) => entry.id !== id));
  };

  // Get institution type suggestion based on education type
  const getSuggestedInstitutionType = (educationType: string): string => {
    switch (educationType) {
      case 'HIGH_SCHOOL':
      case 'INTERMEDIATE':
        return 'SCHOOL';
      case 'DIPLOMA':
      case 'CERTIFICATION':
      case 'VOCATIONAL':
        return 'INSTITUTE';
      case 'BACHELORS':
      case 'MASTERS':
      case 'DOCTORATE':
      case 'POST_DOCTORATE':
        return 'UNIVERSITY';
      default:
        return 'COLLEGE';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Add your educational qualifications starting from the highest degree.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addEducation}>
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No education added</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Click the button above to add your educational qualifications
            </p>
            <Button type="button" variant="outline" onClick={addEducation}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Education
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((entry, index) => (
            <Card key={entry.id} className="relative">
              <CardContent className="pt-6">
                <div className="absolute top-4 right-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeEducation(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  <h4 className="font-medium">Education #{index + 1}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Education Type */}
                  <div className="space-y-2">
                    <Label>Education Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={entry.educationType}
                      onValueChange={(value) => {
                        updateEducation(entry.id, 'educationType', value);
                        // Auto-suggest institution type
                        updateEducation(entry.id, 'institutionType', getSuggestedInstitutionType(value));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select education type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Institution Type */}
                  <div className="space-y-2">
                    <Label>Institution Type</Label>
                    <Select
                      value={entry.institutionType || 'UNIVERSITY'}
                      onValueChange={(value) => updateEducation(entry.id, 'institutionType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select institution type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Institution Name */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Institution Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={entry.institutionName}
                      onChange={(e) => updateEducation(entry.id, 'institutionName', e.target.value)}
                      placeholder="e.g., Gujarat Technological University"
                    />
                  </div>

                  {/* Board / University */}
                  <div className="space-y-2">
                    <Label>Board / University</Label>
                    <Input
                      value={entry.boardUniversity || ''}
                      onChange={(e) => updateEducation(entry.id, 'boardUniversity', e.target.value)}
                      placeholder="e.g., CBSE, GTU, Mumbai University"
                    />
                  </div>

                  {/* Degree */}
                  <div className="space-y-2">
                    <Label>Degree / Course Name</Label>
                    <Input
                      value={entry.degree || ''}
                      onChange={(e) => updateEducation(entry.id, 'degree', e.target.value)}
                      placeholder="e.g., B.Tech, MBA, BCA"
                    />
                  </div>

                  {/* Field of Study */}
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input
                      value={entry.fieldOfStudy || ''}
                      onChange={(e) => updateEducation(entry.id, 'fieldOfStudy', e.target.value)}
                      placeholder="e.g., Computer Science, Commerce"
                    />
                  </div>

                  {/* Specialization */}
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input
                      value={entry.specialization || ''}
                      onChange={(e) => updateEducation(entry.id, 'specialization', e.target.value)}
                      placeholder="e.g., Software Engineering, Finance"
                    />
                  </div>

                  {/* Enrollment Year */}
                  <div className="space-y-2">
                    <Label>Enrollment Year <span className="text-red-500">*</span></Label>
                    <Select
                      value={entry.enrollmentYear?.toString()}
                      onValueChange={(value) => updateEducation(entry.id, 'enrollmentYear', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Completion Year */}
                  <div className="space-y-2">
                    <Label>Completion Year</Label>
                    <Select
                      value={entry.completionYear?.toString() || ''}
                      onValueChange={(value) => updateEducation(entry.id, 'completionYear', value ? parseInt(value) : undefined)}
                      disabled={entry.isOngoing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={entry.isOngoing ? 'Ongoing' : 'Select year'} />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Currently Studying */}
                  <div className="space-y-2 flex items-center gap-2 pt-6">
                    <Checkbox
                      id={`ongoing-${entry.id}`}
                      checked={entry.isOngoing || false}
                      onCheckedChange={(checked) => updateEducation(entry.id, 'isOngoing', checked)}
                    />
                    <Label htmlFor={`ongoing-${entry.id}`} className="cursor-pointer">
                      Currently Studying
                    </Label>
                  </div>

                  {/* Grade Type */}
                  <div className="space-y-2">
                    <Label>Grade Type</Label>
                    <Select
                      value={entry.gradeType || 'PERCENTAGE'}
                      onValueChange={(value) => updateEducation(entry.id, 'gradeType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Grade / Percentage */}
                  <div className="space-y-2">
                    <Label>
                      {entry.gradeType === 'PERCENTAGE' ? 'Percentage' : 
                       entry.gradeType === 'CGPA_10' ? 'CGPA (out of 10)' :
                       entry.gradeType === 'CGPA_4' ? 'CGPA (out of 4)' :
                       entry.gradeType === 'GRADE_LETTER' ? 'Grade' :
                       entry.gradeType === 'DIVISION' ? 'Division' :
                       entry.gradeType === 'PASS_FAIL' ? 'Result' : 'Grade/Score'}
                    </Label>
                    {entry.gradeType === 'PERCENTAGE' ? (
                      <Input
                        type="number"
                        value={entry.percentage || ''}
                        onChange={(e) => updateEducation(entry.id, 'percentage', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 85.5"
                        min={0}
                        max={100}
                        step={0.1}
                      />
                    ) : entry.gradeType === 'CGPA_10' ? (
                      <Input
                        type="number"
                        value={entry.grade || ''}
                        onChange={(e) => updateEducation(entry.id, 'grade', e.target.value)}
                        placeholder="e.g., 8.5"
                        min={0}
                        max={10}
                        step={0.1}
                      />
                    ) : entry.gradeType === 'CGPA_4' ? (
                      <Input
                        type="number"
                        value={entry.grade || ''}
                        onChange={(e) => updateEducation(entry.id, 'grade', e.target.value)}
                        placeholder="e.g., 3.8"
                        min={0}
                        max={4}
                        step={0.1}
                      />
                    ) : entry.gradeType === 'PASS_FAIL' ? (
                      <Select
                        value={entry.grade || ''}
                        onValueChange={(value) => updateEducation(entry.id, 'grade', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pass">Pass</SelectItem>
                          <SelectItem value="Fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : entry.gradeType === 'DIVISION' ? (
                      <Select
                        value={entry.grade || ''}
                        onValueChange={(value) => updateEducation(entry.id, 'grade', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First Division">First Division</SelectItem>
                          <SelectItem value="Second Division">Second Division</SelectItem>
                          <SelectItem value="Third Division">Third Division</SelectItem>
                          <SelectItem value="Distinction">Distinction</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={entry.grade || ''}
                        onChange={(e) => updateEducation(entry.id, 'grade', e.target.value)}
                        placeholder="e.g., A+, A, B"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
        <p className="text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Please add all your educational qualifications. You will need to upload 
          supporting documents (marksheets/certificates) in the next steps.
        </p>
      </div>
    </div>
  );
}
