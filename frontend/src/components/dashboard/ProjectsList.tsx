import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Briefcase, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { TopProject } from './types'

interface ProjectsListProps {
  projects: TopProject[]
  onProjectClick: (projectId: string) => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

export function ProjectsList({ projects, onProjectClick }: ProjectsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Top Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => onProjectClick(project.id)}
          >
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{project.name}</div>
                <Badge variant="outline" className="text-xs">
                  {project.tasksCompleted}/{project.totalTasks}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <Progress value={project.progress} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">{project.progress}%</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{project.members} members</span>
                <span>•</span>
                <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
                <span>•</span>
                <span
                  className={cn(
                    'font-medium',
                    project.status === 'in-progress'
                      ? 'text-blue-600'
                      : project.status === 'review'
                        ? 'text-orange-600'
                        : 'text-green-600'
                  )}
                >
                  {project.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
