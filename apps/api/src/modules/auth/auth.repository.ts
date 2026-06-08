import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  AuthSessionForRefresh,
  AuthUserForLogin,
  AuthUserResponseModel,
  CreatedAuthSession,
} from './auth.types';

type EmailCheckResult = {
  id: string;
};

type ActiveLanguagePairCheckResult = {
  id: string;
};

type ActiveCountryCheckResult = {
  code: string;
};

type CreateUserWithProfileInput = {
  email: string;
  passwordHash: string;
  displayName?: string;
  countryCode?: string;
  languagePairId: string;
};

type CreateAuthSessionInput = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

type RotateAuthSessionInput = {
  id: string;
  currentRefreshTokenHash: string;
  nextRefreshTokenHash: string;
  expiresAt: Date;
  now: Date;
};

const authUserResponseSelect = {
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
    },
  },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<EmailCheckResult | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
  }

  findUserForAuth(email: string): Promise<AuthUserForLogin | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        ...authUserResponseSelect,
        passwordHash: true,
      },
    });
  }

  findActiveLanguagePairById(
    languagePairId: string,
  ): Promise<ActiveLanguagePairCheckResult | null> {
    return this.prisma.languagePair.findFirst({
      where: {
        id: languagePairId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  findActiveCountryByCode(
    countryCode: string,
  ): Promise<ActiveCountryCheckResult | null> {
    return this.prisma.country.findFirst({
      where: {
        code: countryCode,
        isActive: true,
      },
      select: {
        code: true,
      },
    });
  }

  createUserWithProfile(
    input: CreateUserWithProfileInput,
  ): Promise<AuthUserResponseModel> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        profile: {
          create: {
            displayName: input.displayName,
            countryCode: input.countryCode,
            activeLanguagePairId: input.languagePairId,
          },
        },
        languagePairs: {
          create: {
            languagePairId: input.languagePairId,
          },
        },
      },
      select: authUserResponseSelect,
    });
  }

  createAuthSession(
    input: CreateAuthSessionInput,
  ): Promise<CreatedAuthSession> {
    return this.prisma.authSession.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });
  }

  findAuthSessionForRefresh(
    sessionId: string,
  ): Promise<AuthSessionForRefresh | null> {
    return this.prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: authUserResponseSelect,
        },
      },
    });
  }

  async rotateAuthSession(input: RotateAuthSessionInput): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: input.id,
        refreshTokenHash: input.currentRefreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: input.now,
        },
      },
      data: {
        refreshTokenHash: input.nextRefreshTokenHash,
        expiresAt: input.expiresAt,
      },
    });

    return result.count === 1;
  }
}
