import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { formsApi, FormStatus } from '@/lib/api/forms-api';
import type { Form } from '@/lib/api/forms-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlusCircle, MoreVertical, FileText, Eye, Link, Trash, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShareFormDialog } from '@/components/forms/ShareFormDialog';

export default function FormsPage() {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [shareForm, setShareForm] = useState<Form | null>(null);

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms', workspaceId],
    queryFn: () => formsApi.getForms(workspaceId!),
    enabled: !!workspaceId,
  });

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsApi.deleteForm(workspaceId!, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.deleteSuccess' }));
      setDeleteFormId(null);
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.deleteError' }));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (formId: string) => formsApi.duplicateForm(workspaceId!, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.duplicateSuccess' }));
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.duplicateError' }));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (formId: string) => formsApi.publishForm(workspaceId!, formId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.publishSuccess' }));
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.publishError' }));
    },
  });

  const getStatusBadge = (status: FormStatus) => {
    const variants: Record<FormStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [FormStatus.DRAFT]: 'secondary',
      [FormStatus.PUBLISHED]: 'default',
      [FormStatus.CLOSED]: 'destructive',
      [FormStatus.ARCHIVED]: 'outline',
    };
    const statusLabels: Record<FormStatus, string> = {
      [FormStatus.DRAFT]: intl.formatMessage({ id: 'modules.forms.status.draft' }),
      [FormStatus.PUBLISHED]: intl.formatMessage({ id: 'modules.forms.status.published' }),
      [FormStatus.CLOSED]: intl.formatMessage({ id: 'modules.forms.status.closed' }),
      [FormStatus.ARCHIVED]: intl.formatMessage({ id: 'modules.forms.status.archived' }),
    };
    return <Badge variant={variants[status]}>{statusLabels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{intl.formatMessage({ id: 'modules.forms.loading' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{intl.formatMessage({ id: 'modules.forms.title' })}</h1>
          <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.description' })}</p>
        </div>
        <Button onClick={() => navigate(`/workspaces/${workspaceId}/forms/new`)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {intl.formatMessage({ id: 'modules.forms.actions.createForm' })}
        </Button>
      </div>

      {!forms || forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'modules.forms.empty.title' })}</h3>
            <p className="text-gray-600 mb-4">{intl.formatMessage({ id: 'modules.forms.empty.description' })}</p>
            <Button onClick={() => navigate(`/workspaces/${workspaceId}/forms/new`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {intl.formatMessage({ id: 'modules.forms.actions.createForm' })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form: Form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {form.title}
                      {getStatusBadge(form.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {form.description || intl.formatMessage({ id: 'modules.forms.noDescription' })}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/workspaces/${workspaceId}/forms/${form.id}/edit`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'modules.forms.actions.edit' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/workspaces/${workspaceId}/forms/${form.id}/responses`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'modules.forms.actions.viewResponses' }, { count: form.responseCount })}
                      </DropdownMenuItem>
                      {form.status === FormStatus.PUBLISHED && (
                        <DropdownMenuItem onClick={() => setShareForm(form)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          {intl.formatMessage({ id: 'modules.forms.actions.shareLink' })}
                        </DropdownMenuItem>
                      )}
                      {form.status === FormStatus.DRAFT && (
                        <DropdownMenuItem onClick={() => publishMutation.mutate(form.id)}>
                          <Link className="mr-2 h-4 w-4" />
                          {intl.formatMessage({ id: 'modules.forms.actions.publish' })}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(form.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'modules.forms.actions.duplicate' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteFormId(form.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'modules.forms.actions.delete' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{intl.formatMessage({ id: 'modules.forms.fields.fields' })}:</span>
                    <span className="font-medium">{form.fields.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{intl.formatMessage({ id: 'modules.forms.fields.responses' })}:</span>
                    <span className="font-medium">{form.responseCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{intl.formatMessage({ id: 'modules.forms.fields.views' })}:</span>
                    <span className="font-medium">{form.viewCount}</span>
                  </div>
                  {form.publishedAt && (
                    <div className="flex justify-between">
                      <span>{intl.formatMessage({ id: 'modules.forms.fields.published' })}:</span>
                      <span className="font-medium">
                        {new Date(form.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'modules.forms.deleteDialog.title' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'modules.forms.deleteDialog.description' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'modules.forms.deleteDialog.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFormId && deleteMutation.mutate(deleteFormId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {intl.formatMessage({ id: 'modules.forms.deleteDialog.confirm' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {shareForm && (
        <ShareFormDialog
          open={!!shareForm}
          onOpenChange={() => setShareForm(null)}
          form={shareForm}
          workspaceId={workspaceId!}
        />
      )}
    </div>
  );
}
