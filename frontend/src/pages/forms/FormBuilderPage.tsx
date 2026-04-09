import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { formsApi, FieldType } from '@/lib/api/forms-api';
import type { Form, FormField, FormSettings, FormBranding, CreateFormDto } from '@/lib/api/forms-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Save, Eye, Send, Settings, Plus, Trash, GripVertical,
  AlignLeft, Type, Mail, Phone, Link as LinkIcon, Hash,
  Calendar, Clock, List, CheckSquare, Upload, Star, Share2
} from 'lucide-react';
import { ShareFormDialog } from '@/components/forms/ShareFormDialog';

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  [FieldType.SHORT_TEXT]: <Type className="h-4 w-4" />,
  [FieldType.LONG_TEXT]: <AlignLeft className="h-4 w-4" />,
  [FieldType.EMAIL]: <Mail className="h-4 w-4" />,
  [FieldType.PHONE]: <Phone className="h-4 w-4" />,
  [FieldType.URL]: <LinkIcon className="h-4 w-4" />,
  [FieldType.NUMBER]: <Hash className="h-4 w-4" />,
  [FieldType.DATE]: <Calendar className="h-4 w-4" />,
  [FieldType.TIME]: <Clock className="h-4 w-4" />,
  [FieldType.DATETIME]: <Calendar className="h-4 w-4" />,
  [FieldType.SINGLE_CHOICE]: <List className="h-4 w-4" />,
  [FieldType.MULTIPLE_CHOICE]: <CheckSquare className="h-4 w-4" />,
  [FieldType.DROPDOWN]: <List className="h-4 w-4" />,
  [FieldType.CHECKBOX]: <CheckSquare className="h-4 w-4" />,
  [FieldType.FILE_UPLOAD]: <Upload className="h-4 w-4" />,
  [FieldType.RATING]: <Star className="h-4 w-4" />,
  [FieldType.SCALE]: <Star className="h-4 w-4" />,
  [FieldType.MATRIX]: <List className="h-4 w-4" />,
  [FieldType.SECTION_HEADER]: <Type className="h-4 w-4" />,
  [FieldType.PAGE_BREAK]: <AlignLeft className="h-4 w-4" />,
};

