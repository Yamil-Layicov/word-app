import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MasteredCollectionsController } from './mastered-collections.controller';
import { MasteredCollectionsRepository } from './mastered-collections.repository';
import { MasteredCollectionsService } from './mastered-collections.service';

@Module({
  imports: [AuthModule],
  controllers: [MasteredCollectionsController],
  providers: [MasteredCollectionsService, MasteredCollectionsRepository],
})
export class MasteredCollectionsModule {}
