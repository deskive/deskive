import { Mail, Server, ChevronDown, Inbox } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmailConnection } from '@/lib/api/email-api';

interface EmailAccountSelectorProps {
  connections: EmailConnection[];
  activeConnectionId: string | null; // null means "All Mail"
  onConnectionChange: (connectionId: string | null) => void;
}

export function EmailAccountSelector({
  connections,
  activeConnectionId,
  onConnectionChange,
}: EmailAccountSelectorProps) {
  // Don't show if no connections
  if (connections.length === 0) {
    return null;
  }

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onConnectionChange(null);
    } else {
      onConnectionChange(value);
    }
  };

  const selectedConnection = connections.find(c => c.id === activeConnectionId);
  const currentValue = activeConnectionId || 'all';

  return (
    <div className="flex items-center gap-2">
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[280px] h-9">
          <SelectValue>
            {currentValue === 'all' ? (
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-purple-500" />
                <span>All Mail</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({connections.length} accounts)
                </span>
              </div>
            ) : selectedConnection ? (
              <div className="flex items-center gap-2">
                {selectedConnection.provider === 'gmail' ? (
                  <Mail className="h-4 w-4 text-red-500" />
                ) : (
                  <Server className="h-4 w-4 text-blue-500" />
                )}
                <span className="truncate">{selectedConnection.emailAddress}</span>
              </div>
            ) : (
              <span>Select account</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* All Mail option */}
          {connections.length > 1 && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-purple-500" />
                <span>All Mail</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({connections.length} accounts)
                </span>
              </div>
            </SelectItem>
          )}

          {/* Individual accounts */}
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              <div className="flex items-center gap-2">
                {connection.provider === 'gmail' ? (
                  <Mail className="h-4 w-4 text-red-500" />
                ) : (
                  <Server className="h-4 w-4 text-blue-500" />
                )}
                <span className="truncate max-w-[200px]">{connection.emailAddress}</span>
                <span className="text-xs text-muted-foreground">
                  {connection.provider === 'gmail' ? 'Gmail' : 'IMAP'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
