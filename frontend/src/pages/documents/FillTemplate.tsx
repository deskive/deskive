import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { PageSEO } from '../../components/seo';
import { useToast } from '../../hooks/use-toast';
import {
  useDocumentTemplate,
  useCreateDocument,
  DocumentType,
} from '../../lib/api/document-api';

const getDocumentTypeColor = (type: DocumentType) => {
  const colors = {
    [DocumentType.PROPOSAL]: '#10b981',
    [DocumentType.CONTRACT]: '#3b82f6',
    [DocumentType.INVOICE]: '#f59e0b',
    [DocumentType.SOW]: '#8b5cf6',
  };
  return colors[type] || '#10b981';
};

export const FillTemplate: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId, templateId } = useParams<{ workspaceId: string; templateId: string }>();
  const { toast } = useToast();

  const { data: template, isLoading: loadingTemplate } = useDocumentTemplate(workspaceId!, templateId!);
  const createMutation = useCreateDocument(workspaceId!);

  const [title, setTitle] = useState('');
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setTitle(`New ${template.documentType.charAt(0).toUpperCase() + template.documentType.slice(1)}`);

      // Initialize placeholder values
      const initialValues: Record<string, string> = {};
      template.placeholders?.forEach((placeholder: any) => {
        const key = typeof placeholder === 'string' ? placeholder : placeholder.key;
        const defaultValue = typeof placeholder === 'object' ? placeholder.defaultValue || '' : '';
        initialValues[key] = defaultValue;
      });
      setPlaceholderValues(initialValues);
    }
  }, [template]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a document title', variant: 'destructive' });
      return;
    }

    // Check required fields
    if (template?.placeholders) {
      for (const placeholder of template.placeholders) {
        const ph = typeof placeholder === 'object' ? placeholder : { key: placeholder, label: placeholder, required: false };
        if (ph.required && !placeholderValues[ph.key]?.trim()) {
          toast({
            title: `Please fill required field: ${ph.label || ph.key}`,
            variant: 'destructive'
          });
          return;
        }
      }
    }

    try {
      const doc = await createMutation.mutateAsync({
        title,
        documentType: template!.documentType,
        content: template!.content,
        contentHtml: template!.contentHtml,
        templateId: template!.id,
        placeholderValues,
      });

      toast({ title: 'Document created successfully' });
      navigate(`/workspaces/${workspaceId}/more/documents/${doc.id}`);
    } catch (error) {
      toast({ title: 'Failed to create document', variant: 'destructive' });
    }
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Template not found</p>
      </div>
    );
  }

  const color = getDocumentTypeColor(template.documentType);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageSEO
        title="Fill Template"
        description="Enter document details"
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/templates/${templateId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fill Template Details</h1>
              <p className="text-sm text-gray-600">Enter values for placeholder fields</p>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
            style={{ backgroundColor: createMutation.isPending ? undefined : color }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Creating...' : 'Create Document'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6">
              {/* Template Info Header */}
              <div
                className="p-4 rounded-xl mb-6"
                style={{ backgroundColor: `${color}15` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${color}30` }}
                  >
                    <FileText className="w-6 h-6" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.documentType}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Document Title */}
                <div>
                  <Label htmlFor="title">
                    Document Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title"
                    className="mt-1"
                  />
                </div>

                {/* Placeholder Fields */}
                {template.placeholders && template.placeholders.length > 0 && (
                  <>
                    <div className="border-t pt-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Template Fields</h3>
                      <div className="space-y-4">
                        {template.placeholders.map((placeholder: any, index: number) => {
                          const ph = typeof placeholder === 'object'
                            ? placeholder
                            : { key: placeholder, label: placeholder, type: 'text', required: false };

                          const isTextarea = ph.type === 'textarea' || ph.type === 'longtext';

                          return (
                            <div key={index}>
                              <Label htmlFor={ph.key}>
                                {ph.label || ph.key}
                                {ph.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {ph.helpText && (
                                <p className="text-xs text-gray-500 mb-1">{ph.helpText}</p>
                              )}
                              {isTextarea ? (
                                <Textarea
                                  id={ph.key}
                                  value={placeholderValues[ph.key] || ''}
                                  onChange={(e) => setPlaceholderValues({
                                    ...placeholderValues,
                                    [ph.key]: e.target.value
                                  })}
                                  placeholder={ph.placeholder || `Enter ${ph.label || ph.key}`}
                                  className="mt-1"
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  id={ph.key}
                                  type={ph.type === 'number' ? 'number' : ph.type === 'date' ? 'date' : 'text'}
                                  value={placeholderValues[ph.key] || ''}
                                  onChange={(e) => setPlaceholderValues({
                                    ...placeholderValues,
                                    [ph.key]: e.target.value
                                  })}
                                  placeholder={ph.placeholder || `Enter ${ph.label || ph.key}`}
                                  className="mt-1"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Helper Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    After creating, you can further edit the document content using the rich text editor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
