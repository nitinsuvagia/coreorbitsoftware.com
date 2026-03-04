'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  Image,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  Trash2,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentFile {
  url: string;
  name: string;
  type?: string;
}

interface DocumentsData {
  photo?: DocumentFile;
  idProof?: DocumentFile;
  panCard?: DocumentFile;
  addressProof?: DocumentFile;
  educationCertificates?: DocumentFile[];
  experienceLetters?: DocumentFile[];
  relievingLetter?: DocumentFile;
  salarySlips?: DocumentFile[];
  bankProof?: DocumentFile;
  otherDocuments?: DocumentFile[];
}

interface DocumentsStepProps {
  data: DocumentsData;
  onChange: (data: DocumentsData) => void;
  token: string;
}

interface DocumentConfig {
  key: keyof DocumentsData;
  label: string;
  description: string;
  required: boolean;
  multiple: boolean;
  accept: string;
  maxSize: number; // in MB
  typeOptions?: string[];
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    key: 'photo',
    label: 'Passport Size Photo',
    description: 'Recent passport size photograph with white background',
    required: true,
    multiple: false,
    accept: 'image/jpeg,image/png',
    maxSize: 2,
  },
  {
    key: 'idProof',
    label: 'ID Proof',
    description: 'Government issued ID (Aadhar/Passport/Driving License)',
    required: true,
    multiple: false,
    accept: 'image/*,application/pdf',
    maxSize: 5,
    typeOptions: ['Aadhar Card', 'Passport', 'Driving License', 'Voter ID'],
  },
  {
    key: 'panCard',
    label: 'PAN Card',
    description: 'Copy of PAN card (front side)',
    required: true,
    multiple: false,
    accept: 'image/*,application/pdf',
    maxSize: 5,
  },
  {
    key: 'addressProof',
    label: 'Address Proof',
    description: 'Utility bill, rental agreement, or bank statement',
    required: true,
    multiple: false,
    accept: 'image/*,application/pdf',
    maxSize: 5,
    typeOptions: ['Utility Bill', 'Rental Agreement', 'Bank Statement', 'Aadhar Card'],
  },
  {
    key: 'educationCertificates',
    label: 'Education Certificates',
    description: 'Degree certificates and marksheets',
    required: true,
    multiple: true,
    accept: 'image/*,application/pdf',
    maxSize: 10,
  },
  {
    key: 'experienceLetters',
    label: 'Experience Letters',
    description: 'Experience/offer letters from previous employers',
    required: false,
    multiple: true,
    accept: 'image/*,application/pdf',
    maxSize: 10,
  },
  {
    key: 'relievingLetter',
    label: 'Relieving Letter',
    description: 'Relieving letter from last employer',
    required: false,
    multiple: false,
    accept: 'image/*,application/pdf',
    maxSize: 5,
  },
  {
    key: 'salarySlips',
    label: 'Salary Slips',
    description: 'Last 3 months salary slips',
    required: false,
    multiple: true,
    accept: 'image/*,application/pdf',
    maxSize: 10,
  },
  {
    key: 'bankProof',
    label: 'Bank Proof',
    description: 'Cancelled cheque or bank passbook first page',
    required: true,
    multiple: false,
    accept: 'image/*,application/pdf',
    maxSize: 5,
  },
  {
    key: 'otherDocuments',
    label: 'Other Documents',
    description: 'Any other relevant documents',
    required: false,
    multiple: true,
    accept: 'image/*,application/pdf',
    maxSize: 20,
  },
];

