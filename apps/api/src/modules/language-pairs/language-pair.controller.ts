import { Controller, Get } from '@nestjs/common';
import { LanguagePairService } from './language-pair.service';

@Controller('language-pairs')
export class LanguagePairController {
  constructor(private readonly languagePairService: LanguagePairService) {}

  @Get()
  findAll() {
    return this.languagePairService.findAll();
  }
}
