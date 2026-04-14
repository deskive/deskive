import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LangChainSuggestionsService } from './langchain-suggestions.service';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, LangChainSuggestionsService, AuthGuard],
  exports: [DashboardService, LangChainSuggestionsService],
})
export class DashboardModule {}
