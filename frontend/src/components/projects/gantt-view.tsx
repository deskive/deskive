import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Settings,
  Link,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PlayCircle,
  X
} from 'lucide-react'
import type { Task } from '@/lib/api/projects-api'
import type { User } from '@/types'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  isToday,
  isWeekend
} from 'date-fns'

// Type guard to check if assignee is a User object
const isUserObject = (assignee: User | string | undefined): assignee is User => {
  return typeof assignee === 'object' && assignee !== null && 'id' in assignee
}

interface GanttViewProps {
  tasks: Task[]
  onAddTask?: () => void
}

export function GanttView({ tasks, onAddTask }: GanttViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Filter tasks that have due dates
  const scheduledTasks = tasks.filter(task => task.dueDate)

  const getTaskProgress = (task: Task) => {
    switch (task.status) {
      case 'completed': return 100
      case 'in_progress': return 50
      case 'review': return 75
      default: return 0
    }
  }

  const getTaskDuration = (task: Task) => {
    if (!task.dueDate) return 0
    const startDate = new Date(task.createdAt)
    const endDate = new Date(task.dueDate)
    return Math.max(1, differenceInDays(endDate, startDate))
  }

  const getTaskPosition = (task: Task) => {
    if (!task.dueDate) return { left: '0%', width: '0%' }
    const startDate = new Date(task.createdAt)
    const endDate = new Date(task.dueDate)

    const startOffset = differenceInDays(startDate, monthStart)
    const duration = differenceInDays(endDate, startDate)

    const dayWidth = 100 / days.length
    const left = Math.max(0, startOffset * dayWidth)
    const width = Math.min(100 - left, Math.max(1, duration) * dayWidth)

    return { left: `${left}%`, width: `${width}%` }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-100', accent: 'bg-red-600' }
      case 'medium': return { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900', accent: 'bg-yellow-600' }
      case 'low': return { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-100', accent: 'bg-green-600' }
      default: return { bg: 'bg-gray-500', border: 'border-gray-600', text: 'text-gray-100', accent: 'bg-gray-600' }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-100', gradient: 'from-emerald-500 to-emerald-600' }
      case 'in_progress': return { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-100', gradient: 'from-blue-500 to-blue-600' }
      case 'review': return { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-100', gradient: 'from-purple-500 to-purple-600' }
      case 'todo': return { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-slate-100', gradient: 'from-slate-400 to-slate-500' }
      default: return { bg: 'bg-gray-500', border: 'border-gray-600', text: 'text-gray-100', gradient: 'from-gray-500 to-gray-600' }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />
      case 'in_progress': return <PlayCircle className="w-3 h-3" />
      case 'review': return <Target className="w-3 h-3" />
      case 'todo': return <Circle className="w-3 h-3" />
      default: return <Circle className="w-3 h-3" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-3 h-3" />
      case 'medium': return <Target className="w-3 h-3" />
      case 'low': return <Circle className="w-3 h-3" />
      default: return <Circle className="w-3 h-3" />
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-muted/40">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold mb-3">No tasks scheduled</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Create tasks with due dates to visualize your project timeline.
            The Gantt chart will help you track progress and dependencies.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={onAddTask}>
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Task
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">Gantt Chart</h2>
              </div>
              <div className="flex items-center gap-3 bg-background border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 py-1 font-semibold text-center min-w-[140px]">
                  {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                  className="h-8 ml-2"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Today
                </Button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gradient-to-r from-slate-400 to-slate-500 rounded-sm"></div>
                  <span className="text-xs">To Do</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm"></div>
                  <span className="text-xs">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-sm"></div>
                  <span className="text-xs">Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-sm"></div>
                  <span className="text-xs">Done</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Priority:</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-xs">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 text-green-500" />
                  <span className="text-xs">Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex bg-background">
            {/* Task List */}
            <div className="w-96 border-r bg-gradient-to-b from-muted/5 to-muted/10">
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <ListIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold">Tasks</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {scheduledTasks.length} items
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-full">
                <div className="space-y-0">
                  {scheduledTasks.map((task, index) => {
                    const priorityColors = getPriorityColor(task.priority)
                    const statusColors = getStatusColor(task.status)
                    const progress = getTaskProgress(task)

                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`group p-3 cursor-pointer transition-all duration-200 border h-20 flex items-center ${
                              selectedTask === task.id
                                ? 'bg-blue-50 border-blue-200 shadow-md rounded-lg'
                                : 'hover:bg-muted/50 hover:shadow-sm border-transparent hover:rounded-lg'
                            } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                            onClick={() => setSelectedTask(task.id)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex flex-col gap-0.5">
                                  {getPriorityIcon(task.priority)}
                                  {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
                                    {task.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 mb-1">
                                    {task.id.substring(0, 8)} • {getTaskDuration(task)} days
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {task.assignee && (
                                      <>
                                        <Avatar className="w-5 h-5 ring-1 ring-background">
                                          <AvatarImage src={task.assignee.avatarUrl} />
                                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
                                            {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                                             task.assignee.email.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground font-medium">
                                          {task.assignee.name || task.assignee.email}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${statusColors.text} ${statusColors.bg} border-transparent`}
                                >
                                  {task.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    {progress}%
                                  </div>
                                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full bg-gradient-to-r ${statusColors.gradient} transition-all duration-300`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="text-sm">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-muted-foreground text-xs mt-1">
                              {task.description?.substring(0, 100)}...
                            </div>
                            <div className="flex justify-between mt-2 text-xs">
                              <span>Due: {format(new Date(task.dueDate!), 'MMM dd')}</span>
                              <span>{progress}% complete</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-x-auto bg-gradient-to-br from-background to-muted/5">
              <div className="min-w-[1000px] h-full">
                {/* Timeline Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm">
                  <div className="flex border-b border-muted/20">
                    {days.map((day) => {
                      const isCurrentDay = isToday(day)
                      const isWeekendDay = isWeekend(day)

                      return (
                        <div
                          key={day.toISOString()}
                          className={`flex-1 p-3 text-center border-r border-muted/20 transition-colors ${
                            isCurrentDay
                              ? 'bg-blue-50 border-blue-200'
                              : isWeekendDay
                              ? 'bg-muted/30'
                              : 'bg-background hover:bg-muted/20'
                          }`}
                        >
                          <div className={`text-sm font-semibold ${
                            isCurrentDay ? 'text-blue-600' : 'text-foreground'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className={`text-xs ${
                            isCurrentDay
                              ? 'text-blue-500'
                              : 'text-muted-foreground'
                          }`}>
                            {format(day, 'EEE')}
                          </div>
                          {isCurrentDay && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Timeline Body */}
                <div className="relative">
                  {scheduledTasks.map((task, index) => {
                    const position = getTaskPosition(task)
                    const progress = getTaskProgress(task)
                    const statusColors = getStatusColor(task.status)
                    const priorityColors = getPriorityColor(task.priority)

                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`relative h-20 border-b border-muted/10 flex items-center transition-all duration-200 ${
                              selectedTask === task.id
                                ? 'bg-blue-50 border-blue-200'
                                : 'hover:bg-muted/20'
                            } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                          >
                            {/* Grid lines */}
                            {days.map((day, dayIndex) => {
                              const isCurrentDay = isToday(day)
                              const isWeekendDay = isWeekend(day)

                              return (
                                <div
                                  key={day.toISOString()}
                                  className={`absolute top-0 bottom-0 border-r ${
                                    isCurrentDay
                                      ? 'border-blue-300'
                                      : isWeekendDay
                                      ? 'border-muted/40'
                                      : 'border-muted/20'
                                  } ${isCurrentDay ? 'bg-blue-50/50' : ''}`}
                                  style={{ left: `${(dayIndex / days.length) * 100}%` }}
                                />
                              )
                            })}

                            {/* Task Bar */}
                            <div
                              className={`absolute h-8 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group border ${statusColors.border}`}
                              style={{
                                left: position.left,
                                width: position.width,
                                minWidth: '40px'
                              }}
                              onClick={() => setSelectedTask(task.id)}
                            >
                              <div
                                className={`h-full rounded-lg bg-gradient-to-r ${statusColors.gradient} relative overflow-hidden`}
                              >
                                {/* Progress overlay */}
                                <div
                                  className="absolute top-0 left-0 h-full bg-white/25 rounded-lg transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />

                                {/* Priority indicator */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColors.accent} rounded-l-lg`} />

                                {/* Task content */}
                                <div className="absolute inset-0 flex items-center px-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {getStatusIcon(task.status)}
                                    <span className={`text-xs font-semibold truncate ${statusColors.text}`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <div className={`text-xs font-medium ${statusColors.text} opacity-90`}>
                                    {progress}%
                                  </div>
                                </div>

                                {/* Hover effect */}
                                <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              </div>
                            </div>

                            {/* Task info on the left */}
                            <div className="absolute left-4 flex items-center gap-2">
                              {task.assignee && (
                                <Avatar className="w-6 h-6 ring-2 ring-background shadow-sm">
                                  <AvatarImage src={task.assignee.avatarUrl} />
                                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
                                    {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                                     task.assignee.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <Badge variant="outline" className="text-xs bg-background">
                                {task.id.substring(0, 8)}
                              </Badge>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="text-sm space-y-1">
                            <div className="font-semibold">{task.title}</div>
                            <div className="text-muted-foreground text-xs">
                              {task.description?.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Due: {format(new Date(task.dueDate!), 'MMM dd, yyyy')} • {getTaskDuration(task)} days
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Task Details Panel */}
            {selectedTask && (() => {
              const task = scheduledTasks.find(t => t.id === selectedTask)
              if (!task) return null

              const statusColors = getStatusColor(task.status)
              const priorityColors = getPriorityColor(task.priority)
              const progress = getTaskProgress(task)

              return (
                <Card className="absolute bottom-6 right-6 w-96 shadow-2xl border-0 bg-background/95 backdrop-blur-sm">
                  <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-lg font-bold">Task Details</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTask(null)}
                        className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Task Header */}
                      <div>
                        <div className="font-bold text-lg mb-2">{task.title}</div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            {task.id.substring(0, 8)}
                          </Badge>
                          <Badge className={`${statusColors.bg} ${statusColors.text} border-transparent`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {task.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </Badge>
                          <Badge className={`${priorityColors.bg} ${priorityColors.text} border-transparent`}>
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(task.priority)}
                              {task.priority.toUpperCase()}
                            </div>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {task.description || 'No description provided'}
                        </p>
                      </div>

                      {/* Assignee */}
                      {task.assignee && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Avatar className="w-10 h-10 ring-2 ring-background shadow-md">
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="text-sm bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                              {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                               task.assignee.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{task.assignee.name || task.assignee.email}</div>
                            <div className="text-xs text-muted-foreground">Assignee</div>
                          </div>
                        </div>
                      )}

                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Progress</span>
                          <span className="text-lg font-bold text-blue-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="text-xs text-muted-foreground text-center">
                          {progress === 100 ? 'Completed!' : progress > 75 ? 'Almost there!' : progress > 50 ? 'Making progress...' : 'Just getting started'}
                        </div>
                      </div>

                      {/* Timeline Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">{getTaskDuration(task)} days</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-sm">{format(new Date(task.dueDate!), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
