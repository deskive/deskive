/**
 * BotsView Component
 * Main view for listing and managing bots
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import type { Bot, PrebuiltBot } from '@/lib/api/bots-api'
import {
  useBots,
  useDeleteBot,
  useUpdateBot,
  usePrebuiltBots,
  useActivatePrebuiltBot,
  useDeactivatePrebuiltBot,
  BotStatus,
  BotType
} from '@/lib/api/bots-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Bot as BotIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Pause,
  Settings2,
  History,
  Zap,
  Webhook,
  Sparkles,
  AlertCircle,
  Calendar,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function BotsView() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const intl = useIntl()

  const [botToDelete, setBotToDelete] = useState<Bot | null>(null)
  const [activeTab, setActiveTab] = useState<'custom' | 'prebuilt'>('custom')

  const { data: bots, isLoading, error } = useBots(workspaceId!)
  const { data: prebuiltBots, isLoading: prebuiltLoading } = usePrebuiltBots(workspaceId!)
  const deleteBot = useDeleteBot()
  const updateBot = useUpdateBot()
  const activatePrebuiltBot = useActivatePrebuiltBot()
  const deactivatePrebuiltBot = useDeactivatePrebuiltBot()

  const handleCreateBot = () => {
    navigate(`/workspaces/${workspaceId}/more/bots/create`)
  }

  const handleEditBot = (botId: string) => {
    navigate(`/workspaces/${workspaceId}/more/bots/${botId}`)
  }

  const handleViewLogs = (botId: string) => {
    navigate(`/workspaces/${workspaceId}/more/bots/${botId}/logs`)
  }

  const handleToggleStatus = async (bot: Bot) => {
    const newStatus = bot.status === BotStatus.ACTIVE ? BotStatus.INACTIVE : BotStatus.ACTIVE
    try {
      await updateBot.mutateAsync({
        workspaceId: workspaceId!,
        botId: bot.id,
        data: { status: newStatus },
      })
      toast({
        title: newStatus === BotStatus.ACTIVE
          ? intl.formatMessage({ id: 'bots.toast.activated', defaultMessage: 'Bot activated' })
          : intl.formatMessage({ id: 'bots.toast.deactivated', defaultMessage: 'Bot deactivated' }),
        description: `${bot.name} ${intl.formatMessage({
          id: newStatus === BotStatus.ACTIVE ? 'bots.toast.isNowActive' : 'bots.toast.isNowInactive',
          defaultMessage: newStatus === BotStatus.ACTIVE ? 'is now active' : 'is now inactive'
        })}`,
      })
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'bots.toast.failedUpdateStatus', defaultMessage: 'Failed to update bot status' }),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteBot = async () => {
    if (!botToDelete) return
    try {
      await deleteBot.mutateAsync({
        workspaceId: workspaceId!,
        botId: botToDelete.id,
      })
      toast({
        title: intl.formatMessage({ id: 'bots.toast.deleted', defaultMessage: 'Bot deleted' }),
        description: `${botToDelete.name} ${intl.formatMessage({ id: 'bots.toast.hasBeenDeleted', defaultMessage: 'has been deleted' })}`,
      })
      setBotToDelete(null)
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'bots.toast.failedDelete', defaultMessage: 'Failed to delete bot' }),
        variant: 'destructive',
      })
    }
  }

  const handleActivatePrebuiltBot = async (prebuiltBot: PrebuiltBot) => {
    try {
      await activatePrebuiltBot.mutateAsync({
        workspaceId: workspaceId!,
        data: {
          prebuiltBotId: prebuiltBot.id,
        },
      })
      toast({
        title: intl.formatMessage({ id: 'bots.toast.activated', defaultMessage: 'Bot activated' }),
        description: `${prebuiltBot.displayName} ${intl.formatMessage({ id: 'bots.toast.isNowActiveAndReady', defaultMessage: 'is now active and ready to use' })}`,
      })
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'bots.toast.failedActivate', defaultMessage: 'Failed to activate bot' }),
        variant: 'destructive',
      })
    }
  }

  const handleDeactivatePrebuiltBot = async (prebuiltBot: PrebuiltBot) => {
    if (!prebuiltBot.userBotId) return
    try {
      await deactivatePrebuiltBot.mutateAsync({
        workspaceId: workspaceId!,
        botId: prebuiltBot.userBotId,
      })
      toast({
        title: intl.formatMessage({ id: 'bots.toast.deactivated', defaultMessage: 'Bot deactivated' }),
        description: `${prebuiltBot.displayName} ${intl.formatMessage({ id: 'bots.toast.hasBeenDeactivated', defaultMessage: 'has been deactivated' })}`,
      })
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'bots.toast.failedDeactivate', defaultMessage: 'Failed to deactivate bot' }),
        variant: 'destructive',
      })
    }
  }

  const getBotTypeIcon = (type: BotType) => {
    switch (type) {
      case BotType.AI_ASSISTANT:
        return <Sparkles className="h-4 w-4" />
      case BotType.WEBHOOK:
        return <Webhook className="h-4 w-4" />
      case BotType.PREBUILT:
        return <Calendar className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getBotTypeLabel = (type: BotType) => {
    switch (type) {
      case BotType.AI_ASSISTANT:
        return intl.formatMessage({ id: 'bots.type.aiAssistant', defaultMessage: 'AI Assistant' })
      case BotType.WEBHOOK:
        return intl.formatMessage({ id: 'bots.type.webhook', defaultMessage: 'Webhook' })
      case BotType.PREBUILT:
        return intl.formatMessage({ id: 'bots.type.prebuilt', defaultMessage: 'Prebuilt' })
      default:
        return intl.formatMessage({ id: 'bots.type.custom', defaultMessage: 'Custom' })
    }
  }

  const getStatusBadgeVariant = (status: BotStatus) => {
    switch (status) {
      case BotStatus.ACTIVE:
        return 'default'
      case BotStatus.INACTIVE:
        return 'secondary'
      case BotStatus.DRAFT:
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">{intl.formatMessage({ id: 'bots.loading', defaultMessage: 'Loading bots...' })}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">{intl.formatMessage({ id: 'bots.error.loading', defaultMessage: 'Error loading bots' })}</h3>
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'bots.error.tryAgain', defaultMessage: 'Please try again later' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BotIcon className="h-6 w-6" />
              {intl.formatMessage({ id: 'bots.title', defaultMessage: 'Bot Builder' })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'bots.description', defaultMessage: 'Create custom bots or activate prebuilt bots for your workspace' })}
            </p>
          </div>
          {activeTab === 'custom' && (
            <Button onClick={handleCreateBot}>
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'bots.button.create', defaultMessage: 'Create Bot' })}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'custom' | 'prebuilt')}>
          <TabsList className="mb-6">
            <TabsTrigger value="custom">{intl.formatMessage({ id: 'bots.tabs.custom', defaultMessage: 'Custom Bots' })}</TabsTrigger>
            <TabsTrigger value="prebuilt">{intl.formatMessage({ id: 'bots.tabs.prebuilt', defaultMessage: 'Prebuilt Bots' })}</TabsTrigger>
          </TabsList>

          {/* Custom Bots Tab */}
          <TabsContent value="custom">
            {!bots || bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <BotIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'bots.empty.title', defaultMessage: 'No custom bots yet' })}</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  {intl.formatMessage({ id: 'bots.empty.description', defaultMessage: 'Create your first bot to automate responses, tasks, and workflows in your channels and conversations.' })}
                </p>
                <Button onClick={handleCreateBot}>
                  <Plus className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'bots.button.createFirst', defaultMessage: 'Create Your First Bot' })}
                </Button>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <Card
                key={bot.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  bot.status === BotStatus.INACTIVE && "opacity-60"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getBotTypeIcon(bot.botType)}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {bot.displayName || bot.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusBadgeVariant(bot.status)} className="text-xs">
                            {bot.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getBotTypeLabel(bot.botType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditBot(bot.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewLogs(bot.id)}>
                          <History className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'bots.action.viewLogs', defaultMessage: 'View Logs' })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(bot)}
                          disabled={bot.status === BotStatus.DRAFT}
                        >
                          {bot.status === BotStatus.ACTIVE ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'bots.action.deactivate', defaultMessage: 'Deactivate' })}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'bots.action.activate', defaultMessage: 'Activate' })}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setBotToDelete(bot)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {bot.description || intl.formatMessage({ id: 'bots.noDescription', defaultMessage: 'No description provided' })}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{bot.triggerCount || 0} {intl.formatMessage({ id: 'bots.triggers', defaultMessage: 'triggers' })}</span>
                      <span>{bot.actionCount || 0} {intl.formatMessage({ id: 'bots.actions', defaultMessage: 'actions' })}</span>
                    </div>
                    <Switch
                      checked={bot.status === BotStatus.ACTIVE}
                      onCheckedChange={() => handleToggleStatus(bot)}
                      disabled={bot.status === BotStatus.DRAFT}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            )}
          </TabsContent>

          {/* Prebuilt Bots Tab */}
          <TabsContent value="prebuilt">
            {prebuiltLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                  <p className="mt-4 text-sm text-muted-foreground">{intl.formatMessage({ id: 'bots.prebuilt.loading', defaultMessage: 'Loading prebuilt bots...' })}</p>
                </div>
              </div>
            ) : !prebuiltBots || prebuiltBots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Sparkles className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'bots.prebuilt.empty.title', defaultMessage: 'No prebuilt bots available' })}</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  {intl.formatMessage({ id: 'bots.prebuilt.empty.description', defaultMessage: 'Check back later for ready-to-use bots that you can activate instantly.' })}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prebuiltBots.map((prebuiltBot) => (
                  <Card key={prebuiltBot.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {prebuiltBot.category === 'productivity' ? (
                              <Calendar className="h-5 w-5" />
                            ) : (
                              <Sparkles className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {prebuiltBot.displayName}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {prebuiltBot.category}
                              </Badge>
                              {prebuiltBot.isActivated && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  {intl.formatMessage({ id: 'bots.prebuilt.activated', defaultMessage: 'Activated' })}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2 min-h-[40px] mb-4">
                        {prebuiltBot.description}
                      </CardDescription>

                      {/* Features */}
                      {prebuiltBot.features && prebuiltBot.features.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{intl.formatMessage({ id: 'bots.prebuilt.features', defaultMessage: 'Features:' })}</p>
                          <ul className="text-xs space-y-1">
                            {prebuiltBot.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <Check className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                            {prebuiltBot.features.length > 3 && (
                              <li className="text-muted-foreground">
                                +{prebuiltBot.features.length - 3} {intl.formatMessage({ id: 'bots.prebuilt.more', defaultMessage: 'more' })}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="flex items-center justify-end pt-4 border-t">
                        {prebuiltBot.isActivated ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivatePrebuiltBot(prebuiltBot)}
                            disabled={deactivatePrebuiltBot.isPending}
                          >
                            {intl.formatMessage({ id: 'bots.action.deactivate', defaultMessage: 'Deactivate' })}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleActivatePrebuiltBot(prebuiltBot)}
                            disabled={activatePrebuiltBot.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {intl.formatMessage({ id: 'bots.action.activate', defaultMessage: 'Activate' })}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!botToDelete} onOpenChange={() => setBotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'bots.delete.title', defaultMessage: 'Delete Bot' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({
                id: 'bots.delete.description',
                defaultMessage: 'Are you sure you want to delete "{name}"? This action cannot be undone. All triggers, actions, and execution logs will be permanently deleted.'
              }, { name: botToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {intl.formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
