import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom'
import { Separator } from '../../components/ui/separator'
import { FaGoogle, FaGithub, FaApple } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { workspaceApi } from '../../lib/api/workspace-api'
import { AuthLogo } from '../../components/auth/AuthLogo'
import { api } from '../../lib/fetch'

export default function Login() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  // Check for success message from registration redirect
  useEffect(() => {
    const state = location.state as { message?: string; type?: string } | null
    if (state?.message && state?.type === 'success') {
      setSuccessMessage(state.message)
      // Clear the state so message doesn't persist on page refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const callbackUrl = searchParams.get('callbackUrl') || null
  const slackSetupToken = searchParams.get('slack_setup') || null

  // Get the redirect path from location state (set by ProtectedRoute)
  // Include both pathname and search params (e.g., ?action=create)
  const fromLocation = (location.state as { from?: Location })?.from
  const redirectTo = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : callbackUrl

  // Check for pending invitation
  const invitationToken = searchParams.get('invitation') || localStorage.getItem('pending_invitation_token')

  useEffect(() => {
    // If there's an invitation token in the URL, store it
    const urlInvitation = searchParams.get('invitation');
    if (urlInvitation) {
      localStorage.setItem('pending_invitation_token', urlInvitation);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔐 Sign-in Form: Starting sign-in process...')
      console.log('🔐 Sign-in Form: Callback URL:', callbackUrl)
      
      await login({ email, password })

      console.log('✅ Sign-in Form: Login successful')

      // Check if this is a Slack setup flow (handles all features: whiteboard, calendar, projects)
      if (slackSetupToken) {
        console.log('🔗 Slack setup token detected:', slackSetupToken);
        console.log('🔗 Completing Slack setup after login...');

        try {
          console.log('📡 Calling complete-setup API...');
          const setupResult = await api.post<{
            success: boolean;
            data: { workspaceId: string; teamId: string; teamName: string };
            message: string;
          }>('/slack/whiteboard/complete-setup', {
            setupToken: slackSetupToken
          });

          console.log('✅ Setup result:', setupResult);

          if (setupResult.success) {
            console.log('🎉 Redirecting to success page...');
            // Redirect to unified success page (shows all features)
            navigate(`/slack/success?workspace_id=${setupResult.data.workspaceId}&team_id=${setupResult.data.teamId}`);
            return;
          } else {
            console.error('❌ Setup failed:', setupResult);
            setError(setupResult.message || 'Failed to complete Slack setup.');
            setIsLoading(false);
            return;
          }
        } catch (setupError) {
          console.error('❌ Failed to complete Slack setup:', setupError);
          setError('Failed to complete Slack setup. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Check if user has a pending invitation
      if (invitationToken) {
        // Redirect to invitation acceptance page
        navigate(`/invite/${invitationToken}`);
        return;
      }

      // Check if user has workspaces
      try {
        const workspaces = await workspaceApi.getWorkspaces()

        console.log('📋 Found workspaces:', workspaces.length)
        console.log('📋 Workspaces:', workspaces)

        if (workspaces.length > 0) {
          // Get the first workspace or the last used one
          const lastWorkspaceId = localStorage.getItem('lastWorkspaceId')
          const currentWorkspaceId = localStorage.getItem('currentWorkspaceId')

          // Find workspace from stored IDs, fallback to first workspace
          let workspace = workspaces.find(w => w.id === lastWorkspaceId)

          if (!workspace) {
            workspace = workspaces.find(w => w.id === currentWorkspaceId)
          }

          if (!workspace) {
            workspace = workspaces[0]
            // Clean up stale workspace IDs
            if (lastWorkspaceId) {
              console.log('🧹 Cleaning up stale lastWorkspaceId:', lastWorkspaceId)
              localStorage.removeItem('lastWorkspaceId')
            }
            if (currentWorkspaceId) {
              console.log('🧹 Cleaning up stale currentWorkspaceId:', currentWorkspaceId)
              localStorage.removeItem('currentWorkspaceId')
            }
          }

          console.log('✅ Navigating to workspace:', workspace.id)

          // Update localStorage with valid workspace ID
          localStorage.setItem('lastWorkspaceId', workspace.id)
          localStorage.setItem('currentWorkspaceId', workspace.id)

          // Navigate to the original destination or workspace dashboard
          if (redirectTo && redirectTo !== '/') {
            console.log('✅ Redirecting to original destination:', redirectTo)
            navigate(redirectTo)
          } else {
            console.log('✅ Redirecting to workspace dashboard')
            navigate(`/workspaces/${workspace.id}/dashboard`)
          }
        } else {
          // No workspaces, redirect to create one
          console.log('⚠️ No workspaces found, redirecting to create-workspace')
          navigate('/create-workspace')
        }
      } catch (error) {
        console.error('❌ Failed to fetch workspaces:', error)
        // If fetching workspaces fails, try the callback URL or create workspace
        navigate(callbackUrl || '/create-workspace')
      }
    } catch (error: any) {
      console.error('❌ Sign-in Form: Login failed:', error)
      
      // Handle two-factor authentication requirement
      if (error.code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactor(true)
        return
      }
      
      // Show error message
      setError(error.message || 'Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignIn = async (provider: string) => {
    setSocialLoading(provider)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const frontendUrl = window.location.origin

      switch (provider) {
        case 'github':
          window.location.href = `${apiUrl}/api/v1/auth/oauth/github?frontendUrl=${encodeURIComponent(frontendUrl)}`
          break
        case 'google':
          window.location.href = `${apiUrl}/api/v1/auth/oauth/google?frontendUrl=${encodeURIComponent(frontendUrl)}`
          break
        case 'apple':
          window.location.href = `${apiUrl}/api/v1/auth/oauth/apple?frontendUrl=${encodeURIComponent(frontendUrl)}`
          break
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
    } catch (err: any) {
      console.error(`❌ ${provider} sign-in failed:`, err)
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setSocialLoading('')
    }
  }

  const socialProviders = [
    {
      name: 'Google',
      icon: FaGoogle,
      className: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200',
      iconColor: 'text-red-500'
    },
    {
      name: 'GitHub',
      icon: FaGithub,
      className: 'bg-gray-900 hover:bg-gray-800 text-white',
      iconColor: 'text-white'
    },
    {
      name: 'Apple',
      icon: FaApple,
      className: 'bg-black hover:bg-gray-900 text-white',
      iconColor: 'text-white'
    }
  ]

  const titleText = intl.formatMessage({ id: 'auth.login.title' })
  const subtitleText = intl.formatMessage({ id: 'auth.login.subtitle' })
  const orSignInWithText = intl.formatMessage({ id: 'auth.login.orSignInWith' })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-3">
              <AuthLogo />

              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {titleText}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {subtitleText}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="flex justify-center gap-4">
              {socialProviders.map((provider) => {
                const Icon = provider.icon
                return (
                  <Button
                    key={provider.name}
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`w-12 h-12 p-0 rounded-xl transition-all duration-200 hover:scale-105 ${provider.className}`}
                    onClick={() => handleSocialSignIn(provider.name.toLowerCase())}
                    disabled={isLoading || socialLoading !== ''}
                    title={`Continue with ${provider.name}`}
                  >
                    {socialLoading === provider.name.toLowerCase() ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className={`h-5 w-5 ${provider.iconColor}`} />
                    )}
                  </Button>
                )
              })}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-3 text-gray-500 font-medium">
                  {orSignInWithText}
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {intl.formatMessage({ id: 'auth.login.email' })}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.login.emailPlaceholder' })}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'auth.login.password' })}
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
                  >
                    {intl.formatMessage({ id: 'auth.login.forgotPassword' })}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.login.passwordPlaceholder' })}
                    required
                    disabled={isLoading}
                    className="h-11 pr-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
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
              </div>

              {showTwoFactor && (
                <div className="space-y-3">
                  <Label htmlFor="twoFactorCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'auth.login.twoFactorCode' })}
                  </Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.login.twoFactorPlaceholder' })}
                    required={showTwoFactor}
                    disabled={isLoading}
                    maxLength={6}
                    className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              )}
              
              {successMessage && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

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
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg transition-all duration-200"
                disabled={isLoading || socialLoading !== ''}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {intl.formatMessage({ id: 'auth.login.signingIn' })}
                  </>
                ) : (
                  intl.formatMessage({ id: 'auth.login.signIn' })
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {intl.formatMessage({ id: 'auth.login.noAccount' })}{' '}
                <Link
                  to={
                    slackSetupToken
                      ? `/auth/register?slack_setup=${slackSetupToken}`
                      : invitationToken
                      ? `/auth/register?invitation=${invitationToken}`
                      : "/auth/register"
                  }
                  className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  {intl.formatMessage({ id: 'auth.login.signUp' })}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}