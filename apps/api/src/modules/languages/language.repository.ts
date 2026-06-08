import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LanguageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveLanguages() {
    return this.prisma.language.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
