import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddMeLanguagePairDto } from './dto/add-me-language-pair.dto';
import { UpdateActiveLanguagePairDto } from './dto/update-active-language-pair.dto';
import { UpdateMeProfileDto } from './dto/update-me-profile.dto';
import { toMeLanguagePairsResponse, toMeProfileResponse } from './me.mapper';
import { MeRepository } from './me.repository';
import type { MeLanguagePairsResponse, MeProfileResponse } from './me.types';

@Injectable()
export class MeService {
  constructor(private readonly meRepository: MeRepository) {}

  async getProfile(currentUser: AuthenticatedUser): Promise<MeProfileResponse> {
    const user = await this.meRepository.findProfileByUserId(currentUser.id);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    return toMeProfileResponse(user);
  }

  async updateProfile(
    currentUser: AuthenticatedUser,
    updateMeProfileDto: UpdateMeProfileDto,
  ): Promise<MeProfileResponse> {
    const displayName = this.normalizeOptionalDisplayName(
      updateMeProfileDto.displayName,
    );
    const countryCode = updateMeProfileDto.countryCode
      ? this.normalizeCountryCode(updateMeProfileDto.countryCode)
      : undefined;
    const interfaceLanguage = updateMeProfileDto.interfaceLanguage
      ? this.normalizeInterfaceLanguage(updateMeProfileDto.interfaceLanguage)
      : undefined;

    if (
      displayName === undefined &&
      countryCode === undefined &&
      interfaceLanguage === undefined
    ) {
      throw new BadRequestException('At least one profile field is required');
    }

    const context = await this.meRepository.findUpdateProfileContext({
      userId: currentUser.id,
      ...(countryCode !== undefined ? { countryCode } : {}),
      ...(interfaceLanguage !== undefined ? { interfaceLanguage } : {}),
    });

    if (!context.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (context.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    if (!context.user.profile) {
      throw new BadRequestException('User profile is not found');
    }

    if (countryCode !== undefined && !context.country) {
      throw new BadRequestException('Invalid country code');
    }

    if (interfaceLanguage !== undefined && !context.interfaceLanguage) {
      throw new BadRequestException('Invalid interface language');
    }

    await this.meRepository.updateProfile({
      userId: currentUser.id,
      ...(displayName !== undefined ? { displayName } : {}),
      ...(countryCode !== undefined ? { countryCode } : {}),
      ...(interfaceLanguage !== undefined ? { interfaceLanguage } : {}),
    });

    return this.getProfile(currentUser);
  }

  async getLanguagePairs(
    currentUser: AuthenticatedUser,
  ): Promise<MeLanguagePairsResponse> {
    const result = await this.meRepository.findLanguagePairsByUserId(
      currentUser.id,
    );

    if (!result) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (result.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    return toMeLanguagePairsResponse(result);
  }

  async addLanguagePair(
    currentUser: AuthenticatedUser,
    addMeLanguagePairDto: AddMeLanguagePairDto,
  ): Promise<MeLanguagePairsResponse> {
    const result = await this.meRepository.findAddLanguagePairContext(
      currentUser.id,
      addMeLanguagePairDto.languagePairId,
    );

    if (!result.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (result.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    if (!result.user.profile) {
      throw new BadRequestException('User profile is not found');
    }

    if (!result.languagePair) {
      throw new BadRequestException('Invalid language pair');
    }

    if (!result.languagePair.isActive) {
      throw new BadRequestException('Language pair is not active');
    }

    if (result.existingUserLanguagePair) {
      throw new ConflictException('Language pair already added');
    }

    const shouldSetAsActive = !result.user.profile.activeLanguagePairId;

    await this.meRepository.addLanguagePairForUser({
      userId: currentUser.id,
      languagePairId: addMeLanguagePairDto.languagePairId,
      setAsActive: shouldSetAsActive,
      ...(addMeLanguagePairDto.targetCefrLevel
        ? { targetCefrLevel: addMeLanguagePairDto.targetCefrLevel }
        : {}),
    });

    return this.getLanguagePairs(currentUser);
  }

  async updateActiveLanguagePair(
    currentUser: AuthenticatedUser,
    updateActiveLanguagePairDto: UpdateActiveLanguagePairDto,
  ): Promise<MeProfileResponse> {
    const result = await this.meRepository.findActiveLanguagePairUpdateContext(
      currentUser.id,
      updateActiveLanguagePairDto.languagePairId,
    );

    if (!result) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (result.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    if (!result.profile) {
      throw new BadRequestException('User profile is not found');
    }

    const [userLanguagePair] = result.languagePairs;

    if (!userLanguagePair) {
      throw new BadRequestException('Language pair is not available for user');
    }

    if (!userLanguagePair.isLearning) {
      throw new BadRequestException(
        'Language pair is not enabled for learning',
      );
    }

    if (!userLanguagePair.languagePair.isActive) {
      throw new BadRequestException('Language pair is not active');
    }

    if (
      result.profile.activeLanguagePairId !== userLanguagePair.languagePairId
    ) {
      await this.meRepository.updateActiveLanguagePair(
        currentUser.id,
        userLanguagePair.languagePairId,
      );
    }

    return this.getProfile(currentUser);
  }

  private normalizeOptionalDisplayName(
    displayName: string | undefined,
  ): string | undefined {
    if (displayName === undefined) {
      return undefined;
    }

    const normalizedDisplayName = displayName.trim();

    if (normalizedDisplayName.length < 2) {
      throw new BadRequestException(
        'Display name must be at least 2 characters',
      );
    }

    return normalizedDisplayName;
  }

  private normalizeCountryCode(countryCode: string): string {
    return countryCode.toUpperCase().trim();
  }

  private normalizeInterfaceLanguage(interfaceLanguage: string): string {
    return interfaceLanguage.toLowerCase().trim();
  }
}
