/**
 * InstallBotModal Component
 * Modal for installing bots to channels or conversations
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Bot } from '@/lib/api/bots-api'
import {
  useBotInstallations,
  useInstallBot,
  useUninstallBot,
} from '@/lib/api/bots-api'
import { api } from '@/lib/fetch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import {
  Hash,
  MessageSquare,
  Users,
  Search,
  Check,
  Plus,
  Minus,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  description?: string
  isPrivate?: boolean
  memberCount?: number
}

interface Conversation {
  id: string
  participants: Array<{ id: string; name: string }>
  lastMessage?: string
}

interface InstallBotModalProps {
  workspaceId: string
  bot: Bot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallBotModal({
  workspaceId,
  bot,
  open,
  onOpenChange,
}: InstallBotModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('channels')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch installations
  const { data: installations, isLoading: isInstallationsLoading } = useBotInstallations(
    workspaceId,
    bot.id,
    { enabled: open }
  )

  // Fetch channels
  const { data: channelsData, isLoading: isChannelsLoading } = useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      const response = await api.get<{ data: Channel[] }>(`/workspaces/${workspaceId}/channels`)
      return response.data || []
    },
    enabled: open && activeTab === 'channels',
  })

  // Fetch conversations
  const { data: conversationsData, isLoading: isConversationsLoading } = useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: async () => {
      const response = await api.get<{ data: Conversation[] }>(`/workspaces/${workspaceId}/conversations`)
      return response.data || []
    },
    enabled: open && activeTab === 'conversations',
  })

  const installBot = useInstallBot()
  const uninstallBot = useUninstallBot()

  const channels: Channel[] = channelsData || []
  const conversations: Conversation[] = conversationsData || []

  // Get installed channel/conversation IDs
  const installedChannelIds = new Set(
    installations?.filter((i) => i.channelId).map((i) => i.channelId) || []
  )
  const installedConversationIds = new Set(
    installations?.filter((i) => i.conversationId).map((i) => i.conversationId) || []
  )

  // Filter by search
  const filteredChannels = channels.filter((channel) =>
    channel.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredConversations = conversations.filter((conv) =>
    conv.participants.some((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const handleInstallToChannel = async (channelId: string) => {
    try {
      await installBot.mutateAsync({
        workspaceId,
        botId: bot.id,
        data: { channelId },
      })
      toast({
        title: 'Bot installed',
        description: 'Bot has been installed to the channel',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to install bot',
        variant: 'destructive',
      })
    }
  }

  const handleInstallToConversation = async (conversationId: string) => {
    try {
      await installBot.mutateAsync({
        workspaceId,
        botId: bot.id,
        data: { conversationId },
      })
      toast({
        title: 'Bot installed',
        description: 'Bot has been installed to the conversation',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to install bot',
        variant: 'destructive',
      })
    }
  }

  const handleUninstall = async (channelId?: string, conversationId?: string) => {
    try {
      await uninstallBot.mutateAsync({
        workspaceId,
        botId: bot.id,
        data: { channelId, conversationId },
      })
      toast({
        title: 'Bot uninstalled',
        description: 'Bot has been removed',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to uninstall bot',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Install {bot.displayName || bot.name}</DialogTitle>
          <DialogDescription>
            Choose where this bot should be active
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Installed count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4" />
            Installed in {installations?.length || 0} places
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="channels">
                <Hash className="h-4 w-4 mr-2" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="mt-4">
              <ScrollArea className="h-[300px]">
                {isChannelsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading channels...
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No channels found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredChannels.map((channel) => {
                      const isInstalled = installedChannelIds.has(channel.id)
                      return (
                        <div
                          key={channel.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            isInstalled && "bg-primary/5 border-primary/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                              <Hash className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{channel.name}</div>
                              {channel.memberCount !== undefined && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {channel.memberCount} members
                                </div>
                              )}
                            </div>
                          </div>
                          {isInstalled ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUninstall(channel.id, undefined)}
                              disabled={uninstallBot.isPending}
                            >
                              <Minus className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInstallToChannel(channel.id)}
                              disabled={installBot.isPending}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Install
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="conversations" className="mt-4">
              <ScrollArea className="h-[300px]">
                {isConversationsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => {
                      const isInstalled = installedConversationIds.has(conversation.id)
                      const participantNames = conversation.participants
                        .map((p) => p.name)
                        .join(', ')
                      return (
                        <div
                          key={conversation.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            isInstalled && "bg-primary/5 border-primary/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium truncate max-w-[200px]">
                                {participantNames}
                              </div>
                              {conversation.lastMessage && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {conversation.lastMessage}
                                </div>
                              )}
                            </div>
                          </div>
                          {isInstalled ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUninstall(undefined, conversation.id)}
                              disabled={uninstallBot.isPending}
                            >
                              <Minus className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInstallToConversation(conversation.id)}
                              disabled={installBot.isPending}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Install
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
