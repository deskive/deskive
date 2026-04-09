import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  BarChart3
} from 'lucide-react'
// import { mockUsers } from '@/lib/mock-data' // Removed - use real API data
import type { Task } from '@/lib/api/projects-api'

// TODO: Fetch real users from workspace members API
const mockUsers: any[] = []

interface TeamViewProps {
  tasks: Task[]
  onAddTask?: () => void
}

export function TeamView({ tasks, onAddTask }: TeamViewProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const getTeamMemberStats = (userId: string) => {
    const memberTasks = tasks.filter(task => task.assigneeId === userId)
    const completedTasks = memberTasks.filter(task => task.status === 'completed')
    const inProgressTasks = memberTasks.filter(task => task.status === 'in_progress')
    const overdueTasks = memberTasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
    )

    return {
      total: memberTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      overdue: overdueTasks.length,
      completionRate: memberTasks.length > 0 ? (completedTasks.length / memberTasks.length) * 100 : 0
    }
  }

  const getWorkloadDistribution = () => {
    return mockUsers.map(user => ({
      ...user,
      ...getTeamMemberStats(user.id)
    }))
  }

  const teamData = getWorkloadDistribution()

  const getWorkloadLevel = (taskCount: number) => {
    if (taskCount > 10) return { level: 'high', color: 'bg-red-500', text: 'High' }
    if (taskCount > 5) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' }
    return { level: 'low', color: 'bg-green-500', text: 'Low' }
  }

  const totalTasks = tasks.length
  const totalCompleted = tasks.filter(t => t.status === 'completed').length
  const totalInProgress = tasks.filter(t => t.status === 'in_progress').length
  const totalOverdue = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold mb-2">No team tasks found</h3>
          <p className="text-muted-foreground mb-6">
            Assign tasks to team members to see them here
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
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {/* <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger> */}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{totalTasks}</p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{totalCompleted}</p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold">{totalInProgress}</p>
                    </div>
                    <Clock className="w-6 h-6 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold">{totalOverdue}</p>
                    </div>
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamData.map(member => {
                const workload = getWorkloadLevel(member.total)

                return (
                  <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>
                              {member.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{member.name}</h3>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${workload.color}`} />
                          <span className="text-sm text-muted-foreground">{workload.text}</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-semibold text-blue-600">{member.total}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-green-600">{member.completed}</p>
                          <p className="text-xs text-muted-foreground">Done</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-red-600">{member.overdue}</p>
                          <p className="text-xs text-muted-foreground">Overdue</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Completion Rate</span>
                          <span>{member.completionRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={member.completionRate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* <TabsContent value="workload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {member.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.total} tasks</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{member.inProgress} active</div>
                          <div className="text-xs text-muted-foreground">
                            {member.overdue > 0 && (
                              <span className="text-red-600">{member.overdue} overdue</span>
                            )}
                          </div>
                        </div>
                        <div className="w-24">
                          <Progress value={member.completionRate} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Top Performers</h4>
                    <div className="space-y-2">
                      {teamData
                        .sort((a, b) => b.completionRate - a.completionRate)
                        .slice(0, 3)
                        .map((member, index) => (
                          <div key={member.id} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.completionRate.toFixed(1)}% completion rate
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Needs Attention</h4>
                    <div className="space-y-2">
                      {teamData
                        .filter(member => member.overdue > 0)
                        .sort((a, b) => b.overdue - a.overdue)
                        .slice(0, 3)
                        .map(member => (
                          <div key={member.id} className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-red-600">
                                {member.overdue} overdue tasks
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>
      </div>
    </div>
  )
}
