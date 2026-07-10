import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DecksController } from './decks.controller';
import { DecksRepository } from './decks.repository';
import { DecksService } from './decks.service';

@Module({
  imports: [AuthModule],
  controllers: [DecksController],
  providers: [DecksService, DecksRepository],
})
export class DecksModule {}
