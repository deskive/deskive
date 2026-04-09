import { useState, useEffect } from 'react';
import { Download, CheckCircle2, ArrowRight } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import ModernHeader from '../../components/landing/ModernHeader';
import ModernFooter from '../../components/landing/ModernFooter';
import { FaApple, FaWindows, FaAndroid } from 'react-icons/fa';

interface DownloadInfo {
  latest: string;
  version: string;
  releaseDate: string;
  downloads: {
    macOS?: {
      arm64?: string;
      x64?: string;
    };
    windows?: {
      x64?: string;
    };
  };
}

export default function DownloadsPage() {
  const intl = useIntl();
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [os, setOs] = useState<'mac' | 'windows' | 'other'>('other');

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('mac') !== -1) {
      setOs('mac');
    } else if (userAgent.indexOf('win') !== -1) {
      setOs('windows');
    }

    // Set download URLs directly
    setDownloadInfo({
      latest: 'v1.0.0',
      version: '1.0.0',
      releaseDate: new Date().toISOString(),
      downloads: {
        macOS: {
          arm64: '/downloads/Deskive-macOS-arm64.dmg',
          x64: '/downloads/Deskive-macOS-x64.dmg'
        },
        windows: {
          x64: '/downloads/Deskive-Windows-x64.exe'
        }
      }
    });
  }, []);

  const handleDownload = (url?: string) => {
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <ModernHeader />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Download className="w-4 h-4" />
            <span>{intl.formatMessage({ id: 'downloads.badge' })}</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            {intl.formatMessage({ id: 'downloads.title' })}
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            {intl.formatMessage({ id: 'downloads.subtitle' })}
            <br />
            {intl.formatMessage({ id: 'downloads.subtitleSecondLine' })}
          </p>

          {downloadInfo && (
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-12">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{intl.formatMessage({ id: 'downloads.version' }, { version: downloadInfo.version })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{intl.formatMessage({ id: 'downloads.freeOpenSource' })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{intl.formatMessage({ id: 'downloads.regularUpdates' })}</span>
              </div>
            </div>
          )}
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* macOS Card */}
          <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-gray-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="p-8 relative">
              {/* Mac Desktop with Apple Logo */}
              <div className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform relative">
                {/* Monitor/Screen */}
                <div className="w-full h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                  <FaApple className="w-6 h-6 text-white" />
                </div>
                {/* Stand */}
                <div className="w-8 h-2 bg-gradient-to-br from-gray-600 to-gray-700 mx-auto mt-1 rounded-sm" />
                {/* Base */}
                <div className="w-12 h-1 bg-gradient-to-br from-gray-500 to-gray-600 mx-auto mt-0.5 rounded-full" />
              </div>

              <h3 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'downloads.platforms.macOS.title' })}</h3>
              <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'downloads.platforms.macOS.description' })}</p>

              <div className="space-y-3">
                <Button
                  onClick={() => handleDownload(downloadInfo?.downloads?.macOS?.arm64)}
                  disabled={!downloadInfo?.downloads?.macOS?.arm64}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white group/btn"
                >
                  <FaApple className="w-4 h-4 mr-2 group-hover/btn:animate-bounce" />
                  {intl.formatMessage({ id: 'downloads.platforms.macOS.buttonAppleSilicon' })}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>

                <Button
                  onClick={() => handleDownload(downloadInfo?.downloads?.macOS?.x64)}
                  disabled={!downloadInfo?.downloads?.macOS?.x64}
                  variant="outline"
                  className="w-full border-2 hover:border-gray-500 hover:bg-gray-50"
                >
                  <FaApple className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'downloads.platforms.macOS.buttonIntel' })}
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">{intl.formatMessage({ id: 'downloads.platforms.macOS.requirement' })}</p>
            </div>
          </Card>

          {/* Windows Card */}
          <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-sky-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/10 to-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="p-8 relative">
              {/* Windows Desktop with Windows Logo */}
              <div className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform relative">
                {/* Monitor/Screen */}
                <div className="w-full h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg border-2 border-sky-400 flex items-center justify-center">
                  <FaWindows className="w-6 h-6 text-white" />
                </div>
                {/* Stand */}
                <div className="w-8 h-2 bg-gradient-to-br from-gray-600 to-gray-700 mx-auto mt-1 rounded-sm" />
                {/* Base */}
                <div className="w-12 h-1 bg-gradient-to-br from-gray-500 to-gray-600 mx-auto mt-0.5 rounded-full" />
              </div>

              <h3 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'downloads.platforms.windows.title' })}</h3>
              <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'downloads.platforms.windows.description' })}</p>

              <Button
                onClick={() => handleDownload(downloadInfo?.downloads?.windows?.x64)}
                disabled={!downloadInfo?.downloads?.windows?.x64}
                className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white group/btn"
              >
                <FaWindows className="w-4 h-4 mr-2 group-hover/btn:animate-bounce" />
                {intl.formatMessage({ id: 'downloads.platforms.windows.button' })}
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              <p className="text-xs text-gray-500 mt-4">{intl.formatMessage({ id: 'downloads.platforms.windows.requirement' })}</p>
            </div>
          </Card>

          {/* iOS Card */}
          <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-gray-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="p-8 relative">
              {/* iPhone Device with Apple Logo */}
              <div className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform relative flex items-center justify-center">
                {/* Phone body */}
                <div className="w-10 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[10px] border-2 border-gray-700 flex items-center justify-center relative shadow-lg">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-gray-900 rounded-b-lg" />
                  {/* Screen with Apple logo */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-[7px] flex items-center justify-center m-0.5">
                    <FaApple className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'downloads.platforms.iOS.title' })}</h3>
              <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'downloads.platforms.iOS.description' })}</p>

              <Button
                onClick={() => window.open('https://apps.apple.com/ae/app/deskive-ai-team-workspace/id6756350570', '_blank')}
                className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white group/btn"
              >
                <FaApple className="w-4 h-4 mr-2 group-hover/btn:animate-bounce" />
                {intl.formatMessage({ id: 'downloads.platforms.iOS.button' })}
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              <p className="text-xs text-gray-500 mt-4">{intl.formatMessage({ id: 'downloads.platforms.iOS.requirement' })}</p>
            </div>
          </Card>

          {/* Android Card */}
          <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-500 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

            <div className="p-8 relative">
              {/* Android Phone Device with Android Logo */}
              <div className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform relative flex items-center justify-center">
                {/* Phone body */}
                <div className="w-10 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[10px] border-2 border-gray-700 flex items-center justify-center relative shadow-lg">
                  {/* Camera/Sensor bar at top */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gray-900 rounded-full" />
                  {/* Screen with Android logo */}
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-[7px] flex items-center justify-center m-0.5">
                    <FaAndroid className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2">{intl.formatMessage({ id: 'downloads.platforms.android.title' })}</h3>
              <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'downloads.platforms.android.description' })}</p>

              <Button
                onClick={() => window.open('https://play.google.com/store/apps/details?id=com.deskive.app', '_blank')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white group/btn"
              >
                <FaAndroid className="w-4 h-4 mr-2 group-hover/btn:animate-bounce" />
                {intl.formatMessage({ id: 'downloads.platforms.android.button' })}
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              <p className="text-xs text-gray-500 mt-4">{intl.formatMessage({ id: 'downloads.platforms.android.requirement' })}</p>
            </div>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-20 bg-white rounded-3xl shadow-xl p-12 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{intl.formatMessage({ id: 'downloads.features.title' })}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{intl.formatMessage({ id: 'downloads.features.nativePerformance.title' })}</h3>
              <p className="text-gray-600 text-sm">{intl.formatMessage({ id: 'downloads.features.nativePerformance.description' })}</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{intl.formatMessage({ id: 'downloads.features.securePrivate.title' })}</h3>
              <p className="text-gray-600 text-sm">{intl.formatMessage({ id: 'downloads.features.securePrivate.description' })}</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{intl.formatMessage({ id: 'downloads.features.alwaysUpdated.title' })}</h3>
              <p className="text-gray-600 text-sm">{intl.formatMessage({ id: 'downloads.features.alwaysUpdated.description' })}</p>
            </div>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
