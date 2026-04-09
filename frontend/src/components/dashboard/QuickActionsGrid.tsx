import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Zap } from 'lucide-react'
import type { QuickAction } from './types'

interface QuickActionsGridProps {
  actions: QuickAction[]
}

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const intl = useIntl()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {intl.formatMessage({ id: 'dashboard.quickActions.title' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.slice(0, 4).map((action) => {
            const IconComponent = action.icon
            return (
              <Button
                key={action.id}
                variant="outline"
                className="justify-start gap-3 h-auto p-3"
                onClick={action.action}
              >
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
