import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Link2 } from 'lucide-react'
import type { IntegrationUsage } from './types'

interface IntegrationUsageCardsProps {
  integrations: IntegrationUsage[]
}

export function IntegrationUsageCards({ integrations }: IntegrationUsageCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Integration Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.lastSync}</p>
                  </div>
                </div>
                <Badge variant={integration.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {integration.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Usage</span>
                  <span className="font-medium">{integration.usage}%</span>
                </div>
                <Progress value={integration.usage} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
