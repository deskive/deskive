import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { RefreshCw, Home, AlertTriangle, Mail } from 'lucide-react'

interface ErrorPageProps {
  error?: Error
  resetErrorBoundary?: () => void
}

export default function ErrorPage({ error, resetErrorBoundary }: ErrorPageProps) {
  const handleRetry = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Error Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full border border-gray-700/50 mb-6">
            <AlertTriangle className="h-16 w-16 text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-lg text-gray-400 mb-8 leading-relaxed">
          We encountered an unexpected error. Don't worry, our team has been notified and we're working to fix it.
        </p>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Error Details:</h3>
            <p className="text-xs text-gray-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
            onClick={handleRetry}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </Button>
          
          <Link to="/">
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-800 w-full sm:w-auto"
            >
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Support Section */}
        <div className="mt-12 pt-8 border-t border-gray-700/50">
          <p className="text-sm text-gray-500 mb-4">
            If this problem persists, please contact our support team
          </p>
          <div className="flex justify-center">
            <a 
              href="mailto:support@deskive.com"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8">
          <p className="text-xs text-gray-600">
            Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  )
}