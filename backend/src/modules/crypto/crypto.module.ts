import { Module } from '@nestjs/common';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // Import AuthModule to get JWT functionality
  ],
  controllers: [CryptoController],
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
