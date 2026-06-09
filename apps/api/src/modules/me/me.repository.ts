import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { MeProfileResponseModel } from './me.types';

const meLanguageSelect = {
  id: true,
  code: true,
  name: true,
  nativeName: true,
} as const;

const meLanguagePairSelect = {
  id: true,
  sourceLanguage: {
    select: meLanguageSelect,
  },
  targetLanguage: {
    select: meLanguageSelect,
  },
} as const;

@Injectable()
export class MeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileByUserId(
    userId: string,
  ): Promise<MeProfileResponseModel | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            displayName: true,
            countryCode: true,
            interfaceLanguage: true,
            activeLanguagePairId: true,
            activeLanguagePair: {
              select: meLanguagePairSelect,
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile
        ? {
            id: user.profile.id,
            displayName: user.profile.displayName,
            countryCode: user.profile.countryCode,
            interfaceLanguage: user.profile.interfaceLanguage,
            activeLanguagePairId: user.profile.activeLanguagePairId,
          }
        : null,
      activeLanguagePair: user.profile?.activeLanguagePair ?? null,
      createdAt: user.createdAt,
    };
  }
}
