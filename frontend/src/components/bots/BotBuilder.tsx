/**
 * BotBuilder Component
 * Full bot editor with triggers and actions configuration
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useIntl } from 'react-intl'
import type { BotTrigger, BotAction } from '@/lib/api/bots-api'
import {
  useBot,
  useCreateBot,
  useUpdateBot,
  useBotTriggers,
  useBotActions,
  useDeleteTrigger,
  useDeleteAction,
  BotStatus,
  BotType,
  TriggerType,
  ActionType,
} from '@/lib/api/bots-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Zap,
  Play,
  Settings2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Bot as BotIcon,
  Webhook,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TriggerEditor } from './TriggerEditor'
import { ActionEditor } from './ActionEditor'
import { InstallBotModal } from './InstallBotModal'

const createBotSchema = (intl: any) => z.object({
  name: z.string().min(1, intl.formatMessage({ id: 'bots.validation.nameRequired' })).max(50, intl.formatMessage({ id: 'bots.validation.nameMaxLength' })),
  displayName: z.string().max(100, intl.formatMessage({ id: 'bots.validation.displayNameMaxLength' })).optional(),
  description: z.string().max(500, intl.formatMessage({ id: 'bots.validation.descriptionMaxLength' })).optional(),
  botType: z.nativeEnum(BotType),
  status: z.nativeEnum(BotStatus),
  settings: z.object({
    rateLimit: z.number().min(1).max(100).optional(),
    responseDelayMs: z.number().min(0).max(10000).optional(),
    maxRecursionDepth: z.number().min(1).max(5).optional(),
  }).optional(),
})

export function BotBuilder() {
  const { workspaceId, botId } = useParams<{ workspaceId: string; botId?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const intl = useIntl()
  const isEditing = !!botId

  const botSchema = createBotSchema(intl)
  type BotFormData = z.infer<typeof botSchema>

  const [activeTab, setActiveTab] = useState('general')
  const [triggerToDelete, setTriggerToDelete] = useState<BotTrigger | null>(null)
  const [actionToDelete, setActionToDelete] = useState<BotAction | null>(null)
  const [editingTrigger, setEditingTrigger] = useState<BotTrigger | null>(null)
  const [editingAction, setEditingAction] = useState<BotAction | null>(null)
  const [isNewTrigger, setIsNewTrigger] = useState(false)
  const [isNewAction, setIsNewAction] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)

  // Queries
  const { data: bot, isLoading: isBotLoading } = useBot(workspaceId!, botId!, {
    enabled: isEditing,
  })
  const { data: triggers, isLoading: isTriggersLoading } = useBotTriggers(workspaceId!, botId!, {
    enabled: isEditing,
  })
  const { data: actions, isLoading: isActionsLoading } = useBotActions(workspaceId!, botId!, {
    enabled: isEditing,
  })

  // Mutations
  const createBot = useCreateBot()
  const updateBot = useUpdateBot()
  const deleteTrigger = useDeleteTrigger()
  const deleteAction = useDeleteAction()

  const form = useForm<BotFormData>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      botType: BotType.CUSTOM,
      status: BotStatus.DRAFT,
      settings: {
        rateLimit: 60,
        responseDelayMs: 0,
        maxRecursionDepth: 3,
      },
    },
  })

  // Load bot data when editing
  useEffect(() => {
    if (bot) {
      form.reset({
        name: bot.name,
        displayName: bot.displayName || '',
        description: bot.description || '',
        botType: bot.botType,
        status: bot.status,
        settings: bot.settings || {
          rateLimit: 60,
          responseDelayMs: 0,
          maxRecursionDepth: 3,
        },
      })
    }
  }, [bot, form])

  const handleSave = async (data: BotFormData) => {
    try {
      if (isEditing) {
        await updateBot.mutateAsync({
          workspaceId: workspaceId!,
          botId: botId!,
          data,
        })
        toast({
          title: intl.formatMessage({ id: 'bots.builder.botUpdated' }),
          description: intl.formatMessage({ id: 'bots.builder.botUpdatedDesc' }),
        })
      } else {
        const newBot = await createBot.mutateAsync({
          workspaceId: workspaceId!,
          data,
        })
        toast({
          title: intl.formatMessage({ id: 'bots.builder.botCreated' }),
          description: intl.formatMessage({ id: 'bots.builder.botCreatedDesc' }),
        })
        // Navigate to edit mode
        navigate(`/workspaces/${workspaceId}/more/bots/${newBot.id}`, { replace: true })
      }
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error' }),
        description: isEditing ? intl.formatMessage({ id: 'bots.builder.updateFailed' }) : intl.formatMessage({ id: 'bots.builder.createFailed' }),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTrigger = async () => {
    if (!triggerToDelete) return
    try {
      await deleteTrigger.mutateAsync({
        workspaceId: workspaceId!,
        botId: botId!,
        triggerId: triggerToDelete.id,
      })
      toast({
        title: intl.formatMessage({ id: 'bots.builder.triggerDeleted' }),
        description: intl.formatMessage({ id: 'bots.builder.triggerDeletedDesc' }),
      })
      setTriggerToDelete(null)
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error' }),
        description: intl.formatMessage({ id: 'bots.builder.triggerDeleteFailed' }),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAction = async () => {
    if (!actionToDelete) return
    try {
      await deleteAction.mutateAsync({
        workspaceId: workspaceId!,
        botId: botId!,
        actionId: actionToDelete.id,
      })
      toast({
        title: intl.formatMessage({ id: 'bots.builder.actionDeleted' }),
        description: intl.formatMessage({ id: 'bots.builder.actionDeletedDesc' }),
      })
      setActionToDelete(null)
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error' }),
        description: intl.formatMessage({ id: 'bots.builder.actionDeleteFailed' }),
        variant: 'destructive',
      })
    }
  }

  const getTriggerTypeLabel = (type: TriggerType) => {
    const labels: Record<TriggerType, string> = {
      [TriggerType.KEYWORD]: intl.formatMessage({ id: 'bots.triggers.keyword' }),
      [TriggerType.REGEX]: intl.formatMessage({ id: 'bots.triggers.regexPattern' }),
      [TriggerType.SCHEDULE]: intl.formatMessage({ id: 'bots.triggers.schedule' }),
      [TriggerType.WEBHOOK]: intl.formatMessage({ id: 'bots.triggers.webhook' }),
      [TriggerType.MENTION]: intl.formatMessage({ id: 'bots.triggers.mention' }),
      [TriggerType.ANY_MESSAGE]: intl.formatMessage({ id: 'bots.triggers.anyMessage' }),
    }
    return labels[type] || type
  }

  const getActionTypeLabel = (type: ActionType) => {
    const labels: Record<ActionType, string> = {
      [ActionType.SEND_MESSAGE]: intl.formatMessage({ id: 'bots.actions.sendMessage' }),
      [ActionType.SEND_AI_MESSAGE]: intl.formatMessage({ id: 'bots.actions.aiResponse' }),
      [ActionType.AI_AUTOPILOT]: intl.formatMessage({ id: 'bots.actions.aiAutopilot' }),
      [ActionType.CREATE_TASK]: intl.formatMessage({ id: 'bots.actions.createTask' }),
      [ActionType.CREATE_EVENT]: intl.formatMessage({ id: 'bots.actions.createEvent' }),
      [ActionType.CALL_WEBHOOK]: intl.formatMessage({ id: 'bots.actions.callWebhook' }),
      [ActionType.SEND_EMAIL]: intl.formatMessage({ id: 'bots.actions.sendEmail' }),
    }
    return labels[type] || type
  }

  if (isEditing && isBotLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">{intl.formatMessage({ id: 'bots.builder.loadingBot' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/workspaces/${workspaceId}/more/bots`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'common.back' })}
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {isEditing ? intl.formatMessage({ id: 'bots.builder.editBot' }, { name: bot?.displayName || bot?.name }) : intl.formatMessage({ id: 'bots.builder.createNewBot' })}
              </h1>
              {isEditing && bot && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={bot.status === BotStatus.ACTIVE ? 'default' : 'secondary'}>
                    {bot.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button variant="outline" onClick={() => setInstallModalOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'bots.builder.install' })}
              </Button>
            )}
            <Button
              onClick={form.handleSubmit(handleSave)}
              disabled={createBot.isPending || updateBot.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createBot.isPending || updateBot.isPending ? intl.formatMessage({ id: 'bots.builder.saving' }) : intl.formatMessage({ id: 'bots.builder.save' })}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general">{intl.formatMessage({ id: 'bots.tabs.general' })}</TabsTrigger>
              <TabsTrigger value="triggers" disabled={!isEditing}>
                {intl.formatMessage({ id: 'bots.tabs.triggers' })} {isEditing && triggers && `(${triggers.length})`}
              </TabsTrigger>
              <TabsTrigger value="actions" disabled={!isEditing}>
                {intl.formatMessage({ id: 'bots.tabs.actions' })} {isEditing && actions && `(${actions.length})`}
              </TabsTrigger>
              <TabsTrigger value="settings">{intl.formatMessage({ id: 'bots.tabs.settings' })}</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>{intl.formatMessage({ id: 'bots.builder.botInformation' })}</CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: 'bots.builder.botInformationDesc' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.botName' })} *</FormLabel>
                            <FormControl>
                              <Input placeholder={intl.formatMessage({ id: 'bots.form.botNamePlaceholder' })} {...field} />
                            </FormControl>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.botNameDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.displayName' })}</FormLabel>
                            <FormControl>
                              <Input placeholder={intl.formatMessage({ id: 'bots.form.displayNamePlaceholder' })} {...field} />
                            </FormControl>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.displayNameDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.description' })}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={intl.formatMessage({ id: 'bots.form.descriptionPlaceholder' })}
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="botType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.botType' })}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={intl.formatMessage({ id: 'bots.form.selectBotType' })} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={BotType.CUSTOM}>
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    {intl.formatMessage({ id: 'bots.type.customBot' })}
                                  </div>
                                </SelectItem>
                                <SelectItem value={BotType.AI_ASSISTANT}>
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {intl.formatMessage({ id: 'bots.type.aiAssistant' })}
                                  </div>
                                </SelectItem>
                                <SelectItem value={BotType.WEBHOOK}>
                                  <div className="flex items-center gap-2">
                                    <Webhook className="h-4 w-4" />
                                    {intl.formatMessage({ id: 'bots.type.webhookBot' })}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.botTypeDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.status' })}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={intl.formatMessage({ id: 'bots.form.selectStatus' })} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={BotStatus.DRAFT}>{intl.formatMessage({ id: 'bots.form.statusDraft' })}</SelectItem>
                                <SelectItem value={BotStatus.ACTIVE}>{intl.formatMessage({ id: 'bots.form.statusActive' })}</SelectItem>
                                <SelectItem value={BotStatus.INACTIVE}>{intl.formatMessage({ id: 'bots.form.statusInactive' })}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.statusDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Triggers Tab */}
            <TabsContent value="triggers">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{intl.formatMessage({ id: 'bots.tabs.triggers' })}</CardTitle>
                      <CardDescription>
                        {intl.formatMessage({ id: 'bots.builder.triggersDesc' })}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setIsNewTrigger(true)
                        setEditingTrigger(null)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'bots.builder.addTrigger' })}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isTriggersLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {intl.formatMessage({ id: 'bots.builder.loadingTriggers' })}
                    </div>
                  ) : !triggers || triggers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{intl.formatMessage({ id: 'bots.builder.noTriggers' })}</p>
                      <p className="text-sm">{intl.formatMessage({ id: 'bots.builder.noTriggersDesc' })}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {triggers.map((trigger) => (
                        <div
                          key={trigger.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border",
                            !trigger.isActive && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Zap className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">{trigger.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {getTriggerTypeLabel(trigger.triggerType)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                              {trigger.isActive ? intl.formatMessage({ id: 'common.active' }) : intl.formatMessage({ id: 'common.inactive' })}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsNewTrigger(false)
                                setEditingTrigger(trigger)
                              }}
                            >
                              {intl.formatMessage({ id: 'common.edit' })}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setTriggerToDelete(trigger)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{intl.formatMessage({ id: 'bots.tabs.actions' })}</CardTitle>
                      <CardDescription>
                        {intl.formatMessage({ id: 'bots.builder.actionsDesc' })}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setIsNewAction(true)
                        setEditingAction(null)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'bots.builder.addAction' })}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isActionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {intl.formatMessage({ id: 'bots.builder.loadingActions' })}
                    </div>
                  ) : !actions || actions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{intl.formatMessage({ id: 'bots.builder.noActions' })}</p>
                      <p className="text-sm">{intl.formatMessage({ id: 'bots.builder.noActionsDesc' })}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((action, index) => (
                        <div
                          key={action.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border",
                            !action.isActive && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                              <Play className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <div className="font-medium">{action.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {getActionTypeLabel(action.actionType)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={action.isActive ? 'default' : 'secondary'}>
                              {action.isActive ? intl.formatMessage({ id: 'common.active' }) : intl.formatMessage({ id: 'common.inactive' })}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsNewAction(false)
                                setEditingAction(action)
                              }}
                            >
                              {intl.formatMessage({ id: 'common.edit' })}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setActionToDelete(action)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>{intl.formatMessage({ id: 'bots.builder.botSettings' })}</CardTitle>
                  <CardDescription>
                    {intl.formatMessage({ id: 'bots.builder.botSettingsDesc' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-6">
                      <FormField
                        control={form.control}
                        name="settings.rateLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.rateLimit' })}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                              />
                            </FormControl>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.rateLimitDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="settings.responseDelayMs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.responseDelay' })}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={10000}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.responseDelayDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="settings.maxRecursionDepth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'bots.form.maxRecursionDepth' })}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={5}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                              />
                            </FormControl>
                            <FormDescription>
                              {intl.formatMessage({ id: 'bots.form.maxRecursionDepthDesc' })}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Trigger Editor Modal */}
      {(isNewTrigger || editingTrigger) && (
        <TriggerEditor
          workspaceId={workspaceId!}
          botId={botId!}
          trigger={editingTrigger}
          isNew={isNewTrigger}
          onClose={() => {
            setIsNewTrigger(false)
            setEditingTrigger(null)
          }}
        />
      )}

      {/* Action Editor Modal */}
      {(isNewAction || editingAction) && (
        <ActionEditor
          workspaceId={workspaceId!}
          botId={botId!}
          action={editingAction}
          triggers={triggers || []}
          isNew={isNewAction}
          onClose={() => {
            setIsNewAction(false)
            setEditingAction(null)
          }}
        />
      )}

      {/* Install Bot Modal */}
      {isEditing && bot && (
        <InstallBotModal
          workspaceId={workspaceId!}
          bot={bot}
          open={installModalOpen}
          onOpenChange={setInstallModalOpen}
        />
      )}

      {/* Delete Trigger Confirmation */}
      <AlertDialog open={!!triggerToDelete} onOpenChange={() => setTriggerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'bots.builder.deleteTrigger' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'bots.builder.deleteTriggerConfirm' }, { name: triggerToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrigger}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {intl.formatMessage({ id: 'common.delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Action Confirmation */}
      <AlertDialog open={!!actionToDelete} onOpenChange={() => setActionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'bots.builder.deleteAction' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'bots.builder.deleteActionConfirm' }, { name: actionToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {intl.formatMessage({ id: 'common.delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
