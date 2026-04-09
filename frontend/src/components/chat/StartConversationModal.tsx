import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'away' | 'offline';
}

interface StartConversationModalProps {
  open: boolean;
  onClose: () => void;
  members?: Member[];
  onStartConversation: (selectedMemberIds: string[]) => void;
}

export function StartConversationModal({
  open,
  onClose,
  members = [],
  onStartConversation
}: StartConversationModalProps) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMember = (memberId: string) => {
    // Radio button behavior - selecting the same member deselects it
    setSelectedMember(prev => prev === memberId ? null : memberId);
  };

  const handleStartConversation = () => {
    if (selectedMember) {
      onStartConversation([selectedMember]);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedMember(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[500px] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-6 w-6" />
            {intl.formatMessage({ id: 'modules.chat.startConversation.title' })}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({ id: 'modules.chat.startConversation.searchPlaceholder' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Members List */}
        <ScrollArea className="flex-1 px-6 py-4">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <Users className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {intl.formatMessage({ id: 'modules.chat.startConversation.noMembers' })}
              </h3>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => {
                const isSelected = selectedMember === member.id;
                return (
                  <div
                    key={member.id}
                    onClick={() => handleSelectMember(member.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    {/* Radio button indicator */}
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "border-blue-500 gradient-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                      {member.status === 'away' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {member.name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-border flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {selectedMember
              ? intl.formatMessage(
                  { id: 'modules.chat.startConversation.selectedCount' },
                  { count: 1 }
                ).replace('1 member', '1 member selected')
              : intl.formatMessage({ id: 'modules.chat.startConversation.selectOneMember' })}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="min-w-[100px]"
            >
              {intl.formatMessage({ id: 'modules.chat.startConversation.cancel' })}
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={!selectedMember}
              className="min-w-[140px] btn-gradient-primary"
            >
              {intl.formatMessage({ id: 'modules.chat.startConversation.start' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
