/**
 * Integration Webhooks Component
 * Manages webhook configurations for integrations
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Webhook as WebhookIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  type InstalledIntegration,
  type WebhookConfiguration,
  integrationsService
} from '@/lib/api/integrations-api';

interface IntegrationWebhooksProps {
  integration: InstalledIntegration;
  onUpdate: () => void;
}

const webhookSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  secret: z.string().optional(),
  isActive: z.boolean(),
  headers: z.record(z.string(), z.string()).optional(),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

// Common webhook events - these would typically come from the integration definition
const WEBHOOK_EVENTS = [
  { value: 'created', label: 'Item Created', description: 'Triggered when a new item is created' },
  { value: 'updated', label: 'Item Updated', description: 'Triggered when an item is updated' },
  { value: 'deleted', label: 'Item Deleted', description: 'Triggered when an item is deleted' },
  { value: 'status_changed', label: 'Status Changed', description: 'Triggered when status changes' },
  { value: 'assigned', label: 'Item Assigned', description: 'Triggered when an item is assigned' },
  { value: 'completed', label: 'Item Completed', description: 'Triggered when an item is completed' },
  { value: 'comment_added', label: 'Comment Added', description: 'Triggered when a comment is added' },
  { value: 'file_uploaded', label: 'File Uploaded', description: 'Triggered when a file is uploaded' },
];

export function IntegrationWebhooks({ integration, onUpdate }: IntegrationWebhooksProps) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookConfiguration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfiguration | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; webhook: WebhookConfiguration | null }>({
    open: false,
    webhook: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      url: '',
      events: [],
      secret: '',
      isActive: true,
      headers: {},
    },
  });

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadWebhooks();
    }
  }, [currentWorkspace?.id, integration.id]);

  const loadWebhooks = async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    try {
      const webhooksData = await integrationsService.getWebhooks(currentWorkspace.id, integration.id);
      setWebhooks(webhooksData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load webhooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = () => {
    form.reset({
      url: '',
      events: [],
      secret: '',
      isActive: true,
      headers: {},
    });
    setCustomHeaders([]);
    setEditingWebhook(null);
    setDialogOpen(true);
  };

  const handleEditWebhook = (webhook: WebhookConfiguration) => {
    form.reset({
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || '',
      isActive: webhook.isActive,
      headers: webhook.headers || {},
    });
    
    const headers = Object.entries(webhook.headers || {}).map(([key, value]) => ({ key, value }));
    setCustomHeaders(headers);
    setEditingWebhook(webhook);
    setDialogOpen(true);
  };

  const handleSaveWebhook = async (data: WebhookFormData) => {
    if (!currentWorkspace?.id) return;

    setActionLoading(editingWebhook?.id || 'create');
    
    try {
      const headers = customHeaders.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const webhookData = {
        url: data.url,
        events: data.events,
        secret: data.secret || undefined,
        isActive: data.isActive,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      };

      if (editingWebhook) {
        await integrationsService.updateWebhook(
          currentWorkspace.id,
          integration.id,
          editingWebhook.id,
          webhookData
        );
        toast({
          title: "Webhook updated",
          description: "Webhook configuration has been updated successfully.",
        });
      } else {
        await integrationsService.createWebhook(
          currentWorkspace.id,
          integration.id,
          webhookData
        );
        toast({
          title: "Webhook created",
          description: "New webhook has been created successfully.",
        });
      }

      setDialogOpen(false);
      loadWebhooks();
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save webhook",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!currentWorkspace?.id || !deleteDialog.webhook) return;

    setActionLoading(deleteDialog.webhook.id);
    
    try {
      await integrationsService.deleteWebhook(
        currentWorkspace.id,
        integration.id,
        deleteDialog.webhook.id
      );
      
      toast({
        title: "Webhook deleted",
        description: "Webhook has been removed successfully.",
      });
      
      setDeleteDialog({ open: false, webhook: null });
      loadWebhooks();
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete webhook",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfiguration) => {
    if (!currentWorkspace?.id) return;

    setActionLoading(webhook.id);
    
    try {
      const result = await integrationsService.testWebhook(
        currentWorkspace.id,
        integration.id,
        webhook.id
      );
      
      toast({
        title: result.success ? "Test successful" : "Test failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Failed to test webhook",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "URL has been copied to clipboard.",
    });
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const formatLastDelivery = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner className="w-6 h-6" />
        <span className="ml-2">Loading webhooks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhook Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure webhooks to receive real-time notifications from {integration.name}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateWebhook}>
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive events from this integration.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(handleSaveWebhook)} className="space-y-4">
              <div>
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  placeholder="https://your-app.com/webhooks"
                  {...form.register('url')}
                />
                {form.formState.errors.url && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
                )}
              </div>

              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={event.value}
                        value={event.value}
                        {...form.register('events')}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={event.value} className="text-sm font-normal">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.events && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.events.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="secret">Secret (Optional)</Label>
                <div className="relative">
                  <Input
                    id="secret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Webhook secret for signature verification"
                    {...form.register('secret')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Used to verify webhook payload authenticity
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Custom Headers</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomHeader}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Header
                  </Button>
                </div>
                {customHeaders.map((header, index) => (
                  <div key={index} className="flex gap-2 mt-2">
                    <Input
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                    />
                    <Input
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCustomHeader(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this webhook to receive events
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={form.watch('isActive')}
                  onCheckedChange={(checked) => form.setValue('isActive', checked)}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!!actionLoading}
                >
                  {actionLoading ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : null}
                  {editingWebhook ? 'Update' : 'Create'} Webhook
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <WebhookIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
            <p className="text-muted-foreground mb-4">
              Create a webhook to receive real-time notifications from {integration.name}.
            </p>
            <Button onClick={handleCreateWebhook}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium truncate">{webhook.url}</h4>
                      <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {(webhook.failureCount || 0) > 0 && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Last delivery: {formatLastDelivery(webhook.lastDelivery)}
                      </span>
                      {webhook.secret && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Secured
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.url)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={actionLoading === webhook.id}
                    >
                      {actionLoading === webhook.id ? (
                        <LoadingSpinner className="w-4 h-4" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWebhook(webhook)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, webhook })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, webhook: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone and 
              you will no longer receive events at this endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebhook}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <LoadingSpinner className="w-4 h-4 mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}