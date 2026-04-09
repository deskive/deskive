/**
 * Invite People Modal - Modal for inviting people to video call
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  X,
  Search,
  Users as UsersIcon,
  Mail,
  Link as LinkIcon,
  MessageSquare,
  Calendar,
  Phone,
  Copy,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ScrollArea } from '../ui/scroll-area'
import { toast } from 'sonner'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useInviteParticipants, useVideoCall } from '@/lib/api/video-call-api'
import useVideoCallStore from '@/stores/videoCallStore'
import { useAuth } from '@/contexts/AuthContext'

interface Contact {
  id: string
  name: string
  email: string
  department: string
  avatar?: string
  isOnline: boolean
}

interface InvitePeopleModalProps {
  open: boolean
  onClose: () => void
}

export function InvitePeopleModal({ open, onClose }: InvitePeopleModalProps) {
  const { workspaceId, callId: urlCallId } = useParams<{ workspaceId: string; callId: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('contacts')
  const [isInviting, setIsInviting] = useState(false)

  // Get current user
  const { user } = useAuth()

  // Get current call ID from store or URL
  const storeCallId = useVideoCallStore(state => state.callId)
  const currentCallId = storeCallId || urlCallId

  // Mutation hook for inviting participants
  const inviteParticipants = useInviteParticipants()

  // Fetch call details to get existing invitees
  const { data: callDetails, refetch: refetchCallDetails } = useVideoCall(currentCallId || '')

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Get existing invitees from call details
  const existingInvitees = useMemo(() => {
    if (!callDetails?.invitees) return new Set<string>()
    // Handle both array and JSON string formats
    let inviteesList: string[] = []
    if (Array.isArray(callDetails.invitees)) {
      inviteesList = callDetails.invitees
    } else if (typeof callDetails.invitees === 'string') {
      try {
        inviteesList = JSON.parse(callDetails.invitees)
      } catch (e) {
        console.error('Failed to parse invitees:', e)
      }
    }
    return new Set(inviteesList)
  }, [callDetails?.invitees])

  // Convert workspace members to contacts format, excluding current user and existing invitees
  const availableContacts: Contact[] = useMemo(() => {
    return workspaceMembers
      .filter(member => {
        const memberId = member.user_id || member.id
        // Exclude current user
        if (memberId === user?.id) return false
        // Exclude existing invitees (including host)
        if (existingInvitees.has(memberId)) return false
        return true
      })
      .map(member => ({
        id: member.user_id || member.id,
        name: member.user?.name || member.user?.email || 'Unknown User',
        email: member.user?.email || '',
        avatar: member.user?.avatar,
        department: member.role === 'owner' ? 'Owner' :
                    member.role === 'admin' ? 'Admin' :
                    'Team Member',
        isOnline: false // TODO: Integrate with real-time presence
      }))
  }, [workspaceMembers, user?.id, existingInvitees])

  const filteredContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contactId)) {
        newSet.delete(contactId)
      } else {
        newSet.add(contactId)
      }
      return newSet
    })
  }

  const handleSendInvites = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select at least one contact')
      return
    }

    if (!currentCallId) {
      toast.error('No active call found')
      return
    }

    setIsInviting(true)

    try {
      // Call the API to invite participants
      const userIds = Array.from(selectedContacts)
      const result = await inviteParticipants.mutateAsync({
        callId: currentCallId,
        data: { user_ids: userIds }
      })

      const selectedNames = availableContacts
        .filter(c => selectedContacts.has(c.id))
        .map(c => c.name.split(' ')[0])
        .join(', ')

      toast.success(`Invites sent to ${selectedNames}`, {
        description: `${result.invited_count} participant(s) will receive a notification`
      })
      setSelectedContacts(new Set())

      // Refetch call details to update the invitees list
      await refetchCallDetails()
    } catch (error: any) {
      console.error('Failed to send invites:', error)
      toast.error(error.message || 'Failed to send invites')
    } finally {
      setIsInviting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[600px] p-0 gap-0 bg-gray-900 border-gray-700 text-white">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-700">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <UsersIcon className="h-6 w-6" />
              Invite People to Call
            </DialogTitle>
            <p className="text-sm text-gray-400 mt-1">
              Invite team members or external guests to join your video call
            </p>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 bg-gray-800 border border-gray-700">
            <TabsTrigger value="contacts" className="flex-1 data-[state=active]:bg-gray-700">
              <UsersIcon className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
            {/* <TabsTrigger value="email" className="flex-1 data-[state=active]:bg-gray-700">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger> */}
            <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-gray-700">
              <LinkIcon className="h-4 w-4 mr-2" />
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="flex-1 overflow-hidden mt-4 mx-6">
            <div className="h-full flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
                />
              </div>

              {/* Contact List */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 pb-4">
                  {filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-blue-600 text-white font-semibold">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                          contact.isOnline ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{contact.name}</div>
                        <div className="text-sm text-gray-400">{contact.email}</div>
                        <div className="text-sm text-gray-500">{contact.department}</div>
                      </div>

                      {/* <Badge variant="secondary" className="bg-gray-700 text-gray-200 border-gray-600">
                        Team
                      </Badge> */}

                      {selectedContacts.has(contact.id) && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredContacts.length === 0 && (
                    <div className="text-center py-12">
                      <UsersIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No contacts found</p>
                      <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="email" className="flex-1 overflow-hidden mt-4 mx-6">
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Email addresses (comma separated)</label>
                <Input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Email invitations</p>
                <p className="text-sm text-gray-500 mt-1">Enter email addresses to send invites</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="link" className="flex-1 overflow-hidden mt-4 mx-6">
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-4">
                {/* Meeting Link */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Meeting Link</h3>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={currentCallId ? `${window.location.origin}/call/${workspaceId}/${currentCallId}` : 'No active call'}
                      readOnly
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (currentCallId) {
                          navigator.clipboard.writeText(`${window.location.origin}/call/${workspaceId}/${currentCallId}`)
                          toast.success('Link copied to clipboard')
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-6"
                      disabled={!currentCallId}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Meeting ID */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Meeting ID</h3>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={currentCallId || 'No active call'}
                      readOnly
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (currentCallId) {
                          navigator.clipboard.writeText(currentCallId)
                          toast.success('Meeting ID copied to clipboard')
                        }
                      }}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 px-6"
                      disabled={!currentCallId}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Share this ID with participants who need to join the meeting
                  </p>
                </div>

                {/* Share via */}
                {/* <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Share via</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-14 justify-start border-gray-700 text-white hover:bg-gray-800"
                      onClick={() => toast.info('Opening message app...')}
                    >
                      <MessageSquare className="h-5 w-5 mr-3" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 justify-start border-gray-700 text-white hover:bg-gray-800"
                      onClick={() => toast.info('Opening email app...')}
                    >
                      <Mail className="h-5 w-5 mr-3" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 justify-start border-gray-700 text-white hover:bg-gray-800"
                      onClick={() => toast.info('Adding to calendar...')}
                    >
                      <Calendar className="h-5 w-5 mr-3" />
                      Calendar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 justify-start border-gray-700 text-white hover:bg-gray-800"
                      onClick={() => toast.info('Opening SMS app...')}
                    >
                      <Phone className="h-5 w-5 mr-3" />
                      SMS
                    </Button>
                  </div>
                </div> */}

                {/* Security Settings */}
               {/*  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Security Settings</h3>
                  <p className="text-sm text-amber-800">
                    Configure meeting security options and access controls
                  </p>
                </div> */}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedContacts.size > 0 && (
              <span>{selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvites}
              disabled={selectedContacts.size === 0 || isInviting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Send Invites
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
