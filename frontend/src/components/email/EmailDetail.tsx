import React, { useEffect, useState } from 'react';
import { type Email, type EmailProvider, formatEmailAddress, parseEmailAddresses, useMarkAsRead, useStarEmail, useDeleteEmail, useExtractTravelInfo, type TravelTicketInfo } from '@/lib/api/email-api';
import { useCreateEvent } from '@/lib/api/calendar-api';
import { useNavigate } from 'react-router-dom';
import { useGenerateText, useSummarize } from '@/lib/api/ai-api';
import { fetchWithAuth } from '@/lib/fetch';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  MoreHorizontal,
  X,
  Loader2,
  Paperclip,
  Download,
  Sparkles,
  MessageSquareText,
  Languages,
  ListChecks,
  ChevronRight,
  CalendarPlus,
  Plane,
  Train,
  Bus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmailAIResultModal, type EmailAIAction } from './EmailAIResultModal';

// Supported languages for translation
const TRANSLATION_LANGUAGES = [
  { code: 'english', name: 'English' },
  { code: 'spanish', name: 'Spanish' },
  { code: 'french', name: 'French' },
  { code: 'german', name: 'German' },
  { code: 'italian', name: 'Italian' },
  { code: 'portuguese', name: 'Portuguese' },
  { code: 'chinese', name: 'Chinese' },
  { code: 'japanese', name: 'Japanese' },
  { code: 'korean', name: 'Korean' },
  { code: 'arabic', name: 'Arabic' },
  { code: 'hindi', name: 'Hindi' },
  { code: 'bengali', name: 'Bengali' },
];

interface EmailDetailProps {
  email: Email | undefined;
  isLoading: boolean;
  onClose: () => void;
  onReply: () => void;
  workspaceId: string;
  provider?: EmailProvider | null;
  connectionId?: string;
  mailbox?: string;
}

