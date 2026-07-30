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

type LinkGoogleIdentityInput = {
  email: string;
  providerSubject: string;
  userId: string;
};

type GoogleAutoLinkUser = AuthUserResponseModel & {
  emailVerifiedAt: Date | null;
};

export type LinkedAuthIdentityRecord = {
  id: string;
  provider: AuthProvider;
  providerSubject: string;
  emailAtLinkTime: string | null;
  createdAt: Date;
};

export type CreateGoogleUserResult =
  | {
      kind: 'CREATED' | 'IDENTITY_EXISTS';
      user: AuthUserResponseModel;
    }
  | {
      kind: 'EMAIL_EXISTS';
    };

export type LinkGoogleIdentityResult =
  | {
      kind: 'LINKED' | 'ALREADY_LINKED';
      identity: LinkedAuthIdentityRecord;
    }
  | {
      kind: 'PROVIDER_SUBJECT_IN_USE';
    }
  | {
      kind: 'USER_PROVIDER_EXISTS';
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

  findUserByEmailForAutoLink(
    email: string,
  ): Promise<GoogleAutoLinkUser | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        ...authUserResponseSelect,
        emailVerifiedAt: true,
      },
    });
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

  getLinkedIdentities(userId: string): Promise<LinkedAuthIdentityRecord[]> {
    return this.prisma.userIdentity.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        provider: true,
        providerSubject: true,
        emailAtLinkTime: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async linkGoogleIdentity(
    input: LinkGoogleIdentityInput,
  ): Promise<LinkGoogleIdentityResult> {
    const existingResult = await this.resolveExistingLink(input);

    if (existingResult) {
      return existingResult;
    }

    try {
      const identity = await this.prisma.userIdentity.create({
        data: {
          userId: input.userId,
          provider: AuthProvider.GOOGLE,
          providerSubject: input.providerSubject,
          emailAtLinkTime: input.email,
        },
        select: {
          id: true,
          provider: true,
          providerSubject: true,
          emailAtLinkTime: true,
          createdAt: true,
        },
      });

      return {
        kind: 'LINKED',
        identity,
      };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentResult = await this.resolveExistingLink(input);

      if (concurrentResult) {
        return concurrentResult;
      }

      throw new Error('Could not resolve Google account linking conflict');
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

  private async resolveExistingLink(
    input: LinkGoogleIdentityInput,
  ): Promise<LinkGoogleIdentityResult | null> {
    const identityBySubject = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.GOOGLE,
          providerSubject: input.providerSubject,
        },
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerSubject: true,
        emailAtLinkTime: true,
        createdAt: true,
      },
    });

    if (identityBySubject) {
      if (identityBySubject.userId !== input.userId) {
        return {
          kind: 'PROVIDER_SUBJECT_IN_USE',
        };
      }

      return {
        kind: 'ALREADY_LINKED',
        identity: identityBySubject,
      };
    }

    const identityForUser = await this.prisma.userIdentity.findUnique({
      where: {
        userId_provider: {
          userId: input.userId,
          provider: AuthProvider.GOOGLE,
        },
      },
      select: {
        id: true,
      },
    });

    return identityForUser
      ? {
          kind: 'USER_PROVIDER_EXISTS',
        }
      : null;
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
