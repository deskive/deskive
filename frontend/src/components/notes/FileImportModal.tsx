import { useState, useCallback, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Skeleton } from '../ui/skeleton'
import { Upload, FileText, Link, Loader2, Folder, ChevronRight, Home, AlertCircle, Search, Table, Presentation } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import { notesApi } from '../../lib/api/notes-api'
import { googleDriveApi, type GoogleDriveFile, type GoogleDriveFileType } from '../../lib/api/google-drive-api'
import { cn } from '../../lib/utils'
import mammoth from 'mammoth'

// Google Drive icon component
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className}>
      <path d="M6.6 66.85L15.9 78h55.5l9.3-11.15z" fill="#0066da" />
      <path d="M57.6 0L29.4 0 0 48.1l14.8 18.9 28.8-48.2z" fill="#00ac47" />
      <path d="M29.4 0l28.2 0 29.7 48.1H29.1z" fill="#ea4335" />
      <path d="M29.1 48.1h58.2l-9.2 18.9H14.8z" fill="#00832d" />
      <path d="M57.6 0L29.1 48.1h58.2L57.6 0z" fill="#2684fc" />
      <path d="M0 48.1l14.8 18.9 14.3-18.9z" fill="#ffba00" />
    </svg>
  )
}

// Drive file icon for notes-compatible files
function DriveFileIcon({ fileType, className }: { fileType: GoogleDriveFileType; className?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    folder: <Folder className={cn('text-yellow-500', className)} />,
    document: <FileText className={cn('text-blue-500', className)} />,
    spreadsheet: <Table className={cn('text-green-500', className)} />,
    presentation: <Presentation className={cn('text-orange-500', className)} />,
    pdf: <FileText className={cn('text-red-600', className)} />,
    file: <FileText className={cn('text-gray-500', className)} />,
  }
  return <>{iconMap[fileType] || iconMap.file}</>
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface FileImportModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  parentId?: string
  onNoteCreated?: (noteId: string) => void
}

