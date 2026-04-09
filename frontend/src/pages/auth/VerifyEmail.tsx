import { useState, useEffect, useRef } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Mail, CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { authService } from '@/lib/api/auth-api'

type VerificationState = 'verifying' | 'success' | 'error' | 'expired' | 'invalid'

export default function VerifyEmail() {
  const [verificationState, setVerificationState] = useState<VerificationState>('verifying')
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Prevent double execution in React StrictMode
  const hasVerified = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmailToken = async () => {
      // Prevent duplicate calls from React StrictMode
      if (hasVerified.current) {
        console.log('📧 Email Verification: Skipping duplicate call')
        return
      }
      hasVerified.current = true

      if (!token) {
        setVerificationState('invalid')
        setError('Invalid or missing verification token.')
        return
      }

      try {
        console.log('📧 Email Verification: Verifying token...')
        await authService.verifyEmail(token)
        console.log('✅ Email Verification: Email verified successfully')
        setVerificationState('success')

        // Redirect to login after success message
        setTimeout(() => {
          navigate('/auth/login', {
            state: { message: 'Email verified successfully! Please sign in to continue.' }
          })
        }, 3000)
      } catch (error: any) {
        console.error('❌ Email Verification: Verification failed:', error)

        // Handle different error types
        if (error.message?.includes('expired') || error.code === 'TOKEN_EXPIRED') {
          setVerificationState('expired')
          setError('This verification link has expired. Please request a new verification email.')
        } else if (error.message?.includes('invalid') || error.code === 'INVALID_TOKEN') {
          setVerificationState('invalid')
          setError('This verification link is invalid or has already been used.')
        } else {
          setVerificationState('error')
          setError(error.message || 'Email verification failed. Please try again.')
        }
      }
    }

    verifyEmailToken()
  }, [token, navigate])

  const handleResendVerification = async () => {
    setIsResending(true)
    setResendSuccess(false)
    setError(null)

    try {
      console.log('📧 Email Verification: Resending verification email...')
      await authService.resendEmailVerification()
      console.log('✅ Email Verification: Verification email resent successfully')
      setResendSuccess(true)
    } catch (error: any) {
      console.error('❌ Email Verification: Resend failed:', error)
      setError(error.message || 'Failed to resend verification email. Please try again later.')
    } finally {
      setIsResending(false)
    }
  }

  const getStateConfig = () => {
    switch (verificationState) {
      case 'verifying':
        return {
          icon: <Loader2 className="w-6 h-6 text-white animate-spin" />,
          bgColor: 'from-blue-600 to-purple-600',
          title: 'Verifying Email',
          description: 'Please wait while we verify your email address...'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-white" />,
          bgColor: 'from-green-600 to-emerald-600',
          title: 'Email Verified!',
          description: 'Your email address has been successfully verified'
        }
      case 'expired':
        return {
          icon: <XCircle className="w-6 h-6 text-white" />,
          bgColor: 'from-orange-600 to-red-600',
          title: 'Link Expired',
          description: 'This verification link has expired'
        }
      case 'invalid':
        return {
          icon: <XCircle className="w-6 h-6 text-white" />,
          bgColor: 'from-red-600 to-pink-600',
          title: 'Invalid Link',
          description: 'This verification link is invalid or has already been used'
        }
      default:
        return {
          icon: <XCircle className="w-6 h-6 text-white" />,
          bgColor: 'from-red-600 to-pink-600',
          title: 'Verification Failed',
          description: 'Something went wrong during email verification'
        }
    }
  }

  const { icon, bgColor, title, description } = getStateConfig()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${bgColor} rounded-2xl flex items-center justify-center shadow-lg`}>
                {icon}
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {verificationState === 'verifying' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
            )}

            {verificationState === 'success' && (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Great! Your email address has been verified. You can now access all features of your Deskive account.
                  </p>
                  <p className="text-xs text-gray-500">
                    You will be redirected to the sign-in page shortly...
                  </p>
                </div>
                
                <Button 
                  onClick={() => navigate('/auth/login')}
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg transition-all duration-200"
                >
                  Continue to Sign In
                </Button>
              </div>
            )}

            {(verificationState === 'expired' || verificationState === 'error') && (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-red-600" />
                  </div>
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {resendSuccess ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">
                      Verification email sent! Please check your inbox and click the new verification link.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button 
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg transition-all duration-200"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Email...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Send New Verification Email
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {verificationState === 'invalid' && (
              <div className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-gray-600">
                    This verification link may have already been used or is no longer valid.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center space-y-3 pt-4 border-t border-gray-100">
              <Link 
                to="/auth/login" 
                className="flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
              
              <p className="text-sm text-gray-600">
                Need help?{' '}
                <Link 
                  to="/contact" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}