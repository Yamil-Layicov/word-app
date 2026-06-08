import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCountries() {
    return this.prisma.country.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
