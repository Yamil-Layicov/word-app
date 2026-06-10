import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyRepository } from './vocabulary.repository';
import { VocabularyService } from './vocabulary.service';

@Module({
  imports: [AuthModule],
  controllers: [VocabularyController],
  providers: [VocabularyService, VocabularyRepository],
})
export class VocabularyModule {}
