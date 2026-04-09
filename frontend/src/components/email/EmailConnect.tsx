import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Shield, Inbox, Send, Star, Server, ArrowRight } from 'lucide-react';
import { SmtpImapConnect } from './SmtpImapConnect';

interface EmailConnectProps {
  onConnect: () => void;
  onSmtpImapSuccess?: () => void;
}

type ConnectionMethod = 'select' | 'gmail' | 'smtp-imap';

export function EmailConnect({ onConnect, onSmtpImapSuccess }: EmailConnectProps) {
  const intl = useIntl();
  const [method, setMethod] = useState<ConnectionMethod>('select');

  if (method === 'smtp-imap') {
    return (
      <SmtpImapConnect
        onBack={() => setMethod('select')}
        onSuccess={() => {
          onSmtpImapSuccess?.();
          setMethod('select');
        }}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            {intl.formatMessage({ id: 'modules.email.connect.title', defaultMessage: 'Connect your Email' })}
          </h2>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'modules.email.connect.subtitle', defaultMessage: 'Choose how you want to connect your email account to Deskive' })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Gmail OAuth Option */}
          <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={onConnect}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {intl.formatMessage({ id: 'modules.email.connect.gmail.title', defaultMessage: 'Gmail' })}
                    </CardTitle>
                    <CardDescription>
                      {intl.formatMessage({ id: 'modules.email.connect.gmail.description', defaultMessage: 'Quick and secure OAuth connection' })}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.gmail.oneClick', defaultMessage: 'One-click secure login' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.gmail.noPassword', defaultMessage: 'No password stored' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.gmail.fullAccess', defaultMessage: 'Full Gmail API access' })}
                  </li>
                </ul>
              </CardContent>
            </Card>

          {/* SMTP/IMAP Option */}
          <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMethod('smtp-imap')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Server className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {intl.formatMessage({ id: 'modules.email.connect.smtp.title', defaultMessage: 'SMTP / IMAP' })}
                    </CardTitle>
                    <CardDescription>
                      {intl.formatMessage({ id: 'modules.email.connect.smtp.description', defaultMessage: 'Works with any email provider' })}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-blue-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.smtp.anyProvider', defaultMessage: 'Any email provider' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-blue-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.smtp.customServers', defaultMessage: 'Custom mail servers' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-blue-500" />
                    {intl.formatMessage({ id: 'modules.email.connect.smtp.standardProtocols', defaultMessage: 'Standard protocols' })}
                  </li>
                </ul>
              </CardContent>
            </Card>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-center text-muted-foreground">
            {intl.formatMessage({ id: 'modules.email.connect.features.title', defaultMessage: 'What you can do with connected email:' })}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Inbox className="h-5 w-5 text-primary" />
              <div className="text-center">
                <div className="font-medium text-sm">
                  {intl.formatMessage({ id: 'modules.email.connect.features.read', defaultMessage: 'Read emails' })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.email.connect.features.readDesc', defaultMessage: 'Access your inbox' })}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Send className="h-5 w-5 text-primary" />
              <div className="text-center">
                <div className="font-medium text-sm">
                  {intl.formatMessage({ id: 'modules.email.connect.features.send', defaultMessage: 'Send emails' })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.email.connect.features.sendDesc', defaultMessage: 'Compose & reply' })}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Star className="h-5 w-5 text-primary" />
              <div className="text-center">
                <div className="font-medium text-sm">
                  {intl.formatMessage({ id: 'modules.email.connect.features.organize', defaultMessage: 'Organize' })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.email.connect.features.organizeDesc', defaultMessage: 'Star & label' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>{intl.formatMessage({ id: 'modules.email.connect.security', defaultMessage: 'Your data is secure and encrypted' })}</span>
        </div>
      </div>
    </div>
  );
}
