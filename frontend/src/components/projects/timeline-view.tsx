import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin
} from 'lucide-react'
import type { Task } from '@/lib/api/projects-api'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday
} from 'date-fns'

interface TimelineViewProps {
  tasks: Task[]
  onAddTask?: () => void
}

export function TimelineView({ tasks, onAddTask }: TimelineViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('day')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return taskDate.toDateString() === day.toDateString()
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // TODO: Update task due date in the backend
    console.log('Task dragged to new date:', draggableId, destination.droppableId)
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold mb-2">No tasks scheduled</h3>
          <p className="text-muted-foreground mb-6">
            Tasks with due dates will appear in the timeline view
          </p>
          <Button size="lg" onClick={onAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Month Navigation */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 text-sm font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="ml-2"
            >
              Today
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={zoomLevel === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoomLevel('day')}
            >
              Day
            </Button>
            <Button
              variant={zoomLevel === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoomLevel('week')}
            >
              Week
            </Button>
            <Button
              variant={zoomLevel === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoomLevel('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Medium Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Low Priority</span>
              </div>
            </div>

            {/* Timeline Grid */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Days */}
                {days.map(day => {
                  const dayTasks = getTasksForDay(day)
                  const isCurrentDay = isToday(day)
                  const dayId = format(day, 'yyyy-MM-dd')

                  return (
                    <Droppable key={day.toISOString()} droppableId={dayId}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[120px] transition-colors ${
                            isCurrentDay ? 'ring-2 ring-blue-500' : ''
                          } ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          <CardHeader className="p-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                {format(day, 'd')}
                              </span>
                              {dayTasks.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {dayTasks.length}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-2 space-y-1">
                            {dayTasks.slice(0, 3).map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-1.5 rounded text-xs ${getStatusColor(task.status)} relative cursor-grab active:cursor-grabbing transition-transform ${
                                      snapshot.isDragging ? 'scale-105 shadow-lg z-50' : ''
                                    }`}
                                  >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${getPriorityColor(task.priority)}`} />
                                    <div className="pl-2">
                                      <div className="font-medium truncate">{task.title}</div>
                                      <div className="flex items-center gap-1 mt-1">
                                        {task.assignee && (
                                          <Avatar className="w-4 h-4">
                                            <AvatarImage src={task.assignee.avatarUrl} />
                                            <AvatarFallback className="text-xs">
                                              {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                                               task.assignee.email.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        )}
                                        <span className="text-xs opacity-75">{task.id.substring(0, 8)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {dayTasks.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center py-1">
                                +{dayTasks.length - 3} more
                              </div>
                            )}
                            {provided.placeholder}
                          </CardContent>
                        </Card>
                      )}
                    </Droppable>
                  )
                })}
              </div>
            </DragDropContext>

            {/* Unscheduled Tasks */}
            {tasks.filter(task => !task.dueDate).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Unscheduled Tasks ({tasks.filter(task => !task.dueDate).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tasks
                      .filter(task => !task.dueDate)
                      .map(task => (
                        <div
                          key={task.id}
                          className={`p-2 rounded text-xs ${getStatusColor(task.status)} relative cursor-pointer`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${getPriorityColor(task.priority)}`} />
                          <div className="pl-2">
                            <div className="font-medium truncate">{task.title}</div>
                            <div className="flex items-center gap-1 mt-1">
                              {task.assignee && (
                                <Avatar className="w-4 h-4">
                                  <AvatarImage src={task.assignee.avatarUrl} />
                                  <AvatarFallback className="text-xs">
                                    {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                                     task.assignee.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="text-xs opacity-75">{task.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks
                    .filter(task => task.dueDate && new Date(task.dueDate) > new Date())
                    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                    .slice(0, 5)
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground">{task.id.substring(0, 8)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.assignee && (
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={task.assignee.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                                 task.assignee.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(task.dueDate!), 'MMM dd')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
