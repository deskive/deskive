import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { PageSEO } from '../../components/seo';
import { useToast } from '../../hooks/use-toast';
import {
  useDocuments,
  useDocumentStats,
  useDeleteDocument,
  DocumentType,
  DocumentStatus,
  type Document,
} from '../../lib/api/document-api';

export const DocumentBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { toast } = useToast();
  const intl = useIntl();

  const DOCUMENT_TYPES = [
    { value: null, label: intl.formatMessage({ id: 'documents.types.allDocuments', defaultMessage: 'All Documents' }) },
    { value: DocumentType.PROPOSAL, label: intl.formatMessage({ id: 'documents.types.proposals', defaultMessage: 'Proposals' }) },
    { value: DocumentType.CONTRACT, label: intl.formatMessage({ id: 'documents.types.contracts', defaultMessage: 'Contracts' }) },
    { value: DocumentType.INVOICE, label: intl.formatMessage({ id: 'documents.types.invoices', defaultMessage: 'Invoices' }) },
    { value: DocumentType.SOW, label: intl.formatMessage({ id: 'documents.types.sows', defaultMessage: 'SOWs' }) },
  ];

  const STATUS_FILTERS = [
    { value: null, label: intl.formatMessage({ id: 'documents.status.allStatus', defaultMessage: 'All Status' }) },
    { value: DocumentStatus.DRAFT, label: intl.formatMessage({ id: 'documents.status.draft', defaultMessage: 'Draft' }) },
    { value: DocumentStatus.ARCHIVED, label: intl.formatMessage({ id: 'documents.status.archived', defaultMessage: 'Archived' }) },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Fetch documents
  const { data: documentsData, isLoading } = useDocuments(workspaceId!, {
    documentType: selectedType || undefined,
    status: selectedStatus || undefined,
    search: searchTerm || undefined,
    page: 1,
    limit: 50,
  });

  const { data: stats } = useDocumentStats(workspaceId!);
  const deleteMutation = useDeleteDocument(workspaceId!);

  const documents = documentsData?.data || [];

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({ title: intl.formatMessage({ id: 'documents.toast.deleteSuccess', defaultMessage: 'Document deleted successfully' }) });
      setDeleteConfirm(null);
    } catch (error) {
      toast({ title: intl.formatMessage({ id: 'documents.toast.deleteError', defaultMessage: 'Failed to delete document' }), variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const config: Record<DocumentStatus, { color: string; label: string }> = {
      [DocumentStatus.DRAFT]: { color: 'bg-gray-500', label: intl.formatMessage({ id: 'documents.status.draft', defaultMessage: 'Draft' }) },
      [DocumentStatus.ARCHIVED]: { color: 'bg-gray-600', label: intl.formatMessage({ id: 'documents.status.archived', defaultMessage: 'Archived' }) },
      [DocumentStatus.PENDING_SIGNATURE]: { color: 'bg-yellow-500', label: intl.formatMessage({ id: 'documents.status.pending', defaultMessage: 'Pending' }) },
      [DocumentStatus.SIGNED]: { color: 'bg-green-500', label: intl.formatMessage({ id: 'documents.status.completed', defaultMessage: 'Completed' }) },
      [DocumentStatus.EXPIRED]: { color: 'bg-red-500', label: intl.formatMessage({ id: 'documents.status.expired', defaultMessage: 'Expired' }) },
      [DocumentStatus.DECLINED]: { color: 'bg-red-600', label: intl.formatMessage({ id: 'documents.status.declined', defaultMessage: 'Declined' }) },
      [DocumentStatus.PARTIALLY_SIGNED]: { color: 'bg-blue-500', label: intl.formatMessage({ id: 'documents.status.inProgress', defaultMessage: 'In Progress' }) },
    };
    const { color, label } = config[status];
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getTypeIcon = (type: DocumentType) => {
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <PageSEO
        title={intl.formatMessage({ id: 'documents.seo.title', defaultMessage: 'Document Builder' })}
        description={intl.formatMessage({ id: 'documents.seo.description', defaultMessage: 'Create and manage professional documents' })}
      />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'documents.title', defaultMessage: 'Document Builder' })}</h1>
            <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'documents.subtitle', defaultMessage: 'Create and manage professional documents' })}</p>
          </div>
          <Button
            onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/create`)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'documents.actions.newDocument', defaultMessage: 'New Document' })}
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'documents.stats.totalDocuments', defaultMessage: 'Total Documents' })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.byStatus['draft'] || 0}</div>
                <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'documents.stats.drafts', defaultMessage: 'Drafts' })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.byType['proposal'] || 0}</div>
                <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'documents.stats.proposals', defaultMessage: 'Proposals' })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.byStatus['archived'] || 0}</div>
                <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'documents.stats.archived', defaultMessage: 'Archived' })}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={intl.formatMessage({ id: 'documents.search.placeholder', defaultMessage: 'Search documents...' })}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            {DOCUMENT_TYPES.map((type) => (
              <Button
                key={type.label}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.value)}
                className={selectedType === type.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {type.label}
              </Button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'documents.filters.status', defaultMessage: 'Status' })}
                {selectedStatus && <Badge className="ml-2 bg-emerald-600 text-white">1</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUS_FILTERS.map((status) => (
                <DropdownMenuItem
                  key={status.label}
                  onClick={() => setSelectedStatus(status.value)}
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{intl.formatMessage({ id: 'documents.empty.title', defaultMessage: 'No documents found' })}</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? intl.formatMessage({ id: 'documents.empty.noMatch', defaultMessage: 'No documents match "{search}"' }, { search: searchTerm })
                  : intl.formatMessage({ id: 'documents.empty.description', defaultMessage: 'Start creating your first document' })}
              </p>
              <Button
                onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/create`)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'documents.actions.createFirst', defaultMessage: 'Create First Document' })}
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(doc.documentType)}
                      {getStatusBadge(doc.status)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/${doc.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.view', defaultMessage: 'View' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/workspaces/${workspaceId}/documents/${doc.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.edit', defaultMessage: 'Edit' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.exportPdf', defaultMessage: 'Export PDF' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.archive', defaultMessage: 'Archive' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm({ id: doc.id, title: doc.title })}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.delete', defaultMessage: 'Delete' })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/${doc.id}`)}>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {doc.description || intl.formatMessage({ id: 'documents.noDescription', defaultMessage: 'No description' })}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{doc.documentNumber}</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(doc.documentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                        {getStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{doc.description || intl.formatMessage({ id: 'documents.noDescription', defaultMessage: 'No description' })}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{doc.documentNumber}</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/workspaces/${workspaceId}/more/documents/${doc.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.view', defaultMessage: 'View' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/workspaces/${workspaceId}/documents/${doc.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.edit', defaultMessage: 'Edit' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.exportPdf', defaultMessage: 'Export PDF' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.archive', defaultMessage: 'Archive' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm({ id: doc.id, title: doc.title })}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'documents.actions.delete', defaultMessage: 'Delete' })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{intl.formatMessage({ id: 'documents.deleteModal.title', defaultMessage: 'Delete Document' })}</h3>
              <p className="text-gray-600 mb-6">
                {intl.formatMessage(
                  { id: 'documents.deleteModal.message', defaultMessage: 'Are you sure you want to delete "{title}"? This action cannot be undone.' },
                  { title: deleteConfirm.title }
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  {intl.formatMessage({ id: 'documents.deleteModal.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending
                    ? intl.formatMessage({ id: 'documents.deleteModal.deleting', defaultMessage: 'Deleting...' })
                    : intl.formatMessage({ id: 'documents.deleteModal.delete', defaultMessage: 'Delete' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
