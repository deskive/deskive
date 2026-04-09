import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Puzzle,
  Zap,
  Code,
  Database,
  Cloud,
  Webhook,
  Settings,
  CheckCircle,
  ArrowRight,
  Layers,
  Building
} from 'lucide-react'

export default function IntegrationsFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title="Integrations - Connect Your Favorite Apps"
        description="Connect Deskive with 500+ apps and services. Seamless integrations with Slack, Google Workspace, GitHub, Jira, and more."
        keywords={['integrations', 'app integrations', 'connect apps', 'API', 'webhooks', 'third-party apps']}
        ogImage="/og-images/features/integrations.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Puzzle className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-indigo-100">Powerful Integrations</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Connect Everything You Use
            </h1>
            <p className="text-xl mb-8 text-indigo-50">
              Seamlessly integrate with 500+ apps and services through our powerful API, 
              pre-built connectors, and custom webhooks that unify your entire tech stack.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Integration Made Simple</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            From no-code solutions to advanced API integrations - connect your tools effortlessly
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Zap className="w-10 h-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">One-Click Setup</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect popular apps instantly with pre-configured integrations and OAuth authentication
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Code className="w-10 h-10 text-violet-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">REST API</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive REST API with full CRUD operations and real-time data synchronization
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Webhook className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Webhooks</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time event notifications and data syncing with custom webhook endpoints
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Database className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Database Connectors</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Direct connections to MySQL, PostgreSQL, MongoDB, and other popular databases
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Cloud className="w-10 h-10 text-cyan-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Cloud Platforms</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Native integrations with AWS, Azure, Google Cloud, and other cloud providers
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Settings className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Custom Workflows</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Build complex automation workflows with conditional logic and data transformations
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
              <h2 className="text-4xl font-bold mb-4">Integrate Your Entire Workflow</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From development tools to business applications - create seamless workflows
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Layers className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Developers</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Connect GitHub, GitLab, and Bitbucket repositories</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Integrate CI/CD pipelines and deployment tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sync issue tracking with Jira and Linear</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Monitor deployments with DataDog and New Relic</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Building className="w-8 h-8 text-violet-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Business Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sync CRM data with Salesforce and HubSpot</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Automate marketing workflows with Mailchimp</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Connect financial data from QuickBooks and Stripe</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Integrate analytics from Google Analytics and Mixpanel</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Gallery */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">500+ Popular Integrations</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Connect with the tools your team already loves and uses daily
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-6 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">SL</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Slack</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">GH</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">GitHub</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">SF</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Salesforce</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">ZM</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Zoom</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">TR</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Trello</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">DR</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Drive</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">JR</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Jira</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-gray-600">+</span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">500+</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Unify Your Entire Tech Stack
            </h2>
            <p className="text-xl mb-8 text-indigo-50">
              Join thousands of teams who've streamlined their workflows with powerful integrations
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
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