export function EmailDetail({
  email,
  isLoading,
  onClose,
  onReply,
  workspaceId,
  provider,
  connectionId,
  mailbox,
}: EmailDetailProps) {
  const navigate = useNavigate();
  const markAsReadMutation = useMarkAsRead(workspaceId);
  const starEmailMutation = useStarEmail(workspaceId);
  const deleteEmailMutation = useDeleteEmail(workspaceId);
  const createEventMutation = useCreateEvent();
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // AI hooks
  const generateTextMutation = useGenerateText();
  const summarizeMutation = useSummarize();

  // AI modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAction, setAIAction] = useState<EmailAIAction | null>(null);
  const [aiResult, setAIResult] = useState<string | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('');

  // Travel ticket extraction
  const extractTravelMutation = useExtractTravelInfo(workspaceId);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showAnalyzingModal, setShowAnalyzingModal] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelTicketInfo | null>(null);
  const [suggestedEventTitle, setSuggestedEventTitle] = useState('');
  const [suggestedEventDescription, setSuggestedEventDescription] = useState('');
  const [analyzingHasPdf, setAnalyzingHasPdf] = useState(false);

  // Get email content for AI processing
  const getEmailContent = (): string => {
    if (!email) return '';
    // Prefer plain text, fallback to stripping HTML
    if (email.bodyText) return email.bodyText;
    if (email.bodyHtml) {
      // Strip HTML tags for AI processing
      const div = document.createElement('div');
      div.innerHTML = email.bodyHtml;
      return div.textContent || div.innerText || '';
    }
    return '';
  };

  // Helper to extract text from various API response structures
  const extractTextFromResponse = (response: any, primaryField: string): string => {
    // If response is already a string
    if (typeof response === 'string') {
      return response;
    }

    // If response is null/undefined
    if (!response) {
      return '';
    }

    // Check for wrapped data structure: { data: { ... } }
    const data = response.data || response;

    // If data is a string
    if (typeof data === 'string') {
      return data;
    }

    // Try primary field first (e.g., 'content', 'summary', 'translated_text')
    if (data[primaryField]) {
      const fieldValue = data[primaryField];
      if (typeof fieldValue === 'string') {
        return fieldValue;
      }
      // If the field itself is an object, try to extract from it
      if (typeof fieldValue === 'object' && fieldValue !== null) {
        // Check for key_points array (summary response)
        if (fieldValue.key_points && Array.isArray(fieldValue.key_points)) {
          return fieldValue.key_points.join('\n\n');
        }
        // Check for tasks/items arrays
        if (fieldValue.tasks && Array.isArray(fieldValue.tasks)) {
          return formatTasksList(fieldValue.tasks);
        }
        if (fieldValue.items && Array.isArray(fieldValue.items)) {
          return formatTasksList(fieldValue.items);
        }
        // Check common text fields
        if (fieldValue.text) return fieldValue.text;
        if (fieldValue.content) return fieldValue.content;
        if (fieldValue.summary) return fieldValue.summary;
        // Fallback to stringify
        return JSON.stringify(fieldValue, null, 2);
      }
    }

    // Try other common fields
    const commonFields = ['content', 'text', 'summary', 'translated_text', 'translation', 'message', 'result'];
    for (const field of commonFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field];
      }
    }

    // Check for arrays (tasks, key_points, items)
    if (data.key_points && Array.isArray(data.key_points)) {
      return data.key_points.join('\n\n');
    }
    if (data.tasks && Array.isArray(data.tasks)) {
      return formatTasksList(data.tasks);
    }
    if (data.action_items && Array.isArray(data.action_items)) {
      return formatTasksList(data.action_items);
    }
    if (data.items && Array.isArray(data.items)) {
      return formatTasksList(data.items);
    }

    // Last resort: stringify the entire response
    console.warn('Could not extract text from response, using JSON stringify:', data);
    return JSON.stringify(data, null, 2);
  };

  // Helper to format tasks/items array
  const formatTasksList = (items: any[]): string => {
    return items.map((item: any, i: number) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`;
      return `${i + 1}. ${item.title || item.description || item.text || item.task || JSON.stringify(item)}`;
    }).join('\n');
  };

  // Handle AI Summarize
  const handleSummarize = async () => {
    if (!email) return;

    setAIAction('summarize');
    setAIResult(null);
    setAIError(null);
    setAILoading(true);
    setShowAIModal(true);

    try {
      const content = getEmailContent();
      const result = await summarizeMutation.mutateAsync({
        content: `Email Subject: ${email.subject || '(no subject)'}\n\nFrom: ${email.from?.name || email.from?.email || 'Unknown'}\n\n${content}`,
        summary_type: 'bullet_points',
        content_type: 'email',
        length: 'short',
        include_action_items: true,
      });

      // Debug: log the actual response structure
      console.log('Summarize API response:', JSON.stringify(result, null, 2));

      // Extract text from various possible response structures
      const summaryText = extractTextFromResponse(result, 'summary');
      setAIResult(summaryText);
    } catch (error: any) {
      console.error('Summarize failed:', error);
      setAIError(error?.message || 'Failed to summarize email');
    } finally {
      setAILoading(false);
    }
  };

  // Handle AI Translate
  const handleTranslate = async (language: string) => {
    if (!email) return;

    setAIAction('translate');
    setTargetLanguage(language);
    setAIResult(null);
    setAIError(null);
    setAILoading(true);
    setShowAIModal(true);

    try {
      const content = getEmailContent();
      // Use generateText for translation to ensure plain text output
      const result = await generateTextMutation.mutateAsync({
        prompt: `Translate the following email to ${language}. Provide ONLY the translated text, no explanations or notes. Do NOT use markdown formatting.

Subject: ${email.subject || '(no subject)'}

Email Content:
${content}

Translated email in ${language}:`,
        text_type: 'general',
        tone: 'formal',
        max_tokens: 1000,
      });

      // Debug: log the actual response structure
      console.log('Translate API response:', JSON.stringify(result, null, 2));

      // Extract text from various possible response structures
      const translatedText = extractTextFromResponse(result, 'content');
      setAIResult(translatedText);
    } catch (error: any) {
      console.error('Translate failed:', error);
      setAIError(error?.message || 'Failed to translate email');
    } finally {
      setAILoading(false);
    }
  };

  // Handle AI Extract Tasks
  const handleExtractTasks = async () => {
    if (!email) return;

    setAIAction('extract_tasks');
    setAIResult(null);
    setAIError(null);
    setAILoading(true);
    setShowAIModal(true);

    try {
      const content = getEmailContent();
      const result = await generateTextMutation.mutateAsync({
        prompt: `Extract all action items, tasks, deadlines, and things that need to be done from this email. Do NOT use markdown, asterisks, or bold formatting. Use plain text with simple numbered list.

Email Subject: ${email.subject || '(no subject)'}
From: ${email.from?.name || email.from?.email || 'Unknown'}

Email Content:
${content}

List all action items in plain text (numbered list, no markdown):`,
        text_type: 'general',
        tone: 'professional',
        max_tokens: 500,
      });

      // Debug: log the actual response structure
      console.log('Extract Tasks API response:', JSON.stringify(result, null, 2));

      // Extract text from various possible response structures
      const tasksText = extractTextFromResponse(result, 'content');
      setAIResult(tasksText);
    } catch (error: any) {
      console.error('Extract tasks failed:', error);
      setAIError(error?.message || 'Failed to extract tasks from email');
    } finally {
      setAILoading(false);
    }
  };

  // Handle Extract Travel Info and Create Event
  const handleExtractTravelInfo = async () => {
    if (!email) return;

    // Find PDF attachment if any
    const pdfAttachment = email.attachments?.find(
      (att) => att.mimeType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf')
    );

    // Show analyzing modal
    setAnalyzingHasPdf(!!pdfAttachment);
    setShowAnalyzingModal(true);

    try {
      const body = email.bodyHtml || email.bodyText || email.snippet || '';
      const result = await extractTravelMutation.mutateAsync({
        subject: email.subject || '',
        body,
        senderEmail: email.from?.email,
        messageId: email.id,
        attachmentId: pdfAttachment?.attachmentId,
        provider: provider || undefined,
        connectionId: connectionId,
        mailbox: mailbox,
      });

      setShowAnalyzingModal(false);

      if (result.ticketInfo.found) {
        setTravelInfo(result.ticketInfo);
        setSuggestedEventTitle(result.suggestedTitle);
        setSuggestedEventDescription(result.suggestedDescription);
        setShowTravelModal(true);
      } else {
        toast.error('No travel ticket information found in this email.');
      }
    } catch (error: any) {
      console.error('Extract travel info failed:', error);
      setShowAnalyzingModal(false);
      toast.error('Failed to analyze email for travel tickets.');
    }
  };

  // Create calendar event from travel info
  const handleCreateTravelEvent = async () => {
    if (!travelInfo || !travelInfo.departureDateTime) {
      toast.error('Missing departure date/time for event.');
      return;
    }

    try {
      // Use location's timezone from AI extraction, fallback to +00:00 (UTC)
      const locationTimezone = travelInfo.departureTimezone || '+00:00';

      // Append location timezone to datetime strings
      const appendTz = (dt: string) => {
        // Remove any existing timezone info and add location's timezone
        const cleanDt = dt.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
        return `${cleanDt}${locationTimezone}`;
      };

      // Calculate end time - use arrival time or add 2 hours to departure
      let endTime = travelInfo.arrivalDateTime;
      if (!endTime) {
        // Parse departure time and add 2 hours manually
        const [datePart, timePart] = travelInfo.departureDateTime.split('T');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        const newHours = (hours + 2) % 24;
        endTime = `${datePart}T${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${(seconds || 0).toString().padStart(2, '0')}`;
      }

      // Create event directly via API
      await createEventMutation.mutateAsync({
        workspaceId,
        data: {
          title: suggestedEventTitle,
          description: suggestedEventDescription,
          start_time: appendTz(travelInfo.departureDateTime),
          end_time: appendTz(endTime),
          location: travelInfo.departureLocation || undefined,
          priority: 'normal',
          status: 'confirmed',
        },
      });

      toast.success('Calendar event created successfully!');
      handleCloseTravelModal();

      // Navigate to calendar page
      navigate(`/workspaces/${workspaceId}/calendar`);
    } catch (error: any) {
      console.error('Create event failed:', error);
      toast.error('Failed to create calendar event.');
    }
  };

  // Close travel modal
  const handleCloseTravelModal = () => {
    setShowTravelModal(false);
    setTravelInfo(null);
    setSuggestedEventTitle('');
    setSuggestedEventDescription('');
  };

  // Close AI modal
  const handleCloseAIModal = () => {
    setShowAIModal(false);
    setAIAction(null);
    setAIResult(null);
    setAIError(null);
    setTargetLanguage('');
  };

  // Mark as read when viewing
  useEffect(() => {
    if (email && !email.isRead) {
      markAsReadMutation.mutate({ messageId: email.id, isRead: true });
    }
  }, [email?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select an email to view
      </div>
    );
  }

  const handleStar = () => {
    starEmailMutation.mutate({ messageId: email.id, isStarred: !email.isStarred });
  };

  const handleDelete = async () => {
    if (confirm('Move this email to trash?')) {
      await deleteEmailMutation.mutateAsync({ messageId: email.id });
      onClose();
    }
  };

  const getAttachmentPath = (attachmentId: string, filename: string, mimeType: string): string => {
    if (!email) return '';
    const params = new URLSearchParams();
    if (connectionId) params.set('connectionId', connectionId);
    if (provider === 'smtp_imap' && mailbox) params.set('mailbox', mailbox);
    // Pass filename and mimeType so backend doesn't need to look them up
    params.set('filename', filename);
    params.set('mimeType', mimeType);
    const queryString = params.toString();

    if (provider === 'smtp_imap') {
      return `/workspaces/${workspaceId}/email/smtp-imap/messages/${email.id}/attachments/${attachmentId}${queryString ? `?${queryString}` : ''}`;
    }
    return `/workspaces/${workspaceId}/email/messages/${email.id}/attachments/${attachmentId}${queryString ? `?${queryString}` : ''}`;
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string, mimeType: string) => {
    if (!email) return;

    setDownloadingAttachmentId(attachmentId);
    try {
      const path = getAttachmentPath(attachmentId, filename, mimeType);
      const response = await fetchWithAuth(path, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const fromName = email.from?.name || email.from?.email || 'Unknown';
  const fromInitial = fromName[0]?.toUpperCase() || '?';
  const formattedDate = email.date
    ? format(new Date(email.date), 'MMM d, yyyy h:mm a')
    : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Forward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStar}
          >
            <Star
              className={cn(
                'h-4 w-4',
                email.isStarred && 'fill-yellow-400 text-yellow-400'
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* AI Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950">
                <Sparkles className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSummarize} className="gap-2">
                <MessageSquareText className="h-4 w-4 text-green-500" />
                Summarize
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Languages className="h-4 w-4 text-blue-500" />
                  Translate
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={handleExtractTasks} className="gap-2">
                <ListChecks className="h-4 w-4 text-purple-500" />
                Extract Tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleExtractTravelInfo}
                className="gap-2"
                disabled={extractTravelMutation.isPending}
              >
                {extractTravelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                ) : (
                  <CalendarPlus className="h-4 w-4 text-emerald-500" />
                )}
                Create Event from Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => markAsReadMutation.mutate({ messageId: email.id, isRead: false })}>
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem>Add label</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                Delete permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Subject */}
        <h1 className="text-xl font-semibold mb-4">
          {email.subject || '(no subject)'}
        </h1>

        {/* Sender info */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{fromInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{fromName}</span>
                {email.from?.email && (
                  <span className="text-muted-foreground text-sm ml-1">
                    &lt;{email.from.email}&gt;
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{formattedDate}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              to {parseEmailAddresses(email.to) || 'me'}
              {email.cc && email.cc.length > 0 && (
                <>, cc: {parseEmailAddresses(email.cc)}</>
              )}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((attachment) => {
                const isDownloading = downloadingAttachmentId === attachment.attachmentId;
                return (
                  <button
                    key={attachment.attachmentId}
                    onClick={() => handleDownloadAttachment(attachment.attachmentId, attachment.filename, attachment.mimeType)}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-background rounded border text-sm hover:bg-muted transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-wait"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{attachment.filename}</span>
                    <span className="text-muted-foreground text-xs">
                      ({Math.round(attachment.size / 1024)}KB)
                    </span>
                    {isDownloading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : (
                      <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {email.bodyHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              className="email-content"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{email.bodyText}</pre>
          )}
        </div>
      </div>

      {/* Quick reply */}
      <div className="p-3 border-t">
        <Button variant="outline" className="w-full gap-2" onClick={onReply}>
          <Reply className="h-4 w-4" />
          Reply
        </Button>
      </div>

      {/* AI Result Modal */}
      <EmailAIResultModal
        open={showAIModal}
        onClose={handleCloseAIModal}
        action={aiAction}
        result={aiResult}
        isLoading={aiLoading}
        error={aiError}
        emailSubject={email?.subject}
        targetLanguage={targetLanguage}
        workspaceId={workspaceId}
      />

      {/* AI Analyzing Modal */}
      <Dialog open={showAnalyzingModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white animate-bounce" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Analyzing Ticket</h3>
              <p className="text-sm text-muted-foreground">
                {analyzingHasPdf
                  ? 'Reading PDF attachment and extracting travel details...'
                  : 'Scanning email for travel information...'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is processing...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Travel Ticket Modal */}
      <Dialog open={showTravelModal} onOpenChange={setShowTravelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {travelInfo?.travelType === 'flight' && <Plane className="h-5 w-5 text-blue-500" />}
              {travelInfo?.travelType === 'train' && <Train className="h-5 w-5 text-green-500" />}
              {travelInfo?.travelType === 'bus' && <Bus className="h-5 w-5 text-orange-500" />}
              Travel Ticket Detected
            </DialogTitle>
            <DialogDescription>
              We found travel information in this email. Review and create a calendar event.
            </DialogDescription>
          </DialogHeader>

          {travelInfo && (
            <div className="space-y-4 py-4">
              {/* Route */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{travelInfo.departureLocation || 'N/A'}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{travelInfo.arrivalLocation || 'N/A'}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {travelInfo.departureDateTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departure</span>
                    <span className="font-medium">
                      {format(new Date(travelInfo.departureDateTime), 'PPp')}
                    </span>
                  </div>
                )}
                {travelInfo.arrivalDateTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arrival</span>
                    <span className="font-medium">
                      {format(new Date(travelInfo.arrivalDateTime), 'PPp')}
                    </span>
                  </div>
                )}
                {travelInfo.carrier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier</span>
                    <span className="font-medium">{travelInfo.carrier}</span>
                  </div>
                )}
                {travelInfo.vehicleNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {travelInfo.travelType === 'flight' ? 'Flight' : 'Number'}
                    </span>
                    <span className="font-medium">{travelInfo.vehicleNumber}</span>
                  </div>
                )}
                {travelInfo.bookingReference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Ref</span>
                    <span className="font-medium font-mono">{travelInfo.bookingReference}</span>
                  </div>
                )}
                {travelInfo.seatInfo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seat</span>
                    <span className="font-medium">{travelInfo.seatInfo}</span>
                  </div>
                )}
                {travelInfo.passengerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passenger</span>
                    <span className="font-medium">{travelInfo.passengerName}</span>
                  </div>
                )}
              </div>

              {/* Event Preview */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  Event to be created:
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {suggestedEventTitle}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseTravelModal} disabled={createEventMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTravelEvent}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4 mr-2" />
              )}
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
