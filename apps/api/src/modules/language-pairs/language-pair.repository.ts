import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LanguagePairRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveLanguagePairs() {
    return this.prisma.languagePair.findMany({
      where: {
        isActive: true,
      },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
      },
      orderBy: [
        {
          sourceLanguage: {
            name: 'asc',
          },
        },
        {
          targetLanguage: {
            name: 'asc',
          },
        },
      ],
    });
  }
}
