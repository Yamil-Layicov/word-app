import { Injectable } from '@nestjs/common';
import { LanguageRepository } from './language.repository';

@Injectable()
export class LanguageService {
  constructor(private readonly languageRepository: LanguageRepository) {}

  async findAll() {
    const languages = await this.languageRepository.findActiveLanguages();

    return languages.map((language) => ({
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
    }));
  }
}
