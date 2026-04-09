import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  LineChart,
  Target,
  Filter,
  Download,
  CheckCircle,
  ArrowRight,
  Brain,
  Building
} from 'lucide-react'

export default function AnalyticsFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title={intl.formatMessage({ id: 'featurePages.analytics.title' })}
        description={intl.formatMessage({ id: 'featurePages.analytics.description' })}
        keywords={['analytics', 'team insights', 'productivity metrics', 'reporting', 'data visualization', 'business intelligence']}
        ogImage="/og-images/features/analytics.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-blue-100">{intl.formatMessage({ id: 'featurePages.analytics.badge' })}</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">{intl.formatMessage({ id: 'featurePages.analytics.heroTitle' })}</h1>
            <p className="text-xl mb-8 text-blue-50">{intl.formatMessage({ id: 'featurePages.analytics.heroSubtitle' })}</p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Comprehensive Analytics Suite</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            From simple metrics to complex data modeling - everything you need to understand your business
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <TrendingUp className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Dashboards</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor key metrics with live updating dashboards that refresh automatically
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <PieChart className="w-10 h-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Custom Reports</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Build and customize reports with drag-and-drop interface and advanced filtering
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Brain className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get automated insights and anomaly detection powered by machine learning
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <LineChart className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Predictive Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Forecast trends and outcomes using advanced statistical modeling
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Filter className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Advanced Filtering</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Slice and dice data with powerful filtering, segmentation, and drill-down capabilities
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Download className="w-10 h-10 text-cyan-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Export & Share</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Export reports in multiple formats and share insights with stakeholders
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
              <h2 className="text-4xl font-bold mb-4">Analytics for Every Need</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From marketing campaigns to financial planning, make data-driven decisions
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Target className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Marketing Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Track campaign performance across all channels</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Measure customer acquisition and retention</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Optimize ROI with attribution modeling</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Identify high-value customer segments</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Building className="w-8 h-8 text-indigo-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Business Leaders</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Monitor KPIs and business health metrics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Generate executive reports automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Forecast revenue and growth trends</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Make strategic decisions with confidence</span>
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
          <h2 className="text-4xl font-bold mb-6">Connect All Your Data Sources</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Integrate with popular tools and databases for comprehensive analytics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GA</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Google Analytics</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">SF</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Salesforce</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">PG</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">PostgreSQL</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">HB</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">HubSpot</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Start Making Data-Driven Decisions Today
            </h2>
            <p className="text-xl mb-8 text-blue-50">
              Join thousands of companies using advanced analytics to grow their business
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
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