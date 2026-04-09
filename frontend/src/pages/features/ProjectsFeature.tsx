import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  FolderKanban,
  Target,
  Users,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Rocket
} from 'lucide-react'

export default function ProjectsFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title={intl.formatMessage({ id: 'productPages.projects.meta.title' }, {
          defaultValue: "Project Collaboration - Manage Projects Effectively"
        })}
        description={intl.formatMessage({ id: 'productPages.projects.meta.description' }, {
          defaultValue: "Powerful project management with multiple views, task tracking, and team collaboration. Manage projects from start to finish with ease."
        })}
        keywords={['project management', 'project collaboration', 'task tracking', 'team projects', 'project planning']}
        ogImage="/og-images/features/projects.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-600 to-pink-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FolderKanban className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-rose-100">{intl.formatMessage({ id: 'productPages.projects.badge' })}</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              {intl.formatMessage({ id: 'productPages.projects.title' })}
            </h1>
            <p className="text-xl mb-8 text-rose-50">
              {intl.formatMessage({ id: 'productPages.projects.subtitle' })}
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-rose-600 hover:bg-gray-100">
                <Link to="/auth/register">{intl.formatMessage({ id: 'productPages.projects.cta' })}</Link>
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
          <h2 className="text-4xl font-bold mb-4">{intl.formatMessage({ id: 'productPages.projects.sections.powerTitle' })}</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {intl.formatMessage({ id: 'productPages.projects.sections.powerSubtitle' })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Target className="w-10 h-10 text-rose-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Task Management</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create, assign, and track tasks with custom fields, dependencies, and priorities
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <FolderKanban className="w-10 h-10 text-pink-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Kanban Boards</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Visualize workflow with customizable boards, lists, and cards for agile project management
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Calendar className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gantt Charts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Plan timelines, track progress, and manage dependencies with interactive Gantt charts
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Clock className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Time Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track time spent on tasks with built-in timers and detailed reporting
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <BarChart3 className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Project Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor project health with burndown charts, velocity tracking, and custom reports
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Users className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Collaborate with comments, file sharing, and real-time updates across all project elements
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
              <h2 className="text-4xl font-bold mb-4">Built for Every Project Type</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From software development to marketing campaigns - manage any project with confidence
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Rocket className="w-8 h-8 text-rose-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Development Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Manage sprints with scrum and agile workflows</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Track bugs and feature requests efficiently</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Integrate with Git and CI/CD pipelines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Release planning and version management</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Briefcase className="w-8 h-8 text-pink-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Business Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Plan and execute marketing campaigns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Coordinate product launches and events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Manage client projects and deliverables</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Track budgets and resource allocation</span>
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
          <h2 className="text-4xl font-bold mb-6">Connect Your Entire Toolkit</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Integrate with your favorite development, design, and business tools
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">JR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Jira</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GH</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">GitHub</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">FG</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Figma</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">TR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Trello</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-rose-600 to-pink-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Transform How Your Team Delivers Projects
            </h2>
            <p className="text-xl mb-8 text-rose-50">
              Join thousands of teams who've improved their project success rate with better management tools
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-rose-600 hover:bg-gray-100">
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