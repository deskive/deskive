import React from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, X } from 'lucide-react';

interface AIHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIHistoryModal({ open, onClose }: AIHistoryModalProps) {
  const intl = useIntl();
  // Mock AI conversation history - will be replaced with real data
  const conversations: any[] = [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-6 w-6" />
            {intl.formatMessage({ id: 'modules.chat.aiHistory.title' })}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <Briefcase className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {intl.formatMessage({ id: 'modules.chat.aiHistory.noConversations' })}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {intl.formatMessage({ id: 'modules.chat.aiHistory.startChatting' })}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation, index) => (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">Conversation Title</h4>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Conversation preview...
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement clear history
              console.log('Clear history');
            }}
            disabled={conversations.length === 0}
          >
            {intl.formatMessage({ id: 'modules.chat.aiHistory.clearHistory' })}
          </Button>
          <Button onClick={onClose}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
