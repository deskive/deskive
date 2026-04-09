/**
 * ActionEditor Component
 * Modal for creating and editing bot actions
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { BotAction, BotTrigger } from '@/lib/api/bots-api'
import {
  ActionType,
  FailurePolicy,
  useCreateAction,
  useUpdateAction,
} from '@/lib/api/bots-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/components/ui/use-toast'
import {
  MessageSquare,
  Sparkles,
  ClipboardList,
  Calendar,
  Webhook,
  Mail,
  AlertCircle,
  Bot,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const actionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  actionType: z.nativeEnum(ActionType),
  actionConfig: z.any(),
  triggerId: z.string().optional().nullable(),
  isActive: z.boolean(),
  failurePolicy: z.nativeEnum(FailurePolicy),
})

type ActionFormData = z.infer<typeof actionSchema>

interface ActionEditorProps {
  workspaceId: string
  botId: string
  action: BotAction | null
  triggers: BotTrigger[]
  isNew: boolean
  onClose: () => void
}

export function ActionEditor({
  workspaceId,
  botId,
  action,
  triggers,
  isNew,
  onClose,
}: ActionEditorProps) {
  const { toast } = useToast()
  const createAction = useCreateAction()
  const updateAction = useUpdateAction()

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      name: '',
      actionType: ActionType.SEND_MESSAGE,
      actionConfig: {},
      triggerId: null,
      isActive: true,
      failurePolicy: FailurePolicy.CONTINUE,
    },
  })

  const watchActionType = form.watch('actionType')

  // Load action data when editing
  useEffect(() => {
    if (action) {
      form.reset({
        name: action.name,
        actionType: action.actionType,
        actionConfig: action.actionConfig,
        triggerId: action.triggerId || null,
        isActive: action.isActive,
        failurePolicy: action.failurePolicy,
      })
    }
  }, [action, form])

  const handleSave = async (data: ActionFormData) => {
    const payload = {
      ...data,
      triggerId: data.triggerId || undefined,
    }

    try {
      if (isNew) {
        await createAction.mutateAsync({
          workspaceId,
          botId,
          data: payload,
        })
        toast({
          title: 'Action created',
          description: 'The action has been created successfully',
        })
      } else if (action) {
        await updateAction.mutateAsync({
          workspaceId,
          botId,
          actionId: action.id,
          data: payload,
        })
        toast({
          title: 'Action updated',
          description: 'The action has been updated successfully',
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: isNew ? 'Failed to create action' : 'Failed to update action',
        variant: 'destructive',
      })
    }
  }

  const getActionTypeIcon = (type: ActionType) => {
    switch (type) {
      case ActionType.SEND_MESSAGE:
        return <MessageSquare className="h-4 w-4" />
      case ActionType.SEND_AI_MESSAGE:
        return <Sparkles className="h-4 w-4" />
      case ActionType.AI_AUTOPILOT:
        return <Bot className="h-4 w-4" />
      case ActionType.CREATE_TASK:
        return <ClipboardList className="h-4 w-4" />
      case ActionType.CREATE_EVENT:
        return <Calendar className="h-4 w-4" />
      case ActionType.CALL_WEBHOOK:
        return <Webhook className="h-4 w-4" />
      case ActionType.SEND_EMAIL:
        return <Mail className="h-4 w-4" />
      default:
        return null
    }
  }

  const renderActionConfig = () => {
    switch (watchActionType) {
      case ActionType.SEND_MESSAGE:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="actionConfig.content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hello {{user.name}}! Thanks for your message."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Supports variables: {'{{user.name}}'}, {'{{message}}'}, {'{{channel}}'}, etc.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.replyToTrigger"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Reply to Trigger Message</FormLabel>
                    <FormDescription>
                      Send as a reply to the triggering message
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.mentionUser"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Mention User</FormLabel>
                    <FormDescription>
                      @mention the user who triggered the bot
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.SEND_AI_MESSAGE:
        return (
          <div className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                This action uses AI to generate responses based on the message context.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="actionConfig.systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful assistant for our team..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Instructions for the AI on how to respond
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={50}
                      max={2000}
                      placeholder="500"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 500)}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum length of AI response (50-2000)
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.includeContext"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Include Message Context</FormLabel>
                    <FormDescription>
                      Include recent messages for context
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.AI_AUTOPILOT:
        return (
          <div className="space-y-4">
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertDescription>
                AI AutoPilot provides full AI capabilities including creating tasks, scheduling events, and more. The bot can understand natural language commands and perform actions automatically.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="actionConfig.systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful team assistant. Be concise and friendly."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Custom instructions to guide the AI's behavior and personality
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.includeContext"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Include Message Context</FormLabel>
                    <FormDescription>
                      Include previous messages for better understanding
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.contextMessageCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Message Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      placeholder="10"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of previous messages to include (0-50)
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.replyToTrigger"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Reply to Trigger Message</FormLabel>
                    <FormDescription>
                      Send response as a reply thread
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.allowActions"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Allow AutoPilot Actions</FormLabel>
                    <FormDescription>
                      Let AI create tasks, events, and perform other actions
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.CREATE_TASK:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="actionConfig.titleTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Task from {{user.name}}: {{message}}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Supports variables: {'{{user.name}}'}, {'{{message}}'}, etc.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.descriptionTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Created from chat message by {{user.name}}"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'medium'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.assignToTriggeringUser"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Assign to Triggering User</FormLabel>
                    <FormDescription>
                      Auto-assign task to the user who sent the message
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.dueDateOffsetDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (days from now)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="7"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Set due date X days from creation (leave empty for no due date)
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.CREATE_EVENT:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="actionConfig.titleTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Meeting with {{user.name}}"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.descriptionTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Created from chat by {{user.name}}"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      max={480}
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.startTimeOffsetHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (hours from now)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={720}
                      placeholder="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.addTriggeringUserAsAttendee"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Add User as Attendee</FormLabel>
                    <FormDescription>
                      Include the triggering user as an attendee
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.CALL_WEBHOOK:
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Webhooks to internal addresses (localhost, 127.0.0.1) are blocked for security.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="actionConfig.url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.example.com/webhook"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'POST'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.bodyTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Body (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={'{\n  "user": "{{user.name}}",\n  "message": "{{message}}"\n}'}
                      className="min-h-[100px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON body with variable support
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1000}
                      max={30000}
                      placeholder="10000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 10000)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      case ActionType.SEND_EMAIL:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="actionConfig.toTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="{{user.email}}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Email address or variable
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.subjectTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Notification from {{bot.name}}"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionConfig.bodyTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hello {{user.name}},\n\nYou have a new message..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Action' : 'Edit Action'}</DialogTitle>
          <DialogDescription>
            Configure what your bot does when triggered
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Send welcome message" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ActionType.SEND_MESSAGE}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Send Message
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.SEND_AI_MESSAGE}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          AI Response
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.AI_AUTOPILOT}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          AI AutoPilot
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.CREATE_TASK}>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Create Task
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.CREATE_EVENT}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Create Event
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.CALL_WEBHOOK}>
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4" />
                          Call Webhook
                        </div>
                      </SelectItem>
                      <SelectItem value={ActionType.SEND_EMAIL}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Send Email
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {triggers.length > 0 && (
              <FormField
                control={form.control}
                name="triggerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Trigger (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '__all__' ? null : value)}
                      value={field.value || '__all__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All triggers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__all__">All triggers</SelectItem>
                        {triggers.map((trigger) => (
                          <SelectItem key={trigger.id} value={trigger.id}>
                            {trigger.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Run only when specific trigger fires, or leave empty for all triggers
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Configuration</h4>
              {renderActionConfig()}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Execution Options</h4>

              <FormField
                control={form.control}
                name="failurePolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>On Failure</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={FailurePolicy.CONTINUE}>Continue to next action</SelectItem>
                        <SelectItem value={FailurePolicy.STOP}>Stop execution</SelectItem>
                        <SelectItem value={FailurePolicy.RETRY}>Retry (up to 3 times)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What to do if this action fails
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable or disable this action
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAction.isPending || updateAction.isPending}
              >
                {createAction.isPending || updateAction.isPending
                  ? 'Saving...'
                  : isNew
                  ? 'Create Action'
                  : 'Update Action'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
