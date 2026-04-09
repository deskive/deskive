import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CatalogService } from './services/catalog.service';
import { ConnectionService } from './services/connection.service';
import { GenericOAuthService } from './services/generic-oauth.service';
import {
  IntegrationFiltersDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  MarketplaceResponseDto,
  IntegrationCatalogResponseDto,
} from './dto/catalog.dto';
import {
  InitiateOAuthDto,
  ConnectApiKeyDto,
  UpdateConnectionConfigDto,
  OAuthCallbackQueryDto,
  ConnectionResponseDto,
  ConnectionListResponseDto,
  InitiateOAuthResponseDto,
} from './dto/connection.dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Integration Framework')
@Controller('integrations')
export class IntegrationFrameworkController {
  private readonly logger = new Logger(IntegrationFrameworkController.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly connectionService: ConnectionService,
    private readonly oauthService: GenericOAuthService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== CATALOG ENDPOINTS ====================

  @Get('catalog')
  @ApiOperation({ summary: 'Get integration marketplace' })
  @ApiResponse({ status: 200, type: MarketplaceResponseDto })
  async getMarketplace(
    @Query() filters: IntegrationFiltersDto,
  ): Promise<MarketplaceResponseDto> {
    return this.catalogService.getMarketplace(filters);
  }

  @Get('catalog/categories')
  @ApiOperation({ summary: 'Get all categories with counts' })
  async getCategories(): Promise<{ category: string; count: number }[]> {
    return this.catalogService.getCategories();
  }

  @Get('catalog/:slug')
  @ApiOperation({ summary: 'Get integration details by slug' })
  @ApiParam({ name: 'slug', description: 'Integration slug (e.g., google-drive, slack)' })
  @ApiResponse({ status: 200, type: IntegrationCatalogResponseDto })
  async getIntegrationBySlug(
    @Param('slug') slug: string,
  ): Promise<IntegrationCatalogResponseDto> {
    return this.catalogService.getBySlug(slug);
  }

  // ==================== CONNECTION ENDPOINTS ====================

  @Get(':workspaceId/connections')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user connections in a workspace' })
  @ApiResponse({ status: 200, type: ConnectionListResponseDto })
  async getUserConnections(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionListResponseDto> {
    const userId = req.user.sub || req.user.userId;
    return this.connectionService.getUserConnections(workspaceId, userId);
  }

  @Get(':workspaceId/connections/:connectionId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connection details' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  async getConnection(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionResponseDto> {
    const userId = req.user.sub || req.user.userId;
    return this.connectionService.getConnection(connectionId, userId);
  }

  @Get(':workspaceId/connections/by-slug/:integrationSlug')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connection by integration slug' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  async getConnectionBySlug(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationSlug') integrationSlug: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionResponseDto | null> {
    const userId = req.user.sub || req.user.userId;
    return this.connectionService.getConnectionBySlug(
      workspaceId,
      userId,
      integrationSlug,
    );
  }

  @Patch(':workspaceId/connections/:connectionId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update connection configuration' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  async updateConnection(
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateConnectionConfigDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionResponseDto> {
    const userId = req.user.sub || req.user.userId;
    return this.connectionService.updateConnection(connectionId, userId, dto);
  }

  @Delete(':workspaceId/connections/:connectionId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect an integration' })
  @ApiResponse({ status: 204 })
  async disconnect(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user.sub || req.user.userId;
    await this.connectionService.disconnect(connectionId, userId);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  // ==================== OAUTH ENDPOINTS ====================

  @Post(':workspaceId/connect/:integrationSlug')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate OAuth connection' })
  @ApiResponse({ status: 200, type: InitiateOAuthResponseDto })
  async initiateOAuth(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationSlug') integrationSlug: string,
    @Body() dto: InitiateOAuthDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InitiateOAuthResponseDto> {
    const userId = req.user.sub || req.user.userId;

    const integration = await this.catalogService.getFullConfig(integrationSlug);

    if (integration.authType !== 'oauth2' && integration.authType !== 'oauth1') {
      throw new Error(
        `Integration '${integrationSlug}' does not support OAuth. Use the API key endpoint instead.`,
      );
    }

    const { authorizationUrl, state } = this.oauthService.getAuthorizationUrl(
      integration,
      userId,
      workspaceId,
      dto.returnUrl,
    );

    return { authUrl: authorizationUrl, state };
  }

  @Post(':workspaceId/connect-api-key/:integrationSlug')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect with API key' })
  @ApiResponse({ status: 200, type: ConnectionResponseDto })
  async connectWithApiKey(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationSlug') integrationSlug: string,
    @Body() dto: ConnectApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionResponseDto> {
    const userId = req.user.sub || req.user.userId;
    return this.connectionService.createApiKeyConnection(
      workspaceId,
      userId,
      integrationSlug,
      dto.apiKey,
      dto.config,
    );
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'OAuth callback handler (unified)' })
  async handleOAuthCallback(
    @Query() query: OAuthCallbackQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    try {
      // Check for OAuth errors
      if (query.error) {
        const errorMessage = query.error_description || query.error;
        this.logger.error(`OAuth error: ${errorMessage}`);
        return res.redirect(
          `${frontendUrl}/integrations?error=${encodeURIComponent(errorMessage)}`,
        );
      }

      if (!query.code) {
        return res.redirect(
          `${frontendUrl}/integrations?error=${encodeURIComponent('No authorization code received')}`,
        );
      }

      // Decode state
      const stateData = this.oauthService.decodeState(query.state);

      // Get integration config
      const integration = await this.catalogService.getFullConfig(
        stateData.integrationSlug,
      );

      // Exchange code for tokens
      const tokens = await this.oauthService.exchangeCodeForTokens(
        integration,
        query.code,
      );

      // Get user info
      const userInfo = await this.oauthService.getUserInfo(
        integration,
        tokens.accessToken,
      );

      // Create/update connection
      await this.connectionService.createConnection(
        stateData.workspaceId,
        stateData.userId,
        integration.id,
        tokens,
        userInfo,
      );

      // Redirect to success URL
      const returnUrl = stateData.returnUrl || `${frontendUrl}/integrations`;
      const successUrl = returnUrl.includes('?')
        ? `${returnUrl}&connected=${stateData.integrationSlug}`
        : `${returnUrl}?connected=${stateData.integrationSlug}`;

      this.logger.log(
        `Successfully connected ${stateData.integrationSlug} for user ${stateData.userId}`,
      );

      // Check if returnUrl is a custom scheme (mobile app)
      if (this.isCustomScheme(successUrl)) {
        return this.sendDeepLinkPage(res, successUrl, 'Connection Successful');
      }

      return res.redirect(successUrl);
    } catch (error) {
      this.logger.error('OAuth callback error', error);
      return res.redirect(
        `${frontendUrl}/integrations?error=${encodeURIComponent(error.message || 'OAuth failed')}`,
      );
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin/catalog')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create integration (admin)' })
  @ApiResponse({ status: 201, type: IntegrationCatalogResponseDto })
  async createIntegration(
    @Body() dto: CreateIntegrationDto,
  ): Promise<IntegrationCatalogResponseDto> {
    // TODO: Add admin role check
    return this.catalogService.create(dto);
  }

  @Patch('admin/catalog/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update integration (admin)' })
  @ApiResponse({ status: 200, type: IntegrationCatalogResponseDto })
  async updateIntegration(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
  ): Promise<IntegrationCatalogResponseDto> {
    // TODO: Add admin role check
    return this.catalogService.update(id, dto);
  }

  @Delete('admin/catalog/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete integration (admin)' })
  @ApiResponse({ status: 204 })
  async deleteIntegration(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    // TODO: Add admin role check
    await this.catalogService.delete(id);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post('admin/seed')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed integrations from data' })
  async seedIntegrations(
    @Body() data: { integrations: CreateIntegrationDto[] },
  ): Promise<{ created: number }> {
    // TODO: Add admin role check
    const created = await this.catalogService.seedFromData(data.integrations);
    return { created };
  }

  // ==================== TESTING ENDPOINTS ====================

  @Get('admin/run-tests')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run OAuth integration tests (uses nock + jest). Query params: ?slug=asana&type=oauth (or type=actions or type=all). Leave slug empty to test all' })
  async runIntegrationTests(
    @Query('slug') slug?: string,
    @Query('type') type?: 'oauth' | 'actions' | 'all',
  ) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      let command: string;

      if (slug) {
        let testPattern: string;

        // Determine which tests to run based on type parameter
        const testType = type || 'oauth'; // Default to OAuth tests

        if (testType === 'oauth') {
          // OAuth connection tests
          const oauthPatternMap: Record<string, string> = {
            'google-drive': 'integration-framework/google-drive.*oauth',
            'google-sheets': 'integration-framework/google-sheets.*oauth',
            'google-calendar': 'calendar.*oauth',
            'gmail': 'integration-framework/email.*oauth',
            'slack': 'integration-framework.*slack-oauth',
            'github': 'integration-framework/github.*oauth',
            'asana': 'integration-framework/asana.*asana-oauth',
            'clickup': 'integration-framework/clickup.*clickup-oauth',
            'jira': 'integration-framework/jira.*jira-oauth',
            'linear': 'integration-framework/linear.*linear-oauth',
            'notion': 'integration-framework/notion.*notion-oauth',
            'trello': 'integration-framework/trello.*trello-oauth',
          };
          testPattern = oauthPatternMap[slug];
        } else if (testType === 'actions') {
          // Action tests (service methods)
          const actionPatternMap: Record<string, string> = {
            'asana': 'integration-framework/asana/.*asana.service.spec',
            'clickup': 'integration-framework/clickup/.*clickup.service.spec',
            'jira': 'integration-framework/jira/.*jira.service.spec',
            'linear': 'integration-framework/linear/.*linear.service.spec',
            'notion': 'integration-framework/notion/.*notion.service.spec',
            'trello': 'integration-framework/trello/.*trello.service.spec',
          };
          testPattern = actionPatternMap[slug];
        } else {
          // Run all tests for the app (both OAuth + actions)
          testPattern = `integration-framework/${slug}/`;
        }

        if (!testPattern) {
          return {
            success: false,
            error: `No test found for integration: ${slug}. Available: asana, clickup, jira, linear, notion, trello`,
          };
        }

        command = `npm test -- --testPathPatterns="${testPattern}" --json --forceExit`;
        this.logger.log(`Testing ${slug} (type: ${testType}, pattern: ${testPattern})`);
      } else {
        // Test all OAuth integrations
        command = 'npm run test:oauth -- --json --forceExit';
        this.logger.log('Testing all OAuth integrations');
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Parse jest JSON output
      const lastJsonLine = stdout
        .split('\n')
        .filter((line: string) => line.trim().startsWith('{'))
        .pop();

      if (lastJsonLine) {
        const results = JSON.parse(lastJsonLine);

        return {
          success: results.success,
          numTotalTests: results.numTotalTests,
          numPassedTests: results.numPassedTests,
          numFailedTests: results.numFailedTests,
          testResults: results.testResults.map((suite: any) => ({
            name: suite.name.replace(process.cwd(), ''),
            status: suite.status,
            duration: suite.endTime - suite.startTime,
            numPassingTests: suite.numPassingTests,
            numFailingTests: suite.numFailingTests,
            tests: suite.assertionResults.map((test: any) => ({
              title: test.title,
              status: test.status,
              duration: test.duration,
              failureMessages: test.failureMessages,
            })),
          })),
          summary: {
            total: results.numTotalTests,
            passed: results.numPassedTests,
            failed: results.numFailedTests,
            success: results.success,
          },
        };
      }

      return {
        success: false,
        error: 'Could not parse test results',
        stdout,
        stderr,
      };
    } catch (error) {
      this.logger.error('Failed to run integration tests', error);
      return {
        success: false,
        error: error.message,
        stderr: error.stderr,
      };
    }
  }

  // ==================== HELPER METHODS ====================

  private isCustomScheme(url: string): boolean {
    try {
      const parsed = new URL(url);
      return !['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private sendDeepLinkPage(res: Response, redirectUrl: string, title: string): void {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { margin-bottom: 1rem; }
            p { opacity: 0.9; }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 1rem auto;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            <div class="spinner"></div>
            <p>Returning to the app...</p>
          </div>
          <script>
            window.location.href = '${redirectUrl}';
          </script>
        </body>
      </html>
    `;
    res.type('html').send(html);
  }
}
