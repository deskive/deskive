/**
 * File Upload Modal
 * Drag and drop file upload with progress tracking
 */

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, Trash2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useUploadFile } from '@/lib/api/files-api';
import { useIntl } from 'react-intl';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  parentFolderId?: string | null;
  onUploadSuccess?: () => void;
}

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  name: string;
  size: number;
  type: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function FileUploadModal({
  isOpen,
  onClose,
  workspaceId,
  parentFolderId,
  onUploadSuccess
}: FileUploadModalProps) {
  const intl = useIntl();
  const uploadFileMutation = useUploadFile();

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithPreview[] = acceptedFiles.map(file => {
      let preview: string | undefined;

      if (file && file.type && file.type.startsWith('image/')) {
        try {
          preview = URL.createObjectURL(file);
        } catch (error) {
          console.warn('Failed to create object URL for', file.name, error);
          preview = undefined;
        }
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        preview,
        status: 'pending' as const,
        progress: 0,
        name: file.name || 'Unknown file',
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024, // 500MB
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
      'application/vnd.ms-powerpoint': [],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': [],
      'text/*': [],
      'application/zip': [],
      'application/x-rar-compressed': [],
    },
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const getFileIcon = (fileWithPreview: FileWithPreview) => {
    const fileType = fileWithPreview.type;
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
    return File;
  };

  const getFileColor = (fileWithPreview: FileWithPreview) => {
    const fileType = fileWithPreview.type;
    if (!fileType) return 'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200';
    if (fileType.startsWith('image/')) return 'text-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200';
    if (fileType.startsWith('video/')) return 'text-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200';
    if (fileType.startsWith('audio/')) return 'text-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200';
    if (fileType.includes('pdf')) return 'text-red-600 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-red-200';
    if (fileType.includes('document') || fileType.includes('spreadsheet')) return 'text-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200';
    return 'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200';
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Validate workspaceId before uploading
    if (!workspaceId) {
      toast.error('Workspace ID is required');
      return;
    }

    setUploading(true);

    try {
      let uploadedCount = 0;

      // Upload files one by one
      for (const fileWithPreview of files) {
        try {
          // Mark file as uploading
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id
              ? { ...f, status: 'uploading' as const, progress: 0 }
              : f
          ));

          // Simulate progress animation
          const progressInterval = setInterval(() => {
            setFiles(prev => prev.map(f =>
              f.id === fileWithPreview.id && f.progress! < 90
                ? { ...f, progress: (f.progress || 0) + 10 }
                : f
            ));
          }, 100);

          // Upload file using TanStack Query mutation
          await uploadFileMutation.mutateAsync({
            workspaceId,
            data: {
              file: fileWithPreview.file,
              workspace_id: workspaceId,  // Required in FormData body
              parent_folder_id: parentFolderId || undefined,
              description: description.trim() || undefined,
              tags: tags.length > 0 ? tags : undefined,
              is_public: isPublic,
            },
          });

          clearInterval(progressInterval);

          // Mark file as completed
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id
              ? { ...f, status: 'completed' as const, progress: 100 }
              : f
          ));

          uploadedCount++;

        } catch (error) {
          console.error(`Failed to upload ${fileWithPreview.name}:`, error);

          let errorMessage = 'Upload failed';
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          // Mark file as error
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id
              ? { ...f, status: 'error' as const, error: errorMessage }
              : f
          ));
        }
      }

      // Show success message
      if (uploadedCount > 0) {
        toast.success(`Successfully uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''}`);

        // Call success callback
        onUploadSuccess?.();

        // Close modal after a brief delay
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        toast.error('Failed to upload files');
      }

    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    setFiles([]);
    setDescription('');
    setTags([]);
    setTagInput('');
    setIsPublic(false);
    setUploading(false);

    onClose();
  };

  const canUpload = files.length > 0 && !uploading;
  const allCompleted = files.length > 0 && files.every(file => file.status === 'completed');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{intl.formatMessage({ id: 'modules.files.upload.title' })}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">{intl.formatMessage({ id: 'modules.files.upload.dropHere' })}</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">{intl.formatMessage({ id: 'modules.files.upload.dragDrop' })}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.files.upload.orClick' })}
                </p>
                <Button
                  variant="outline"
                  type="button"
                  className="btn-gradient-primary border-0"
                >
                  {intl.formatMessage({ id: 'modules.files.upload.chooseFiles' })}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {intl.formatMessage({ id: 'modules.files.upload.maxSize' })}
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">{intl.formatMessage({ id: 'modules.files.upload.filesToUpload' }, { count: files.length })}</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file);
                  const colorClasses = getFileColor(file);

                  return (
                    <Card key={file.id} className="relative">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* File Preview/Icon */}
                          <div className={`p-2 rounded border ${colorClasses}`}>
                            {file.preview ? (
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="h-8 w-8 object-cover rounded"
                              />
                            ) : (
                              <FileIcon className="h-5 w-5" />
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                            </p>

                            {/* Progress */}
                            {file.status === 'uploading' && (
                              <Progress value={file.progress || 0} className="h-1 mt-1" />
                            )}

                            {/* Status */}
                            {file.status === 'completed' && (
                              <div className="flex items-center gap-1 mt-1">
                                <Check className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-green-600">{intl.formatMessage({ id: 'modules.files.upload.uploaded' })}</span>
                              </div>
                            )}

                            {file.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">{file.error}</p>
                            )}
                          </div>

                          {/* Remove Button */}
                          {file.status !== 'uploading' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload Options */}
          {files.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{intl.formatMessage({ id: 'modules.files.upload.makePublic' })}</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="public" className="text-sm text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.files.upload.anyoneWithLink' })}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{intl.formatMessage({ id: 'modules.files.upload.descriptionLabel' })}</Label>
                <Textarea
                  id="description"
                  placeholder={intl.formatMessage({ id: 'modules.files.upload.descriptionPlaceholder' })}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: 'modules.files.upload.tagsLabel' })}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={intl.formatMessage({ id: 'modules.files.upload.tagPlaceholder' })}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button
                    variant="outline"
                    onClick={addTag}
                    className="btn-gradient-primary border-0"
                  >
                    {intl.formatMessage({ id: 'modules.files.upload.add' })}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {files.length > 0 && (
              <span>
                {intl.formatMessage(
                  { id: files.length === 1 ? 'modules.files.upload.fileCount' : 'modules.files.upload.fileCountPlural' },
                  { count: files.length }
                )} • {' '}
                {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {intl.formatMessage({ id: 'modules.files.upload.cancel' })}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!canUpload}
              className={!canUpload ? '' : 'btn-gradient-primary'}
            >
              {uploading ? intl.formatMessage({ id: 'modules.files.upload.uploading' }) : allCompleted ? intl.formatMessage({ id: 'modules.files.upload.done' }) : intl.formatMessage({ id: 'modules.files.upload.uploadFiles' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
