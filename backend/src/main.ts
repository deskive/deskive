import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Configure body parser limits for larger payloads (like file uploads)
  app.use(bodyParser.json({ limit: '50mb' }));

  // Configure urlencoded parser with verify callback to capture raw body for Slack signature verification
  app.use(
    bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      verify: (req: any, res, buf, encoding) => {
        // Capture raw body for Slack routes (needed for signature verification)
        if (req.url?.includes('/slack/')) {
          req.rawBody = buf.toString('utf8');
        }
      },
    }),
  );

  app.use(bodyParser.raw({ limit: '50mb', type: 'application/octet-stream' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      forbidNonWhitelisted: true,
    }),
  );

  // MANUAL CORS MIDDLEWARE - This works reliably
  console.log('🔓 Enabling CORS...');
  app.use((req, res, next) => {
    // Set CORS headers for every response
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-api-key,X-Api-Key,x-project-id,X-Project-ID,x-app-id,X-App-ID,x-organization-id,X-Organization-ID',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    console.log(`📨 ${req.method} ${req.url} from ${req.headers.origin || 'no origin'}`);

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS preflight handled');
      return res.status(200).end();
    }

    next();
  });

  console.log('🌐 CORS enabled with manual middleware');

  // API prefix (just "api", versioning will add "/v1")
  const apiPrefix = configService.get('API_PREFIX') || 'api';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['api-docs', 'api-docs/(.*)', 'api-docs-json'],
  });

  // Enable versioning (adds "/v1" to make "/api/v1")
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger documentation (setup regardless of environment for now, can be restricted later)
  const config = new DocumentBuilder()
    .setTitle('Deskive API')
    .setDescription('Comprehensive Workspace Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('workspaces', 'Workspace management')
    .addTag('workspace-invitations', 'Workspace invitation management')
    .addTag('chat', 'Team communication and messaging')
    .addTag('projects', 'Project management, Kanban boards, and tasks')
    .addTag('files', 'File storage, management, and folders')
    .addTag('storage', 'File storage operations')
    .addTag('calendar', 'Calendar events and scheduling')
    .addTag('notes', 'Note-taking and documentation')
    .addTag('Notifications', 'Notification system')
    .addTag('AI Services', 'AI-powered features')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('dashboard', 'Dashboard statistics')
    .addTag('events', 'Event streaming and updates')
    .addTag('integrations', 'Third-party integrations')
    .addTag('monitoring', 'System monitoring')
    .addTag('search', 'Universal search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get('PORT') || 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Deskive Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  console.log(`🌐 API Endpoint: http://localhost:${port}/${apiPrefix}`);
  console.log(`⚡ WebSocket Server: ws://localhost:${port}`);
}

bootstrap();
