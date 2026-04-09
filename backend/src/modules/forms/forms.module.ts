import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FormsController } from './forms.controller';
import { PublicFormsController } from './public-forms.controller';
import { FormsService } from './forms.service';
import { FormResponsesService } from './form-responses.service';
import { FormAnalyticsService } from './form-analytics.service';

@Module({
  imports: [AuthModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService, FormResponsesService, FormAnalyticsService],
  exports: [FormsService, FormResponsesService, FormAnalyticsService],
})
export class FormsModule {}
