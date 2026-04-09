import { Module, forwardRef } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { AuthModule } from '../auth/auth.module';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [
    AuthModule, // Required for JwtAuthGuard to work
    forwardRef(() => ApprovalsModule), // For expense approval integration
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
