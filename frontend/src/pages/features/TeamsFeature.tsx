import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Users, 
  MessageSquare, 
  UserCheck, 
  Shield,
  Settings,
  Globe,
  Heart,
  CheckCircle,
  ArrowRight,
  Building,
  Briefcase
} from 'lucide-react'

export default function TeamsFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title={intl.formatMessage({ id: 'featurePages.teams.title' })}
        description={intl.formatMessage({ id: 'featurePages.teams.description' })}
        keywords={['team collaboration', 'teamwork', 'team communication', 'workspace sharing', 'team management']}
        ogImage="/og-images/features/teams.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-violet-100">{intl.formatMessage({ id: 'featurePages.teams.badge' })}</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">{intl.formatMessage({ id: 'featurePages.teams.heroTitle' })}</h1>
            <p className="text-xl mb-8 text-violet-50">
              Create high-performing teams with powerful collaboration tools, 
              seamless communication, and intelligent workflows that keep everyone aligned.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100">
                <Link to="/auth/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/contact">Request Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Everything Teams Need to Succeed</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            From communication to project coordination - all the tools your team needs in one place
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <MessageSquare className="w-10 h-10 text-violet-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Chat & Channels</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Organize conversations by topic with channels, threads, and direct messaging
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <UserCheck className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Member Management</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Invite team members, assign roles, and manage permissions with ease
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Shield className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Advanced Security</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enterprise-grade security with SSO, 2FA, and granular access controls
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Settings className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Workflow Automation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Automate repetitive tasks and create custom workflows for your team processes
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Globe className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Global Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Work seamlessly across time zones with async communication tools
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Heart className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track team performance, engagement, and collaboration metrics
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-100 dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Built for Modern Teams</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Whether you're a startup or enterprise, scale your team collaboration effectively
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Briefcase className="w-8 h-8 text-violet-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Remote Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Stay connected with video calls and screen sharing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Async communication across time zones</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Virtual team building and culture tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Track productivity and engagement metrics</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Building className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Enterprise</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Scale to thousands of team members</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Advanced admin controls and compliance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Custom integrations and API access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">24/7 enterprise support and onboarding</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Integrate Your Favorite Tools</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Connect with the tools your team already uses for seamless workflows
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">SL</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Slack</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">MS</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Microsoft Teams</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">AS</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Asana</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">JR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Jira</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-violet-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Build High-Performance Teams Today
            </h2>
            <p className="text-xl mb-8 text-violet-50">
              Join thousands of teams who've transformed their collaboration and productivity
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-violet-600 hover:bg-gray-100">
                <Link to="/auth/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/features">
                  Explore All Features <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}