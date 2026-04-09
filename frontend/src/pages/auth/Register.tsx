import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Checkbox } from '../../components/ui/checkbox'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { FaGoogle, FaGithub, FaApple } from 'react-icons/fa'
import { authApi } from '../../lib/api/auth-api'
import { Eye, EyeOff, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { workspaceApi } from '../../lib/api/workspace-api'
import { api } from '../../lib/fetch'

export default function Register() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get invitation parameters from URL or localStorage
  const invitationToken = searchParams.get('invitation') || localStorage.getItem('pending_invitation_token')
  const slackSetupToken = searchParams.get('slack_setup') || null

  // Store invitation token in localStorage when present in URL
  useEffect(() => {
    const urlInvitation = searchParams.get('invitation')
    if (urlInvitation) {
      localStorage.setItem('pending_invitation_token', urlInvitation)
    }
  }, [searchParams])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue')
      setIsLoading(false)
      return
    }

    try {
      console.log('🔐 Registration: Starting registration process...')

      const response = await authApi.register({
        email,
        password,
        name: fullName
      })

      console.log('✅ Registration: Account created successfully!', response)

      // Check if email verification is required
      if (response.requiresVerification) {
        console.log('📧 Email verification required, redirecting to login...')
        const redirectUrl = slackSetupToken
          ? `/auth/login?slack_setup=${slackSetupToken}`
          : '/auth/login';
        navigate(redirectUrl, {
          state: {
            message: 'Registration successful! Please check your email to verify your account before signing in.',
            type: 'success'
          }
        })
        return
      }

      // Check if this is a Slack setup flow (handles all features: whiteboard, calendar, projects)
      if (slackSetupToken) {
        console.log('🔗 Slack setup token detected:', slackSetupToken);
        console.log('🔗 Completing Slack setup after registration...');
        console.log('🔗 Registration response:', response);

        // Store auth token first - check all possible token fields
        const authToken = (response as any).access_token || response.token;
        if (authToken) {
          console.log('💾 Storing auth token in localStorage');
          localStorage.setItem('auth_token', authToken);
        } else {
          console.error('❌ No auth token found in response!');
          setError('Authentication token not received. Please try logging in.');
          setIsLoading(false);
          return;
        }

        // Wait a moment for localStorage to persist
        await new Promise(resolve => setTimeout(resolve, 100));

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

      // If there's an invitation token, redirect to invitation acceptance page
      if (invitationToken) {
        navigate(`/invite/${invitationToken}`)
        return
      }

      // Check if user has workspaces
      try {
        const workspaces = await workspaceApi.getWorkspaces()

        console.log('📋 Found workspaces:', workspaces.length)
        console.log('📋 Workspaces:', workspaces)

        if (workspaces.length > 0) {
          // Navigate to first workspace dashboard
          const workspace = workspaces[0]
          console.log('✅ Navigating to workspace:', workspace.id)
          navigate(`/workspaces/${workspace.id}/dashboard`)
        } else {
          // No workspaces, redirect to create one
          console.log('⚠️ No workspaces found, redirecting to create-workspace')
          navigate('/create-workspace')
        }
      } catch (error) {
        console.error('❌ Failed to fetch workspaces:', error)
        // If fetching workspaces fails, go to create workspace
        navigate('/create-workspace')
      }
    } catch (error: any) {
      console.error('❌ Registration failed:', error)
      setError(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignUp = async (provider: string) => {
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
      console.error(`❌ ${provider} sign-up failed:`, err)
      setError(`Failed to sign up with ${provider}. Please try again.`)
      setSocialLoading('')
    }
  }

  const socialProviders = [
    {
      name: 'Google',
      icon: FaGoogle,
      className: 'bg-background hover:bg-muted text-foreground border border-border',
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex flex-col items-center space-y-3">
              {/* Deskive Logo - Clickable to home */}
              <Link to="/" className="flex items-center gap-3 group cursor-pointer mb-2">
                <img
                  src="https://cdn.deskive.com/deskive/logo.png"
                  alt="Deskive Logo"
                  className="w-12 h-12 transition-all duration-300 group-hover:scale-110"
                />
                <span className="text-gray-900 dark:text-white font-black text-2xl tracking-tight">
                  Deskive
                </span>
              </Link>

              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'auth.register.title' })}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {intl.formatMessage({ id: 'auth.register.subtitle' })}
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
                    onClick={() => handleSocialSignUp(provider.name.toLowerCase())}
                    disabled={isLoading || socialLoading !== ''}
                    title={`Sign up with ${provider.name}`}
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
                <span className="bg-card px-3 text-muted-foreground font-medium">
                  {intl.formatMessage({ id: 'auth.register.orSignUpWith' })}
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {intl.formatMessage({ id: 'auth.register.name' })}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.register.namePlaceholder' })}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {intl.formatMessage({ id: 'auth.register.email' })}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.register.emailPlaceholder' })}
                  required
                  disabled={isLoading}
                  className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {intl.formatMessage({ id: 'auth.register.password' })}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'auth.register.passwordPlaceholder' })}
                    required
                    disabled={isLoading}
                    minLength={8}
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
                <p className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'auth.register.passwordHint' })}
                </p>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(!!checked)}
                  className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <div className="text-sm">
                  <label htmlFor="terms" className="text-gray-600 dark:text-gray-400 cursor-pointer">
                    {intl.formatMessage({ id: 'auth.register.agree' })}{' '}
                    <Link to="/terms" className="font-medium text-emerald-600 hover:text-emerald-500">
                      {intl.formatMessage({ id: 'auth.register.terms' })}
                    </Link>{' '}
                    {intl.formatMessage({ id: 'auth.register.and' })}{' '}
                    <Link to="/privacy" className="font-medium text-emerald-600 hover:text-emerald-500">
                      {intl.formatMessage({ id: 'auth.register.privacy' })}
                    </Link>
                  </label>
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
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg transition-all duration-200"
                disabled={isLoading || socialLoading !== ''}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {intl.formatMessage({ id: 'auth.register.creatingAccount' })}
                  </>
                ) : (
                  intl.formatMessage({ id: 'auth.register.createAccount' })
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {intl.formatMessage({ id: 'auth.register.haveAccount' })}{' '}
                <Link
                  to={invitationToken ? `/auth/login?invitation=${invitationToken}` : "/auth/login"}
                  className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  {intl.formatMessage({ id: 'auth.register.signIn' })}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}