/**
 * TriggerEditor Component
 * Modal for creating and editing bot triggers
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { BotTrigger } from '@/lib/api/bots-api'
import {
  TriggerType,
  MatchType,
  useCreateTrigger,
  useUpdateTrigger,
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
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

const triggerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  triggerType: z.nativeEnum(TriggerType),
  triggerConfig: z.any(),
  isActive: z.boolean(),
  priority: z.number().min(0).max(100),
  cooldownSeconds: z.number().min(0).max(86400),
})

type TriggerFormData = z.infer<typeof triggerSchema>

interface TriggerEditorProps {
  workspaceId: string
  botId: string
  trigger: BotTrigger | null
  isNew: boolean
  onClose: () => void
}

export function TriggerEditor({
  workspaceId,
  botId,
  trigger,
  isNew,
  onClose,
}: TriggerEditorProps) {
  const { toast } = useToast()
  const createTrigger = useCreateTrigger()
  const updateTrigger = useUpdateTrigger()

  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')

  const form = useForm<TriggerFormData>({
    resolver: zodResolver(triggerSchema),
    defaultValues: {
      name: '',
      triggerType: TriggerType.KEYWORD,
      triggerConfig: {},
      isActive: true,
      priority: 0,
      cooldownSeconds: 0,
    },
  })

  const watchTriggerType = form.watch('triggerType')

  // Load trigger data when editing
  useEffect(() => {
    if (trigger) {
      form.reset({
        name: trigger.name,
        triggerType: trigger.triggerType,
        triggerConfig: trigger.triggerConfig,
        isActive: trigger.isActive,
        priority: trigger.priority,
        cooldownSeconds: trigger.cooldownSeconds || 0,
      })

      // Load keywords for keyword triggers
      if (trigger.triggerType === TriggerType.KEYWORD) {
        const config = trigger.triggerConfig as any
        setKeywords(config?.keywords || [])
      }
    }
  }, [trigger, form])

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword))
  }

  const handleSave = async (data: TriggerFormData) => {
    // Build trigger config based on type
    let triggerConfig: any = {}

    switch (data.triggerType) {
      case TriggerType.KEYWORD:
        triggerConfig = {
          keywords,
          matchType: form.getValues('triggerConfig.matchType') || MatchType.CONTAINS,
          caseSensitive: form.getValues('triggerConfig.caseSensitive') || false,
        }
        break
      case TriggerType.REGEX:
        triggerConfig = {
          pattern: form.getValues('triggerConfig.pattern') || '',
          flags: form.getValues('triggerConfig.flags') || '',
        }
        break
      case TriggerType.SCHEDULE:
        triggerConfig = {
          cron: form.getValues('triggerConfig.cron') || '',
          timezone: form.getValues('triggerConfig.timezone') || 'UTC',
        }
        break
      case TriggerType.WEBHOOK:
        triggerConfig = {
          endpointPath: form.getValues('triggerConfig.endpointPath') || '',
        }
        break
      case TriggerType.MENTION:
        triggerConfig = {
          requireAtMention: form.getValues('triggerConfig.requireAtMention') !== false,
        }
        break
      case TriggerType.ANY_MESSAGE:
        triggerConfig = {
          includeThreads: form.getValues('triggerConfig.includeThreads') || false,
        }
        break
    }

    const payload = {
      ...data,
      triggerConfig,
    }

    try {
      if (isNew) {
        await createTrigger.mutateAsync({
          workspaceId,
          botId,
          data: payload,
        })
        toast({
          title: 'Trigger created',
          description: 'The trigger has been created successfully',
        })
      } else if (trigger) {
        await updateTrigger.mutateAsync({
          workspaceId,
          botId,
          triggerId: trigger.id,
          data: payload,
        })
        toast({
          title: 'Trigger updated',
          description: 'The trigger has been updated successfully',
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: isNew ? 'Failed to create trigger' : 'Failed to update trigger',
        variant: 'destructive',
      })
    }
  }

  const renderTriggerConfig = () => {
    switch (watchTriggerType) {
      case TriggerType.KEYWORD:
        return (
          <div className="space-y-4">
            <div>
              <Label>Keywords</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Enter keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                />
                <Button type="button" onClick={handleAddKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
              {keywords.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Add at least one keyword
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="triggerConfig.matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || MatchType.CONTAINS}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MatchType.EXACT}>Exact Match</SelectItem>
                      <SelectItem value={MatchType.CONTAINS}>Contains</SelectItem>
                      <SelectItem value={MatchType.STARTS_WITH}>Starts With</SelectItem>
                      <SelectItem value={MatchType.ENDS_WITH}>Ends With</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerConfig.caseSensitive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Case Sensitive</FormLabel>
                    <FormDescription>
                      Match keywords with exact case
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

      case TriggerType.REGEX:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regex Pattern</FormLabel>
                  <FormControl>
                    <Input placeholder="^!command\s+(.+)$" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use capture groups to extract data
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerConfig.flags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flags</FormLabel>
                  <FormControl>
                    <Input placeholder="i" {...field} />
                  </FormControl>
                  <FormDescription>
                    i = case-insensitive, g = global, m = multiline
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )

      case TriggerType.SCHEDULE:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.cron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression</FormLabel>
                  <FormControl>
                    <Input placeholder="0 9 * * 1-5" {...field} />
                  </FormControl>
                  <FormDescription>
                    Example: 0 9 * * 1-5 (9 AM, Mon-Fri)
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerConfig.timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'UTC'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                      <SelectItem value="Asia/Dhaka">Dhaka</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        )

      case TriggerType.WEBHOOK:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.endpointPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint Path</FormLabel>
                  <FormControl>
                    <Input placeholder="/my-webhook" {...field} />
                  </FormControl>
                  <FormDescription>
                    The URL path for incoming webhooks
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )

      case TriggerType.MENTION:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.requireAtMention"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Require @ Mention</FormLabel>
                    <FormDescription>
                      Only trigger when the bot is directly mentioned
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

      case TriggerType.ANY_MESSAGE:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="triggerConfig.includeThreads"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Include Thread Replies</FormLabel>
                    <FormDescription>
                      Also trigger on messages in threads
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

      default:
        return null
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Trigger' : 'Edit Trigger'}</DialogTitle>
          <DialogDescription>
            Configure when your bot should respond
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
                    <Input placeholder="Keyword trigger" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Type</FormLabel>
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
                      <SelectItem value={TriggerType.KEYWORD}>Keyword</SelectItem>
                      <SelectItem value={TriggerType.REGEX}>Regex Pattern</SelectItem>
                      <SelectItem value={TriggerType.MENTION}>Mention</SelectItem>
                      <SelectItem value={TriggerType.ANY_MESSAGE}>Any Message</SelectItem>
                      <SelectItem value={TriggerType.SCHEDULE}>Schedule (Cron)</SelectItem>
                      <SelectItem value={TriggerType.WEBHOOK}>Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Configuration</h4>
              {renderTriggerConfig()}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Advanced Options</h4>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Higher priority triggers execute first (0-100)
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cooldownSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={86400}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Time before this trigger can fire again for the same user
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
                        Enable or disable this trigger
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
                disabled={createTrigger.isPending || updateTrigger.isPending}
              >
                {createTrigger.isPending || updateTrigger.isPending
                  ? 'Saving...'
                  : isNew
                  ? 'Create Trigger'
                  : 'Update Trigger'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
