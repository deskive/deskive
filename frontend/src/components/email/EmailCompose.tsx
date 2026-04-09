import React, { useState, useRef, useEffect } from 'react';
import {
  useSendEmail,
  useReplyToEmail,
  useSendSmtpImapEmail,
  useReplyToSmtpImapEmail,
  type Email,
  type EmailProvider,
} from '@/lib/api/email-api';
import { useGenerateEmailSuggestions, useGenerateSmartReplies } from '@/lib/api/ai-api';
import { googleDriveApi, type GoogleDriveFile } from '@/lib/api/google-drive-api';
import { fetchWithAuth } from '@/lib/fetch';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  Paperclip,
  HardDrive,
  FileText,
  Image,
  Video,
  File,
  Folder,
  ChevronRight,
  Home,
  ArrowLeft,
  Search,
  Sparkles,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Attachment type for sending
interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  mimeType: string;
  size: number;
  source: 'device' | 'drive';
}

// File type icon mapping
const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="h-4 w-4 text-red-500" />;
  if (mimeType?.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
  if (mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="h-4 w-4 text-blue-600" />;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileText className="h-4 w-4 text-green-600" />;
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return <FileText className="h-4 w-4 text-orange-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

interface EmailComposeProps {
  workspaceId: string;
  onClose: () => void;
  replyTo?: Email;
  provider?: EmailProvider | null;
  connectionId?: string;
}

export function EmailCompose({ workspaceId, onClose, replyTo, provider, connectionId }: EmailComposeProps) {
  const intl = useIntl();
  const [isMinimized, setIsMinimized] = useState(false);
  const [to, setTo] = useState(replyTo?.from?.email || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? intl.formatMessage({ id: 'modules.email.compose.replyPrefix' }, { subject: replyTo.subject || '' }) : ''
  );
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Attachment state
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drive picker state
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // AI state
  const emailSuggestionsMutation = useGenerateEmailSuggestions();
  const smartRepliesMutation = useGenerateSmartReplies();
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);

  const isGeneratingAI = emailSuggestionsMutation.isPending;
  const isGeneratingSmartReplies = smartRepliesMutation.isPending;

  // Get original email content for context (when replying)
  const getOriginalEmailContent = (): string => {
    if (!replyTo) return '';
    if (replyTo.bodyText) return replyTo.bodyText;
    if (replyTo.bodyHtml) {
      const div = document.createElement('div');
      div.innerHTML = replyTo.bodyHtml;
      return div.textContent || div.innerText || '';
    }
    return '';
  };

  // Generate email draft with AI ("Help Me Write")
  const handleHelpMeWrite = async () => {
    if (!subject.trim()) {
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.subjectRequired' }));
      return;
    }

    setAiSuggestions([]);
    setShowAiSuggestions(false);

    try {
      const isReply = !!replyTo;

      const response = await emailSuggestionsMutation.mutateAsync({
        subject,
        recipient: to || undefined,
        currentDraft: body || undefined,
        isReply,
        replyTo: replyTo ? {
          subject: replyTo.subject,
          senderName: replyTo.from?.name,
          senderEmail: replyTo.from?.email,
          bodyText: replyTo.bodyText,
          bodyHtml: replyTo.bodyHtml,
        } : undefined,
        tone: 'professional',
        count: 3,
      });

      // Backend returns already parsed suggestions
      setAiSuggestions(response.suggestions);
      setShowAiSuggestions(true);
      toast.success(intl.formatMessage({ id: 'modules.email.compose.ai.suggestionsGenerated' }));
    } catch (error: any) {
      console.error('AI generation failed:', error);
      toast.error(error?.message || intl.formatMessage({ id: 'modules.email.compose.errors.generateFailed' }));
    }
  };

  // Select an AI suggestion
  const selectAiSuggestion = (suggestion: string) => {
    setBody(suggestion);
    setShowAiSuggestions(false);
    setAiSuggestions([]);
  };

  // Generate smart replies when replying to an email
  const generateSmartReplies = async () => {
    if (!replyTo) return;

    setSmartReplies([]);

    try {
      const originalContent = getOriginalEmailContent();

      const response = await smartRepliesMutation.mutateAsync({
        subject: replyTo.subject || '(no subject)',
        sender: replyTo.from?.name || replyTo.from?.email || intl.formatMessage({ id: 'modules.email.compose.unknownSender' }),
        body: originalContent,
        count: 3,
        tone: 'professional',
      });

      // Backend returns already parsed replies
      setSmartReplies(response.replies);
    } catch (error) {
      console.error('Smart replies generation failed:', error);
    }
  };

  // Generate smart replies when replying to an email on mount
  useEffect(() => {
    if (replyTo && !body) {
      generateSmartReplies();
    }
  }, [replyTo?.id]);

  // Check if Drive is connected on mount
  useEffect(() => {
    const checkDriveConnection = async () => {
      try {
        const connection = await googleDriveApi.getConnection(workspaceId);
        setIsDriveConnected(!!connection);
      } catch {
        setIsDriveConnected(false);
      }
    };
    checkDriveConnection();
  }, [workspaceId]);

  // Gmail hooks - pass connectionId for multi-account support
  const sendGmailMutation = useSendEmail(workspaceId, connectionId);
  const replyGmailMutation = useReplyToEmail(workspaceId, connectionId);

  // SMTP/IMAP hooks - pass connectionId for multi-account support
  const sendSmtpImapMutation = useSendSmtpImapEmail(workspaceId, connectionId);
  const replySmtpImapMutation = useReplyToSmtpImapEmail(workspaceId, connectionId);

  // Select correct hooks based on provider
  const sendEmailMutation = provider === 'smtp_imap' ? sendSmtpImapMutation : sendGmailMutation;
  const replyMutation = provider === 'smtp_imap' ? replySmtpImapMutation : replyGmailMutation;

  // Handle device file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const newAttachments: EmailAttachment[] = [];

      for (const file of Array.from(files)) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64Content = result.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          filename: file.name,
          content: base64,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          source: 'device',
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Failed to process attachments:', error);
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.attachmentsFailed' }));
    } finally {
      setIsUploadingAttachment(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Drive picker functions
  const loadDriveFiles = async () => {
    if (!workspaceId) return;

    setIsDriveLoading(true);
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolderId,
        pageSize: 50,
      });
      setDriveFiles(response.files);
    } catch (error) {
      console.error('Failed to load Drive files:', error);
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.driveLoadFailed' }));
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDriveSearch = async () => {
    if (!workspaceId || !driveSearchQuery.trim()) {
      setIsSearching(false);
      loadDriveFiles();
      return;
    }

    setIsSearching(true);
    setIsDriveLoading(true);
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        query: driveSearchQuery,
        pageSize: 50,
      });
      setDriveFiles(response.files);
    } catch (error) {
      console.error('Failed to search Drive files:', error);
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.driveSearchFailed' }));
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDriveFolderClick = (folder: GoogleDriveFile) => {
    setIsSearching(false);
    setDriveSearchQuery('');
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleDriveBreadcrumbClick = (index: number) => {
    const item = folderPath[index];
    setIsSearching(false);
    setDriveSearchQuery('');
    setCurrentFolderId(item.id);
    setFolderPath((prev) => prev.slice(0, index + 1));
  };

  const handleDriveGoBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  const toggleDriveFileSelection = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      handleDriveFolderClick(file);
      return;
    }

    setSelectedDriveFiles((prev) => {
      const isSelected = prev.some((f) => f.id === file.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleDrivePickerOpen = () => {
    setIsDrivePickerOpen(true);
    loadDriveFiles();
  };

  const handleDrivePickerClose = () => {
    setIsDrivePickerOpen(false);
    setSelectedDriveFiles([]);
    setCurrentFolderId('root');
    setFolderPath([{ id: 'root', name: intl.formatMessage({ id: 'modules.email.compose.drive.myDrive' }) }]);
    setDriveSearchQuery('');
    setIsSearching(false);
  };

  const handleDriveFilesConfirm = async () => {
    if (selectedDriveFiles.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const newAttachments: EmailAttachment[] = [];

      for (const file of selectedDriveFiles) {
        // Download file from Drive and convert to base64
        const downloadUrl = googleDriveApi.getDownloadUrl(workspaceId, file.id);
        const response = await fetchWithAuth(downloadUrl, { method: 'GET' });

        if (!response.ok) {
          console.error(`Failed to download file: ${file.name}`);
          continue;
        }

        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Content = result.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        newAttachments.push({
          filename: file.name,
          content: base64,
          mimeType: file.mimeType || 'application/octet-stream',
          size: file.size || blob.size,
          source: 'drive',
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      handleDrivePickerClose();
    } catch (error) {
      console.error('Failed to attach Drive files:', error);
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.driveAttachFailed' }));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Load drive files when folder changes
  useEffect(() => {
    if (isDrivePickerOpen && isDriveConnected && !isSearching) {
      loadDriveFiles();
    }
  }, [currentFolderId, isDrivePickerOpen]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.recipientRequired' }));
      return;
    }

    // Prepare attachments for API
    const emailAttachments = attachments.length > 0
      ? attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          mimeType: att.mimeType,
        }))
      : undefined;

    try {
      if (replyTo) {
        await replyMutation.mutateAsync({
          messageId: replyTo.id,
          data: {
            body,
            isHtml: false,
            attachments: emailAttachments,
          },
        });
      } else {
        await sendEmailMutation.mutateAsync({
          to: to.split(',').map((e) => e.trim()),
          cc: cc ? cc.split(',').map((e) => e.trim()) : undefined,
          bcc: bcc ? bcc.split(',').map((e) => e.trim()) : undefined,
          subject,
          body,
          isHtml: false,
          attachments: emailAttachments,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(intl.formatMessage({ id: 'modules.email.compose.errors.sendFailed' }));
    }
  };

  const isLoading =
    sendGmailMutation.isPending ||
    replyGmailMutation.isPending ||
    sendSmtpImapMutation.isPending ||
    replySmtpImapMutation.isPending;

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50 w-72 bg-background border rounded-t-lg shadow-lg">
        <div
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <span className="font-medium truncate">
            {replyTo ? intl.formatMessage({ id: 'modules.email.compose.replyPrefix' }, { subject: replyTo.subject }) : intl.formatMessage({ id: 'modules.email.compose.newMessage' })}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 w-[600px] max-h-[80vh] bg-background border rounded-t-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <span className="font-medium">
          {replyTo ? intl.formatMessage({ id: 'modules.email.compose.replyPrefix' }, { subject: replyTo.subject }) : intl.formatMessage({ id: 'modules.email.compose.newMessage' })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-2">
          {/* To */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground w-12">{intl.formatMessage({ id: 'modules.email.compose.labels.to' })}</label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.email.compose.placeholders.recipients' })}
              className="flex-1"
            />
            <div className="flex gap-1">
              {!showCc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowCc(true)}
                >
                  {intl.formatMessage({ id: 'modules.email.compose.labels.cc' })}
                </Button>
              )}
              {!showBcc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowBcc(true)}
                >
                  {intl.formatMessage({ id: 'modules.email.compose.labels.bcc' })}
                </Button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-12">{intl.formatMessage({ id: 'modules.email.compose.labels.cc' })}</label>
              <Input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder={intl.formatMessage({ id: 'modules.email.compose.placeholders.cc' })}
                className="flex-1"
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-12">{intl.formatMessage({ id: 'modules.email.compose.labels.bcc' })}</label>
              <Input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder={intl.formatMessage({ id: 'modules.email.compose.placeholders.bcc' })}
                className="flex-1"
              />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground w-12">{intl.formatMessage({ id: 'modules.email.compose.labels.subject' })}</label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.email.compose.placeholders.subject' })}
              className="flex-1"
            />
          </div>
        </div>

        {/* Smart Reply suggestions (when replying) */}
        {replyTo && smartReplies.length > 0 && !body && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.email.compose.ai.smartReplies' })}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={generateSmartReplies}
                disabled={isGeneratingSmartReplies}
              >
                <RefreshCw className={cn("h-3 w-3", isGeneratingSmartReplies && "animate-spin")} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {smartReplies.map((reply, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3 max-w-full"
                  onClick={() => setBody(reply)}
                >
                  <span className="truncate">{reply.length > 60 ? reply.substring(0, 60) + '...' : reply}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {isGeneratingSmartReplies && replyTo && !body && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {intl.formatMessage({ id: 'modules.email.compose.ai.generatingReplies' })}
            </div>
          </div>
        )}

        {/* Body with Help Me Write button */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.email.compose.placeholders.body' })}
              className="min-h-[200px] resize-none pr-32"
            />
            {/* Help Me Write button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 gap-1.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950"
              onClick={handleHelpMeWrite}
              disabled={isGeneratingAI}
            >
              {isGeneratingAI ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              {intl.formatMessage({ id: 'modules.email.compose.ai.helpMeWrite' })}
            </Button>
          </div>

          {/* AI Suggestions */}
          {showAiSuggestions && aiSuggestions.length > 0 && (
            <div className="mt-3 border rounded-lg p-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{intl.formatMessage({ id: 'modules.email.compose.ai.suggestions' })}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowAiSuggestions(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-3 rounded-md bg-background border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors text-sm"
                    onClick={() => selectAiSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={handleHelpMeWrite}
                  disabled={isGeneratingAI}
                >
                  <RefreshCw className={cn("h-3 w-3", isGeneratingAI && "animate-spin")} />
                  {intl.formatMessage({ id: 'modules.email.compose.ai.regenerate' })}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Attachments display */}
        {attachments.length > 0 && (
          <div className="px-3 pb-3">
            <div className="border rounded-md p-2 bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {intl.formatMessage({ id: 'modules.email.compose.attachments.title' }, { count: attachments.length })}
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <div
                    key={`${att.filename}-${index}`}
                    className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 text-sm"
                  >
                    {getFileIcon(att.mimeType)}
                    <span className="max-w-[150px] truncate">{att.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(att.size)})
                    </span>
                    {att.source === 'drive' && (
                      <HardDrive className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-destructive/20"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t">
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />

          {/* Device attachment button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAttachment}
            title={intl.formatMessage({ id: 'modules.email.compose.attachments.fromDevice' })}
          >
            {isUploadingAttachment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          {/* Drive attachment button (only show if connected) */}
          {isDriveConnected && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDrivePickerOpen}
              disabled={isUploadingAttachment}
              title={intl.formatMessage({ id: 'modules.email.compose.attachments.fromDrive' })}
            >
              <HardDrive className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            {intl.formatMessage({ id: 'modules.email.compose.buttons.discard' })}
          </Button>
          <Button onClick={handleSend} disabled={isLoading || isUploadingAttachment} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: 'modules.email.compose.buttons.send' })}
          </Button>
        </div>
      </div>

      {/* Google Drive Picker Dialog */}
      <Dialog open={isDrivePickerOpen} onOpenChange={handleDrivePickerClose}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {intl.formatMessage({ id: 'modules.email.compose.drive.title' })}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'modules.email.compose.drive.description' })}
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: 'modules.email.compose.drive.searchPlaceholder' })}
                value={driveSearchQuery}
                onChange={(e) => setDriveSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDriveSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleDriveSearch} variant="secondary">
              {intl.formatMessage({ id: 'modules.email.compose.drive.search' })}
            </Button>
          </div>

          {/* Breadcrumb / Navigation */}
          {!isSearching && (
            <div className="flex items-center gap-1 text-sm mb-2 overflow-x-auto">
              {folderPath.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDriveGoBack}
                  className="h-7 px-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {folderPath.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDriveBreadcrumbClick(index)}
                    className={cn(
                      'h-7 px-2',
                      index === folderPath.length - 1 && 'font-medium'
                    )}
                  >
                    {index === 0 ? <Home className="h-4 w-4 mr-1" /> : null}
                    {item.name}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Search className="h-4 w-4" />
              {intl.formatMessage({ id: 'modules.email.compose.drive.searchResults' }, { query: driveSearchQuery })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSearching(false);
                  setDriveSearchQuery('');
                  loadDriveFiles();
                }}
                className="h-6 px-2 text-xs"
              >
                {intl.formatMessage({ id: 'modules.email.compose.drive.clear' })}
              </Button>
            </div>
          )}

          {/* File list */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 min-h-[300px]">
              {isDriveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Folder className="h-12 w-12 mb-2 opacity-50" />
                  <p>{intl.formatMessage({ id: 'modules.email.compose.drive.noFiles' })}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {driveFiles.map((file) => {
                    const isSelected = selectedDriveFiles.some(
                      (f) => f.id === file.id
                    );
                    const isFolder = file.fileType === 'folder';

                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleDriveFileSelection(file)}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted',
                          isFolder && 'hover:bg-muted/80'
                        )}
                      >
                        {!isFolder && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDriveFileSelection(file)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {isFolder && <div className="w-4" />}

                        <div className="flex-shrink-0">
                          {file.thumbnailLink ? (
                            <img
                              src={file.thumbnailLink}
                              alt=""
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : isFolder ? (
                            <Folder className="h-5 w-5 text-yellow-500" />
                          ) : (
                            getFileIcon(file.mimeType)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {isFolder
                              ? intl.formatMessage({ id: 'modules.email.compose.drive.folder' })
                              : file.size
                              ? formatFileSize(file.size)
                              : ''}
                            {file.modifiedTime && (
                              <span className="ml-2">
                                {intl.formatMessage({ id: 'modules.email.compose.drive.modified' })}{' '}
                                {new Date(file.modifiedTime).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {isFolder && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Selected files preview */}
          {selectedDriveFiles.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <div className="text-sm font-medium mb-2">
                {intl.formatMessage({ id: 'modules.email.compose.drive.selected' }, { count: selectedDriveFiles.length })}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDriveFiles.map((file) => (
                  <Badge
                    key={file.id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 flex items-center gap-1"
                  >
                    {file.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDriveFiles((prev) =>
                          prev.filter((f) => f.id !== file.id)
                        );
                      }}
                      className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDrivePickerClose}>
              {intl.formatMessage({ id: 'modules.email.compose.buttons.cancel' })}
            </Button>
            <Button
              onClick={handleDriveFilesConfirm}
              disabled={selectedDriveFiles.length === 0 || isUploadingAttachment}
            >
              {isUploadingAttachment ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {intl.formatMessage({ id: 'modules.email.compose.buttons.attach' }, { count: selectedDriveFiles.length > 0 ? ` (${selectedDriveFiles.length})` : '' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
