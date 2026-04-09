import { Module, forwardRef } from '@nestjs/common';
import { BotsController } from './controllers/bots.controller';
import { BotsService } from './services/bots.service';
import { BotTriggersService } from './services/bot-triggers.service';
import { BotActionsService } from './services/bot-actions.service';
import { BotInstallationsService } from './services/bot-installations.service';
import { BotVariablesService } from './services/bot-variables.service';
import { TriggerEvaluatorService } from './services/trigger-evaluator.service';
import { ActionExecutorService } from './services/action-executor.service';
import { BotExecutionService } from './services/bot-execution.service';
import { BotMessageHandlerService } from './services/bot-message-handler.service';
import { BotIntentClassifierService } from './services/bot-intent-classifier.service';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ProjectsModule } from '../projects/projects.module';
import { CalendarModule } from '../calendar/calendar.module';
import { AutoPilotModule } from '../autopilot/autopilot.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';
import { AutomationCoreModule } from '../automation-core';

@Module({
  imports: [
    AuthModule,
    AutomationCoreModule,
    forwardRef(() => ChatModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => CalendarModule),
    forwardRef(() => AutoPilotModule),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [BotsController],
  providers: [
    BotsService,
    BotTriggersService,
    BotActionsService,
    BotInstallationsService,
    BotVariablesService,
    TriggerEvaluatorService,
    ActionExecutorService,
    BotExecutionService,
    BotMessageHandlerService,
    BotIntentClassifierService,
  ],
  exports: [
    BotsService,
    BotTriggersService,
    BotActionsService,
    BotInstallationsService,
    BotExecutionService,
    BotMessageHandlerService,
  ],
})
export class BotsModule {}