export default function DocumentsStep({ data, onChange, token }: DocumentsStepProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [docTypes, setDocTypes] = useState<Record<string, string>>({});
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileUpload = async (config: DocumentConfig, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size
    if (file.size > config.maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${config.maxSize}MB`);
      return;
    }

    // Validate file type
    const acceptedTypes = config.accept.split(',').map(t => t.trim());
    const fileType = file.type;
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isAccepted = acceptedTypes.some(t => {
      if (t === 'image/*') return fileType.startsWith('image/');
      if (t === 'application/pdf') return fileType === 'application/pdf' || fileExt === '.pdf';
      return t === fileType || t === fileExt;
    });

    if (!isAccepted) {
      toast.error(`Invalid file type. Accepted: ${config.accept}`);
      return;
    }

    setUploadingKey(config.key);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', config.key);
      formData.append('documentSubType', docTypes[config.key] || '');

      // Upload to backend
      const response = await fetch(`/api/v1/public/onboarding/${token}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        const errorMsg = typeof result.error === 'object' 
          ? result.error?.message || 'Failed to upload document' 
          : result.error || 'Failed to upload document';
        toast.error(errorMsg);
        return;
      }

      const documentFile: DocumentFile = {
        url: result.data.url,
        name: file.name,
        type: docTypes[config.key],
      };

      // Update data
      if (config.multiple) {
        const existing = (data[config.key] as DocumentFile[]) || [];
        onChange({
          ...data,
          [config.key]: [...existing, documentFile],
        });
      } else {
        onChange({
          ...data,
          [config.key]: documentFile,
        });
      }

      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingKey(null);
      // Reset file input
      if (fileInputRefs.current[config.key]) {
        fileInputRefs.current[config.key]!.value = '';
      }
    }
  };

  const handleRemoveDocument = (config: DocumentConfig, index?: number) => {
    if (config.multiple && typeof index === 'number') {
      const existing = (data[config.key] as DocumentFile[]) || [];
      onChange({
        ...data,
        [config.key]: existing.filter((_, i) => i !== index),
      });
    } else {
      onChange({
        ...data,
        [config.key]: undefined,
      });
    }
  };

  const getDocumentCount = (config: DocumentConfig): number => {
    const value = data[config.key];
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    return 1;
  };

  const isDocumentUploaded = (config: DocumentConfig): boolean => {
    return getDocumentCount(config) > 0;
  };

  const requiredDocsCount = DOCUMENT_CONFIGS.filter(c => c.required).length;
  const uploadedRequiredDocs = DOCUMENT_CONFIGS.filter(c => c.required && isDocumentUploaded(c)).length;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Document Upload Progress</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {uploadedRequiredDocs} of {requiredDocsCount} required documents uploaded
            </p>
          </div>
          <Badge variant={uploadedRequiredDocs === requiredDocsCount ? 'default' : 'secondary'}>
            {Math.round((uploadedRequiredDocs / requiredDocsCount) * 100)}%
          </Badge>
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCUMENT_CONFIGS.map((config) => {
          const isUploading = uploadingKey === config.key;
          const isUploaded = isDocumentUploaded(config);
          const files = config.multiple 
            ? (data[config.key] as DocumentFile[] | undefined) || []
            : data[config.key] ? [data[config.key] as DocumentFile] : [];

          return (
            <Card 
              key={config.key} 
              className={`relative ${isUploaded ? 'border-green-200 dark:border-green-800' : config.required ? 'border-amber-200 dark:border-amber-800' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isUploaded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : config.required ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm font-medium">
                      {config.label}
                      {config.required && <span className="text-red-500 ml-1">*</span>}
                    </CardTitle>
                  </div>
                  {config.multiple && files.length > 0 && (
                    <Badge variant="secondary">{files.length} file(s)</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Document Type Selector */}
                {config.typeOptions && !isUploaded && (
                  <div className="mb-3">
                    <Select 
                      value={docTypes[config.key] || ''} 
                      onValueChange={(value) => setDocTypes({ ...docTypes, [config.key]: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Uploaded Files List */}
                {files.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {files.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {file.url?.includes('image') || file.name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="truncate">{file.name}</span>
                          {file.type && (
                            <Badge variant="outline" className="text-[10px] h-4">{file.type}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() => handleRemoveDocument(config, config.multiple ? index : undefined)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Dropzone */}
                {(config.multiple || !isUploaded) && (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer ${
                      dragOverKey === config.key
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                    } ${isUploading || (config.typeOptions && !docTypes[config.key]) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isUploading && !(config.typeOptions && !docTypes[config.key])) {
                        setDragOverKey(config.key);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverKey(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverKey(null);
                      if (!isUploading && !(config.typeOptions && !docTypes[config.key])) {
                        handleFileUpload(config, e.dataTransfer.files);
                      }
                    }}
                    onClick={() => {
                      if (!isUploading && !(config.typeOptions && !docTypes[config.key])) {
                        fileInputRefs.current[config.key]?.click();
                      }
                    }}
                  >
                    <input
                      ref={(el) => { fileInputRefs.current[config.key] = el; }}
                      type="file"
                      accept={config.accept}
                      onChange={(e) => handleFileUpload(config, e.target.files)}
                      className="hidden"
                      disabled={isUploading || (config.typeOptions && !docTypes[config.key])}
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className={`h-8 w-8 mb-2 ${dragOverKey === config.key ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-medium">
                            {config.multiple && files.length > 0 ? 'Add more files' : 'Drop file here or click to upload'}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            Max {config.maxSize}MB • {config.accept.includes('image') ? 'Images' : ''}{config.accept.includes('pdf') ? (config.accept.includes('image') ? ' or PDF' : 'PDF') : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Guidelines */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border rounded-lg p-4 text-sm">
        <h4 className="font-medium mb-2">Document Guidelines:</h4>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
          <li>All documents should be clear and readable</li>
          <li>Accepted formats: JPEG, PNG, PDF</li>
          <li>Ensure all corners of documents are visible</li>
          <li>Colored scans are preferred over black & white</li>
          <li>Documents marked with * are mandatory</li>
        </ul>
      </div>
    </div>
  );
}
