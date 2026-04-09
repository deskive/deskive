/**
 * Feedback Settings Component
 * User feedback submission and history
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  MessageSquare,
  Plus,
  Bug,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Clock,
  CheckCircle,
  AlertTriangle,
  Paperclip,
  Loader2,
} from 'lucide-react';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// API
import {
  useUserFeedback,
  useCreateFeedback,
  useUploadAttachment,
} from '@/lib/api/feedback-api';
import type {
  Feedback,
  FeedbackType,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackAttachment,
  CreateFeedbackDto,
} from '@/lib/api/feedback-api';

const FeedbackSettings: React.FC = () => {
  const intl = useIntl();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: feedbackData, isLoading, error, refetch } = useUserFeedback();

  const allFeedback = feedbackData?.data || [];
  const pendingFeedback = allFeedback.filter((f) => !['resolved', 'wont_fix'].includes(f.status));
  const resolvedFeedback = allFeedback.filter((f) => ['resolved', 'wont_fix'].includes(f.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load feedback</p>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <span>{intl.formatMessage({ id: 'settings.feedback.title', defaultMessage: 'Feedback & Support' })}</span>
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {intl.formatMessage({ id: 'settings.feedback.newFeedback', defaultMessage: 'New Feedback' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'settings.feedback.description', defaultMessage: 'Report bugs, request features, or share suggestions to help us improve Deskive.' })}
          </p>
        </CardContent>
      </Card>

      {/* Feedback List with Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">{intl.formatMessage({ id: 'settings.feedback.tabs.all', defaultMessage: 'All' })} ({allFeedback.length})</TabsTrigger>
              <TabsTrigger value="pending">{intl.formatMessage({ id: 'settings.feedback.tabs.pending', defaultMessage: 'Pending' })} ({pendingFeedback.length})</TabsTrigger>
              <TabsTrigger value="resolved">{intl.formatMessage({ id: 'settings.feedback.tabs.resolved', defaultMessage: 'Resolved' })} ({resolvedFeedback.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <FeedbackList feedback={allFeedback} onSelect={setSelectedFeedback} />
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <FeedbackList feedback={pendingFeedback} onSelect={setSelectedFeedback} />
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              <FeedbackList feedback={resolvedFeedback} onSelect={setSelectedFeedback} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Feedback Dialog */}
      <CreateFeedbackDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {/* Feedback Detail Dialog */}
      {selectedFeedback && (
        <FeedbackDetailDialog
          feedback={selectedFeedback}
          open={!!selectedFeedback}
          onOpenChange={(open) => !open && setSelectedFeedback(null)}
        />
      )}
    </div>
  );
};

