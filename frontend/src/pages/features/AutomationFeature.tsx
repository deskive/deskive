import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Workflow,
  Zap,
  Bot,
  Clock,
  GitBranch,
  Settings,
  Code,
  CheckCircle,
  ArrowRight,
  Cog,
  Rocket
} from 'lucide-react'

export default function AutomationFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title="Workflow Automation - Automate Repetitive Tasks"
        description="Automate your workflows with no-code automation builder. Create custom workflows, integrate apps, and save time with intelligent automation."
        keywords={['workflow automation', 'automation', 'no-code automation', 'workflow builder', 'zapier alternative', 'task automation']}
        ogImage="/og-images/features/automation.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 to-teal-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Workflow className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-green-100">Workflow Automation</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Automate Everything, Focus on What Matters
            </h1>
            <p className="text-xl mb-8 text-green-50">
              Build powerful automation workflows with drag-and-drop simplicity. 
              Connect apps, trigger actions, and eliminate repetitive tasks to boost productivity.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Automation Made Simple</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            From simple triggers to complex workflows - automate any process with ease
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Bot className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered Automation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Let AI suggest and create automation workflows based on your usage patterns
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Zap className="w-10 h-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trigger-Based Actions</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set up triggers based on time, events, data changes, or external webhooks
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <GitBranch className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Conditional Logic</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create complex workflows with if/then conditions, loops, and branching logic
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Clock className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Scheduled Workflows</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Run automations on schedules, recurring intervals, or specific time triggers
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Code className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Custom Scripts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Execute custom code with JavaScript, Python, or shell scripts within workflows
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Settings className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Error Handling</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Built-in error handling, retry logic, and failure notifications for reliable automation
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
              <h2 className="text-4xl font-bold mb-4">Automate Every Process</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From development workflows to business processes - eliminate manual work
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Cog className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Development Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Automate CI/CD pipelines and deployments</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sync issues between GitHub and project management tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Auto-assign code reviews and send notifications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Generate release notes and deployment reports</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Rocket className="w-8 h-8 text-teal-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Business Operations</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Automate lead qualification and follow-ups</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Generate reports and send to stakeholders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sync customer data across CRM and support tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Automate invoice processing and approvals</span>
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
          <h2 className="text-4xl font-bold mb-6">Automate Across Your Entire Stack</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Connect and automate workflows between all your favorite tools and services
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">ZP</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Zapier</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">MW</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Make (Integromat)</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GH</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">GitHub Actions</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">JK</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Jenkins</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-green-600 to-teal-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Start Automating Your Work Today
            </h2>
            <p className="text-xl mb-8 text-green-50">
              Join thousands of teams who've saved hours every week with intelligent automation
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
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