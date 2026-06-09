import { Injectable } from '@nestjs/common';
import type { CefrLevel, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { MeLanguagePairsModel, MeProfileResponseModel } from './me.types';

type MeLanguagePairsRepositoryResult = MeLanguagePairsModel & {
  status: UserStatus;
};

type ActiveLanguagePairUpdateContext = {
  status: UserStatus;
  profile: {
    id: string;
    activeLanguagePairId: string | null;
  } | null;
  languagePairs: {
    id: string;
    languagePairId: string;
    isLearning: boolean;
    languagePair: {
      id: string;
      isActive: boolean;
    };
  }[];
};

type AddLanguagePairContext = {
  user: {
    status: UserStatus;
    profile: {
      id: string;
      activeLanguagePairId: string | null;
    } | null;
  } | null;
  languagePair: {
    id: string;
    isActive: boolean;
  } | null;
  existingUserLanguagePair: {
    id: string;
  } | null;
};

type AddLanguagePairInput = {
  userId: string;
  languagePairId: string;
  targetCefrLevel?: CefrLevel;
  setAsActive: boolean;
};

type UpdateProfileContext = {
  user: {
    status: UserStatus;
    profile: {
      id: string;
    } | null;
  } | null;
  country: {
    code: string;
  } | null;
  interfaceLanguage: {
    code: string;
  } | null;
};

type UpdateProfileInput = {
  userId: string;
  displayName?: string;
  countryCode?: string;
  interfaceLanguage?: string;
};

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

  async findLanguagePairsByUserId(
    userId: string,
  ): Promise<MeLanguagePairsRepositoryResult | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
        profile: {
          select: {
            activeLanguagePairId: true,
          },
        },
        languagePairs: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            languagePairId: true,
            isLearning: true,
            targetCefrLevel: true,
            createdAt: true,
            languagePair: {
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
      status: user.status,
      activeLanguagePairId: user.profile?.activeLanguagePairId ?? null,
      languagePairs: user.languagePairs,
    };
  }

  findActiveLanguagePairUpdateContext(
    userId: string,
    languagePairId: string,
  ): Promise<ActiveLanguagePairUpdateContext | null> {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
        profile: {
          select: {
            id: true,
            activeLanguagePairId: true,
          },
        },
        languagePairs: {
          where: {
            languagePairId,
          },
          take: 1,
          select: {
            id: true,
            languagePairId: true,
            isLearning: true,
            languagePair: {
              select: {
                id: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async updateActiveLanguagePair(
    userId: string,
    languagePairId: string,
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: {
        userId,
      },
      data: {
        activeLanguagePairId: languagePairId,
      },
    });
  }

  async findAddLanguagePairContext(
    userId: string,
    languagePairId: string,
  ): Promise<AddLanguagePairContext> {
    const [user, languagePair, existingUserLanguagePair] =
      await this.prisma.$transaction([
        this.prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            status: true,
            profile: {
              select: {
                id: true,
                activeLanguagePairId: true,
              },
            },
          },
        }),
        this.prisma.languagePair.findUnique({
          where: {
            id: languagePairId,
          },
          select: {
            id: true,
            isActive: true,
          },
        }),
        this.prisma.userLanguagePair.findUnique({
          where: {
            userId_languagePairId: {
              userId,
              languagePairId,
            },
          },
          select: {
            id: true,
          },
        }),
      ]);

    return {
      user,
      languagePair,
      existingUserLanguagePair,
    };
  }

  async addLanguagePairForUser(input: AddLanguagePairInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userLanguagePair.create({
        data: {
          userId: input.userId,
          languagePairId: input.languagePairId,
          targetCefrLevel: input.targetCefrLevel ?? null,
        },
      });

      if (input.setAsActive) {
        await tx.userProfile.update({
          where: {
            userId: input.userId,
          },
          data: {
            activeLanguagePairId: input.languagePairId,
          },
        });
      }
    });
  }

  async findUpdateProfileContext(input: {
    userId: string;
    countryCode?: string;
    interfaceLanguage?: string;
  }): Promise<UpdateProfileContext> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        status: true,
        profile: {
          select: {
            id: true,
          },
        },
      },
    });

    const [country, interfaceLanguage] = await Promise.all([
      input.countryCode
        ? this.prisma.country.findFirst({
            where: {
              code: input.countryCode,
              isActive: true,
            },
            select: {
              code: true,
            },
          })
        : Promise.resolve(null),
      input.interfaceLanguage
        ? this.prisma.language.findFirst({
            where: {
              code: input.interfaceLanguage,
              isActive: true,
            },
            select: {
              code: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      user,
      country,
      interfaceLanguage,
    };
  }
  async updateProfile(input: UpdateProfileInput): Promise<void> {
    const data: {
      displayName?: string;
      countryCode?: string;
      interfaceLanguage?: string;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = input.displayName;
    }

    if (input.countryCode !== undefined) {
      data.countryCode = input.countryCode;
    }

    if (input.interfaceLanguage !== undefined) {
      data.interfaceLanguage = input.interfaceLanguage;
    }

    await this.prisma.userProfile.update({
      where: {
        userId: input.userId,
      },
      data,
    });
  }
}
