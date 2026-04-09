import React from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { ViewType } from '../layout/NavigationRail'
import { CalendarRightSidebar } from '../calendar/CalendarRightSidebar'
import { ProjectsRightSidebar } from '../projects/ProjectsRightSidebar'
import { VideoRightSidebar } from '@/components/video-call'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useIntl } from 'react-intl'
import { useNotesStore } from '../../stores/notesStore'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useAuth } from '@/contexts/AuthContext'
import { notesApi } from '@/lib/api/notes-api'
import { googleDriveApi } from '@/lib/api/google-drive-api'
import { GoogleDriveExportModal } from '../files/GoogleDriveExportModal'
import { toast } from 'sonner'
import html2pdf from 'html2pdf.js'
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  BarChart3,
  Zap,
  Target,
  Star,
  Video,
  Upload,
  Loader2
} from 'lucide-react'

interface RightSidebarProps {
  currentView: ViewType
  isCollapsed: boolean
}

export function NotesRightSidebar() {
    const intl = useIntl()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const storeState = useNotesStore()
  const { ui, notes } = storeState
  const [enrichedNote, setEnrichedNote] = React.useState<any>(null)
  const [isLoadingNote, setIsLoadingNote] = React.useState(false)

  // Google Drive export state
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = React.useState(false)
  const [showDriveExportModal, setShowDriveExportModal] = React.useState(false)
  const [isExportingToDrive, setIsExportingToDrive] = React.useState(false)

  // Fetch workspace members to get user details
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Check Google Drive connection status
  React.useEffect(() => {
    const checkDriveConnection = async () => {
      if (!workspaceId) return
      try {
        const connection = await googleDriveApi.getConnection(workspaceId)
        setIsGoogleDriveConnected(connection?.isActive || false)
      } catch {
        setIsGoogleDriveConnected(false)
      }
    }
    checkDriveConnection()
  }, [workspaceId])

  // Fetch the note from API only when selected note changes (initial load)
  React.useEffect(() => {
    const fetchNoteData = async () => {
      if (ui.selectedNoteId && workspaceId) {
        // Set loading state immediately when note selection changes
        setIsLoadingNote(true)
        setEnrichedNote(null) // Clear previous note data immediately

        try {
          const note = await notesApi.getNoteByWorkspace(workspaceId, ui.selectedNoteId)
          console.log('🎯 [RightSidebar] Fetched note from API:', note)
          setEnrichedNote(note)
        } catch (error) {
          console.error('Failed to fetch note for sidebar:', error)
          setEnrichedNote(null)
        } finally {
          setIsLoadingNote(false)
        }
      } else {
        setEnrichedNote(null)
        setIsLoadingNote(false)
      }
    }

    fetchNoteData()
  }, [ui.selectedNoteId, workspaceId])

  // Get the latest note from store - this has the updated content from the editor
  const storeNote = notes.find(n => n.id === ui.selectedNoteId)

  // Merge store note (for content) with enriched note (for author/collaborators)
  // Prioritize enrichedNote's author and collaborators since they come from fresh API call
  const selectedNote = storeNote
    ? {
        ...storeNote,
        // Use enriched data if available (fresher from API), otherwise use store data
        author: enrichedNote?.author || (storeNote as any).author,
        collaborators: enrichedNote?.collaborators || (storeNote as any).collaborators,
        author_id: enrichedNote?.author_id || (storeNote as any).author_id,
        collaborative_data: enrichedNote?.collaborative_data || (storeNote as any).collaborative_data
      }
    : enrichedNote
  console.log("🎯 [RightSidebar] Using enriched note:", selectedNote);
  // Immediate log after retrieval
  if (selectedNote && ui.selectedNoteId) {
    console.log('🔥 IMMEDIATE - Note just retrieved:', {
      id: selectedNote.id,
      author_id: (selectedNote as any).author_id,
      created_by: (selectedNote as any).created_by,
      collaborative_data: (selectedNote as any).collaborative_data,
      hasAuthorId: 'author_id' in selectedNote,
      hasCollaborativeData: 'collaborative_data' in selectedNote
    })
    console.log('🔥 Raw note from array:', notes.find(n => n.id === ui.selectedNoteId))
    console.log('🔥 All notes in store:', notes.map(n => ({ id: n.id, author_id: (n as any).author_id })))
  }

  const currentUserId = user?.id

  // Debug: Log selected note and workspace members
  React.useEffect(() => {
    if (selectedNote) {
      console.log('🎯 [RightSidebar] Selected Note from Store:', selectedNote)
      console.log('🎯 [RightSidebar] Note Fields Check:', {
        author_id: (selectedNote as any).author_id,
        created_by: (selectedNote as any).created_by,
        createdBy: selectedNote.createdBy,
        collaborative_data: (selectedNote as any).collaborative_data,
        collaborativeData: selectedNote.collaborativeData,
        allKeys: Object.keys(selectedNote)
      })
      console.log('👥 [RightSidebar] Workspace Members:', workspaceMembers)
      console.log('👥 [RightSidebar] Workspace Members Count:', workspaceMembers.length)
      console.log('👤 [RightSidebar] Current User:', user)
    }
  }, [selectedNote, workspaceMembers, user])


  if (!selectedNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <div className="bg-muted/20 rounded-full p-4 mb-4">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="font-medium mb-2">{intl.formatMessage({ id: 'modules.notes.rightSidebar.noNoteSelected' })}</h3>
        <p className="text-sm">
          {intl.formatMessage({ id: 'modules.notes.rightSidebar.selectNotePrompt' })}
        </p>
      </div>
    )
  }

  // Helper function to extract text from content
  const extractTextFromContent = (content: any): string => {
    if (!content || !Array.isArray(content)) return ''

    return content.map((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        // Check for HTML content first
        const htmlItem = block.content.find((item: any) => item.html)
        if (htmlItem && htmlItem.html) {
          // Strip HTML tags and decode entities
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = htmlItem.html
          return tempDiv.textContent || tempDiv.innerText || ''
        }

        // Fallback to text content
        return block.content.map((item: any) => item.text || '').join('')
      }
      return ''
    }).join('\n')
  }

  // Simulate formatDistanceToNow function
  const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInDays > 0) {
      return options?.addSuffix ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago` : `${diffInDays} day${diffInDays > 1 ? 's' : ''}`
    }
    if (diffInHours > 0) {
      return options?.addSuffix ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago` : `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`
    }
    return options?.addSuffix ? 'just now' : '0 minutes'
  }

  // Helper function to extract HTML from content
  const extractHtmlFromContent = (content: any): string => {
    if (!content) return '<p>No content available</p>'

    // If content is already a string, return it
    if (typeof content === 'string') {
      return content
    }

    // If it's not an array, try to convert it
    if (!Array.isArray(content)) {
      return '<p>Unable to parse content</p>'
    }

    // Process TipTap JSON structure
    const processNode = (node: any): string => {
      if (!node) return ''

      const { type, content, text, marks, attrs } = node

      // Handle text nodes
      if (type === 'text' || text) {
        let textContent = text || ''

        // Apply marks (bold, italic, etc.)
        if (marks && Array.isArray(marks)) {
          marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                textContent = `<strong>${textContent}</strong>`
                break
              case 'italic':
                textContent = `<em>${textContent}</em>`
                break
              case 'underline':
                textContent = `<u>${textContent}</u>`
                break
              case 'strike':
                textContent = `<s>${textContent}</s>`
                break
              case 'code':
                textContent = `<code>${textContent}</code>`
                break
              case 'link':
                const href = mark.attrs?.href || '#'
                textContent = `<a href="${href}" target="_blank">${textContent}</a>`
                break
            }
          })
        }

        return textContent
      }

      // Handle block nodes
      switch (type) {
        case 'paragraph':
          return `<p>${content ? content.map(processNode).join('') : '<br>'}</p>`

        case 'heading':
          const level = attrs?.level || 1
          return `<h${level}>${content ? content.map(processNode).join('') : ''}</h${level}>`

        case 'bulletList':
          return `<ul>${content ? content.map(processNode).join('') : ''}</ul>`

        case 'orderedList':
          return `<ol>${content ? content.map(processNode).join('') : ''}</ol>`

        case 'listItem':
          return `<li>${content ? content.map(processNode).join('') : ''}</li>`

        case 'blockquote':
          return `<blockquote>${content ? content.map(processNode).join('') : ''}</blockquote>`

        case 'codeBlock':
          const code = content ? content.map(processNode).join('') : ''
          return `<pre><code>${code}</code></pre>`

        case 'hardBreak':
          return '<br>'

        case 'horizontalRule':
          return '<hr>'

        case 'image':
          const src = attrs?.src || ''
          const alt = attrs?.alt || ''
          return `<img src="${src}" alt="${alt}" />`

        case 'table':
          return `<table>${content ? content.map(processNode).join('') : ''}</table>`

        case 'tableRow':
          return `<tr>${content ? content.map(processNode).join('') : ''}</tr>`

        case 'tableCell':
        case 'tableHeader':
          const tag = type === 'tableHeader' ? 'th' : 'td'
          return `<${tag}>${content ? content.map(processNode).join('') : ''}</${tag}>`

        case 'doc':
          // Root document node
          return content ? content.map(processNode).join('') : ''

        default:
          // For unknown types, try to process content
          if (content && Array.isArray(content)) {
            return content.map(processNode).join('')
          }
          return ''
      }
    }

    try {
      // If it's an array of nodes, check for different formats
      if (Array.isArray(content)) {
        // Check if it's the blockContent format from editor: [{type: 'html', content: [{html: '...'}]}]
        if (content.length > 0 && content[0].type === 'html' && content[0].content) {
          const htmlBlocks = content.map((block: any) => {
            if (block.content && Array.isArray(block.content)) {
              const htmlItem = block.content.find((item: any) => item.html)
              if (htmlItem && htmlItem.html) {
                return htmlItem.html
              }
            }
            return ''
          }).filter(Boolean)

          if (htmlBlocks.length > 0) {
            return htmlBlocks.join('')
          }
        }

        // Otherwise, process as TipTap JSON
        const html = content.map(processNode).join('')
        return html || '<p>No content to display</p>'
      }

      // Check if content is already in TipTap JSON format (single doc object)
      if (typeof content === 'object' && content !== null) {
        const docContent = content as { type?: string; content?: any }
        if (docContent.type === 'doc' && docContent.content) {
          return processNode(docContent)
        }
      }

      return '<p>No content to display</p>'
    } catch (error) {
      console.error('Error processing content:', error)
      return '<p>Error processing content for export</p>'
    }
  }

  // Export PDF handler
  const handleExportPDF = async () => {
    if (!selectedNote) {
      console.warn('No note selected for PDF export')
      return
    }

    try {
      console.log('🎯 Starting PDF export for note:', selectedNote.id)
      console.log('📄 Note content structure:', selectedNote.content)

      // Get note title and content
      const noteTitle = Array.isArray(selectedNote.title)
        ? selectedNote.title.map((rt: any) => rt.text || rt).join('')
        : String(selectedNote.title || intl.formatMessage({ id: 'modules.notes.rightSidebar.untitled' }))

      console.log('📝 Note title:', noteTitle)

      const htmlContent = extractHtmlFromContent(selectedNote.content)
      console.log('🎨 Generated HTML length:', htmlContent.length)
      console.log('🎨 HTML preview:', htmlContent.substring(0, 200))

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        console.error('Failed to open print window - popup blocked')
        alert('Please allow popups to export as PDF.\n\nClick the popup blocker icon in your browser address bar and allow popups from this site.')
        return
      }

      console.log('✅ Print window opened successfully')

      // Escape special characters in title and content
      const escapedTitle = noteTitle.replace(/[<>]/g, '')
      const safeHtmlContent = htmlContent || '<p><em>This note has no content</em></p>'

      // Detect if content contains RTL characters (Arabic, Hebrew, etc.)
      const hasRTL = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(safeHtmlContent + noteTitle)

      // Write HTML content with improved styles
      const htmlDocument = `
        <!DOCTYPE html>
        <html lang="en" ${hasRTL ? 'dir="auto"' : ''}>
          <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapedTitle}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Noto Sans Arabic', sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                padding: 40px 60px;
                max-width: 850px;
                margin: 0 auto;
                background: #ffffff;
                direction: ${hasRTL ? 'auto' : 'ltr'};
              }
              h1.document-title {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 8px;
                color: #111;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 12px;
              }
              .document-meta {
                font-size: 12px;
                color: #666;
                margin-bottom: 32px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e5e5;
              }
              .content {
                font-size: 15px;
                color: #2d2d2d;
                direction: auto;
                unicode-bidi: plaintext;
              }
              .content p {
                margin-bottom: 14px;
                line-height: 1.7;
                direction: auto;
                unicode-bidi: plaintext;
              }
              .content h1 {
                font-size: 28px;
                font-weight: 700;
                margin-top: 28px;
                margin-bottom: 16px;
                color: #111;
              }
              .content h2 {
                font-size: 24px;
                font-weight: 600;
                margin-top: 24px;
                margin-bottom: 14px;
                color: #222;
              }
              .content h3 {
                font-size: 20px;
                font-weight: 600;
                margin-top: 20px;
                margin-bottom: 12px;
                color: #333;
              }
              .content h4 {
                font-size: 18px;
                font-weight: 600;
                margin-top: 16px;
                margin-bottom: 10px;
                color: #444;
              }
              .content ul, .content ol {
                margin-left: 28px;
                margin-bottom: 14px;
                padding-left: 8px;
              }
              .content li {
                margin-bottom: 8px;
                line-height: 1.6;
              }
              .content blockquote {
                border-left: 4px solid #3b82f6;
                padding-left: 20px;
                margin: 20px 0;
                color: #555;
                font-style: italic;
                background: #f8f9fa;
                padding: 12px 20px;
                border-radius: 4px;
              }
              .content pre {
                background-color: #f5f5f5;
                padding: 16px;
                border-radius: 6px;
                overflow-x: auto;
                margin: 16px 0;
                border: 1px solid #e5e5e5;
                font-size: 13px;
              }
              .content code {
                background-color: #f0f0f0;
                padding: 3px 8px;
                border-radius: 4px;
                font-family: 'Courier New', 'Monaco', monospace;
                font-size: 13px;
                color: #d63384;
              }
              .content pre code {
                background: none;
                padding: 0;
                color: #2d2d2d;
              }
              .content strong {
                font-weight: 700;
                color: #111;
              }
              .content em {
                font-style: italic;
              }
              .content u {
                text-decoration: underline;
              }
              .content s {
                text-decoration: line-through;
              }
              .content a {
                color: #3b82f6;
                text-decoration: none;
                border-bottom: 1px solid #3b82f6;
              }
              .content a:hover {
                color: #2563eb;
              }
              .content img {
                max-width: 100%;
                height: auto;
                margin: 20px 0;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .content hr {
                border: none;
                border-top: 2px solid #e5e5e5;
                margin: 24px 0;
              }
              .content table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
              }
              .content table th,
              .content table td {
                border: 1px solid #ddd;
                padding: 10px 14px;
                text-align: left;
              }
              .content table th {
                background-color: #f5f5f5;
                font-weight: 600;
                color: #111;
              }
              .content table tr:nth-child(even) {
                background-color: #fafafa;
              }
              @media print {
                body {
                  padding: 15px;
                }
                @page {
                  margin: 15mm;
                  size: A4;
                }
                .content {
                  page-break-inside: avoid;
                }
                .content h1, .content h2, .content h3 {
                  page-break-after: avoid;
                }
              }
            </style>
          </head>
          <body>
            <h1 class="document-title">${escapedTitle}</h1>
            <div class="document-meta">
              Exported from Deskive • ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div class="content">
              ${safeHtmlContent}
            </div>
          </body>
        </html>
      `

      // Open document with UTF-8 charset
      printWindow.document.open('text/html', 'replace')
      printWindow.document.write(htmlDocument)
      printWindow.document.close()

      console.log('📄 HTML document written to print window')

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        console.log('🎯 Print window loaded, triggering print dialog...')
        setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
            console.log('✅ Print dialog opened successfully')
          } catch (printError) {
            console.error('❌ Print failed:', printError)
          }
        }, 500)
      }

      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          try {
            printWindow.focus()
            printWindow.print()
            console.log('✅ Print dialog opened (fallback)')
          } catch (printError) {
            console.error('❌ Fallback print failed:', printError)
          }
        }
      }, 1000)

    } catch (error) {
      console.error('❌ Failed to export PDF:', error)
      alert('Failed to export PDF. Please check the console for details and try again.')
    }
  }

  // Export to Google Drive handler
  const handleExportToDrive = async (targetFolderId?: string) => {
    if (!selectedNote || !workspaceId) {
      toast.error('No note selected')
      return
    }

    setIsExportingToDrive(true)

    try {
      // Get note title
      const noteTitle = Array.isArray(selectedNote.title)
        ? selectedNote.title.map((rt: any) => rt.text || rt).join('')
        : String(selectedNote.title || intl.formatMessage({ id: 'modules.notes.rightSidebar.untitled' }))

      const htmlContent = extractHtmlFromContent(selectedNote.content)

      // Detect if content contains RTL characters
      const hasRTL = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(htmlContent + noteTitle)

      // Create complete HTML document
      const escapedTitle = noteTitle.replace(/[<>]/g, '')
      const safeHtmlContent = htmlContent || '<p><em>This note has no content</em></p>'

      // Create a temporary container for html2pdf
      const container = document.createElement('div')
      container.innerHTML = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 20px; ${hasRTL ? 'direction: rtl;' : ''}">
          <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px; border-bottom: 3px solid #3b82f6; padding-bottom: 12px;">${escapedTitle}</h1>
          <div style="font-size: 11px; color: #666; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5;">
            Exported from Deskive • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style="font-size: 14px;">${safeHtmlContent}</div>
        </div>
      `

      // Generate PDF using html2pdf
      const pdfBlob = await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${noteTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '').trim()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(container)
        .outputPdf('blob')

      // Create File object from blob
      const sanitizedFileName = `${noteTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '').trim() || 'Untitled'}.pdf`
      const file = new File([pdfBlob], sanitizedFileName, { type: 'application/pdf' })

      // Upload to Google Drive
      const result = await googleDriveApi.uploadFile(workspaceId, file, {
        parentId: targetFolderId,
        description: `Note exported from Deskive on ${new Date().toISOString()}`
      })

      toast.success(intl.formatMessage(
        { id: 'modules.notes.rightSidebar.exportSuccess', defaultMessage: 'Note exported to Google Drive as PDF' }
      ))
      setShowDriveExportModal(false)

      console.log('Note exported to Google Drive as PDF:', result)
    } catch (error) {
      console.error('Failed to export note to Google Drive:', error)
      toast.error(intl.formatMessage(
        { id: 'modules.notes.rightSidebar.exportFailed', defaultMessage: 'Failed to export note to Google Drive' }
      ))
    } finally {
      setIsExportingToDrive(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 p-4">
      {/* Document Info */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {intl.formatMessage({ id: 'modules.notes.rightSidebar.documentInfo' })}
        </h3>

        <div className="space-y-3">
          {isLoadingNote ? (
            /* Loading skeleton for document info */
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-muted rounded animate-pulse mb-3" />
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="pt-3 border-t">
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : selectedNote ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">
                {Array.isArray(selectedNote.title)
                  ? selectedNote.title.map((rt: any) => rt.text || rt).join('')
                  : String(selectedNote.title || intl.formatMessage({ id: 'modules.notes.rightSidebar.untitled' }))}
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {intl.formatMessage({ id: 'modules.notes.rightSidebar.createdAgo' }, { time: formatDistanceToNow(new Date(selectedNote.createdAt)) })} •
                {intl.formatMessage({ id: 'modules.notes.rightSidebar.lastEdited' }, { time: formatDistanceToNow(new Date(selectedNote.updatedAt)) })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedNote.tags?.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {selectedNote.isFavorite && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {intl.formatMessage({ id: 'modules.notes.rightSidebar.favorite' })}
                  </Badge>
                )}
                {selectedNote.isArchived && (
                  <Badge variant="outline" className="text-xs">
                    {intl.formatMessage({ id: 'modules.notes.rightSidebar.archived' })}
                  </Badge>
                )}
              </div>
              {selectedNote.content && selectedNote.content.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {selectedNote.content.length} {selectedNote.content.length !== 1 ? intl.formatMessage({ id: "modules.notes.rightSidebar.blocks" }) : intl.formatMessage({ id: "modules.notes.rightSidebar.block" })} •
                    {extractTextFromContent(selectedNote.content).length} {intl.formatMessage({ id: "modules.notes.rightSidebar.characters" })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.notes.rightSidebar.noNoteSelected' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collaborators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.notes.rightSidebar.collaborators' })}
          </h3>
        </div>

        <div className="space-y-2">
          {isLoadingNote ? (
            /* Loading skeleton */
            <>
              {/* Owner skeleton */}
              <div className="flex items-center gap-3 p-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 bg-muted rounded animate-pulse" />
              </div>

              {/* Collaborator skeleton */}
              <div className="flex items-center gap-3 p-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-14 bg-muted rounded animate-pulse" />
              </div>
            </>
          ) : selectedNote ? (
            <>
              {/* Owner - from backend author field */}
              {(() => {
                const author = (selectedNote as any).author

                if (!author) {
                  console.log('⚠️ No author info found in note')
                  return (
                    <div className="text-center py-2 text-xs text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.notes.rightSidebar.authorNotAvailable' })}
                    </div>
                  )
                }

                console.log('👤 Author from API:', author)

                return (
                  <div className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={author.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(author.name || author.email || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {author.id === currentUserId ? intl.formatMessage({ id: 'modules.notes.rightSidebar.you' }) : (author.name || author.email || 'Unknown User')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.notes.rightSidebar.owner' })} • {intl.formatMessage({ id: 'modules.notes.rightSidebar.createdAgo' }, { time: formatDistanceToNow(new Date(selectedNote.createdAt)) })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{intl.formatMessage({ id: 'modules.notes.rightSidebar.owner' })}</Badge>
                  </div>
                )
              })()}

              {/* Collaborators - from backend collaborators field */}
              {(() => {
                const collaborators = (selectedNote as any).collaborators

                console.log('🤝 Collaborators from API:', collaborators)

                if (!collaborators || !Array.isArray(collaborators) || collaborators.length === 0) {
                  return (
                    <div className="text-center py-2 text-xs text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.notes.rightSidebar.noCollaborators' })}
                    </div>
                  )
                }

                return collaborators.map((collaborator: any) => {
                  return (
                    <div key={collaborator.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={collaborator.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(collaborator.name || collaborator.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {collaborator.id === currentUserId ? intl.formatMessage({ id: 'modules.notes.rightSidebar.you' }) : (collaborator.name || collaborator.email || 'Unknown User')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.notes.rightSidebar.collaborators' })}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {intl.formatMessage({ id: 'modules.notes.rightSidebar.member' })}
                      </Badge>
                    </div>
                  )
                })
              })()}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'modules.notes.rightSidebar.noCollaborators' })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity - Commented out as requested */}
      {/* <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </h3>

        <div className="space-y-3">
          {selectedNote ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={getUserData(selectedNote.createdBy)?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedNote.createdBy}`} />
                  <AvatarFallback className="text-xs">
                    {(getUserData(selectedNote.createdBy)?.name || selectedNote.createdBy || 'U').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm">
                    {selectedNote.createdBy === currentUserId ? intl.formatMessage({ id: 'modules.notes.rightSidebar.you' }) : (getUserData(selectedNote.createdBy)?.name || 'Unknown User')} created this note
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedNote.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {selectedNote.lastEditedBy && selectedNote.updatedAt !== selectedNote.createdAt && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getUserData(selectedNote.lastEditedBy)?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedNote.lastEditedBy}`} />
                    <AvatarFallback className="text-xs">
                      {(getUserData(selectedNote.lastEditedBy)?.name || selectedNote.lastEditedBy || 'U').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm">
                      {selectedNote.lastEditedBy === currentUserId ? intl.formatMessage({ id: 'modules.notes.rightSidebar.you' }) : (getUserData(selectedNote.lastEditedBy)?.name || 'Unknown User')} updated this note
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedNote.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              )}

              {selectedNote.lastSavedAt && selectedNote.lastSavedAt !== selectedNote.updatedAt && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">Note auto-saved</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedNote.lastSavedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No activity to display
            </div>
          )}
        </div>
      </div> */}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{intl.formatMessage({ id: 'modules.notes.rightSidebar.quickActions' })}</h3>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            size="sm"
            onClick={handleExportPDF}
            disabled={!selectedNote}
          >
            <FileText className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.notes.rightSidebar.exportAsPDF' })}
          </Button>

          {/* Export to Google Drive - only show when connected */}
          {isGoogleDriveConnected && (
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => setShowDriveExportModal(true)}
              disabled={!selectedNote || isExportingToDrive}
            >
              {isExportingToDrive ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {intl.formatMessage({ id: 'modules.notes.rightSidebar.exportToDrive', defaultMessage: 'Export to Drive' })}
            </Button>
          )}
        </div>
      </div>

      {/* Google Drive Export Modal */}
      <GoogleDriveExportModal
        isOpen={showDriveExportModal}
        onClose={() => setShowDriveExportModal(false)}
        onExport={handleExportToDrive}
        fileName={
          selectedNote
            ? (Array.isArray(selectedNote.title)
                ? selectedNote.title.map((rt: any) => rt.text || rt).join('')
                : String(selectedNote.title || 'Untitled')
              ).replace(/[^a-zA-Z0-9\u0600-\u06FF\s-_]/g, '').trim() + '.pdf'
            : 'note.pdf'
        }
        isExporting={isExportingToDrive}
      />
    </div>
  )
}

export function RightSidebar({ currentView, isCollapsed }: RightSidebarProps) {
  const getRightSidebarContent = () => {
    switch (currentView) {
      case 'dashboard':
        // TODO: Fetch real dashboard stats from API
        return (
          <>
            {/* Quick Stats */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Today's Overview</h3>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0%</div>
                  <Progress value={0} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    No data
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Review</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed Today</span>
                    <span className="font-semibold text-green-600">0</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Generate Daily Report
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                Set Weekly Goals
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </>
        )

      case 'chat':
        // TODO: Fetch real chat channel info from API
        return (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Thread</h3>
              <p className="text-sm text-muted-foreground">
                Select a message to view thread
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-sm">Channel Info</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Members</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm font-medium">-</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Messages</span>
                      <span className="text-sm font-medium">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-sm">Pinned Messages</h3>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    No pinned messages yet
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )

      case 'calendar':
        return <CalendarRightSidebar />

      case 'projects':
        return <ProjectsRightSidebar projects={[]} allTasks={[]} />

      case 'notes':
        return <NotesRightSidebar />

      case 'video':
        return <VideoRightSidebar />

      case 'files':
        // TODO: Fetch real file storage info from API
        return (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">File Details</h3>
              <p className="text-sm text-muted-foreground">
                Select a file to view details
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-sm">Storage</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>0 GB / 15 GB</span>
                    </div>
                    <Progress value={0} />
                    <p className="text-xs text-muted-foreground">
                      15 GB available
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-sm">Recent Files</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground p-2">No recent files</p>
              </div>
            </div>
          </>
        )

      default:
        return (
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-sm">{currentView} sidebar</p>
            <p className="text-xs mt-2">Coming soon...</p>
          </div>
        )
    }
  }

  return (
    <aside
      className={cn(
        "bg-card/80 backdrop-blur-xl border-l border-border transition-all duration-300 overflow-hidden z-30",
        isCollapsed ? "w-0" : "w-80"
      )}
    >
      <div className="p-6 h-full overflow-y-auto sidebar-scroll">
        {getRightSidebarContent()}
      </div>
    </aside>
  )
}