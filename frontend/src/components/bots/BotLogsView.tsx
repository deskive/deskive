/**
 * BotLogsView Component
 * View execution logs for a bot
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BotExecutionLog } from '@/lib/api/bots-api'
import { useBot, useBotLogs, ExecutionStatus } from '@/lib/api/bots-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Loader2,
  Eye,
  Bot as BotIcon,
  Zap,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

export function BotLogsView() {
  const { workspaceId, botId } = useParams<{ workspaceId: string; botId: string }>()
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<BotExecutionLog | null>(null)
  const [page, setPage] = useState(0)
  const limit = 50

  const { data: bot, isLoading: isBotLoading } = useBot(workspaceId!, botId!)
  const {
    data: logs,
    isLoading: isLogsLoading,
    refetch,
    isFetching,
  } = useBotLogs(workspaceId!, botId!, {
    status: statusFilter !== 'all' ? statusFilter as ExecutionStatus : undefined,
    limit,
    offset: page * limit,
  })

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.SUCCESS:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case ExecutionStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />
      case ExecutionStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />
      case ExecutionStatus.RUNNING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case ExecutionStatus.SKIPPED:
        return <SkipForward className="h-4 w-4 text-muted-foreground" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadgeVariant = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.SUCCESS:
        return 'default'
      case ExecutionStatus.FAILED:
        return 'destructive'
      case ExecutionStatus.PENDING:
      case ExecutionStatus.RUNNING:
        return 'outline'
      case ExecutionStatus.SKIPPED:
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  // Filter logs by search query
  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.triggerType?.toLowerCase().includes(query) ||
      log.actionType?.toLowerCase().includes(query) ||
      log.errorMessage?.toLowerCase().includes(query)
    )
  })

  // Stats calculation
  const stats = logs?.reduce(
    (acc, log) => {
      acc.total++
      if (log.status === ExecutionStatus.SUCCESS) acc.success++
      else if (log.status === ExecutionStatus.FAILED) acc.failed++
      if (log.executionTimeMs) {
        acc.totalTime += log.executionTimeMs
      }
      return acc
    },
    { total: 0, success: 0, failed: 0, totalTime: 0 }
  )

  if (isBotLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/workspaces/${workspaceId}/more/bots/${botId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BotIcon className="h-5 w-5" />
                {bot?.displayName || bot?.name} - Logs
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View execution history and debug information
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Executions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{stats.success}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round(stats.totalTime / stats.total) : 0}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg. Execution Time</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={ExecutionStatus.SUCCESS}>Success</SelectItem>
              <SelectItem value={ExecutionStatus.FAILED}>Failed</SelectItem>
              <SelectItem value={ExecutionStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={ExecutionStatus.RUNNING}>Running</SelectItem>
              <SelectItem value={ExecutionStatus.SKIPPED}>Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {isLogsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading logs...
              </div>
            ) : !filteredLogs || filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No execution logs yet</p>
                <p className="text-sm">Logs will appear when your bot executes</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Execution Time</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">
                              {log.triggerType?.replace('_', ' ') || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">
                              {log.actionType?.replace('_', ' ') || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.executionTimeMs ? `${log.executionTimeMs}ms` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * limit + 1} - {Math.min((page + 1) * limit, (logs?.length || 0) + page * limit)} logs
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!logs || logs.length < limit}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getStatusIcon(selectedLog.status)}
              Execution Log Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.createdAt), 'MMMM d, yyyy HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                {selectedLog.errorMessage && <TabsTrigger value="error">Error</TabsTrigger>}
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Status</div>
                        <Badge variant={getStatusBadgeVariant(selectedLog.status)}>
                          {selectedLog.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Execution Time</div>
                        <div>{selectedLog.executionTimeMs || 0}ms</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Trigger Type</div>
                        <div className="capitalize">{selectedLog.triggerType?.replace('_', ' ') || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Action Type</div>
                        <div className="capitalize">{selectedLog.actionType?.replace('_', ' ') || '-'}</div>
                      </div>
                      {selectedLog.channelId && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Channel ID</div>
                          <div className="font-mono text-sm">{selectedLog.channelId}</div>
                        </div>
                      )}
                      {selectedLog.conversationId && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Conversation ID</div>
                          <div className="font-mono text-sm">{selectedLog.conversationId}</div>
                        </div>
                      )}
                      {selectedLog.triggeredByUser && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Triggered By</div>
                          <div className="font-mono text-sm">{selectedLog.triggeredByUser}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="input" className="mt-0">
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {selectedLog.triggerData
                        ? JSON.stringify(selectedLog.triggerData, null, 2)
                        : 'No input data'}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="output" className="mt-0">
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {selectedLog.actionOutput
                        ? JSON.stringify(selectedLog.actionOutput, null, 2)
                        : 'No output data'}
                    </pre>
                  </div>
                </TabsContent>

                {selectedLog.errorMessage && (
                  <TabsContent value="error" className="mt-0">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <pre className="text-sm font-mono text-destructive whitespace-pre-wrap">
                        {selectedLog.errorMessage}
                      </pre>
                    </div>
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
