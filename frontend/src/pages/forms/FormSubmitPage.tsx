import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { formsApi, FieldType } from '@/lib/api/forms-api';
import type { FormField, SubmitResponseDto } from '@/lib/api/forms-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function FormSubmitPage() {
  const intl = useIntl();
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', workspaceId, formId],
    queryFn: () => formsApi.getForm(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Form not found');

      const submissionData: SubmitResponseDto = {
        responses: Object.entries(responses).reduce((acc, [fieldId, value]) => {
          const field = form.fields.find((f) => f.id === fieldId);
          if (field) {
            acc[fieldId] = {
              value,
              label: field.label,
            };
          }
          return acc;
        }, {} as Record<string, { value: any; label: string }>),
        submissionTimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        isComplete: true,
      };

      return formsApi.submitResponse(workspaceId!, formId!, submissionData);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.responseSubmitted', defaultMessage: 'Response submitted successfully' }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || intl.formatMessage({ id: 'modules.forms.messages.responseSubmitError', defaultMessage: 'Failed to submit response' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = form?.fields.filter(
      (field) => field.required && !responses[field.id]
    );

    if (missingFields && missingFields.length > 0) {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.requiredFields', defaultMessage: 'Please fill in all required fields' }));
      return;
    }

    submitMutation.mutate();
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id];

    switch (field.type) {
      case FieldType.SHORT_TEXT:
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.EMAIL:
        return (
          <Input
            type="email"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.PHONE:
        return (
          <Input
            type="tel"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.URL:
        return (
          <Input
            type="url"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.LONG_TEXT:
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
            rows={4}
          />
        );

      case FieldType.NUMBER:
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.DATE:
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.TIME:
        return (
          <Input
            type="time"
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.DATETIME:
        return (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            required={field.required}
          />
        );

      case FieldType.SINGLE_CHOICE:
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => setResponses({ ...responses, [field.id]: val })}
            required={field.required}
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case FieldType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || [];
                    if (checked) {
                      setResponses({
                        ...responses,
                        [field.id]: [...currentValues, option],
                      });
                    } else {
                      setResponses({
                        ...responses,
                        [field.id]: currentValues.filter((v: string) => v !== option),
                      });
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case FieldType.DROPDOWN:
        return (
          <Select
            value={value}
            onValueChange={(val) => setResponses({ ...responses, [field.id]: val })}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={intl.formatMessage({ id: 'modules.forms.submit.selectOption', defaultMessage: 'Select an option' })} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case FieldType.CHECKBOX:
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) =>
                setResponses({ ...responses, [field.id]: checked })
              }
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        );

      case FieldType.RATING:
      case FieldType.SCALE:
        const min = field.scale?.min || 1;
        const max = field.scale?.max || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setResponses({ ...responses, [field.id]: num })}
                className={`px-4 py-2 rounded border ${
                  value === num
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        );

      case FieldType.SECTION_HEADER:
        return (
          <div className="py-2">
            <h3 className="text-lg font-semibold">{field.label}</h3>
            {field.description && (
              <p className="text-gray-600 text-sm">{field.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            {intl.formatMessage(
              { id: 'modules.forms.submit.fieldTypeNotSupported', defaultMessage: 'Field type {type} not yet supported' },
              { type: field.type }
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">{intl.formatMessage({ id: 'modules.forms.submit.loading', defaultMessage: 'Loading form...' })}</div>;
  }

  if (!form) {
    return <div className="flex items-center justify-center h-64">{intl.formatMessage({ id: 'modules.forms.submit.formNotFound', defaultMessage: 'Form not found' })}</div>;
  }

  if (submitted) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'modules.forms.submit.submitted', defaultMessage: 'Response Submitted!' })}</h2>
            <p className="text-gray-600 text-center mb-6">
              {form.settings.confirmationMessage}
            </p>
            <Button onClick={() => navigate(`/workspaces/${workspaceId}/forms`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {intl.formatMessage({ id: 'modules.forms.actions.backToForms', defaultMessage: 'Back to Forms' })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/workspaces/${workspaceId}/forms`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {intl.formatMessage({ id: 'modules.forms.actions.backToForms', defaultMessage: 'Back to Forms' })}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type !== FieldType.SECTION_HEADER &&
                  field.type !== FieldType.CHECKBOX && (
                    <Label>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  )}
                {field.description && field.type !== FieldType.SECTION_HEADER && (
                  <p className="text-sm text-gray-600">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}

            <div className="pt-6 border-t">
              <Button type="submit" size="lg" disabled={submitMutation.isPending}>
                {submitMutation.isPending
                  ? intl.formatMessage({ id: 'modules.forms.actions.submitting', defaultMessage: 'Submitting...' })
                  : intl.formatMessage({ id: 'modules.forms.actions.submitResponse', defaultMessage: 'Submit Response' })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