export default function FormBuilderPage() {
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const intl = useIntl();
  const [currentFormId, setCurrentFormId] = useState(formId);
  const isNewForm = currentFormId === 'new';

  const getFieldTypeLabel = (type: FieldType): string => {
    return intl.formatMessage({
      id: `modules.forms.fieldTypes.${type}`,
      defaultMessage: type.replace(/_/g, ' ')
    });
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [settings, setSettings] = useState<FormSettings>({
    allowMultipleSubmissions: false,
    requireLogin: false,
    showProgressBar: true,
    shuffleQuestions: false,
    confirmationMessage: 'Thank you for your submission!',
    collectEmail: true,
    notifyOnSubmission: false,
    formLanguage: 'en',
  });

  const [branding, setBranding] = useState<FormBranding & { buttonColor?: string; buttonTextColor?: string }>({
    fontFamily: 'Inter',
    fontSize: '16',
    fontWeight: 'normal',
    textAlign: 'left' as const,
    textColor: '#1f2937',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
  });

  // Update currentFormId when formId param changes
  useEffect(() => {
    if (formId) {
      setCurrentFormId(formId);
    }
  }, [formId]);

  const { data: existingForm, isLoading } = useQuery({
    queryKey: ['form', workspaceId, currentFormId],
    queryFn: () => formsApi.getForm(workspaceId!, currentFormId!),
    enabled: !isNewForm && !!workspaceId && !!currentFormId && currentFormId !== 'new',
  });

  useEffect(() => {
    if (existingForm) {
      setTitle(existingForm.title);
      setDescription(existingForm.description || '');
      setFields(existingForm.fields);
      setSettings(existingForm.settings);
      if (existingForm.branding) {
        setBranding({
          ...branding,
          ...existingForm.branding,
        });
      }
    }
  }, [existingForm]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title || title.trim().length === 0) {
        throw new Error(intl.formatMessage({ id: 'modules.forms.validation.titleRequired', defaultMessage: 'Form title is required' }));
      }

      const data: CreateFormDto = {
        title: title.trim(),
        description: description?.trim() || undefined,
        fields,
        settings,
        branding,
      };

      // Check at mutation time, not render time
      if (!currentFormId || currentFormId === 'new') {
        return formsApi.createForm(workspaceId!, data);
      } else {
        return formsApi.updateForm(workspaceId!, currentFormId, data);
      }
    },
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['form', workspaceId, currentFormId] });
      toast.success(intl.formatMessage({
        id: isNewForm ? 'modules.forms.messages.createSuccess' : 'modules.forms.messages.saveSuccess',
        defaultMessage: isNewForm ? 'Form created successfully' : 'Form saved successfully'
      }));
      if (isNewForm) {
        setCurrentFormId(form.id);
        navigate(`/workspaces/${workspaceId}/forms/${form.id}/edit`, { replace: true });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || intl.formatMessage({ id: 'modules.forms.messages.saveFailed', defaultMessage: 'Failed to save form' }));
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      if (isNewForm || !currentFormId || currentFormId === 'new') {
        throw new Error(intl.formatMessage({ id: 'modules.forms.messages.saveBeforePublish', defaultMessage: 'Please save the form before publishing' }));
      }
      return formsApi.publishForm(workspaceId!, currentFormId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['form', workspaceId, currentFormId] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.publishSuccess', defaultMessage: 'Form published successfully' }));
    },
    onError: (error: any) => {
      toast.error(error.message || intl.formatMessage({ id: 'modules.forms.messages.publishFailed', defaultMessage: 'Failed to publish form' }));
    },
  });

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `${intl.formatMessage({ id: 'modules.forms.builder.newField', defaultMessage: 'New Field' })} ${getFieldTypeLabel(type)}`,
      required: false,
      page: 1,
      order: fields.length,
    };

    // Add default options for choice fields
    if ([FieldType.SINGLE_CHOICE, FieldType.MULTIPLE_CHOICE, FieldType.DROPDOWN].includes(type)) {
      newField.options = [
        intl.formatMessage({ id: 'modules.forms.builder.option', defaultMessage: 'Option {number}' }, { number: 1 }),
        intl.formatMessage({ id: 'modules.forms.builder.option', defaultMessage: 'Option {number}' }, { number: 2 }),
        intl.formatMessage({ id: 'modules.forms.builder.option', defaultMessage: 'Option {number}' }, { number: 3 })
      ];
    }

    // Add default scale for rating/scale fields
    if ([FieldType.RATING, FieldType.SCALE].includes(type)) {
      newField.scale = { min: 1, max: 5 };
    }

    setFields([...fields, newField]);
    setSelectedFieldIndex(fields.length);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const deleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    setSelectedFieldIndex(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newFields = [...fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      setFields(newFields);
      setSelectedFieldIndex(index - 1);
    } else if (direction === 'down' && index < fields.length - 1) {
      const newFields = [...fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      setFields(newFields);
      setSelectedFieldIndex(index + 1);
    }
  };

  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">{intl.formatMessage({ id: 'common.loading', defaultMessage: 'Loading...' })}</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.forms.builder.formTitlePlaceholder', defaultMessage: 'Enter form title' })}
              className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.forms.builder.formDescriptionPlaceholder', defaultMessage: 'Enter form description (optional)' })}
              className="mt-1 border-none px-0 text-gray-600 focus-visible:ring-0"
            />
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/forms`)}>
              {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={!title || title.trim().length === 0 || saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? intl.formatMessage({ id: 'common.saving', defaultMessage: 'Saving...' }) : intl.formatMessage({ id: 'common.save', defaultMessage: 'Save' })}
            </Button>
            {!isNewForm && currentFormId && currentFormId !== 'new' && existingForm?.status === 'published' && (
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {intl.formatMessage({ id: 'modules.forms.actions.share', defaultMessage: 'Share' })}
              </Button>
            )}
            {!isNewForm && currentFormId && currentFormId !== 'new' && existingForm?.status === 'draft' && (
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {publishMutation.isPending ? intl.formatMessage({ id: 'common.publishing', defaultMessage: 'Publishing...' }) : intl.formatMessage({ id: 'modules.forms.actions.publish', defaultMessage: 'Publish' })}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Field Palette */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">{intl.formatMessage({ id: 'modules.forms.builder.addFields', defaultMessage: 'Add Fields' })}</h3>
          <div className="space-y-1">
            {Object.values(FieldType).map((type) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-200 transition-colors"
              >
                {fieldTypeIcons[type]}
                <span>{getFieldTypeLabel(type)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Form Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
          <div className="max-w-3xl mx-auto">
            <Card
              style={{
                backgroundColor: branding.backgroundColor,
                fontFamily: branding.fontFamily,
                fontSize: `${branding.fontSize}px`,
                fontWeight: branding.fontWeight,
                color: branding.textColor,
              }}
            >
              <CardHeader>
                <CardTitle
                  style={{
                    textAlign: branding.textAlign as any,
                    color: branding.textColor,
                    fontFamily: branding.fontFamily,
                    fontWeight: branding.fontWeight,
                  }}
                >
                  {title || intl.formatMessage({ id: 'modules.forms.builder.untitledForm', defaultMessage: 'Untitled Form' })}
                </CardTitle>
                {description && (
                  <p
                    className="text-sm"
                    style={{
                      textAlign: branding.textAlign as any,
                      color: branding.textColor,
                      opacity: 0.8,
                    }}
                  >
                    {description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>{intl.formatMessage({ id: 'modules.forms.builder.noFieldsYet', defaultMessage: 'No fields yet. Add fields from the left panel.' })}</p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldIndex(index)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedFieldIndex === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(index, 'up');
                            }}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(index, 'down');
                            }}
                            disabled={index === fields.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="flex-1">
                          <div
                            className="flex items-center gap-2 mb-2"
                            style={{ fontFamily: branding.fontFamily, fontWeight: branding.fontWeight }}
                          >
                            {fieldTypeIcons[field.type]}
                            <span className="font-medium" style={{ color: branding.textColor }}>
                              {field.label}
                            </span>
                            {field.required && <span className="text-red-500">*</span>}
                          </div>
                          {field.description && (
                            <p
                              className="text-sm mb-2"
                              style={{
                                fontFamily: branding.fontFamily,
                                color: branding.textColor,
                                opacity: 0.7,
                              }}
                            >
                              {field.description}
                            </p>
                          )}
                          <div className="text-sm text-gray-400">
                            {getFieldTypeLabel(field.type)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(index);
                          }}
                          className="p-2 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Field Properties */}
        <div className="w-80 border-l bg-white p-4 overflow-y-auto">
          {selectedField ? (
            <div className="space-y-4">
              <h3 className="font-semibold">{intl.formatMessage({ id: 'modules.forms.builder.fieldProperties', defaultMessage: 'Field Properties' })}</h3>

              <div>
                <Label>{intl.formatMessage({ id: 'modules.forms.builder.label', defaultMessage: 'Label' })}</Label>
                <Input
                  value={selectedField.label}
                  onChange={(e) =>
                    updateField(selectedFieldIndex!, { label: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>{intl.formatMessage({ id: 'modules.forms.builder.description', defaultMessage: 'Description' })}</Label>
                <Textarea
                  value={selectedField.description || ''}
                  onChange={(e) =>
                    updateField(selectedFieldIndex!, { description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div>
                <Label>{intl.formatMessage({ id: 'modules.forms.builder.placeholder', defaultMessage: 'Placeholder' })}</Label>
                <Input
                  value={selectedField.placeholder || ''}
                  onChange={(e) =>
                    updateField(selectedFieldIndex!, { placeholder: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{intl.formatMessage({ id: 'modules.forms.builder.required', defaultMessage: 'Required' })}</Label>
                <Switch
                  checked={selectedField.required}
                  onCheckedChange={(checked) =>
                    updateField(selectedFieldIndex!, { required: checked })
                  }
                />
              </div>

              {/* Options for choice fields */}
              {[FieldType.SINGLE_CHOICE, FieldType.MULTIPLE_CHOICE, FieldType.DROPDOWN].includes(
                selectedField.type
              ) && (
                <div>
                  <Label>{intl.formatMessage({ id: 'modules.forms.builder.options', defaultMessage: 'Options' })}</Label>
                  <div className="space-y-2 mt-2">
                    {(selectedField.options || []).map((option, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(selectedField.options || [])];
                            newOptions[i] = e.target.value;
                            updateField(selectedFieldIndex!, { options: newOptions });
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newOptions = (selectedField.options || []).filter(
                              (_, idx) => idx !== i
                            );
                            updateField(selectedFieldIndex!, { options: newOptions });
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = [
                          ...(selectedField.options || []),
                          intl.formatMessage({ id: 'modules.forms.builder.option', defaultMessage: 'Option {number}' }, { number: (selectedField.options || []).length + 1 }),
                        ];
                        updateField(selectedFieldIndex!, { options: newOptions });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.forms.builder.addOption', defaultMessage: 'Add Option' })}
                    </Button>
                  </div>
                </div>
              )}

              {/* Scale for rating/scale fields */}
              {[FieldType.RATING, FieldType.SCALE].includes(selectedField.type) && (
                <div>
                  <Label>{intl.formatMessage({ id: 'modules.forms.builder.scaleRange', defaultMessage: 'Scale Range' })}</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <Label className="text-xs">{intl.formatMessage({ id: 'modules.forms.builder.min', defaultMessage: 'Min' })}</Label>
                      <Input
                        type="number"
                        value={selectedField.scale?.min || 1}
                        onChange={(e) =>
                          updateField(selectedFieldIndex!, {
                            scale: {
                              ...selectedField.scale!,
                              min: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">{intl.formatMessage({ id: 'modules.forms.builder.max', defaultMessage: 'Max' })}</Label>
                      <Input
                        type="number"
                        value={selectedField.scale?.max || 5}
                        onChange={(e) =>
                          updateField(selectedFieldIndex!, {
                            scale: {
                              ...selectedField.scale!,
                              max: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p>{intl.formatMessage({ id: 'modules.forms.builder.selectFieldToEdit', defaultMessage: 'Select a field to edit' })}</p>
            </div>
          )}

          {/* Form Settings Tab */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">{intl.formatMessage({ id: 'modules.forms.settings.title', defaultMessage: 'Form Settings' })}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{intl.formatMessage({ id: 'modules.forms.settings.requireLogin', defaultMessage: 'Require Login' })}</Label>
                <Switch
                  checked={settings.requireLogin}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, requireLogin: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{intl.formatMessage({ id: 'modules.forms.settings.allowMultipleSubmissions', defaultMessage: 'Allow Multiple Submissions' })}</Label>
                <Switch
                  checked={settings.allowMultipleSubmissions}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowMultipleSubmissions: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{intl.formatMessage({ id: 'modules.forms.settings.collectEmail', defaultMessage: 'Collect Email' })}</Label>
                <Switch
                  checked={settings.collectEmail}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, collectEmail: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Form Formatting & Language Section */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">{intl.formatMessage({ id: 'modules.forms.builder.textFormattingLanguage', defaultMessage: 'Text Formatting & Language' })}</h3>

            {/* Language Selection */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.builder.formLanguage', defaultMessage: 'Form Language' })}</Label>
              <Select
                value={settings.formLanguage || 'en'}
                onValueChange={(value) => setSettings({ ...settings, formLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'modules.forms.builder.selectLanguage', defaultMessage: 'Select language' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">Japanese (日本語)</SelectItem>
                  <SelectItem value="es">Spanish (Español)</SelectItem>
                  <SelectItem value="fr">French (Français)</SelectItem>
                  <SelectItem value="de">German (Deutsch)</SelectItem>
                  <SelectItem value="zh">Chinese (中文)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Family */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.builder.fontFamily', defaultMessage: 'Font Family' })}</Label>
              <Select
                value={branding.fontFamily}
                onValueChange={(value) => setBranding({ ...branding, fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.fontSize', defaultMessage: 'Font Size' })}</Label>
              <Select
                value={branding.fontSize}
                onValueChange={(value) => setBranding({ ...branding, fontSize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">{intl.formatMessage({ id: 'modules.forms.branding.fontSizes.small', defaultMessage: '12px - Small' })}</SelectItem>
                  <SelectItem value="14">{intl.formatMessage({ id: 'modules.forms.branding.fontSizes.default', defaultMessage: '14px - Default' })}</SelectItem>
                  <SelectItem value="16">{intl.formatMessage({ id: 'modules.forms.branding.fontSizes.medium', defaultMessage: '16px - Medium' })}</SelectItem>
                  <SelectItem value="18">{intl.formatMessage({ id: 'modules.forms.branding.fontSizes.large', defaultMessage: '18px - Large' })}</SelectItem>
                  <SelectItem value="20">{intl.formatMessage({ id: 'modules.forms.branding.fontSizes.extraLarge', defaultMessage: '20px - Extra Large' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Weight */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.fontWeight', defaultMessage: 'Font Weight' })}</Label>
              <Select
                value={branding.fontWeight}
                onValueChange={(value) => setBranding({ ...branding, fontWeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{intl.formatMessage({ id: 'modules.forms.branding.fontWeights.light', defaultMessage: 'Light (300)' })}</SelectItem>
                  <SelectItem value="normal">{intl.formatMessage({ id: 'modules.forms.branding.fontWeights.normal', defaultMessage: 'Normal (400)' })}</SelectItem>
                  <SelectItem value="medium">{intl.formatMessage({ id: 'modules.forms.branding.fontWeights.medium', defaultMessage: 'Medium (500)' })}</SelectItem>
                  <SelectItem value="semibold">{intl.formatMessage({ id: 'modules.forms.branding.fontWeights.semibold', defaultMessage: 'Semibold (600)' })}</SelectItem>
                  <SelectItem value="bold">{intl.formatMessage({ id: 'modules.forms.branding.fontWeights.bold', defaultMessage: 'Bold (700)' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Alignment */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.textAlign', defaultMessage: 'Text Alignment' })}</Label>
              <Select
                value={branding.textAlign}
                onValueChange={(value) => setBranding({ ...branding, textAlign: value as 'left' | 'center' | 'right' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{intl.formatMessage({ id: 'modules.forms.branding.alignments.left', defaultMessage: 'Left' })}</SelectItem>
                  <SelectItem value="center">{intl.formatMessage({ id: 'modules.forms.branding.alignments.center', defaultMessage: 'Center' })}</SelectItem>
                  <SelectItem value="right">{intl.formatMessage({ id: 'modules.forms.branding.alignments.right', defaultMessage: 'Right' })}</SelectItem>
                  <SelectItem value="justify">{intl.formatMessage({ id: 'modules.forms.branding.alignments.justify', defaultMessage: 'Justify' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.textColor', defaultMessage: 'Text Color' })}</Label>
                <Input
                  type="color"
                  value={branding.textColor}
                  onChange={(e) => setBranding({ ...branding, textColor: e.target.value })}
                  className="h-10 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.primaryColor', defaultMessage: 'Primary Color' })}</Label>
                <Input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="h-10 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.backgroundColor', defaultMessage: 'Background Color' })}</Label>
                <Input
                  type="color"
                  value={branding.backgroundColor}
                  onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })}
                  className="h-10 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.branding.buttonColor', defaultMessage: 'Button Color' })}</Label>
                <Input
                  type="color"
                  value={branding.buttonColor}
                  onChange={(e) => setBranding({ ...branding, buttonColor: e.target.value })}
                  className="h-10 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {existingForm && showShareDialog && (
        <ShareFormDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          form={existingForm}
          workspaceId={workspaceId!}
        />
      )}
    </div>
  );
}
