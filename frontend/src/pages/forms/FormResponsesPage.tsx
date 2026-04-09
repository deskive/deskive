import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { formsApi } from '@/lib/api/forms-api';
import type { FormResponse } from '@/lib/api/forms-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Download, Eye, Trash, ArrowLeft, BarChart } from 'lucide-react';
import { toast } from 'sonner';

export default function FormResponsesPage() {
  const intl = useIntl();
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [deleteResponseId, setDeleteResponseId] = useState<string | null>(null);

  const { data: form } = useQuery({
    queryKey: ['form', workspaceId, formId],
    queryFn: () => formsApi.getForm(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const { data: responsesData, isLoading } = useQuery({
    queryKey: ['form-responses', workspaceId, formId],
    queryFn: () => formsApi.getResponses(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const deleteMutation = useMutation({
    mutationFn: (responseId: string) =>
      formsApi.deleteResponse(workspaceId!, formId!, responseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-responses', workspaceId, formId] });
      toast.success(intl.formatMessage({ id: 'modules.forms.responses.deleteSuccess' }));
      setDeleteResponseId(null);
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.responses.deleteError' }));
    },
  });

  const handleExport = async () => {
    try {
      const blob = await formsApi.exportResponses(workspaceId!, formId!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-responses-${formId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(intl.formatMessage({ id: 'modules.forms.responses.exportSuccess' }));
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'modules.forms.responses.exportError' }));
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">{intl.formatMessage({ id: 'modules.forms.responses.loading' })}</div>;
  }

  const responses = responsesData?.data || [];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/workspaces/${workspaceId}/forms`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: 'modules.forms.responses.backToForms', defaultMessage: 'Back to Forms' })}
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {form?.title || intl.formatMessage({ id: 'modules.forms.responses.formTitle', defaultMessage: 'Form' })} - {intl.formatMessage({ id: 'modules.forms.responses.responses', defaultMessage: 'Responses' })}
          </h1>
          <p className="text-gray-600">
            {intl.formatMessage(
              { id: 'modules.forms.responses.responseCount', defaultMessage: '{count} responses' },
              { count: responses.length }
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/workspaces/${workspaceId}/forms/${formId}/analytics`)}
          >
            <BarChart className="mr-2 h-4 w-4" />
            {intl.formatMessage({ id: 'modules.forms.actions.analytics', defaultMessage: 'Analytics' })}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={responses.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {intl.formatMessage({ id: 'modules.forms.actions.exportCsv', defaultMessage: 'Export CSV' })}
          </Button>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Eye className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'modules.forms.responses.noResponsesTitle', defaultMessage: 'No responses yet' })}</h3>
            <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.responses.noResponsesDescription', defaultMessage: 'When someone submits this form, responses will appear here' })}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'modules.forms.responses.allResponses' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{intl.formatMessage({ id: 'modules.forms.responses.submittedAt' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'modules.forms.responses.respondent' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'modules.forms.responses.email' })}</TableHead>
                  <TableHead>{intl.formatMessage({ id: 'modules.forms.responses.status' })}</TableHead>
                  <TableHead className="text-right">{intl.formatMessage({ id: 'modules.forms.actions.actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      {new Date(response.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{response.respondentName || intl.formatMessage({ id: 'modules.forms.responses.anonymous' })}</TableCell>
                    <TableCell>{response.respondentEmail || '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {response.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedResponse(response)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteResponseId(response.id)}
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Response Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: 'modules.forms.responses.responseDetails' })}</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'modules.forms.responses.submittedAt' })}</p>
                  <p className="font-medium">
                    {new Date(selectedResponse.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'modules.forms.responses.respondent' })}</p>
                  <p className="font-medium">
                    {selectedResponse.respondentName || intl.formatMessage({ id: 'modules.forms.responses.anonymous' })}
                  </p>
                </div>
                {selectedResponse.respondentEmail && (
                  <div>
                    <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'modules.forms.responses.email' })}</p>
                    <p className="font-medium">{selectedResponse.respondentEmail}</p>
                  </div>
                )}
                {selectedResponse.submissionTimeSeconds && (
                  <div>
                    <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'modules.forms.responses.completionTime' })}</p>
                    <p className="font-medium">
                      {Math.floor(selectedResponse.submissionTimeSeconds / 60)}m{' '}
                      {selectedResponse.submissionTimeSeconds % 60}s
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">{intl.formatMessage({ id: 'modules.forms.responses.answers' })}</h3>
                {Object.entries(selectedResponse.responses).map(([fieldId, answer]) => (
                  <div key={fieldId} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-2">{answer.label}</p>
                    <p className="text-gray-700">
                      {Array.isArray(answer.value)
                        ? answer.value.join(', ')
                        : String(answer.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteResponseId} onOpenChange={() => setDeleteResponseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'modules.forms.responses.deleteResponseTitle' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'modules.forms.responses.deleteResponseDescription' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteResponseId && deleteMutation.mutate(deleteResponseId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {intl.formatMessage({ id: 'common.delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
