import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { publicFormsApi, FieldType } from '@/lib/api/forms-api';
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
import { CheckCircle, Lock } from 'lucide-react';

export default function PublicFormSubmitPage() {
  const intl = useIntl();
  const { slug, shareToken } = useParams<{ slug?: string; shareToken?: string }>();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['public-form', slug || shareToken],
    queryFn: async () => {
      if (slug) {
        return publicFormsApi.getFormBySlug(slug);
      } else if (shareToken) {
        return publicFormsApi.getFormByShareToken(shareToken);
      }
      throw new Error('No form identifier provided');
    },
    enabled: !!slug || !!shareToken,
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      if (!shareToken) throw new Error('Share token required for password verification');
      return publicFormsApi.verifySharePassword(shareToken, pwd);
    },
    onSuccess: (isValid) => {
      if (isValid) {
        setIsPasswordVerified(true);
        setShowPasswordPrompt(false);
        toast.success(intl.formatMessage({ id: 'modules.forms.messages.passwordVerified', defaultMessage: 'Password verified' }));
      } else {
        toast.error(intl.formatMessage({ id: 'modules.forms.messages.passwordInvalid', defaultMessage: 'Invalid password' }));
      }
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.passwordVerifyError', defaultMessage: 'Failed to verify password' }));
    },
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

      if (slug) {
        return publicFormsApi.submitPublicResponse(slug, submissionData);
      } else if (shareToken) {
        return publicFormsApi.submitShareResponse(shareToken, submissionData);
      }
      throw new Error('No form identifier provided');
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPasswordMutation.mutate(password);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.submit.loading', defaultMessage: 'Loading form...' })}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">{intl.formatMessage({ id: 'modules.forms.submit.formNotFound', defaultMessage: 'Form Not Found' })}</h2>
              <p className="text-gray-600">
                {intl.formatMessage({ id: 'modules.forms.submit.formNotAvailable', defaultMessage: 'This form is not available or has been closed.' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{intl.formatMessage({ id: 'modules.forms.submit.formNotFound', defaultMessage: 'Form Not Found' })}</h2>
              <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.submit.formNotExist', defaultMessage: "The form you're looking for doesn't exist." })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if form requires login
  if (form.settings.requireLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <CardTitle>{intl.formatMessage({ id: 'modules.forms.submit.loginRequired', defaultMessage: 'Login Required' })}</CardTitle>
            </div>
            <CardDescription>{form.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {intl.formatMessage({ id: 'modules.forms.submit.loginRequiredDescription', defaultMessage: 'This form requires you to be logged in to submit a response.' })}
            </p>
            <Button
              onClick={() => {
                // Save current URL for redirect after login
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                window.location.href = '/auth/login';
              }}
              className="w-full"
            >
              {intl.formatMessage({ id: 'modules.forms.actions.loginToContinue', defaultMessage: 'Login to Continue' })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password prompt if share token requires password
  if (shareToken && !isPasswordVerified && showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <CardTitle>{intl.formatMessage({ id: 'modules.forms.submit.passwordProtected', defaultMessage: 'Password Protected Form' })}</CardTitle>
            </div>
            <CardDescription>
              {intl.formatMessage({ id: 'modules.forms.submit.passwordProtectedDescription', defaultMessage: 'This form requires a password to access' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label>{intl.formatMessage({ id: 'modules.forms.submit.password', defaultMessage: 'Password' })}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'modules.forms.submit.enterPassword', defaultMessage: 'Enter password' })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyPasswordMutation.isPending}
              >
                {verifyPasswordMutation.isPending
                  ? intl.formatMessage({ id: 'modules.forms.actions.verifying', defaultMessage: 'Verifying...' })
                  : intl.formatMessage({ id: 'modules.forms.actions.submit', defaultMessage: 'Submit' })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'modules.forms.submit.submitted', defaultMessage: 'Response Submitted!' })}</h2>
            <p className="text-gray-600 text-center mb-6">
              {form.settings.confirmationMessage}
            </p>
            {form.settings.redirectUrl && (
              <Button onClick={() => window.location.href = form.settings.redirectUrl!}>
                {intl.formatMessage({ id: 'modules.forms.actions.continue', defaultMessage: 'Continue' })}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const formBranding = form.branding || {};

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: formBranding.backgroundColor || '#f9fafb' }}>
      <div className="container mx-auto max-w-3xl">
        <Card style={{
          backgroundColor: formBranding.backgroundColor || '#ffffff',
          fontFamily: formBranding.fontFamily || 'Inter',
          fontSize: `${formBranding.fontSize || 16}px`,
          color: formBranding.textColor || '#1f2937',
        }}>
          <CardHeader style={{ textAlign: formBranding.textAlign as any || 'left' }}>
            <CardTitle style={{
              color: formBranding.textColor || '#1f2937',
              fontFamily: formBranding.fontFamily || 'Inter',
              fontWeight: formBranding.fontWeight || 'normal',
            }}>
              {form.title}
            </CardTitle>
            {form.description && (
              <CardDescription style={{
                color: formBranding.textColor || '#6b7280',
                fontFamily: formBranding.fontFamily || 'Inter',
              }}>
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  {field.type !== FieldType.SECTION_HEADER &&
                    field.type !== FieldType.CHECKBOX && (
                      <Label style={{
                        color: formBranding.textColor || '#374151',
                        fontFamily: formBranding.fontFamily || 'Inter',
                        fontWeight: formBranding.fontWeight || 'normal',
                      }}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    )}
                  {field.description && field.type !== FieldType.SECTION_HEADER && (
                    <p className="text-sm" style={{
                      color: formBranding.textColor || '#6b7280',
                      fontFamily: formBranding.fontFamily || 'Inter',
                      opacity: 0.8,
                    }}>
                      {field.description}
                    </p>
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

        {/* Powered by footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          {intl.formatMessage({ id: 'modules.forms.submit.poweredBy', defaultMessage: 'Powered by Deskive Forms' })}
        </div>
      </div>
    </div>
  );
}
