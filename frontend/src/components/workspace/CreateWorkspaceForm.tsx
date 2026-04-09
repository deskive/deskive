import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { WorkspaceIconUpload } from './WorkspaceIconUpload'
import { useCreateWorkspace, useUploadWorkspaceLogo } from '../../lib/api/workspace-api'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '../ui/alert'

interface CreateWorkspaceFormData {
  name: string
  icon: File | null
}

export function CreateWorkspaceForm() {
  const navigate = useNavigate()
  const createWorkspaceMutation = useCreateWorkspace()
  const uploadLogoMutation = useUploadWorkspaceLogo()

  const [formData, setFormData] = useState<CreateWorkspaceFormData>({
    name: '',
    icon: null,
  })
  const [errors, setErrors] = useState<Partial<CreateWorkspaceFormData>>({})
  const [isSuccess, setIsSuccess] = useState(false)
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateWorkspaceFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Workspace name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Workspace name must be less than 50 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleIconChange = async (file: File | null) => {
    console.log('🖼️ Icon changed:', file?.name)
    setFormData(prev => ({ ...prev, icon: file }))

    if (file) {
      try {
        console.log('📤 Uploading icon immediately...')
        const result = await uploadLogoMutation.mutateAsync(file)
        console.log('✅ Icon uploaded successfully:', result.url)
        setUploadedLogoUrl(result.url)
      } catch (error) {
        console.error('❌ Failed to upload icon:', error)
        setUploadedLogoUrl(null)
      }
    } else {
      setUploadedLogoUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔍 Form submitted with data:', formData)
    console.log('🔍 Uploaded logo URL:', uploadedLogoUrl)

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    try {
      const workspaceData = {
        name: formData.name.trim(),
        logo: uploadedLogoUrl || undefined,
      }

      console.log('📤 Creating workspace with data:', workspaceData)

      const workspace = await createWorkspaceMutation.mutateAsync(workspaceData)

      console.log('✅ Workspace created successfully:', workspace)
      console.log('✅ Workspace ID:', workspace.id)

      setIsSuccess(true)

      // Clear any previous errors
      setErrors({})

      // Note: current_workspace is already stored in localStorage by the mutation hook
      // Store the workspace ID for quick access as well
      localStorage.setItem('lastWorkspaceId', workspace.id)

      // Redirect to the new workspace dashboard after a brief success animation (1.5 seconds)
      // The mutation hook will also invalidate and refetch the workspaces list
      const dashboardUrl = `/workspaces/${workspace.id}/dashboard`
      console.log('📍 Will redirect to:', dashboardUrl)

      setTimeout(() => {
        console.log('➡️ Redirecting now to:', dashboardUrl)
        navigate(dashboardUrl, { replace: true })
      }, 1500)
    } catch (error: any) {
      console.error('❌ Failed to create workspace:', error)
      setIsSuccess(false)
    }
  }

  const handleInputChange = (field: keyof CreateWorkspaceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 px-4 sm:px-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Workspace Created!
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-2">
                Welcome to {formData.name}. Redirecting you to your new workspace...
              </p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center pb-3 px-4 sm:px-6 pt-4">
        <CardTitle className="text-lg sm:text-xl">Create a workspace</CardTitle>
        <CardDescription className="text-sm">
          Workspaces are where your team collaborates. Name it after your company or team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workspace Icon Upload */}
          <div className="flex justify-center">
            <WorkspaceIconUpload
              onIconChange={handleIconChange}
            />
          </div>

          {/* Workspace Name */}
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="workspace-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Acme Design Studio, My Company"
              className={`h-10 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Error Alert */}
          {createWorkspaceMutation.isError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {createWorkspaceMutation.error?.message || 'Failed to create workspace. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-10 text-sm font-medium"
            disabled={createWorkspaceMutation.isPending || uploadLogoMutation.isPending || !formData.name.trim()}
          >
            {createWorkspaceMutation.isPending || uploadLogoMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadLogoMutation.isPending ? 'Uploading...' : 'Creating...'}</span>
              </div>
            ) : (
              'Create Workspace'
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="text-center pt-3 border-t">
          <p className="text-xs text-gray-500">
            You can always change these settings later in workspace preferences
          </p>
        </div>
      </CardContent>
    </Card>
  )
}