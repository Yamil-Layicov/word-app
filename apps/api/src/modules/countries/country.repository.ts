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
      select: {
        id: true,
        code: true,
        name: true,
        emoji: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
