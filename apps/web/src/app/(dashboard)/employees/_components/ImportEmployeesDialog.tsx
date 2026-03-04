'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileWarning,
  Users,
} from 'lucide-react';
import { apiClient, api } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface PreviewData {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  columns: string[];
  mappedColumns: Record<string, string>;
  unmappedColumns: string[];
  preview: any[];
  duplicateDetails: { row: number; email: string; data: any }[];
  invalidDetails: { row: number; errors: string[]; data: any }[];
}

interface ImportResult {
  created: number;
  failed: number;
  duplicates: number;
  invalid: number;
  createdEmployees: { id: string; employeeCode: string; name: string; email: string }[];
  failedDetails: { row: number; name: string; email: string; error: string }[];
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export function ImportEmployeesDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportEmployeesDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/v1/employees/import/template', {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/v1/employees/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to preview file');
      }

      setPreviewData(result.data);
      setStep('preview');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to preview file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDuplicates', 'true');

      const response = await api.post('/api/v1/employees/import/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error?.message || 'Import failed');
      }

      setImportResult(result.data);
      setStep('complete');
      onImportComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || 'Import failed');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Employees from Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload an Excel file to import employees in bulk'}
            {step === 'preview' && 'Review the data before importing'}
            {step === 'importing' && 'Importing employees...'}
            {step === 'complete' && 'Import completed'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={cn(
            "flex items-center gap-1 text-sm",
            step === 'upload' ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              step === 'upload' ? "bg-primary text-primary-foreground" : "bg-green-500 text-white"
            )}>
              {step === 'upload' ? '1' : <CheckCircle2 className="h-4 w-4" />}
            </span>
            Upload
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-1 text-sm",
            step === 'preview' ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              step === 'preview' ? "bg-primary text-primary-foreground" : 
              ['importing', 'complete'].includes(step) ? "bg-green-500 text-white" : "bg-muted"
            )}>
              {['importing', 'complete'].includes(step) ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </span>
            Preview
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-1 text-sm",
            step === 'complete' ? "text-primary font-medium" : 
            step === 'importing' ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              step === 'importing' ? "bg-primary text-primary-foreground" : 
              step === 'complete' ? "bg-green-500 text-white" : "bg-muted"
            )}>
              {step === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : '3'}
            </span>
            Import
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Download Template */}
              <Alert>
                <Download className="h-4 w-4" />
                <AlertTitle>Download Template</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>Use our template for best results with column mapping</span>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </AlertDescription>
              </Alert>

              {/* File Upload Area */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  file ? "border-green-500 bg-green-500/5" : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-green-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drop your Excel file here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ position: 'relative' }}
                    />
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              <Alert variant="default" className="bg-muted/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tips for successful import</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>Use Official Mail ID column for employee email (required)</li>
                    <li>Date columns should be in YYYY-MM-DD format</li>
                    <li>Department and Designation must already exist in the system</li>
                    <li>Employees with Left Date will be marked as Terminated</li>
                    <li>Extra columns will be saved as custom fields (Other Information)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{previewData.total}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{previewData.valid}</div>
                  <div className="text-sm text-muted-foreground">Valid</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-600">{previewData.duplicates}</div>
                  <div className="text-sm text-muted-foreground">Duplicates</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{previewData.invalid}</div>
                  <div className="text-sm text-muted-foreground">Invalid</div>
                </div>
              </div>

              {/* Unmapped Columns Notice */}
              {previewData.unmappedColumns.length > 0 && (
                <Alert>
                  <FileWarning className="h-4 w-4" />
                  <AlertTitle>Custom Fields Detected</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm">
                      The following columns will be saved as custom fields (Other Information):
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {previewData.unmappedColumns.map((col) => (
                        <Badge key={col} variant="secondary" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg">
                <div className="p-2 bg-muted border-b">
                  <span className="text-sm font-medium">
                    Preview (showing first {Math.min(previewData.preview.length, 10)} valid records)
                  </span>
                </div>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.preview.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{row._rowNumber || idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim()}
                          </TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.department || '-'}</TableCell>
                          <TableCell>{row.designation || '-'}</TableCell>
                          <TableCell>{row.date_of_joining || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'TERMINATED' ? 'destructive' : 'outline'}>
                              {row.status || 'ACTIVE'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Invalid Records */}
              {previewData.invalidDetails.length > 0 && (
                <div className="border rounded-lg border-red-200">
                  <div className="p-2 bg-red-50 border-b border-red-200">
                    <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Invalid Records ({previewData.invalid})
                    </span>
                  </div>
                  <ScrollArea className="h-[150px]">
                    <div className="p-2 space-y-2">
                      {previewData.invalidDetails.map((item, idx) => (
                        <div key={idx} className="text-sm border-b pb-2 last:border-0">
                          <span className="font-medium">Row {item.row}:</span>{' '}
                          <span className="text-red-600">{item.errors.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Duplicate Records */}
              {previewData.duplicateDetails.length > 0 && (
                <div className="border rounded-lg border-yellow-200">
                  <div className="p-2 bg-yellow-50 border-b border-yellow-200">
                    <span className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Duplicate Records ({previewData.duplicates}) - Will be skipped
                    </span>
                  </div>
                  <ScrollArea className="h-[100px]">
                    <div className="p-2 space-y-1">
                      {previewData.duplicateDetails.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          Row {item.row}: <span className="font-medium">{item.email}</span> already exists
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Importing employees...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments
                </p>
              </div>
              <Progress value={undefined} className="w-64" />
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Successfully imported {importResult.created} employees
                </p>
              </div>

              {/* Result Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                  <div className="text-xs text-muted-foreground">Created</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                  <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
                  <FileWarning className="h-5 w-5 mx-auto text-gray-600 mb-1" />
                  <div className="text-2xl font-bold text-gray-600">{importResult.invalid}</div>
                  <div className="text-xs text-muted-foreground">Invalid</div>
                </div>
              </div>

              {/* Created Employees */}
              {importResult.createdEmployees.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-2 bg-green-50 border-b">
                    <span className="text-sm font-medium text-green-700">
                      Created Employees (showing first 10)
                    </span>
                  </div>
                  <ScrollArea className="h-[150px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.createdEmployees.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono text-sm">{emp.employeeCode}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{emp.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* Failed Records */}
              {importResult.failedDetails.length > 0 && (
                <div className="border rounded-lg border-red-200">
                  <div className="p-2 bg-red-50 border-b border-red-200">
                    <span className="text-sm font-medium text-red-700">
                      Failed Records
                    </span>
                  </div>
                  <ScrollArea className="h-[100px]">
                    <div className="p-2 space-y-2">
                      {importResult.failedDetails.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">Row {item.row}:</span>{' '}
                          {item.name} ({item.email}) - <span className="text-red-600">{item.error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!file || loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={loading || !previewData || previewData.valid === 0}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {previewData?.valid || 0} Employees
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
