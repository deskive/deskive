import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Activity,
  AlertTriangle,
  Shield,
  Server,
  BarChart3,
  Bell,
  Cpu,
  CheckCircle,
  ArrowRight,
  Monitor,
  TrendingUp
} from 'lucide-react'

export default function MonitoringFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title="System Monitoring - Real-Time Performance Tracking"
        description="Monitor system health, uptime, and performance in real-time. Get alerts, track metrics, and ensure optimal system performance."
        keywords={['monitoring', 'system monitoring', 'uptime monitoring', 'performance tracking', 'alerts', 'observability']}
        ogImage="/og-images/features/monitoring.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Activity className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-red-100">System Monitoring</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Stay Ahead of Issues Before They Impact Users
            </h1>
            <p className="text-xl mb-8 text-red-50">
              Monitor your entire infrastructure with real-time alerts, comprehensive metrics, 
              and intelligent anomaly detection that keeps your systems running smoothly.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Complete Infrastructure Visibility</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Monitor everything from servers to applications with comprehensive observability tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Server className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Infrastructure Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor servers, containers, and cloud resources with detailed performance metrics
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <AlertTriangle className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Alerts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Intelligent alerting with customizable thresholds and escalation policies
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <BarChart3 className="w-10 h-10 text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Performance Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed performance analytics with trend analysis and capacity planning
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Cpu className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Application Performance</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor application response times, error rates, and user experience metrics
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Shield className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Security Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detect security threats and anomalies with advanced intrusion detection
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Bell className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Channel Alerts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Receive alerts via email, SMS, Slack, PagerDuty, and custom webhooks
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
              <h2 className="text-4xl font-bold mb-4">Monitor Every Layer of Your Stack</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From infrastructure to user experience - get complete visibility into your systems
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Monitor className="w-8 h-8 text-red-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For DevOps Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Monitor Kubernetes clusters and container health</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Track deployment success and rollback triggers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Monitor CI/CD pipeline performance and failures</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Set up custom dashboards for team visibility</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <TrendingUp className="w-8 h-8 text-orange-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For SRE Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Define and track SLIs, SLOs, and error budgets</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Implement chaos engineering and testing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Root cause analysis with distributed tracing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Automated incident response and escalation</span>
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
          <h2 className="text-4xl font-bold mb-6">Integrate With Your Monitoring Stack</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Connect with popular monitoring, logging, and observability platforms
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">PR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Prometheus</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Grafana</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">DD</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">DataDog</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">NR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">New Relic</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-red-600 to-orange-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Never Miss a Critical Issue Again
            </h2>
            <p className="text-xl mb-8 text-red-50">
              Join thousands of engineering teams who trust us to keep their systems reliable and performant
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100">
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