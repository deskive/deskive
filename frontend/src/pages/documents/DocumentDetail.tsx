import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  Archive,
  Trash2,
  FileText,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { PageSEO } from '../../components/seo';
import { useToast } from '../../hooks/use-toast';
import {
  useDocument,
  useUpdateDocument,
  useDeleteDocument,
  useDocumentPreview,
  DocumentType,
  DocumentStatus,
} from '../../lib/api/document-api';

// Lazy load ReactQuill
const ReactQuill = lazy(() => import('react-quill-new'));
import 'react-quill-new/dist/quill.snow.css';

export const DocumentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId: string }>();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  // Fetch document
  const { data: document, isLoading } = useDocument(workspaceId!, documentId!);
  const { data: previewHtml } = useDocumentPreview(workspaceId!, documentId!);
  const updateMutation = useUpdateDocument(workspaceId!, documentId!);
  const deleteMutation = useDeleteDocument(workspaceId!);

  // Form state
  const [formData, setFormData] = useState({
    title: document?.title || '',
    description: document?.description || '',
    documentType: document?.documentType || DocumentType.PROPOSAL,
    content: document?.contentHtml || '',
  });

  // Update form when document loads
  React.useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        description: document.description || '',
        documentType: document.documentType,
        content: document.contentHtml || '',
      });
    }
  }, [document]);

  // Quill editor config
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ 'align': [] }],
      ['clean']
    ],
  }), []);

  const quillFormats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image',
    'align',
    'blockquote', 'code-block',
  ], []);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        contentHtml: formData.content,
      });
      toast({ title: 'Document saved successfully' });
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Failed to save document', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${document?.title}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(documentId!);
      toast({ title: 'Document deleted' });
      navigate(`/workspaces/${workspaceId}/more/documents`);
    } catch (error) {
      toast({ title: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handleExportPDF = () => {
    toast({ title: 'PDF export coming soon' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Document not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: DocumentStatus) => {
    const config: Record<DocumentStatus, { color: string; label: string }> = {
      [DocumentStatus.DRAFT]: { color: 'bg-gray-500', label: 'Draft' },
      [DocumentStatus.ARCHIVED]: { color: 'bg-gray-600', label: 'Archived' },
      [DocumentStatus.PENDING_SIGNATURE]: { color: 'bg-yellow-500', label: 'Pending' },
      [DocumentStatus.PARTIALLY_SIGNED]: { color: 'bg-blue-500', label: 'In Progress' },
      [DocumentStatus.SIGNED]: { color: 'bg-green-500', label: 'Completed' },
      [DocumentStatus.EXPIRED]: { color: 'bg-red-500', label: 'Expired' },
      [DocumentStatus.DECLINED]: { color: 'bg-red-600', label: 'Declined' },
    };
    const statusConfig = config[status] || { color: 'bg-gray-500', label: status || 'Unknown' };
    const { color, label } = statusConfig;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageSEO
        title={document.title}
        description="View and edit document"
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/workspaces/${workspaceId}/more/documents`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                {getStatusBadge(document.status)}
              </div>
              <p className="text-sm text-gray-600">{document.documentNumber} • {document.documentType}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      title: document.title,
                      description: document.description || '',
                      documentType: document.documentType,
                      content: document.contentHtml || '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-6">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Document Type */}
                  <div>
                    <Label htmlFor="type">Document Type</Label>
                    <Select
                      value={formData.documentType}
                      onValueChange={(value) => setFormData({ ...formData, documentType: value as DocumentType })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DocumentType.PROPOSAL}>Proposal</SelectItem>
                        <SelectItem value={DocumentType.CONTRACT}>Contract</SelectItem>
                        <SelectItem value={DocumentType.INVOICE}>Invoice</SelectItem>
                        <SelectItem value={DocumentType.SOW}>SOW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Content Editor */}
                  <div>
                    <Label>Content</Label>
                    {isEditing ? (
                      <Suspense fallback={
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-96 flex items-center justify-center">
                          <div className="text-gray-500">Loading editor...</div>
                        </div>
                      }>
                        <ReactQuill
                          theme="snow"
                          value={formData.content}
                          onChange={(content) => setFormData({ ...formData, content })}
                          modules={quillModules}
                          formats={quillFormats}
                          className="mt-1 bg-white"
                          style={{ height: '500px', marginBottom: '50px' }}
                        />
                      </Suspense>
                    ) : (
                      <div
                        className="mt-1 border border-gray-300 rounded-lg p-6 min-h-[500px] bg-white prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="preview">
                  <div className="border border-gray-300 rounded-lg p-8 bg-white min-h-[600px]">
                    {previewHtml ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    ) : (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                      />
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleExportPDF}
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export as PDF
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
