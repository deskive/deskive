import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Search, Sparkles, Plus } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { PageSEO } from '../../components/seo';
import { DocumentType, useDocumentTemplates } from '../../lib/api/document-api';

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: FileText },
  { id: 'proposal', name: 'Proposals', icon: FileText, type: DocumentType.PROPOSAL },
  { id: 'contract', name: 'Contracts', icon: FileText, type: DocumentType.CONTRACT },
  { id: 'invoice', name: 'Invoices', icon: FileText, type: DocumentType.INVOICE },
  { id: 'sow', name: 'SOWs', icon: FileText, type: DocumentType.SOW },
];

export const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch real templates from API
  const selectedType = TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.type;
  const { data: templatesData, isLoading } = useDocumentTemplates(workspaceId!, {
    documentType: selectedType,
    search: searchTerm || undefined,
    page: 1,
    limit: 50,
  });

  const templates = templatesData?.data || [];

  const handleTemplateSelect = (templateId: string) => {
    navigate(`/workspaces/${workspaceId}/more/documents/templates/${templateId}`);
  };

  const handleBlankDocument = () => {
    navigate(`/workspaces/${workspaceId}/more/documents/new`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageSEO
        title="Create Document"
        description="Choose a template to create your document"
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/workspaces/${workspaceId}/more/documents`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Document</h1>
            <p className="text-sm text-gray-600">Choose a template or start from scratch</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Category Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {TEMPLATE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory === category.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              );
            })}
          </div>

          {/* Blank Document Card */}
          <Card
            className="mb-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50"
            onClick={handleBlankDocument}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Start from Blank</h3>
                  <p className="text-sm text-gray-600">
                    Create a custom document from scratch with our editor
                  </p>
                </div>
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600">Try a different search term or category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardContent className="p-0">
                    {/* Template Preview */}
                    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-b">
                      {template.thumbnailUrl ? (
                        <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-16 h-16 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {template.name}
                        </h3>
                        <Badge className="bg-emerald-500 text-white ml-2 flex-shrink-0">
                          {template.documentType}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                      {template.isFeatured && (
                        <Badge className="bg-amber-500 text-white text-xs mt-2">Featured</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
