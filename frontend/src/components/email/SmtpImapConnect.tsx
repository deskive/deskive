import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Server, CheckCircle2, XCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import {
  useTestSmtpImapConnection,
  useConnectSmtpImap,
  type SmtpConfig,
  type ImapConfig,
  type TestConnectionResult,
} from '@/lib/api/email-api';

interface SmtpImapConnectProps {
  onBack: () => void;
  onSuccess: () => void;
}

// Common presets for popular email providers
const EMAIL_PRESETS = {
  gmail: {
    label: 'Gmail',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
  },
  outlook: {
    label: 'Outlook/Hotmail',
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    imap: { host: 'imap.outlook.com', port: 993, secure: true },
  },
  yahoo: {
    label: 'Yahoo Mail',
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
  },
  custom: {
    label: 'Custom Server',
    smtp: { host: '', port: 587, secure: false },
    imap: { host: '', port: 993, secure: true },
  },
};

export function SmtpImapConnect({ onBack, onSuccess }: SmtpImapConnectProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof EMAIL_PRESETS>('gmail');
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [emailAddress, setEmailAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  // SMTP config
  const [smtpHost, setSmtpHost] = useState(EMAIL_PRESETS.gmail.smtp.host);
  const [smtpPort, setSmtpPort] = useState(EMAIL_PRESETS.gmail.smtp.port);
  const [smtpSecure, setSmtpSecure] = useState(EMAIL_PRESETS.gmail.smtp.secure);

  // IMAP config
  const [imapHost, setImapHost] = useState(EMAIL_PRESETS.gmail.imap.host);
  const [imapPort, setImapPort] = useState(EMAIL_PRESETS.gmail.imap.port);
  const [imapSecure, setImapSecure] = useState(EMAIL_PRESETS.gmail.imap.secure);

  const testConnectionMutation = useTestSmtpImapConnection(workspaceId || '');
  const connectMutation = useConnectSmtpImap(workspaceId || '');

  const handlePresetChange = (preset: keyof typeof EMAIL_PRESETS) => {
    setSelectedPreset(preset);
    const config = EMAIL_PRESETS[preset];
    setSmtpHost(config.smtp.host);
    setSmtpPort(config.smtp.port);
    setSmtpSecure(config.smtp.secure);
    setImapHost(config.imap.host);
    setImapPort(config.imap.port);
    setImapSecure(config.imap.secure);
    setTestResult(null);
    setError(null);
  };

  const getSmtpConfig = (): SmtpConfig => ({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: emailAddress,
    password: password,
  });

  const getImapConfig = (): ImapConfig => ({
    host: imapHost,
    port: imapPort,
    secure: imapSecure,
    user: emailAddress,
    password: password,
  });

  const handleTestConnection = async () => {
    if (!emailAddress || !password) {
      setError('Please enter your email address and password');
      return;
    }

    setTestResult(null);
    setError(null);

    try {
      const result = await testConnectionMutation.mutateAsync({
        smtp: getSmtpConfig(),
        imap: getImapConfig(),
      });
      setTestResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to test connection');
    }
  };

  const handleConnect = async () => {
    if (!emailAddress || !password) {
      setError('Please enter your email address and password');
      return;
    }

    setError(null);

    try {
      await connectMutation.mutateAsync({
        emailAddress,
        displayName: displayName || undefined,
        smtp: getSmtpConfig(),
        imap: getImapConfig(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
    }
  };

  const isLoading = testConnectionMutation.isPending || connectMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Connect via SMTP/IMAP</CardTitle>
              <CardDescription>
                Connect your email account using SMTP (sending) and IMAP (receiving) protocols
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Provider Preset */}
          <div className="space-y-2">
            <Label>Email Provider</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(EMAIL_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={selectedPreset === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(key as keyof typeof EMAIL_PRESETS)}
                  className="h-auto py-2"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password / App Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password or app password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                For Gmail, use an App Password from your Google Account security settings
              </p>
            </div>
          </div>

          {/* Server Configuration (shown for custom or if user wants to edit) */}
          {selectedPreset === 'custom' && (
            <>
              {/* SMTP Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  SMTP Settings (Outgoing Mail)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="smtpHost">SMTP Server</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.example.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtpSecure"
                    checked={smtpSecure}
                    onCheckedChange={setSmtpSecure}
                  />
                  <Label htmlFor="smtpSecure">Use SSL/TLS (port 465)</Label>
                </div>
              </div>

              {/* IMAP Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  IMAP Settings (Incoming Mail)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="imapHost">IMAP Server</Label>
                    <Input
                      id="imapHost"
                      placeholder="imap.example.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imapPort">Port</Label>
                    <Input
                      id="imapPort"
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(parseInt(e.target.value) || 993)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="imapSecure"
                    checked={imapSecure}
                    onCheckedChange={setImapSecure}
                  />
                  <Label htmlFor="imapSecure">Use SSL/TLS</Label>
                </div>
              </div>
            </>
          )}

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {testResult.smtp.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>SMTP: {testResult.smtp.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResult.imap.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>IMAP: {testResult.imap.message}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading || !emailAddress || !password}
              className="flex-1"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isLoading || !emailAddress || !password}
              className="flex-1"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
