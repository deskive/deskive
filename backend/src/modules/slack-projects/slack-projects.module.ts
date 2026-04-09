import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SlackProjectsController } from './slack-projects.controller';
import { SlackProjectsService } from './slack-projects.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    ConfigModule,
    ProjectsModule, // Import existing projects module
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SlackProjectsController],
  providers: [SlackProjectsService],
  exports: [SlackProjectsService], // Export so whiteboard controller can use it
})
export class SlackProjectsModule {}
