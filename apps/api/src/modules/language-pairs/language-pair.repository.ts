import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LanguagePairRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveLanguagePairs() {
    return this.prisma.languagePair.findMany({
      where: {
        isActive: true,
        sourceLanguage: {
          isActive: true,
        },
        targetLanguage: {
          isActive: true,
        },
      },
      select: {
        id: true,
        sourceLanguage: {
          select: {
            id: true,
            code: true,
            name: true,
            nativeName: true,
          },
        },
        targetLanguage: {
          select: {
            id: true,
            code: true,
            name: true,
            nativeName: true,
          },
        },
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
