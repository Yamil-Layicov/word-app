import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { authUserResponseSelect } from '../auth.select';
import type { AuthUserResponseModel } from '../auth.types';

type CreateGoogleUserInput = {
  email: string;
  displayName?: string;
  languagePairId: string;
  providerSubject: string;
  verifiedAt: Date;
};

export type CreateGoogleUserResult =
  | {
      kind: 'CREATED' | 'IDENTITY_EXISTS';
      user: AuthUserResponseModel;
    }
  | {
      kind: 'EMAIL_EXISTS';
    };

@Injectable()
export class GoogleAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByProviderSubject(
    providerSubject: string,
  ): Promise<AuthUserResponseModel | null> {
    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.GOOGLE,
          providerSubject,
        },
      },
      select: {
        user: {
          select: authUserResponseSelect,
        },
      },
    });

    return identity?.user ?? null;
  }

  async createGoogleUser(
    input: CreateGoogleUserInput,
  ): Promise<CreateGoogleUserResult> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: null,
          emailVerifiedAt: input.verifiedAt,
          profile: {
            create: {
              displayName: input.displayName,
              activeLanguagePairId: input.languagePairId,
            },
          },
          languagePairs: {
            create: {
              languagePairId: input.languagePairId,
            },
          },
          identities: {
            create: {
              provider: AuthProvider.GOOGLE,
              providerSubject: input.providerSubject,
              emailAtLinkTime: input.email,
            },
          },
        },
        select: authUserResponseSelect,
      });

      return {
        kind: 'CREATED',
        user,
      };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      return this.resolveConcurrentCreation(input);
    }
  }

  private async resolveConcurrentCreation(
    input: CreateGoogleUserInput,
  ): Promise<CreateGoogleUserResult> {
    const identityUser = await this.findUserByProviderSubject(
      input.providerSubject,
    );

    if (identityUser) {
      return {
        kind: 'IDENTITY_EXISTS',
        user: identityUser,
      };
    }

    const emailUser = await this.prisma.user.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

    if (emailUser) {
      return {
        kind: 'EMAIL_EXISTS',
      };
    }

    throw new Error('Could not resolve Google account creation conflict');
  }

  private isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
