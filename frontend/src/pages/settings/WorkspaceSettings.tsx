/**
 * Workspace Settings Component
 * Allows workspace owners/admins to edit workspace details and delete workspace
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Upload,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';

// API
import { workspaceApi, useUpdateWorkspace, useDeleteWorkspace, workspaceKeys } from '@/lib/api/workspace-api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WorkspaceSettingsProps {
  workspaceId: string;
}

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ workspaceId }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces, refreshCurrentWorkspace } = useWorkspace();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Mutations
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();

  // Check if user is owner
  const isOwner = currentWorkspace?.owner_id === user?.id;

  // Initialize form with current workspace data
  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || '');
      setDescription(currentWorkspace.description || '');
      // Handle both 'logo' and 'logo_url' field names for compatibility
      setLogoUrl((currentWorkspace as any).logo || (currentWorkspace as any).logo_url || '');
    }
  }, [currentWorkspace]);

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(intl.formatMessage({ id: 'settings.workspace.logoInvalidType', defaultMessage: 'Please select an image file' }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(intl.formatMessage({ id: 'settings.workspace.logoTooLarge', defaultMessage: 'Image must be less than 5MB' }));
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(intl.formatMessage({ id: 'settings.workspace.nameRequired', defaultMessage: 'Workspace name is required' }));
      return;
    }

    try {
      let uploadedLogoUrl = logoUrl;

      // Upload logo if a new file was selected
      if (logoFile) {
        setIsUploading(true);
        try {
          const response = await workspaceApi.uploadWorkspaceLogo(logoFile);
          uploadedLogoUrl = response.url;
        } catch (uploadError) {
          console.error('Failed to upload logo:', uploadError);
          toast.error(intl.formatMessage({ id: 'settings.workspace.logoUploadFailed', defaultMessage: 'Failed to upload logo' }));
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      // Update workspace
      await updateWorkspaceMutation.mutateAsync({
        id: workspaceId,
        data: {
          name: name.trim(),
          description: description.trim(),
          logo: uploadedLogoUrl
        }
      });

      // Update local logo URL state with the new URL
      setLogoUrl(uploadedLogoUrl);

      // Refresh workspace data - use refreshCurrentWorkspace to update both the current workspace and the list
      await refreshCurrentWorkspace();
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });

      toast.success(intl.formatMessage({ id: 'settings.workspace.updateSuccess', defaultMessage: 'Workspace updated successfully' }));

      // Clear logo file and preview after successful save
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error: any) {
      console.error('Failed to update workspace:', error);
      toast.error(error?.message || intl.formatMessage({ id: 'settings.workspace.updateFailed', defaultMessage: 'Failed to update workspace' }));
    }
  };

  // Handle workspace deletion
  const handleDelete = async () => {
    if (deleteConfirmText !== currentWorkspace?.name) {
      toast.error(intl.formatMessage({ id: 'settings.workspace.deleteNameMismatch', defaultMessage: 'Please type the workspace name to confirm deletion' }));
      return;
    }

    try {
      await deleteWorkspaceMutation.mutateAsync(workspaceId);

      toast.success(intl.formatMessage({ id: 'settings.workspace.deleteSuccess', defaultMessage: 'Workspace deleted successfully' }));

      // Refresh workspaces and navigate to home
      await refreshWorkspaces();

      // Navigate to root/home page
      navigate('/');
    } catch (error: any) {
      console.error('Failed to delete workspace:', error);
      toast.error(error?.message || intl.formatMessage({ id: 'settings.workspace.deleteFailed', defaultMessage: 'Failed to delete workspace' }));
    }
  };

  const isSaving = updateWorkspaceMutation.isPending || isUploading;
  const isDeleting = deleteWorkspaceMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Workspace Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {intl.formatMessage({ id: 'settings.workspace.title', defaultMessage: 'Workspace Settings' })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'settings.workspace.description', defaultMessage: 'Manage your workspace name, description, and logo' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: 'settings.workspace.logo', defaultMessage: 'Workspace Logo' })}</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={logoPreview || logoUrl} alt={name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {name ? name.charAt(0).toUpperCase() : 'W'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {intl.formatMessage({ id: 'settings.workspace.uploadLogo', defaultMessage: 'Upload Logo' })}
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'settings.workspace.logoHint', defaultMessage: 'Recommended: 256x256px, max 5MB' })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">
              {intl.formatMessage({ id: 'settings.workspace.name', defaultMessage: 'Workspace Name' })}
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'settings.workspace.namePlaceholder', defaultMessage: 'Enter workspace name' })}
            />
          </div>

          {/* Workspace Description */}
          <div className="space-y-2">
            <Label htmlFor="workspace-description">
              {intl.formatMessage({ id: 'settings.workspace.descriptionLabel', defaultMessage: 'Description' })}
            </Label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={intl.formatMessage({ id: 'settings.workspace.descriptionPlaceholder', defaultMessage: 'Enter workspace description' })}
              rows={3}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'common.saving', defaultMessage: 'Saving...' })}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'common.saveChanges', defaultMessage: 'Save Changes' })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Only for workspace owner */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {intl.formatMessage({ id: 'settings.workspace.dangerZone', defaultMessage: 'Danger Zone' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'settings.workspace.dangerZoneDescription', defaultMessage: 'Irreversible and destructive actions' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
              <div>
                <h4 className="font-medium text-destructive">
                  {intl.formatMessage({ id: 'settings.workspace.deleteWorkspace', defaultMessage: 'Delete Workspace' })}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'settings.workspace.deleteWarning', defaultMessage: 'Once deleted, all data will be permanently removed. This action cannot be undone.' })}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'settings.workspace.delete', defaultMessage: 'Delete' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={intl.formatMessage({ id: 'settings.workspace.deleteConfirmTitle', defaultMessage: 'Delete Workspace' })}
        description={
          <div className="space-y-4">
            <p>
              {intl.formatMessage(
                { id: 'settings.workspace.deleteConfirmDescription', defaultMessage: 'This will permanently delete the workspace "{workspaceName}" and all its data including:' },
                { workspaceName: currentWorkspace?.name || '' }
              )}
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>{intl.formatMessage({ id: 'settings.workspace.deleteItem1', defaultMessage: 'All channels and messages' })}</li>
              <li>{intl.formatMessage({ id: 'settings.workspace.deleteItem2', defaultMessage: 'All files and documents' })}</li>
              <li>{intl.formatMessage({ id: 'settings.workspace.deleteItem3', defaultMessage: 'All projects and tasks' })}</li>
              <li>{intl.formatMessage({ id: 'settings.workspace.deleteItem4', defaultMessage: 'All calendar events' })}</li>
              <li>{intl.formatMessage({ id: 'settings.workspace.deleteItem5', defaultMessage: 'All member access' })}</li>
            </ul>
            <div className="pt-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                {intl.formatMessage(
                  { id: 'settings.workspace.deleteConfirmLabel', defaultMessage: 'Type "{workspaceName}" to confirm:' },
                  { workspaceName: currentWorkspace?.name || '' }
                )}
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={currentWorkspace?.name}
                className="mt-2"
              />
            </div>
          </div>
        }
        confirmText={intl.formatMessage({ id: 'settings.workspace.deleteConfirmButton', defaultMessage: 'Delete Workspace' })}
        cancelText={intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
};

export default WorkspaceSettings;