// Feedback List Component
function FeedbackList({ feedback, onSelect }: { feedback: Feedback[]; onSelect: (f: Feedback) => void }) {
  const intl = useIntl();

  if (feedback.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-muted-foreground">{intl.formatMessage({ id: 'settings.feedback.noFeedback', defaultMessage: 'No feedback yet' })}</p>
        <p className="text-sm text-muted-foreground mt-1">{intl.formatMessage({ id: 'settings.feedback.clickToSubmit', defaultMessage: 'Click "New Feedback" to submit your first feedback' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedback.map((item) => (
        <FeedbackCard key={item.id} feedback={item} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
}

// Feedback Card Component
function FeedbackCard({ feedback, onClick }: { feedback: Feedback; onClick: () => void }) {
  const intl = useIntl();
  const typeInfo = getFeedbackTypeInfo(feedback.type);
  const statusInfo = getFeedbackStatusInfo(feedback.status);

  const typeLabel = intl.formatMessage({ id: `settings.feedback.types.${feedback.type}`, defaultMessage: typeInfo.label });
  const statusLabel = intl.formatMessage({ id: `settings.feedback.statuses.${feedback.status}`, defaultMessage: statusInfo.label });

  return (
    <div
      onClick={onClick}
      className="p-4 border-2 rounded-lg hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <Badge variant="outline" className={`gap-1 ${typeInfo.className}`}>
            <typeInfo.icon className="w-3 h-3" />
            {typeLabel}
          </Badge>
          <Badge variant="outline" className={`gap-1 ${statusInfo.className}`}>
            <statusInfo.icon className="w-3 h-3" />
            {statusLabel}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(feedback.createdAt)}</span>
      </div>
      <h4 className="font-semibold mb-1">{feedback.title}</h4>
      <p className="text-sm text-muted-foreground line-clamp-2">{feedback.description}</p>
      {feedback.attachments.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Paperclip className="w-3 h-3" />
          {intl.formatMessage(
            {
              id: feedback.attachments.length === 1 ? 'settings.feedback.attachmentCount' : 'settings.feedback.attachmentCount_plural',
              defaultMessage: feedback.attachments.length === 1 ? '{count} attachment' : '{count} attachments'
            },
            { count: feedback.attachments.length }
          )}
        </div>
      )}
    </div>
  );
}

// Create Feedback Dialog
function CreateFeedbackDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const intl = useIntl();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory | undefined>();
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateFeedback();
  const uploadMutation = useUploadAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length > 5) {
      setError(intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.maxAttachments', defaultMessage: 'Maximum 5 attachments allowed' }));
      return;
    }

    setUploadingFiles(true);
    setError(null);

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setError(intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.fileTooBig', defaultMessage: 'File {fileName} is too large (max 10MB)' }, { fileName: file.name }));
          continue;
        }

        const attachment = await uploadMutation.mutateAsync(file);
        setAttachments((prev) => [...prev, attachment]);
      }
    } catch (err: any) {
      setError(err.message || intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.uploadFailed', defaultMessage: 'Failed to upload file' }));
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 5) {
      setError(intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.titleTooShort', defaultMessage: 'Title must be at least 5 characters' }));
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      setError(intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.descriptionTooShort', defaultMessage: 'Description must be at least 20 characters' }));
      return;
    }

    setError(null);

    try {
      const dto: CreateFeedbackDto = {
        type,
        title: title.trim(),
        description: description.trim(),
        category,
        attachments: attachments.length > 0 ? attachments : undefined,
        appVersion: '1.0.0', // TODO: Get from package.json
        deviceInfo: {
          platform: 'web',
          osVersion: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
        },
      };

      await createMutation.mutateAsync(dto);
      onSuccess();

      // Reset form
      setTitle('');
      setDescription('');
      setCategory(undefined);
      setAttachments([]);
      setType('bug');
    } catch (err: any) {
      setError(err.message || intl.formatMessage({ id: 'settings.feedback.dialog.create.errors.submitFailed', defaultMessage: 'Failed to submit feedback' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'settings.feedback.dialog.create.title', defaultMessage: 'Submit Feedback' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>{intl.formatMessage({ id: 'settings.feedback.dialog.create.type.label', defaultMessage: 'Feedback Type' })}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['bug', 'issue', 'improvement', 'feature_request'] as FeedbackType[]).map((t) => {
                const typeLabels = {
                  bug: intl.formatMessage({ id: 'settings.feedback.dialog.create.type.bug', defaultMessage: 'Bug' }),
                  issue: intl.formatMessage({ id: 'settings.feedback.dialog.create.type.issue', defaultMessage: 'Issue' }),
                  improvement: intl.formatMessage({ id: 'settings.feedback.dialog.create.type.improvement', defaultMessage: 'Improvement' }),
                  feature_request: intl.formatMessage({ id: 'settings.feedback.dialog.create.type.featureRequest', defaultMessage: 'Feature Request' }),
                };
                const info = getFeedbackTypeInfo(t);
                return (
                  <Button
                    key={t}
                    variant={type === t ? 'default' : 'outline'}
                    className="justify-start gap-2"
                    onClick={() => setType(t)}
                  >
                    <info.icon className="w-4 h-4" />
                    {typeLabels[t]}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{intl.formatMessage({ id: 'settings.feedback.dialog.create.title_field.label', defaultMessage: 'Title *' })}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={intl.formatMessage({ id: 'settings.feedback.dialog.create.title_field.placeholder', defaultMessage: 'Brief description of the issue' })}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'settings.feedback.dialog.create.title_field.counter', defaultMessage: '{current}/{max}' }, { current: title.length, max: 200 })}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{intl.formatMessage({ id: 'settings.feedback.dialog.create.description.label', defaultMessage: 'Description *' })}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={intl.formatMessage({ id: 'settings.feedback.dialog.create.description.placeholder', defaultMessage: 'Provide detailed information...' })}
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'settings.feedback.dialog.create.description.counter', defaultMessage: '{current}/{max}' }, { current: description.length, max: 2000 })}</p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.label', defaultMessage: 'Category (Optional)' })}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
              <SelectTrigger>
                <SelectValue placeholder={intl.formatMessage({ id: 'settings.feedback.dialog.create.category.placeholder', defaultMessage: 'Select a category' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ui">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.ui', defaultMessage: 'UI/UX' })}</SelectItem>
                <SelectItem value="performance">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.performance', defaultMessage: 'Performance' })}</SelectItem>
                <SelectItem value="feature">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.feature', defaultMessage: 'Feature' })}</SelectItem>
                <SelectItem value="security">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.security', defaultMessage: 'Security' })}</SelectItem>
                <SelectItem value="other">{intl.formatMessage({ id: 'settings.feedback.dialog.create.category.other', defaultMessage: 'Other' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label>{intl.formatMessage({ id: 'settings.feedback.dialog.create.attachments.label', defaultMessage: 'Attachments (Optional)' })}</Label>
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'settings.feedback.dialog.create.attachments.description', defaultMessage: 'Add screenshots or files to help us understand the issue (max 5 files, 10MB each)' })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById('file-input')?.click()} disabled={uploadingFiles}>
                {uploadingFiles ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 mr-2" />
                )}
                {uploadingFiles ? intl.formatMessage({ id: 'settings.feedback.dialog.create.attachments.uploading', defaultMessage: 'Uploading...' }) : intl.formatMessage({ id: 'settings.feedback.dialog.create.attachments.button', defaultMessage: 'Attach Files' })}
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.log"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    <Paperclip className="w-3 h-3" />
                    {att.name.length > 20 ? `${att.name.substring(0, 17)}...` : att.name}
                    <button
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="ml-1 hover:text-destructive"
                      title={intl.formatMessage({ id: 'settings.feedback.dialog.create.attachments.remove', defaultMessage: 'Remove' })}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {intl.formatMessage({ id: 'settings.feedback.dialog.create.buttons.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'settings.feedback.dialog.create.buttons.submitting', defaultMessage: 'Submitting...' })}
                </>
              ) : (
                intl.formatMessage({ id: 'settings.feedback.dialog.create.buttons.submit', defaultMessage: 'Submit Feedback' })
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Feedback Detail Dialog
function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
}: {
  feedback: Feedback;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const intl = useIntl();
  const typeInfo = getFeedbackTypeInfo(feedback.type);
  const statusInfo = getFeedbackStatusInfo(feedback.status);

  const typeLabel = intl.formatMessage({ id: `settings.feedback.types.${feedback.type}`, defaultMessage: typeInfo.label });
  const statusLabel = intl.formatMessage({ id: `settings.feedback.statuses.${feedback.status}`, defaultMessage: statusInfo.label });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'settings.feedback.dialog.detail.title', defaultMessage: 'Feedback Details' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Badges */}
          <div className="flex gap-2">
            <Badge variant="outline" className={typeInfo.className}>
              <typeInfo.icon className="w-3 h-3 mr-1" />
              {typeLabel}
            </Badge>
            <Badge variant="outline" className={statusInfo.className}>
              <statusInfo.icon className="w-3 h-3 mr-1" />
              {statusLabel}
            </Badge>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold">{feedback.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage(
                { id: 'settings.feedback.dialog.detail.submittedOn', defaultMessage: 'Submitted on {date}' },
                {
                  date: new Date(feedback.createdAt).toLocaleDateString(intl.locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }
              )}
            </p>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">{intl.formatMessage({ id: 'settings.feedback.dialog.detail.description', defaultMessage: 'Description' })}</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="whitespace-pre-wrap">{feedback.description}</p>
            </div>
          </div>

          {/* Category */}
          {feedback.category && (
            <div>
              <span className="font-semibold">{intl.formatMessage({ id: 'settings.feedback.dialog.detail.category', defaultMessage: 'Category' })}: </span>
              <span className="capitalize">{feedback.category}</span>
            </div>
          )}

          {/* Attachments */}
          {feedback.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">{intl.formatMessage({ id: 'settings.feedback.dialog.detail.attachments', defaultMessage: 'Attachments' })}</h3>
              <div className="flex flex-wrap gap-2">
                {feedback.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="w-4 h-4" />
                    {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Device Info */}
          {(feedback.appVersion || feedback.deviceInfo.platform) && (
            <div>
              <h3 className="font-semibold mb-2">{intl.formatMessage({ id: 'settings.feedback.dialog.detail.deviceInfo', defaultMessage: 'Device Information' })}</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm space-y-1">
                {feedback.appVersion && <div>{intl.formatMessage({ id: 'settings.feedback.dialog.detail.appVersion', defaultMessage: 'App Version' })}: {feedback.appVersion}</div>}
                {feedback.deviceInfo.platform && <div>{intl.formatMessage({ id: 'settings.feedback.dialog.detail.platform', defaultMessage: 'Platform' })}: {feedback.deviceInfo.platform}</div>}
                {feedback.deviceInfo.osVersion && <div>{intl.formatMessage({ id: 'settings.feedback.dialog.detail.os', defaultMessage: 'OS' })}: {feedback.deviceInfo.osVersion}</div>}
                {feedback.deviceInfo.deviceModel && <div>{intl.formatMessage({ id: 'settings.feedback.dialog.detail.device', defaultMessage: 'Device' })}: {feedback.deviceInfo.deviceModel}</div>}
              </div>
            </div>
          )}

          {/* Resolution */}
          {feedback.status === 'resolved' && feedback.resolutionNotes && (
            <div className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" />
                {intl.formatMessage({ id: 'settings.feedback.dialog.detail.resolved.title', defaultMessage: 'Resolved' })}
              </div>
              {feedback.resolvedAt && (
                <p className="text-sm text-muted-foreground mb-2">
                  {intl.formatMessage(
                    { id: 'settings.feedback.dialog.detail.resolved.resolvedOn', defaultMessage: 'Resolved on {date}' },
                    {
                      date: new Date(feedback.resolvedAt).toLocaleDateString(intl.locale)
                    }
                  )}
                </p>
              )}
              <p className="text-sm">{feedback.resolutionNotes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getFeedbackTypeInfo(type: FeedbackType) {
  const info = {
    bug: { label: 'Bug', icon: Bug, className: 'text-red-600 border-red-200' },
    issue: { label: 'Issue', icon: AlertTriangle, className: 'text-orange-600 border-orange-200' },
    improvement: { label: 'Improvement', icon: Lightbulb, className: 'text-blue-600 border-blue-200' },
    feature_request: { label: 'Feature Request', icon: Sparkles, className: 'text-purple-600 border-purple-200' },
  };
  return info[type];
}

function getFeedbackStatusInfo(status: FeedbackStatus) {
  const info = {
    pending: { label: 'Pending', icon: Clock, className: 'text-gray-600 border-gray-200' },
    in_review: { label: 'In Review', icon: AlertCircle, className: 'text-blue-600 border-blue-200' },
    in_progress: { label: 'In Progress', icon: Loader2, className: 'text-orange-600 border-orange-200' },
    resolved: { label: 'Resolved', icon: CheckCircle, className: 'text-green-600 border-green-200' },
    wont_fix: { label: "Won't Fix", icon: AlertTriangle, className: 'text-red-600 border-red-200' },
    duplicate: { label: 'Duplicate', icon: AlertCircle, className: 'text-purple-600 border-purple-200' },
  };
  return info[status];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default FeedbackSettings;
