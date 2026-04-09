import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { FolderOpen, FileText, FileImage, Video } from 'lucide-react'
import type { DashboardMetrics } from './types'

interface StorageUsageCardProps {
  metrics: DashboardMetrics
}

export function StorageUsageCard({ metrics }: StorageUsageCardProps) {
  // TODO: Fetch real storage breakdown by file type from API
  // Should include: documents, images, videos, and other file types
  const storageBreakdown = {
    documents: 0, // GB
    images: 0,    // GB
    videos: 0     // GB
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Storage Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Used</span>
            <span className="text-sm text-muted-foreground">
              {metrics.storageUsed}GB of {metrics.storageLimit}GB
            </span>
          </div>
          <Progress value={(metrics.storageUsed / metrics.storageLimit) * 100} className="h-2" />

          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Documents</span>
              </div>
              <span className="text-sm font-medium">{storageBreakdown.documents} GB</span>
            </div>
            <Progress value={0} className="h-1" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Images</span>
              </div>
              <span className="text-sm font-medium">{storageBreakdown.images} GB</span>
            </div>
            <Progress value={0} className="h-1" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-red-600" />
                <span className="text-sm">Videos</span>
              </div>
              <span className="text-sm font-medium">{storageBreakdown.videos} GB</span>
            </div>
            <Progress value={0} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
