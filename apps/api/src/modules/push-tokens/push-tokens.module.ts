import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PushTokensController } from './push-tokens.controller';
import { PushTokensRepository } from './push-tokens.repository';
import { PushTokensService } from './push-tokens.service';

@Module({
  imports: [AuthModule],
  controllers: [PushTokensController],
  providers: [PushTokensService, PushTokensRepository],
})
export class PushTokensModule {}
