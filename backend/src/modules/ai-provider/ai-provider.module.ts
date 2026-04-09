import { Global, Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

@Global()
@Module({
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
