import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Key, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { authService } from '@/lib/api/auth-api'

export default function ResetPassword() {
  const intl = useIntl()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.invalidToken' }))
    }
  }, [token, intl])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return intl.formatMessage({ id: 'auth.resetPassword.passwordHint' })
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.invalidToken' }))
      return
    }

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.passwordMismatch' }))
      return
    }

    setIsLoading(true)

    try {
      console.log('🔐 Reset Password: Resetting password with token')
      await authService.resetPassword({ token, password })
      console.log('✅ Reset Password: Password reset successfully')
      setIsSuccess(true)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth/login', { 
          state: { message: 'Password reset successfully. Please sign in with your new password.' }
        })
      }, 2000)
    } catch (error: any) {
      console.error('❌ Reset Password: Request failed:', error)
      setError(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-lg mx-auto">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-6 pb-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {intl.formatMessage({ id: 'auth.resetPassword.success' })}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {intl.formatMessage({ id: 'auth.resetPassword.successMessage' })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Key className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {intl.formatMessage({ id: 'auth.resetPassword.redirectMessage' })}
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all duration-200"
              >
                {intl.formatMessage({ id: 'auth.resetPassword.continueSignIn' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'auth.resetPassword.title' })}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {intl.formatMessage({ id: 'auth.resetPassword.subtitle' })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {intl.formatMessage({ id: 'auth.resetPassword.password' })}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.resetPassword.passwordPlaceholder' })}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="h-11 pr-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 w-11 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {intl.formatMessage({ id: 'auth.resetPassword.passwordHint' })}
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  {intl.formatMessage({ id: 'auth.resetPassword.confirmPassword' })}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.resetPassword.confirmPasswordPlaceholder' })}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="h-11 pr-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 w-11 p-0 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all duration-200"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {intl.formatMessage({ id: 'auth.resetPassword.resetting' })}
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'auth.resetPassword.reset' })}
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col items-center space-y-3 pt-4 border-t border-gray-100">
              <Link
                to="/auth/login"
                className="flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {intl.formatMessage({ id: 'auth.resetPassword.backToLogin' })}
              </Link>

              <p className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'auth.resetPassword.rememberPassword' })}{' '}
                <Link
                  to="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {intl.formatMessage({ id: 'auth.resetPassword.signIn' })}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}