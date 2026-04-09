import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { authService } from '@/lib/api/auth-api'

export default function ForgotPassword() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔐 Forgot Password: Sending reset request for:', email)
      await authService.forgotPassword(email)
      console.log('✅ Forgot Password: Reset email sent successfully')
      setIsSuccess(true)
    } catch (error: any) {
      console.error('❌ Forgot Password: Request failed:', error)
      setError(error.message || 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAgain = () => {
    setIsSuccess(false)
    setEmail('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-3">
              {/* Deskive Logo - Clickable to home */}
              <Link to="/" className="flex items-center gap-3 group cursor-pointer mb-2">
                <img
                  src="https://cdn.deskive.com/deskive/logo.png"
                  alt="Deskive Logo"
                  className="w-12 h-12 transition-all duration-300 group-hover:scale-110"
                />
                <span className="text-gray-900 font-black text-2xl tracking-tight">
                  Deskive
                </span>
              </Link>

              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {isSuccess
                    ? intl.formatMessage({ id: 'auth.forgotPassword.success' })
                    : intl.formatMessage({ id: 'auth.forgotPassword.title' })
                  }
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {isSuccess
                    ? intl.formatMessage({ id: 'auth.forgotPassword.successMessage' })
                    : intl.formatMessage({ id: 'auth.forgotPassword.subtitle' })
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isSuccess ? (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {intl.formatMessage({ id: 'auth.forgotPassword.checkInbox' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {intl.formatMessage({ id: 'auth.forgotPassword.noEmail' })}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleTryAgain}
                    variant="outline"
                    className="w-full h-11"
                  >
                    {intl.formatMessage({ id: 'auth.forgotPassword.sendAnother' })}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'auth.forgotPassword.email' })}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.forgotPassword.emailPlaceholder' })}
                    required
                    disabled={isLoading}
                    className="h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {intl.formatMessage({ id: 'auth.forgotPassword.sendingLink' })}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {intl.formatMessage({ id: 'auth.forgotPassword.sendLink' })}
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="flex flex-col items-center space-y-3 pt-4 border-t border-gray-100">
              <Link
                to="/auth/login"
                className="flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {intl.formatMessage({ id: 'auth.forgotPassword.backToLogin' })}
              </Link>

              <p className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'auth.forgotPassword.noAccount' })}{' '}
                <Link
                  to="/auth/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {intl.formatMessage({ id: 'auth.forgotPassword.signUp' })}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}