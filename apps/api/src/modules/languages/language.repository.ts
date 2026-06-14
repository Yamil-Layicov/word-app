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
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
