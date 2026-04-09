import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Search,
  Folder,
  FileText,
  Image,
  Video,
  File,
  ChevronRight,
  Home,
  HardDrive,
  ArrowLeft,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { googleDriveApi, type GoogleDriveFile } from '@/lib/api/google-drive-api'
import type { AttachedContent } from './MessageInput'

interface ChatDrivePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectFiles: (files: AttachedContent[]) => void
}

// File type icon mapping
const getFileIcon = (mimeType: string, fileType: string) => {
  if (fileType === 'folder') return <Folder className="h-5 w-5 text-yellow-500" />
  if (mimeType?.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
  if (mimeType?.startsWith('video/')) return <Video className="h-5 w-5 text-red-500" />
  if (mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="h-5 w-5 text-blue-600" />
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileText className="h-5 w-5 text-green-600" />
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return <FileText className="h-5 w-5 text-orange-500" />
  if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
  return <File className="h-5 w-5 text-gray-500" />
}

// Format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ChatDrivePickerModal({
  open,
  onOpenChange,
  onSelectFiles,
}: ChatDrivePickerModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [files, setFiles] = useState<GoogleDriveFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<GoogleDriveFile[]>([])
  const [currentFolderId, setCurrentFolderId] = useState('root')
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Check connection and load files
  useEffect(() => {
    if (open && workspaceId) {
      checkConnectionAndLoadFiles()
    }
  }, [open, workspaceId])

  // Load files when folder changes
  useEffect(() => {
    if (open && workspaceId && isConnected && !isSearching) {
      loadFiles()
    }
  }, [currentFolderId, isConnected])

  const checkConnectionAndLoadFiles = async () => {
    if (!workspaceId) return

    setIsLoading(true)
    try {
      const connection = await googleDriveApi.getConnection(workspaceId)
      setIsConnected(!!connection)

      if (connection) {
        await loadFiles()
      }
    } catch (error) {
      console.error('Failed to check Drive connection:', error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFiles = async () => {
    if (!workspaceId) return

    setIsLoading(true)
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolderId,
        pageSize: 50,
      })
      setFiles(response.files)
    } catch (error) {
      console.error('Failed to load Drive files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!workspaceId || !searchQuery.trim()) {
      setIsSearching(false)
      loadFiles()
      return
    }

    setIsSearching(true)
    setIsLoading(true)
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        query: searchQuery,
        pageSize: 50,
      })
      setFiles(response.files)
    } catch (error) {
      console.error('Failed to search Drive files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFolderClick = (folder: GoogleDriveFile) => {
    setIsSearching(false)
    setSearchQuery('')
    setCurrentFolderId(folder.id)
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  const handleBreadcrumbClick = (index: number) => {
    const item = folderPath[index]
    setIsSearching(false)
    setSearchQuery('')
    setCurrentFolderId(item.id)
    setFolderPath(prev => prev.slice(0, index + 1))
  }

  const handleGoBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1)
      setFolderPath(newPath)
      setCurrentFolderId(newPath[newPath.length - 1].id)
    }
  }

  const toggleFileSelection = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      handleFolderClick(file)
      return
    }

    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id)
      if (isSelected) {
        return prev.filter(f => f.id !== file.id)
      }
      return [...prev, file]
    })
  }

  const handleConfirm = () => {
    const attachedFiles: AttachedContent[] = selectedFiles.map(file => ({
      id: file.id,
      title: file.name,
      type: 'drive' as const,
      subtitle: formatFileSize(file.size),
      driveFileUrl: file.webViewLink,
      driveThumbnailUrl: file.thumbnailLink,
      driveMimeType: file.mimeType,
      driveFileSize: file.size,
    }))

    onSelectFiles(attachedFiles)
    handleClose()
  }

  const handleClose = () => {
    setSelectedFiles([])
    setCurrentFolderId('root')
    setFolderPath([{ id: 'root', name: 'My Drive' }])
    setSearchQuery('')
    setIsSearching(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Select from Google Drive
          </DialogTitle>
          <DialogDescription>
            Browse and select files to share in the conversation
          </DialogDescription>
        </DialogHeader>

        {isLoading && !files.length ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Google Drive is not connected</p>
            <p className="text-sm text-muted-foreground">
              Ask your workspace admin to connect Google Drive in Apps settings
            </p>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                Search
              </Button>
            </div>

            {/* Breadcrumb / Navigation */}
            {!isSearching && (
              <div className="flex items-center gap-1 text-sm mb-2 overflow-x-auto">
                {folderPath.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGoBack}
                    className="h-7 px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {folderPath.map((item, index) => (
                  <div key={item.id} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBreadcrumbClick(index)}
                      className={cn(
                        "h-7 px-2",
                        index === folderPath.length - 1 && "font-medium"
                      )}
                    >
                      {index === 0 ? <Home className="h-4 w-4 mr-1" /> : null}
                      {item.name}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Search className="h-4 w-4" />
                Search results for "{searchQuery}"
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSearching(false)
                    setSearchQuery('')
                    loadFiles()
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}

            {/* File list */}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 min-h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Folder className="h-12 w-12 mb-2 opacity-50" />
                    <p>No files found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {files.map((file) => {
                      const isSelected = selectedFiles.some(f => f.id === file.id)
                      const isFolder = file.fileType === 'folder'

                      return (
                        <div
                          key={file.id}
                          onClick={() => toggleFileSelection(file)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                            isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted",
                            isFolder && "hover:bg-muted/80"
                          )}
                        >
                          {!isFolder && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleFileSelection(file)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          {isFolder && <div className="w-4" />}

                          <div className="flex-shrink-0">
                            {file.thumbnailLink ? (
                              <img
                                src={file.thumbnailLink}
                                alt=""
                                className="w-8 h-8 object-cover rounded"
                              />
                            ) : (
                              getFileIcon(file.mimeType, file.fileType)
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {isFolder ? 'Folder' : formatFileSize(file.size)}
                              {file.modifiedTime && (
                                <span className="ml-2">
                                  Modified {new Date(file.modifiedTime).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {isFolder && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-md">
                <div className="text-sm font-medium mb-2">
                  Selected ({selectedFiles.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map(file => (
                    <Badge
                      key={file.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 flex items-center gap-1"
                    >
                      {file.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFiles(prev => prev.filter(f => f.id !== file.id))
                        }}
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedFiles.length === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Attach {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChatDrivePickerModal
