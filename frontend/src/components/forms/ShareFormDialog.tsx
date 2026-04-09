import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, ExternalLink, Plus, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { formsApi } from '@/lib/api/forms-api';
import type { Form, FormShareLink, CreateShareLinkDto } from '@/lib/api/forms-api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';

interface ShareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Form;
  workspaceId: string;
}

export function ShareFormDialog({ open, onOpenChange, form, workspaceId }: ShareFormDialogProps) {
  const intl = useIntl();
  const [copied, setCopied] = useState<string | null>(null);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLinkSettings, setNewLinkSettings] = useState<CreateShareLinkDto>({
    accessLevel: 'respond',
    requirePassword: false,
    password: '',
  });

  const queryClient = useQueryClient();

  // Fetch existing share links
  const { data: shareLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['share-links', workspaceId, form.id],
    queryFn: () => formsApi.getShareLinks(workspaceId, form.id),
    enabled: open,
  });

  // Create share link mutation
  const createLinkMutation = useMutation({
    mutationFn: (data: CreateShareLinkDto) =>
      formsApi.createShareLink(workspaceId, form.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links', workspaceId, form.id] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.shareLinkCreated' }));
      setShowCreateLink(false);
      setNewLinkSettings({
        accessLevel: 'respond',
        requirePassword: false,
        password: '',
      });
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.shareLinkCreateError' }));
    },
  });

  // Delete share link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: (shareId: string) =>
      formsApi.deleteShareLink(workspaceId, shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links', workspaceId, form.id] });
      toast.success(intl.formatMessage({ id: 'modules.forms.messages.shareLinkDeleted' }));
    },
    onError: () => {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.shareLinkDeleteError' }));
    },
  });

  const getShareUrl = (shareLink: FormShareLink) => {
    return `${window.location.origin}/forms/s/${shareLink.shareToken}`;
  };

  const getPublicSlugUrl = () => {
    return `${window.location.origin}/forms/${form.slug}`;
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopied(identifier);
    toast.success(intl.formatMessage({ id: 'modules.forms.messages.linkCopied' }));
    setTimeout(() => setCopied(null), 2000);
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const handleCreateLink = () => {
    const data: CreateShareLinkDto = {
      accessLevel: newLinkSettings.accessLevel,
      requirePassword: newLinkSettings.requirePassword,
      password: newLinkSettings.requirePassword ? newLinkSettings.password : undefined,
      expiresAt: newLinkSettings.expiresAt,
      maxResponses: newLinkSettings.maxResponses,
    };

    if (newLinkSettings.requirePassword && !newLinkSettings.password) {
      toast.error(intl.formatMessage({ id: 'modules.forms.messages.passwordRequired' }));
      return;
    }

    createLinkMutation.mutate(data);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return intl.formatMessage({ id: 'modules.forms.share.never' });
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'modules.forms.share.title' }, { title: form.title })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Slug Link */}
          <div>
            <Label className="text-base font-semibold">
              {intl.formatMessage({ id: 'modules.forms.share.publicLink' })}
            </Label>
            <p className="text-sm text-gray-600 mb-2">
              {intl.formatMessage({ id: 'modules.forms.share.publicLinkDescription' })}
            </p>
            <div className="flex gap-2">
              <Input value={getPublicSlugUrl()} readOnly className="flex-1 font-mono text-sm" />
              <Button
                onClick={() => copyToClipboard(getPublicSlugUrl(), 'slug')}
                variant="outline"
              >
                {copied === 'slug' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.forms.actions.copied' })}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.forms.actions.copy' })}
                  </>
                )}
              </Button>
              <Button onClick={() => openInNewTab(getPublicSlugUrl())} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.forms.actions.open' })}
              </Button>
            </div>
          </div>

          {/* Share Links Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base font-semibold">
                  {intl.formatMessage({ id: 'modules.forms.share.customLinks' })}
                </Label>
                <p className="text-sm text-gray-600">
                  {intl.formatMessage({ id: 'modules.forms.share.customLinksDescription' })}
                </p>
              </div>
              <Button
                onClick={() => setShowCreateLink(!showCreateLink)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.forms.actions.newLink' })}
              </Button>
            </div>

            {/* Create Link Form */}
            {showCreateLink && (
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <h4 className="font-semibold mb-3">Create New Share Link</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Require Password</Label>
                    <Switch
                      checked={newLinkSettings.requirePassword}
                      onCheckedChange={(checked) =>
                        setNewLinkSettings({ ...newLinkSettings, requirePassword: checked })
                      }
                    />
                  </div>

                  {newLinkSettings.requirePassword && (
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={newLinkSettings.password || ''}
                        onChange={(e) =>
                          setNewLinkSettings({ ...newLinkSettings, password: e.target.value })
                        }
                        placeholder="Enter password"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Expiration Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newLinkSettings.expiresAt || ''}
                      onChange={(e) =>
                        setNewLinkSettings({ ...newLinkSettings, expiresAt: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Maximum Responses (Optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newLinkSettings.maxResponses || ''}
                      onChange={(e) =>
                        setNewLinkSettings({
                          ...newLinkSettings,
                          maxResponses: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="Unlimited"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateLink}
                      disabled={createLinkMutation.isPending}
                    >
                      {createLinkMutation.isPending ? 'Creating...' : 'Create Link'}
                    </Button>
                    <Button
                      onClick={() => setShowCreateLink(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Share Links */}
            {linksLoading ? (
              <div className="text-center py-4 text-gray-500">Loading share links...</div>
            ) : shareLinks && shareLinks.length > 0 ? (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div key={link.id} className="border rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {link.requirePassword && (
                              <Lock className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm font-medium">
                              Share Link {link.requirePassword && '(Password Protected)'}
                            </span>
                          </div>
                          <Input
                            value={getShareUrl(link)}
                            readOnly
                            className="font-mono text-xs mb-2"
                          />
                        </div>
                        <Button
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteLinkMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Responses:</span>{' '}
                          {link.responseCount}
                          {link.maxResponses && ` / ${link.maxResponses}`}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span>{' '}
                          {formatDate(link.expiresAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => copyToClipboard(getShareUrl(link), link.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {copied === link.id ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => openInNewTab(getShareUrl(link))}
                          variant="outline"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No share links created yet</p>
                <p className="text-sm mt-1">Click "New Link" to create one</p>
              </div>
            )}
          </div>

          {/* Form Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Form Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{form.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Responses:</span>
                <span className="ml-2 font-medium">{form.responseCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Views:</span>
                <span className="ml-2 font-medium">{form.viewCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Fields:</span>
                <span className="ml-2 font-medium">{form.fields.length}</span>
              </div>
            </div>
          </div>

          {/* Settings Info */}
          <div className="text-sm space-y-2">
            <h4 className="font-semibold">Form Settings</h4>
            <ul className="space-y-1 text-gray-600">
              {form.settings.requireLogin && (
                <li>• Requires workspace login</li>
              )}
              {form.settings.allowMultipleSubmissions ? (
                <li>• Allows multiple submissions per person</li>
              ) : (
                <li>• One submission per person</li>
              )}
              {form.settings.collectEmail && (
                <li>• Collects email addresses</li>
              )}
              {form.settings.maxResponses && (
                <li>• Limited to {form.settings.maxResponses} responses</li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
