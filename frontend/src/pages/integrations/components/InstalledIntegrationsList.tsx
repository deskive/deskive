/**
 * Installed Integrations List Component
 * Displays and manages installed integrations
 */

import { useState } from 'react';
import { 
  Settings, 
  Power, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trash2, 
  RefreshCw,
  MoreHorizontal,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  type IntegrationCategory,
  integrationsService
} from '@/lib/api/integrations-api';

interface InstalledIntegrationsListProps {
  integrations: InstalledIntegration[];
  onIntegrationClick: (integration: InstalledIntegration) => void;
  onRefresh: () => void;
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-500/10 text-green-700 dark:text-green-300',
  INACTIVE: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
  ERROR: 'bg-red-500/10 text-red-700 dark:text-red-300',
  PENDING: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
};

const STATUS_ICONS = {
  ACTIVE: <CheckCircle className="w-4 h-4" />,
  INACTIVE: <Power className="w-4 h-4" />,
  ERROR: <AlertCircle className="w-4 h-4" />,
  PENDING: <Clock className="w-4 h-4" />,
};

export function InstalledIntegrationsList({ 
  integrations, 
  onIntegrationClick, 
  onRefresh 
}: InstalledIntegrationsListProps) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uninstallDialog, setUninstallDialog] = useState<{ 
    open: boolean; 
    integration: InstalledIntegration | null; 
  }>({ open: false, integration: null });

  const getCategoryLabel = (category: IntegrationCategory): string => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatLastSync = (dateString: string): string => {
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

  const handleToggleStatus = async (integration: InstalledIntegration) => {
    if (!currentWorkspace?.id) return;

    const newStatus = integration.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoading(integration.id);

    try {
      await integrationsService.updateIntegration(integration.id, {
        configuration: {
          ...integration.configuration,
        },
      } as any);

      toast({
        title: "Status updated",
        description: `Integration ${newStatus.toLowerCase()} successfully.`,
      });
      
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update integration status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async (integration: InstalledIntegration) => {
    if (!currentWorkspace?.id) return;

    setActionLoading(integration.id);

    try {
      const result = await integrationsService.syncIntegration(currentWorkspace.id, integration.id);
      
      toast({
        title: result.success ? "Sync completed" : "Sync failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.success) {
        onRefresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync integration",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async () => {
    if (!currentWorkspace?.id || !uninstallDialog.integration) return;

    setActionLoading(uninstallDialog.integration.id);

    try {
      await integrationsService.uninstallIntegration(currentWorkspace.id, uninstallDialog.integration.id);
      
      toast({
        title: "Integration uninstalled",
        description: `${uninstallDialog.integration.name} has been removed from your workspace.`,
      });
      
      onRefresh();
      setUninstallDialog({ open: false, integration: null });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to uninstall integration",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatUsageStats = (integration: InstalledIntegration) => {
    const usage = integration.usage;
    const successRate = usage?.totalRequests && usage.totalRequests > 0
      ? ((usage.successfulRequests / usage.totalRequests) * 100).toFixed(1)
      : '0';

    return {
      successRate: `${successRate}%`,
      totalRequests: usage?.totalRequests?.toLocaleString() ?? '0',
      avgResponseTime: `${usage?.averageResponseTime ?? 0}ms`,
      dataTransferred: formatBytes(usage?.dataTransferred ?? 0),
    };
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="space-y-4">
        {integrations.map((integration) => {
          const isLoading = actionLoading === integration.id;
          const stats = formatUsageStats(integration);
          
          return (
            <Card 
              key={integration.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onIntegrationClick(integration)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <Avatar className="w-16 h-16 flex-shrink-0">
                    <AvatarImage src={integration.logo} alt={integration.name} />
                    <AvatarFallback className="text-lg">
                      {integration.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold truncate">
                            {integration.name}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={STATUS_COLORS[integration.status]}
                          >
                            {STATUS_ICONS[integration.status]}
                            <span className="ml-1">{integration.status}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-3">
                          by {integration.provider}{integration.category ? ` • ${getCategoryLabel(integration.category)}` : ''}
                        </p>

                        {/* Usage Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Success Rate</p>
                            <p className="text-sm font-medium">{stats.successRate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Requests</p>
                            <p className="text-sm font-medium">{stats.totalRequests}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Response</p>
                            <p className="text-sm font-medium">{stats.avgResponseTime}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Data Transferred</p>
                            <p className="text-sm font-medium">{stats.dataTransferred}</p>
                          </div>
                        </div>

                        {/* Last Sync */}
                        {integration.lastSync && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Activity className="w-4 h-4" />
                            <span>Last sync: {formatLastSync(integration.lastSync)}</span>
                            {integration.nextSync && (
                              <span>• Next: {formatLastSync(integration.nextSync)}</span>
                            )}
                          </div>
                        )}

                        {/* Errors */}
                        {integration.errors && integration.errors.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {integration.errors.length} error{integration.errors.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(integration);
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <LoadingSpinner className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onIntegrationClick(integration)}>
                              <Settings className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(integration)}
                              disabled={isLoading}
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {integration.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setUninstallDialog({ open: true, integration })}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Uninstall
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog 
        open={uninstallDialog.open} 
        onOpenChange={(open) => setUninstallDialog({ open, integration: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uninstall {uninstallDialog.integration?.name}? 
              This will remove all configuration and stop data synchronization. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <LoadingSpinner className="w-4 h-4 mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}