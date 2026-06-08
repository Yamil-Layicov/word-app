import { Injectable } from '@nestjs/common';
import { LanguagePairRepository } from './language-pair.repository';

@Injectable()
export class LanguagePairService {
  constructor(
    private readonly languagePairRepository: LanguagePairRepository,
  ) {}

  async findAll() {
    const languagePairs =
      await this.languagePairRepository.findActiveLanguagePairs();

    return languagePairs.map((pair) => ({
      id: pair.id,
      sourceLanguage: {
        id: pair.sourceLanguage.id,
        code: pair.sourceLanguage.code,
        name: pair.sourceLanguage.name,
        nativeName: pair.sourceLanguage.nativeName,
      },
      targetLanguage: {
        id: pair.targetLanguage.id,
        code: pair.targetLanguage.code,
        name: pair.targetLanguage.name,
        nativeName: pair.targetLanguage.nativeName,
      },
    }));
  }
}
