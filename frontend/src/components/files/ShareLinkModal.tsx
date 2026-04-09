/**
 * Share Link Modal
 * Create and manage public shareable links (Google Drive style)
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { fileApi } from '@/lib/api/files-api';
import type { ShareLinkResponse } from '@/lib/api/files-api';
import {
  Link2,
  Copy,
  Check,
  Loader2,
  Eye,
  Download,
  Edit3,
  Lock,
  Calendar,
  Hash,
  Trash2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: ShareLinkModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinkResponse[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New link options
  const [accessLevel, setAccessLevel] = useState<'view' | 'download' | 'edit'>('view');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useExpiration, setUseExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [useDownloadLimit, setUseDownloadLimit] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(10);

  // Fetch existing share links
  useEffect(() => {
    if (isOpen && workspaceId && fileId) {
      fetchShareLinks();
    }
  }, [isOpen, workspaceId, fileId]);

  const fetchShareLinks = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const links = await fileApi.getFileShareLinks(workspaceId, fileId);
      setShareLinks(links);
    } catch (error) {
      console.error('Failed to fetch share links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    setIsCreating(true);
    try {
      const newLink = await fileApi.createShareLink(workspaceId, fileId, {
        accessLevel,
        password: usePassword ? password : undefined,
        expiresAt: useExpiration ? expiresAt : undefined,
        maxDownloads: useDownloadLimit ? maxDownloads : undefined,
      });

      setShareLinks([newLink, ...shareLinks]);
      toast.success('Share link created!');

      // Reset form
      setAccessLevel('view');
      setUsePassword(false);
      setPassword('');
      setUseExpiration(false);
      setExpiresAt('');
      setUseDownloadLimit(false);
      setMaxDownloads(10);
    } catch (error: any) {
      console.error('Failed to create share link:', error);
      toast.error(error?.response?.data?.message || 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (link: ShareLinkResponse) => {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopiedId(link.id);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteLink = async (shareId: string) => {
    if (!workspaceId) return;

    try {
      await fileApi.deleteShareLink(workspaceId, shareId);
      setShareLinks(shareLinks.filter(link => link.id !== shareId));
      toast.success('Share link deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete share link');
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'view':
        return <Eye className="h-3 w-3" />;
      case 'download':
        return <Download className="h-3 w-3" />;
      case 'edit':
        return <Edit3 className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case 'view':
        return 'View only';
      case 'download':
        return 'Can download';
      case 'edit':
        return 'Can edit';
      default:
        return level;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share "{fileName}"
          </DialogTitle>
          <DialogDescription>
            Create a shareable link anyone can use to access this file
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">
              Manage Links
              {shareLinks.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {shareLinks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Create Link Tab */}
          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Access Level */}
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View only - Can preview the file
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download - Can download the file
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Edit - Can modify the file
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Protection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password Protection
                </Label>
                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expiration Date
                </Label>
                <Switch checked={useExpiration} onCheckedChange={setUseExpiration} />
              </div>
              {useExpiration && (
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>

            {/* Download Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Download Limit
                </Label>
                <Switch checked={useDownloadLimit} onCheckedChange={setUseDownloadLimit} />
              </div>
              {useDownloadLimit && (
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 10)}
                />
              )}
            </div>

            <Button
              onClick={handleCreateLink}
              disabled={isCreating || (usePassword && !password)}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Create Share Link
                </>
              )}
            </Button>
          </TabsContent>

          {/* Manage Links Tab */}
          <TabsContent value="manage" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Link2 className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No share links yet</p>
                <p className="text-xs text-muted-foreground">Create a link to share this file</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {shareLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getAccessLevelIcon(link.accessLevel)}
                            {getAccessLevelLabel(link.accessLevel)}
                          </Badge>
                          {link.hasPassword && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Protected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(link)}
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(link.shareUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {link.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {link.downloadCount}
                          {link.maxDownloads ? `/${link.maxDownloads}` : ''} downloads
                        </span>
                      </div>

                      {link.expiresAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(new Date(link.expiresAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(link.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
