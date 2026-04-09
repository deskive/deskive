import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Server } from 'lucide-react';
import type { EmailConnection } from '@/lib/api/email-api';

interface EmailAccountTabsProps {
  connections: EmailConnection[];
  activeConnectionId: string | null;
  onConnectionChange: (connectionId: string) => void;
}

export function EmailAccountTabs({
  connections,
  activeConnectionId,
  onConnectionChange,
}: EmailAccountTabsProps) {
  if (connections.length <= 1) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <Tabs
        value={activeConnectionId || connections[0]?.id}
        onValueChange={onConnectionChange}
      >
        <TabsList className="h-9 flex-wrap">
          {connections.map((connection) => (
            <TabsTrigger
              key={connection.id}
              value={connection.id}
              className="gap-2 px-4"
            >
              {connection.provider === 'gmail' ? (
                <Mail className="h-4 w-4 text-red-500" />
              ) : (
                <Server className="h-4 w-4 text-blue-500" />
              )}
              <span className="max-w-[180px] truncate">
                {connection.emailAddress}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
