/**
 * Shared File Page
 * Public page for viewing files shared via link
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fileApi } from '@/lib/api/files-api';
import type { SharedFileResponse } from '@/lib/api/files-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Image,
  Video,
  Music,
  File,
  Download,
  Eye,
  Lock,
  Loader2,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to get file icon
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-12 w-12" />;
  if (mimeType.startsWith('video/')) return <Video className="h-12 w-12" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-12 w-12" />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="h-12 w-12" />;
  return <File className="h-12 w-12" />;
};

// Helper to check if file can be previewed
const canPreview = (mimeType: string): boolean => {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf'
  );
};

export default function SharedFilePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedFileResponse | null>(null);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (shareToken) {
      fetchSharedFile();
    }
  }, [shareToken]);

  const fetchSharedFile = async (pwd?: string) => {
    if (!shareToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fileApi.accessSharedFile(shareToken, pwd);
      setData(response);
    } catch (err: any) {
      console.error('Failed to access shared file:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to access shared file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fileApi.verifySharePassword(shareToken!, password);
      setData(response);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Incorrect password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
    const downloadUrl = data?.file?.url || data?.file?.previewUrl;
    if (!downloadUrl || !data?.file?.name) return;

    try {
      // Fetch the file as a blob to force download (works with cross-origin CDN URLs)
      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = data.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if blob download fails
      window.open(downloadUrl, '_blank');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading shared file...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data?.requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <CardTitle className="mt-4">Unable to Access File</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              This link may have expired, been disabled, or the file may have been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required state
  if (data?.requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-primary" />
            <CardTitle className="mt-4">Password Required</CardTitle>
            <CardDescription>
              This file is password protected. Enter the password to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerifying}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isVerifying || !password.trim()}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Unlock
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // File view state
  if (data?.file) {
    const { file } = data;
    const showPreview = canPreview(file.mimeType);

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  {getFileIcon(file.mimeType)}
                </div>
                <div>
                  <h1 className="text-xl font-semibold">{file.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {file.accessLevel === 'view' && <Eye className="h-3 w-3" />}
                      {file.accessLevel === 'download' && <Download className="h-3 w-3" />}
                      {file.accessLevel === 'view' ? 'View only' :
                        file.accessLevel === 'download' ? 'Download allowed' : 'Edit allowed'}
                    </Badge>
                  </div>
                </div>
              </div>

              {file.canDownload && (
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Preview Area */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-0">
                  {showPreview ? (
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden rounded-lg">
                      {file.mimeType.startsWith('image/') && (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                      {file.mimeType.startsWith('video/') && (
                        <video
                          src={file.previewUrl}
                          controls
                          className="max-w-full max-h-full"
                        />
                      )}
                      {file.mimeType.startsWith('audio/') && (
                        <div className="p-8 w-full">
                          <audio src={file.previewUrl} controls className="w-full" />
                        </div>
                      )}
                      {file.mimeType === 'application/pdf' && (
                        <iframe
                          src={file.previewUrl}
                          className="w-full h-[600px]"
                          title={file.name}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex flex-col items-center justify-center rounded-lg">
                      {getFileIcon(file.mimeType)}
                      <p className="mt-4 text-muted-foreground">Preview not available for this file type</p>
                      {file.canDownload && (
                        <Button onClick={handleDownload} variant="outline" className="mt-4">
                          <Download className="mr-2 h-4 w-4" />
                          Download to view
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* File Info Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">File Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shared By */}
                  {file.sharedBy && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={file.sharedBy.avatarUrl} />
                        <AvatarFallback>
                          {file.sharedBy.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{file.sharedBy.name}</p>
                        <p className="text-xs text-muted-foreground">Shared this file</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Type:</span>
                      <span>{file.mimeType}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Shared:</span>
                      <span>{format(new Date(file.sharedAt), 'MMM d, yyyy')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {file.accessLevel === 'view' ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Download className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground">Access:</span>
                      <span>
                        {file.accessLevel === 'view' ? 'View only' :
                          file.accessLevel === 'download' ? 'Can download' : 'Can edit'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deskive Branding */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Shared via <strong>Deskive</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
