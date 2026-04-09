import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Tag,
  Shield,
  Edit,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { PageSEO } from '../../components/seo';
import { useDocumentTemplate, DocumentType } from '../../lib/api/document-api';

const getDocumentTypeColor = (type: DocumentType) => {
  const colors = {
    [DocumentType.PROPOSAL]: '#10b981',
    [DocumentType.CONTRACT]: '#3b82f6',
    [DocumentType.INVOICE]: '#f59e0b',
    [DocumentType.SOW]: '#8b5cf6',
  };
  return colors[type] || '#10b981';
};

export const TemplatePreview: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId, templateId } = useParams<{ workspaceId: string; templateId: string }>();

  const { data: template, isLoading } = useDocumentTemplate(workspaceId!, templateId!);

  if (isLoading) {
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
        title={template.name}
        description="Template preview"
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/create`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Preview</h1>
            <p className="text-sm text-gray-600">Review template before using</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header Section */}
          <div
            className="p-6 rounded-xl mb-6"
            style={{
              background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`
            }}
          >
            <div
              className="inline-flex p-4 rounded-2xl mb-4"
              style={{ backgroundColor: `${color}20` }}
            >
              <FileText className="w-9 h-9" style={{ color }} />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h2>
            {template.description && (
              <p className="text-gray-700 mb-4">{template.description}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-600 text-white">
                <FileText className="w-3 h-3 mr-1" />
                {template.documentType}
              </Badge>
              {template.category && (
                <Badge variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {template.category}
                </Badge>
              )}
              {template.isSystem && (
                <Badge className="bg-blue-600 text-white">
                  <Shield className="w-3 h-3 mr-1" />
                  System Template
                </Badge>
              )}
              {template.isFeatured && (
                <Badge className="bg-amber-500 text-white">
                  ⭐ Featured
                </Badge>
              )}
            </div>
          </div>

          {/* Placeholders Section */}
          {template.placeholders && template.placeholders.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Edit className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customizable Fields
                  </h3>
                  <Badge variant="secondary">{template.placeholders.length} fields</Badge>
                </div>
                <div className="space-y-2">
                  {template.placeholders.map((placeholder, index) => {
                    const placeholderText = typeof placeholder === 'string'
                      ? placeholder
                      : (placeholder as any).label || (placeholder as any).key || 'Field';
                    const isRequired = typeof placeholder === 'object' && (placeholder as any).required;

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {placeholderText}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <Users className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {template.isSystem ? 'System' : 'Custom'}
                  </div>
                  <div className="text-xs text-gray-600">Template Type</div>
                </div>
                <div>
                  <Edit className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {template.placeholders?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Fields</div>
                </div>
                <div>
                  <FileText className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {template.documentType}
                  </div>
                  <div className="text-xs text-gray-600">Type</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Content */}
          {template.contentHtml && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Preview</h3>
                <div
                  className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-6 bg-white max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: template.contentHtml }}
                />
              </CardContent>
            </Card>
          )}

          {/* Use Template Button */}
          <Button
            onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/templates/${template.id}/fill`)}
            className="w-full py-6 text-lg font-semibold"
            style={{ backgroundColor: color }}
          >
            <FileText className="w-5 h-5 mr-2" />
            Use This Template
          </Button>
        </div>
      </div>
    </div>
  );
};
