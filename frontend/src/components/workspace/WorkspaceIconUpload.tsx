import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Camera, Upload, X, Building2 } from 'lucide-react'

interface WorkspaceIconUploadProps {
  onIconChange: (file: File | null) => void
}

export function WorkspaceIconUpload({ onIconChange }: WorkspaceIconUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    console.log('🔍 File selected in WorkspaceIconUpload:', file.name, file.type, file.size)
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    console.log('✅ File validation passed, setting preview and calling onIconChange')
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    onIconChange(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeIcon = () => {
    setPreview(null)
    onIconChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative w-20 h-20 mx-auto rounded-xl border-2 border-dashed transition-all cursor-pointer group ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : preview
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Workspace icon preview"
              className="w-full h-full rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeIcon()
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all flex items-center justify-center">
              <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Building2 className="w-6 h-6 mb-1" />
            <Upload className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          className="text-xs h-7"
        >
          {preview ? 'Change Icon' : 'Upload Icon'}
        </Button>
        <p className="text-xs text-gray-500 mt-1">
          Optional • PNG, JPG up to 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}