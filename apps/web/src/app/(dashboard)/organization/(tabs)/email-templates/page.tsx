'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Copy,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Search,
  Code,
  Info,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

// Types
interface EmailTemplate {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: TemplateVariable[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateVariable {
  name: string;
  description: string;
  required?: boolean;
  example?: string;
}

interface TemplateCategory {
  value: string;
  label: string;
  description: string;
  count: number;
}

// Category badge colors
const CATEGORY_COLORS: Record<string, string> = {
  SYSTEM: 'bg-blue-100 text-blue-800',
  HR: 'bg-green-100 text-green-800',
  RECRUITMENT: 'bg-purple-100 text-purple-800',
  ATTENDANCE: 'bg-orange-100 text-orange-800',
  PROJECT: 'bg-cyan-100 text-cyan-800',
  CUSTOM: 'bg-gray-100 text-gray-800',
};

export default function EmailTemplatesPage() {
  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Current template state
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Seed default templates
  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const response = await apiClient.post<{ created?: number; existingCount?: number }>('/api/v1/email-templates/seed', {});
      if (response.success) {
        toast.success(response.data?.created ? `${response.data.created} default templates created` : 'Templates already exist');
        fetchTemplates();
        fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed default templates');
    } finally {
      setSeeding(false);
    }
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailTemplate[]>('/api/v1/email-templates');
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get<TemplateCategory[]>('/api/v1/email-templates/categories');
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Open edit dialog
  const openEditDialog = (template?: EmailTemplate) => {
    if (template) {
      setCurrentTemplate(template);
      setFormData({
        displayName: template.displayName,
        category: template.category,
        description: template.description,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        isActive: template.isActive,
      });
    } else {
      setCurrentTemplate(null);
      setFormData({
        name: '',
        displayName: '',
        category: 'CUSTOM',
        description: '',
        subject: '',
        htmlContent: `<h2>{{title}}</h2>\n\n<p>Dear {{recipientName}},</p>\n\n<p>Your content here...</p>\n\n<p>Best regards,<br>\n<strong>{{companyName}} Team</strong></p>`,
        isActive: true,
      });
    }
    setEditDialogOpen(true);
  };

  // Save template
  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (currentTemplate) {
        // Update existing template
        const response = await apiClient.put<EmailTemplate>(
          `/api/v1/email-templates/${currentTemplate.id}`,
          formData
        );
        if (response.success) {
          toast.success('Template updated successfully');
          setEditDialogOpen(false);
          fetchTemplates();
        }
      } else {
        // Create new template
        if (!formData.name) {
          toast.error('Template name is required');
          return;
        }
        const response = await apiClient.post<EmailTemplate>('/api/v1/email-templates', formData);
        if (response.success) {
          toast.success('Template created successfully');
          setEditDialogOpen(false);
          fetchTemplates();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Preview template
  const handlePreview = async (template: EmailTemplate) => {
    try {
      // Fetch full template content if htmlContent is missing (list view doesn't include it)
      let subject = template.subject;
      let htmlContent = template.htmlContent;
      if (!htmlContent) {
        const fullTemplate = await apiClient.get<EmailTemplate>(`/api/v1/email-templates/${template.id}`);
        if (fullTemplate.success && fullTemplate.data) {
          subject = fullTemplate.data.subject;
          htmlContent = fullTemplate.data.htmlContent;
        }
      }
      if (!htmlContent) {
        toast.error('Template has no content to preview');
        return;
      }
      const response = await apiClient.post<{ subject: string; html: string }>(
        '/api/v1/email-templates/preview',
        {
          subject,
          htmlContent,
          data: {
            title: 'Sample Title',
            recipientName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            companyName: 'Innovatelab Inc',
          },
        }
      );
      if (response.success && response.data) {
        setPreviewHtml(response.data.html);
        setCurrentTemplate(template);
        setPreviewDialogOpen(true);
      }
    } catch (error: any) {
      toast.error('Failed to preview template');
    }
  };

  // Send test email
  const handleSendTest = async () => {
    if (!testEmail || !currentTemplate) return;
    
    try {
      setSaving(true);
      const response = await apiClient.post(`/api/v1/email-templates/${currentTemplate.id}/test`, {
        to: testEmail,
      });
      if (response.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmailDialogOpen(false);
        setTestEmail('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      setSaving(true);
      const response = await apiClient.delete(`/api/v1/email-templates/${deletingId}`);
      if (response.success) {
        toast.success('Template deleted successfully');
        setDeleteDialogOpen(false);
        setDeletingId(null);
        fetchTemplates();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate template
  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const response = await apiClient.post<EmailTemplate>(
        `/api/v1/email-templates/${template.id}/duplicate`,
        {}
      );
      if (response.success) {
        toast.success('Template duplicated successfully');
        fetchTemplates();
      }
    } catch (error: any) {
      toast.error('Failed to duplicate template');
    }
  };

  // Toggle active status
  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const response = await apiClient.put<EmailTemplate>(
        `/api/v1/email-templates/${template.id}`,
        { isActive: !template.isActive }
      );
      if (response.success) {
        toast.success(`Template ${template.isActive ? 'deactivated' : 'activated'}`);
        fetchTemplates();
      }
    } catch (error: any) {
      toast.error('Failed to update template status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Email Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize the email templates sent to your employees and users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => openEditDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setVariablesDialogOpen(true)}
                title="View available variables"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No templates found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Seed default templates to get started, or create your own'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {!searchQuery && (
                <Button onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Seed Default Templates
                </Button>
              )}
              <Button variant={searchQuery ? 'default' : 'outline'} onClick={() => openEditDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.displayName}</span>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {template.description || template.subject}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={CATEGORY_COLORS[template.category] || ''}
                    >
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentTemplate(template);
                            setTestEmailDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!template.isDefault && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeletingId(template.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {currentTemplate
                ? 'Modify the email template content and settings'
                : 'Create a new custom email template'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              {!currentTemplate && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name (identifier)</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                      }
                      placeholder="e.g., custom-notification"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName || ''}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Custom Notification"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Welcome to {{companyName}}"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{variableName}}"} for dynamic content
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="htmlContent">Email Content (HTML)</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent || ''}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder="<h2>Hello {{firstName}}</h2>..."
                />
                <p className="text-xs text-muted-foreground">
                  Handlebars syntax is supported. Click the code icon in the filters to see available variables.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM">System</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="RECRUITMENT">Recruitment</SelectItem>
                      <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                      <SelectItem value="PROJECT">Project</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <span className="text-sm">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description of when this template is used..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textContent">Plain Text Version (optional)</Label>
                <Textarea
                  id="textContent"
                  value={formData.textContent || ''}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  rows={6}
                  placeholder="Plain text version for email clients that don't support HTML..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of {currentTemplate?.displayName} with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px] border-0"
              title="Email Preview"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {currentTemplate && (
              <Button
                onClick={() => {
                  setPreviewDialogOpen(false);
                  setTestEmailDialogOpen(true);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Recipient Email</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The email will be sent with sample data. Subject will be prefixed with [TEST].
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={saving || !testEmail}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Reference Dialog */}
      <Dialog open={variablesDialogOpen} onOpenChange={setVariablesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Available Template Variables</DialogTitle>
            <DialogDescription>
              Use these variables in your templates with {"{{variableName}}"} syntax
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Common Variables</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <code className="bg-muted p-1 rounded">{"{{companyName}}"}</code>
                <span className="text-muted-foreground">Organization name</span>
                <code className="bg-muted p-1 rounded">{"{{companyLogo}}"}</code>
                <span className="text-muted-foreground">Logo URL</span>
                <code className="bg-muted p-1 rounded">{"{{portalUrl}}"}</code>
                <span className="text-muted-foreground">Portal login URL</span>
                <code className="bg-muted p-1 rounded">{"{{year}}"}</code>
                <span className="text-muted-foreground">Current year</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">User Variables</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <code className="bg-muted p-1 rounded">{"{{firstName}}"}</code>
                <span className="text-muted-foreground">User first name</span>
                <code className="bg-muted p-1 rounded">{"{{lastName}}"}</code>
                <span className="text-muted-foreground">User last name</span>
                <code className="bg-muted p-1 rounded">{"{{email}}"}</code>
                <span className="text-muted-foreground">User email</span>
                <code className="bg-muted p-1 rounded">{"{{role}}"}</code>
                <span className="text-muted-foreground">User role</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Conditionals</h4>
              <div className="text-sm space-y-2">
                <code className="bg-muted p-2 rounded block">
                  {"{{#if variableName}}...{{/if}}"}
                </code>
                <code className="bg-muted p-2 rounded block">
                  {"{{#if variableName}}...{{else}}...{{/if}}"}
                </code>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Templates support Handlebars syntax. For complete documentation, visit the Handlebars documentation.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setVariablesDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
