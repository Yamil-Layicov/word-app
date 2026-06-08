import { Injectable } from '@nestjs/common';
import { CountryRepository } from './country.repository';

@Injectable()
export class CountryService {
  constructor(private readonly countryRepository: CountryRepository) {}

  async findAll() {
    const countries = await this.countryRepository.findActiveCountries();

    return countries.map((country) => ({
      id: country.id,
      code: country.code,
      name: country.name,
      emoji: country.emoji,
    }));
  }
}
