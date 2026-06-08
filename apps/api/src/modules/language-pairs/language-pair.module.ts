import { Module } from '@nestjs/common';
import { LanguagePairController } from './language-pair.controller';
import { LanguagePairRepository } from './language-pair.repository';
import { LanguagePairService } from './language-pair.service';

@Module({
  controllers: [LanguagePairController],
  providers: [LanguagePairService, LanguagePairRepository],
})
export class LanguagePairModule {}
