import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { GoogleDriveService } from '../integration-framework/google-drive/google-drive.service';
import { GoogleSheetsService } from '../integration-framework/google-sheets/google-sheets.service';
import { EmailService } from '../integration-framework/email/email.service';
import { GoogleCalendarSyncService } from '../calendar/google-calendar-sync.service';
import { GenericOAuthService } from '../integration-framework/services/generic-oauth.service';
import { ConnectionService } from '../integration-framework/services/connection.service';
import { CatalogService } from '../integration-framework/services/catalog.service';

/**
 * Unified Google OAuth Callback Controller
 *
 * This controller handles OAuth callbacks for all Google services (Drive, Gmail, etc.)
 * using a single redirect URI. The 'service' field in the state parameter determines
 * which service handler to use.
 *
 * Redirect URI: /api/v1/integrations/google/callback
 *
 * Supported services:
 * - gmail, email: Gmail integration
 * - calendar, google-calendar: Google Calendar
 * - sheets, google-sheets: Google Sheets
 * - drive, google-drive: Google Drive (default)
 * - google-chat: Google Chat
 * - google-meet: Google Meet
 * - google-cloud: Google Cloud Platform
 * - google-analytics: Google Analytics
 * - youtube: YouTube
 */
@ApiTags('integrations')
@Controller('integrations/google')
export class GoogleOAuthController {
  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly emailService: EmailService,
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
    private readonly genericOAuthService: GenericOAuthService,
    private readonly connectionService: ConnectionService,
    private readonly catalogService: CatalogService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: 'Unified Google OAuth callback for all services' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', description: 'State parameter containing service type and metadata' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with result' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      // Handle OAuth errors
      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect(`${frontendUrl}?google_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${frontendUrl}?google_error=missing_params`);
      }

      // Parse state to determine which service
      let stateData: any;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      } catch (e) {
        console.error('Failed to parse OAuth state:', e);
        return res.redirect(`${frontendUrl}?google_error=invalid_state`);
      }

      const service = stateData.service || 'drive'; // Default to drive for backwards compatibility
      const workspaceId = stateData.workspaceId;

      console.log(`Google OAuth callback for service: ${service}, workspace: ${workspaceId}`);

      // Route to appropriate service handler
      switch (service) {
        case 'gmail':
        case 'email':
          return await this.handleGmailCallback(code, state, stateData, res, frontendUrl);

        case 'calendar':
        case 'google-calendar':
          return await this.handleCalendarCallback(code, stateData, res, frontendUrl);

        case 'sheets':
        case 'google-sheets':
          return await this.handleSheetsCallback(code, state, stateData, res, frontendUrl);

        case 'drive':
        case 'google-drive':
          return await this.handleDriveCallback(code, state, stateData, res, frontendUrl);

        // New Google services using generic OAuth handler
        case 'google-chat':
        case 'google-meet':
        case 'google-cloud':
        case 'google-analytics':
        case 'youtube':
          return await this.handleGenericGoogleCallback(code, service, stateData, res, frontendUrl);

        default:
          return await this.handleDriveCallback(code, state, stateData, res, frontendUrl);
      }
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      return res.redirect(
        `${frontendUrl}?google_error=${encodeURIComponent(err.message || 'unknown_error')}`
      );
    }
  }

  /**
   * Handle Gmail OAuth callback
   */
  private async handleGmailCallback(
    code: string,
    state: string,
    stateData: any,
    res: Response,
    frontendUrl: string,
  ) {
    try {
      const connection = await this.emailService.handleOAuthCallback(code, state);
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/email`;

      // Build redirect URL with proper query parameter handling
      const separator = returnUrl.includes('?') ? '&' : '?';
      const redirectUrl = `${returnUrl}${separator}emailConnected=true&email=${encodeURIComponent(connection.emailAddress)}`;

      console.log('Email OAuth redirect URL:', redirectUrl);

      // Check if returnUrl is a custom scheme (mobile app deep link)
      // Browsers can't redirect to custom schemes, so we need to serve an HTML page
      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, redirectUrl, 'Email Connected Successfully');
      }

      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('Gmail OAuth callback error:', err);
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/email`;

      const separator = returnUrl.includes('?') ? '&' : '?';
      const errorUrl = `${returnUrl}${separator}emailError=${encodeURIComponent(err.message || 'unknown_error')}`;

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, errorUrl, 'Email Connection Failed');
      }

      return res.redirect(errorUrl);
    }
  }

  /**
   * Check if URL uses a custom scheme (not http/https)
   */
  private isCustomScheme(url: string): boolean {
    try {
      const parsed = new URL(url);
      return !['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Send an HTML page that triggers a deep link
   * This is needed because browsers can't redirect to custom URL schemes
   */
  private sendDeepLinkPage(res: Response, deepLinkUrl: string, title: string, errorMessage?: string) {
    const isError = title.toLowerCase().includes('failed');
    const bgGradient = isError
      ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const buttonColor = isError ? '#e53935' : '#667eea';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: ${bgGradient};
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
    }
    h1 { margin-bottom: 10px; font-size: 24px; }
    p { opacity: 0.9; margin-bottom: 20px; }
    .error-msg {
      background: rgba(0,0,0,0.2);
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      word-break: break-word;
    }
    .button {
      display: inline-block;
      background: white;
      color: ${buttonColor};
      padding: 15px 40px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover { transform: scale(1.05); }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    ${isError ? '<div class="icon">❌</div>' : '<div class="spinner"></div>'}
    <h1>${title}</h1>
    ${errorMessage ? `<div class="error-msg">${errorMessage}</div>` : ''}
    <p>Redirecting you back to the app...</p>
    <a href="${deepLinkUrl}" class="button">Open App</a>
  </div>
  <script>
    // Try to open the deep link automatically
    window.location.href = "${deepLinkUrl}";

    // Fallback: try again after a short delay
    setTimeout(function() {
      window.location.href = "${deepLinkUrl}";
    }, 500);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  /**
   * Handle Google Calendar OAuth callback
   */
  private async handleCalendarCallback(
    code: string,
    stateData: any,
    res: Response,
    frontendUrl: string,
  ) {
    try {
      const result = await this.googleCalendarSyncService.handleOAuthCallback(
        code,
        stateData.userId,
        stateData.workspaceId,
      );

      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/calendar`;

      // Build redirect URL with proper query parameter handling
      const separator = returnUrl.includes('?') ? '&' : '?';
      const redirectUrl = `${returnUrl}${separator}calendarConnected=true&email=${encodeURIComponent(result.connection.googleEmail || '')}`;

      console.log('Calendar OAuth redirect URL:', redirectUrl);

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, redirectUrl, 'Google Calendar Connected Successfully');
      }

      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('Google Calendar OAuth callback error:', err);
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/calendar`;

      const separator = returnUrl.includes('?') ? '&' : '?';
      const errorUrl = `${returnUrl}${separator}calendarError=${encodeURIComponent(err.message || 'unknown_error')}`;

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, errorUrl, 'Google Calendar Connection Failed');
      }

      return res.redirect(errorUrl);
    }
  }

  /**
   * Handle Google Sheets OAuth callback
   */
  private async handleSheetsCallback(
    code: string,
    state: string,
    stateData: any,
    res: Response,
    frontendUrl: string,
  ) {
    try {
      const connection = await this.googleSheetsService.handleOAuthCallback(code, state);

      // Check if returnUrl was provided (for mobile deep link)
      let returnUrl = stateData.returnUrl;

      if (returnUrl) {
        // Build redirect URL with success params
        const separator = returnUrl.includes('?') ? '&' : '?';
        const redirectUrl = `${returnUrl}${separator}success=true&google_sheets_connected=true&email=${encodeURIComponent(connection.googleEmail || '')}`;

        console.log('Google Sheets OAuth redirect URL:', redirectUrl);

        // Check if returnUrl is a custom scheme (mobile app deep link)
        if (this.isCustomScheme(returnUrl)) {
          return this.sendDeepLinkPage(res, redirectUrl, 'Google Sheets Connected Successfully');
        }

        return res.redirect(redirectUrl);
      }

      // Default: redirect to web frontend
      return res.redirect(
        `${frontendUrl}/workspaces/${connection.workspaceId}/settings/integrations?google_sheets_success=true`
      );
    } catch (err) {
      console.error('Google Sheets OAuth callback error:', err);

      const errorMessage = err.message || 'unknown_error';

      // Check if returnUrl was provided (for mobile deep link)
      let returnUrl = stateData.returnUrl;

      if (returnUrl) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        const errorUrl = `${returnUrl}${separator}error=${encodeURIComponent(errorMessage)}`;

        // Check if returnUrl is a custom scheme (mobile app deep link)
        if (this.isCustomScheme(returnUrl)) {
          return this.sendDeepLinkPage(res, errorUrl, 'Google Sheets Connection Failed', errorMessage);
        }

        return res.redirect(errorUrl);
      }

      // Default: redirect to web frontend
      return res.redirect(
        `${frontendUrl}/settings/integrations?google_sheets_error=${encodeURIComponent(errorMessage)}`
      );
    }
  }

  /**
   * Handle Google Drive OAuth callback
   */
  private async handleDriveCallback(
    code: string,
    state: string,
    stateData: any,
    res: Response,
    frontendUrl: string,
  ) {
    try {
      const connection = await this.googleDriveService.handleOAuthCallback(code, state);

      // Check if returnUrl was provided (for mobile deep link)
      let returnUrl = stateData.returnUrl;

      if (returnUrl) {
        // Build redirect URL with success params
        const separator = returnUrl.includes('?') ? '&' : '?';
        const redirectUrl = `${returnUrl}${separator}success=true&google_drive_connected=true&email=${encodeURIComponent(connection.googleEmail || '')}`;

        console.log('Google Drive OAuth redirect URL:', redirectUrl);

        // Check if returnUrl is a custom scheme (mobile app deep link)
        if (this.isCustomScheme(returnUrl)) {
          return this.sendDeepLinkPage(res, redirectUrl, 'Google Drive Connected Successfully');
        }

        return res.redirect(redirectUrl);
      }

      // Default: redirect to web frontend
      return res.redirect(
        `${frontendUrl}/workspaces/${connection.workspaceId}/settings/integrations?google_drive_success=true`
      );
    } catch (err) {
      console.error('Google Drive OAuth callback error:', err);

      const errorMessage = err.message || 'unknown_error';

      // Check if returnUrl was provided (for mobile deep link)
      let returnUrl = stateData.returnUrl;

      if (returnUrl) {
        const separator = returnUrl.includes('?') ? '&' : '?';
        const errorUrl = `${returnUrl}${separator}error=${encodeURIComponent(errorMessage)}`;

        // Check if returnUrl is a custom scheme (mobile app deep link)
        if (this.isCustomScheme(returnUrl)) {
          return this.sendDeepLinkPage(res, errorUrl, 'Google Drive Connection Failed', errorMessage);
        }

        return res.redirect(errorUrl);
      }

      // Default: redirect to web frontend
      return res.redirect(
        `${frontendUrl}/settings/integrations?google_drive_error=${encodeURIComponent(errorMessage)}`
      );
    }
  }

  /**
   * Handle generic Google OAuth callback for services without dedicated handlers
   * (Google Chat, Meet, Cloud, Analytics, YouTube)
   */
  private async handleGenericGoogleCallback(
    code: string,
    service: string,
    stateData: any,
    res: Response,
    frontendUrl: string,
  ) {
    try {
      // Get integration from catalog (cast to entry type for OAuth service compatibility)
      const integrationDto = await this.catalogService.getBySlug(service);
      const integration = integrationDto as any; // DTO has same structure as Entry

      // Exchange code for tokens using generic OAuth service
      const tokens = await this.genericOAuthService.exchangeCodeForTokens(integration, code);

      // Get user info
      const userInfo = await this.genericOAuthService.getUserInfo(integration, tokens.accessToken);

      // Create/update connection in database
      const connection = await this.connectionService.createConnection(
        stateData.workspaceId,
        stateData.userId,
        integration.id,
        tokens,
        userInfo,
      );

      // Build success redirect URL
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/settings/integrations`;
      const separator = returnUrl.includes('?') ? '&' : '?';
      const successParam = `${service.replace('-', '_')}_connected`;
      const redirectUrl = `${returnUrl}${separator}success=true&${successParam}=true&email=${encodeURIComponent(userInfo.email || '')}`;

      console.log(`${service} OAuth redirect URL:`, redirectUrl);

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        const displayName = this.getServiceDisplayName(service);
        return this.sendDeepLinkPage(res, redirectUrl, `${displayName} Connected Successfully`);
      }

      return res.redirect(redirectUrl);
    } catch (err) {
      console.error(`${service} OAuth callback error:`, err);

      const errorMessage = err.message || 'unknown_error';
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId}/settings/integrations`;

      const separator = returnUrl.includes('?') ? '&' : '?';
      const errorUrl = `${returnUrl}${separator}error=${encodeURIComponent(errorMessage)}`;

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        const displayName = this.getServiceDisplayName(service);
        return this.sendDeepLinkPage(res, errorUrl, `${displayName} Connection Failed`, errorMessage);
      }

      return res.redirect(errorUrl);
    }
  }

  /**
   * Get display name for a Google service
   */
  private getServiceDisplayName(service: string): string {
    const names: Record<string, string> = {
      'google-chat': 'Google Chat',
      'google-meet': 'Google Meet',
      'google-cloud': 'Google Cloud',
      'google-analytics': 'Google Analytics',
      'youtube': 'YouTube',
    };
    return names[service] || service;
  }
}
