import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoogleSheetsModule } from '../integration-framework/google-sheets/google-sheets.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';
import { BudgetModule } from '../budget/budget.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    GoogleSheetsModule,
    forwardRef(() => WebSocketModule),
    forwardRef(() => BudgetModule),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