export function FileImportModal({ isOpen, onClose, workspaceId, parentId, onNoteCreated }: FileImportModalProps) {
  const intl = useIntl()
  const { toast } = useToast()
  const [importType, setImportType] = useState<'file' | 'url' | 'google-drive' | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Google Drive states
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
  const [isLoadingDrive, setIsLoadingDrive] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<string>('root')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDriveFile, setSelectedDriveFile] = useState<GoogleDriveFile | null>(null)

  // Check Google Drive connection when import type changes
  useEffect(() => {
    if (importType === 'google-drive' && workspaceId) {
      checkDriveConnection()
    }
  }, [importType, workspaceId])

  // Load Drive files when folder changes
  useEffect(() => {
    if (importType === 'google-drive' && workspaceId && isConnected) {
      loadDriveFiles()
    }
  }, [importType, workspaceId, isConnected, currentFolder])

  const checkDriveConnection = async () => {
    if (!workspaceId) return
    setIsCheckingConnection(true)
    try {
      const connection = await googleDriveApi.getConnection(workspaceId)
      setIsConnected(!!connection)
    } catch {
      setIsConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const loadDriveFiles = async () => {
    if (!workspaceId) return
    setIsLoadingDrive(true)
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolder,
        query: searchQuery || undefined,
        pageSize: 100,
      })
      // Filter to only show document-compatible files (docs, pdfs, text files, folders)
      const compatibleFiles = response.files.filter(f =>
        f.fileType === 'folder' ||
        f.fileType === 'document' ||
        f.fileType === 'pdf' ||
        f.mimeType?.includes('text/') ||
        f.mimeType?.includes('application/rtf')
      )
      setDriveFiles(compatibleFiles)
    } catch (error) {
      console.error('Failed to load Drive files:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.error' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.failedLoadDrive' }),
        variant: 'destructive',
      })
    } finally {
      setIsLoadingDrive(false)
    }
  }

  const handleConnectDrive = async () => {
    if (!workspaceId) return
    try {
      const returnUrl = window.location.href
      const { authorizationUrl } = await googleDriveApi.getAuthUrl(workspaceId, returnUrl)
      window.location.href = authorizationUrl
    } catch {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.error' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.failedConnectDrive' }),
        variant: 'destructive',
      })
    }
  }

  const handleNavigateToFolder = (folderId: string, folderName?: string) => {
    if (folderId === 'root') {
      setCurrentFolder('root')
      setBreadcrumbs([])
    } else {
      if (folderName) {
        const existingIndex = breadcrumbs.findIndex((b) => b.id === folderId)
        if (existingIndex >= 0) {
          setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1))
        } else {
          setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }])
        }
      }
      setCurrentFolder(folderId)
    }
    setSelectedDriveFile(null)
  }

  const handleDriveFileClick = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      handleNavigateToFolder(file.id, file.name)
    } else {
      setSelectedDriveFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleClose = useCallback(() => {
    setImportType(null)
    setTitle('')
    setUrl('')
    setSelectedFile(null)
    setSelectedDriveFile(null)
    setCurrentFolder('root')
    setBreadcrumbs([])
    setSearchQuery('')
    setIsProcessing(false)
    onClose()
  }, [onClose])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, '')) // Remove file extension
    }
  }, [])

  // Check if file is a PDF
  const isPdfFile = (file: File): boolean => {
    return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
  }

  // Process non-PDF files locally (TXT, Markdown, Word)
  const processFileContent = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase()

    // Handle Word documents (.docx)
    if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        return result.value || '<p></p>'
      } catch (error) {
        console.error('Failed to parse Word document:', error)
        throw new Error('Failed to parse Word document. Please ensure the file is a valid .docx file.')
      }
    }

    // Handle plain text files (.txt)
    if (fileName.endsWith('.txt') || file.type === 'text/plain') {
      const content = await file.text()
      // Convert plain text to HTML paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim())
      if (paragraphs.length === 0) {
        return `<p>${content.replace(/\n/g, '<br>')}</p>`
      }
      return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
    }

    // Handle Markdown files (.md)
    if (fileName.endsWith('.md') || file.type === 'text/markdown') {
      const content = await file.text()
      // Simple markdown to HTML conversion
      let html = content
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '')
          return `<pre><code>${code}</code></pre>`
        })
        // Inline code
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
        // Unordered lists
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Blockquotes
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        // Tables (basic support)
        .replace(/^\|(.+)\|$/gm, (match) => {
          const cells = match.split('|').filter(c => c.trim())
          if (cells.every(c => /^[\s\-:]+$/.test(c))) {
            return '' // Skip separator row
          }
          const cellHtml = cells.map(c => `<td style="border: 1px solid #ddd; padding: 8px;">${c.trim()}</td>`).join('')
          return `<tr>${cellHtml}</tr>`
        })
        // Paragraphs (lines that don't start with HTML tags)
        .split('\n')
        .map(line => {
          const trimmed = line.trim()
          if (!trimmed) return ''
          if (trimmed.startsWith('<')) return trimmed
          return `<p>${trimmed}</p>`
        })
        .join('\n')

      // Wrap consecutive <li> elements in <ul>
      html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

      // Wrap consecutive <tr> elements in <table>
      html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<table style="border-collapse: collapse; width: 100%;">${match}</table>`)

      return html || '<p></p>'
    }

    // For other file types, try to read as text
    try {
      const content = await file.text()
      return `<p>${content.replace(/\n/g, '<br>')}</p>`
    } catch {
      throw new Error('Unable to read file content')
    }
  }

  const handleImport = useCallback(async () => {
    if (!title.trim()) {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.titleRequired' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.titleRequiredMessage' }),
        variant: 'destructive',
      })
      return
    }

    if (!workspaceId) {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.error' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.noWorkspace' }),
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      let noteId: string | undefined

      if (importType === 'file' && selectedFile) {
        // Check if it's a PDF - use backend processing
        if (isPdfFile(selectedFile)) {
          const result = await notesApi.importPdf(workspaceId, selectedFile, {
            title: title.trim(),
            parentId,
            tags: ['pdf', 'imported'],
            extractImages: true,
          })

          noteId = result.noteId

          toast({
            title: intl.formatMessage({ id: 'modules.notes.fileImport.pdfImportSuccess' }),
            description: result.message || intl.formatMessage({ id: 'modules.notes.fileImport.pdfImportDescription' }, { pageCount: result.pageCount, hasTable: result.hasTable, imageCount: result.imageCount }),
          })
        } else {
          // Process other file types locally
          const htmlContent = await processFileContent(selectedFile)

          const newNote = await notesApi.createNote(workspaceId, {
            title: title.trim(),
            content: htmlContent,
            parent_id: parentId,
            tags: ['imported'],
          })

          noteId = newNote.id

          toast({
            title: intl.formatMessage({ id: 'modules.notes.fileImport.importSuccessful' }),
            description: intl.formatMessage({ id: 'modules.notes.fileImport.importedAsNewNote' }),
          })
        }
      } else if (importType === 'url' && url) {
        // Use backend to fetch and extract content from URL
        const result = await notesApi.importUrl(workspaceId, {
          url: url.trim(),
          title: title.trim() || undefined,
          parentId,
          tags: ['web', 'imported'],
        })

        noteId = result.noteId

        toast({
          title: intl.formatMessage({ id: 'modules.notes.fileImport.urlImportSuccess' }),
          description: result.message || intl.formatMessage({ id: 'modules.notes.fileImport.urlImportDescription' }, { siteName: result.siteName || intl.formatMessage({ id: 'modules.notes.fileImport.website' }) }),
        })
      } else if (importType === 'google-drive' && selectedDriveFile) {
        // Import from Google Drive - use backend endpoint
        const result = await notesApi.importFromGoogleDrive(workspaceId, {
          fileId: selectedDriveFile.id,
          title: title.trim(),
          parentId,
          tags: ['google-drive', 'imported'],
        })

        noteId = result.noteId

        toast({
          title: intl.formatMessage({ id: 'modules.notes.fileImport.driveImportSuccess' }),
          description: result.message || intl.formatMessage({ id: 'modules.notes.fileImport.driveImportDescription' }, { fileName: selectedDriveFile.name }),
        })
      }

      // Call the callback with the new note ID
      if (noteId && onNoteCreated) {
        onNoteCreated(noteId)
      }

      handleClose()
    } catch (error) {
      console.error('Import failed:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.importFailed' }),
        description: error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.notes.fileImport.importFailedMessage' }),
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [title, importType, selectedFile, selectedDriveFile, url, workspaceId, parentId, handleClose, onNoteCreated, toast])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'modules.notes.fileImport.importContent' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!importType ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.notes.fileImport.chooseImportMethod' })}
              </p>

              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3"
                  onClick={() => setImportType('file')}
                >
                  <FileText className="h-8 w-8" />
                  <span>{intl.formatMessage({ id: 'modules.notes.fileImport.importFile' })}</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3"
                  onClick={() => setImportType('url')}
                >
                  <Link className="h-8 w-8" />
                  <span>{intl.formatMessage({ id: 'modules.notes.fileImport.importURL' })}</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3"
                  onClick={() => setImportType('google-drive')}
                >
                  <GoogleDriveIcon className="h-8 w-8" />
                  <span>{intl.formatMessage({ id: 'modules.notes.fileImport.googleDrive' })}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportType(null)}
              >
                {intl.formatMessage({ id: 'modules.notes.fileImport.back' })}
              </Button>

              <div>
                <Label htmlFor="title">{intl.formatMessage({ id: 'modules.notes.fileImport.noteTitle' })}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'modules.notes.fileImport.noteTitlePlaceholder' })}
                  autoFocus
                />
              </div>

              {importType === 'file' && (
                <div>
                  <Label htmlFor="file">{intl.formatMessage({ id: 'modules.notes.fileImport.selectFile' })}</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".txt,.md,.doc,.docx,.pdf"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {intl.formatMessage({ id: 'modules.notes.fileImport.supportedFilesPDF' })}
                  </p>
                </div>
              )}

              {importType === 'url' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="url">{intl.formatMessage({ id: 'modules.notes.fileImport.url' })}</Label>
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'modules.notes.fileImport.urlPlaceholder' })}
                    />
                  </div>
                  <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-md">
                    <p className="font-medium text-foreground">{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLsTitle' })}</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.news' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.blogs' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.wikipedia' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.docs' })}</li>
                    </ul>
                    <p className="text-amber-600 dark:text-amber-500 mt-2">
                      {intl.formatMessage({ id: 'modules.notes.fileImport.urlLimitation' })}
                    </p>
                  </div>
                </div>
              )}

              {importType === 'google-drive' && (
                <>
                  {isCheckingConnection ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !isConnected ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        {intl.formatMessage({ id: 'modules.notes.fileImport.connectDrivePrompt' })}
                      </p>
                      <Button onClick={handleConnectDrive}>
                        {intl.formatMessage({ id: 'modules.notes.fileImport.connectDriveButton' })}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Search */}
                      <form onSubmit={(e) => { e.preventDefault(); loadDriveFiles(); }} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={intl.formatMessage({ id: 'modules.notes.fileImport.searchDocuments' })}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </form>

                      {/* Breadcrumbs */}
                      <div className="flex items-center gap-1 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleNavigateToFolder('root')}
                        >
                          <Home className="w-4 h-4" />
                        </Button>
                        {breadcrumbs.map((item, index) => (
                          <div key={item.id} className="flex items-center">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-7 px-2',
                                index === breadcrumbs.length - 1 && 'font-medium'
                              )}
                              onClick={() => handleNavigateToFolder(item.id, item.name)}
                            >
                              {item.name}
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* File List */}
                      <ScrollArea className="h-48 border rounded-lg">
                        {isLoadingDrive ? (
                          <div className="p-4 space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="flex items-center gap-3 p-2">
                                <Skeleton className="w-5 h-5" />
                                <Skeleton className="h-4 flex-1" />
                              </div>
                            ))}
                          </div>
                        ) : driveFiles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                            <Folder className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">{intl.formatMessage({ id: 'modules.notes.fileImport.noDocuments' })}</p>
                          </div>
                        ) : (
                          <div className="p-2">
                            {driveFiles
                              .sort((a, b) => {
                                if (a.fileType === 'folder' && b.fileType !== 'folder') return -1
                                if (a.fileType !== 'folder' && b.fileType === 'folder') return 1
                                return a.name.localeCompare(b.name)
                              })
                              .map((file) => (
                                <div
                                  key={file.id}
                                  className={cn(
                                    'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
                                    selectedDriveFile?.id === file.id && 'bg-primary/10'
                                  )}
                                  onClick={() => handleDriveFileClick(file)}
                                >
                                  <DriveFileIcon fileType={file.fileType} className="w-5 h-5" />
                                  <span className="flex-1 truncate text-sm">{file.name}</span>
                                  {file.fileType === 'folder' && (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </ScrollArea>

                      {selectedDriveFile && (
                        <p className="text-xs text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.notes.fileImport.selectedFile' }, { fileName: selectedDriveFile.name })}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  {intl.formatMessage({ id: 'modules.notes.fileImport.cancel' })}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    isProcessing ||
                    !title.trim() ||
                    (importType === 'file' && !selectedFile) ||
                    (importType === 'url' && !url.trim()) ||
                    (importType === 'google-drive' && !selectedDriveFile)
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {intl.formatMessage({ id: 'modules.notes.fileImport.importing' })}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.notes.fileImport.import' })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
