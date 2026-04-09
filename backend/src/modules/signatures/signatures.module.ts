import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
