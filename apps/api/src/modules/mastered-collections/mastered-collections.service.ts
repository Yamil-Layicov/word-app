import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddMasteredCollectionWordsDto } from './dto/add-mastered-collection-words.dto';
import { CreateMasteredCollectionDto } from './dto/create-mastered-collection.dto';
import {
  toMasteredCollectionDetailResponse,
  toMasteredCollectionsResponse,
} from './mastered-collections.mapper';
import { MasteredCollectionsRepository } from './mastered-collections.repository';
import type {
  MasteredCollectionDetailResponse,
  MasteredCollectionsResponse,
} from './mastered-collections.types';

@Injectable()
export class MasteredCollectionsService {
  constructor(
    private readonly masteredCollectionsRepository: MasteredCollectionsRepository,
  ) {}

  async listCollections(
    currentUser: AuthenticatedUser,
  ): Promise<MasteredCollectionsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const collections =
      await this.masteredCollectionsRepository.findCollections({
        userId: currentUser.id,
        languagePairId: activeLanguagePairId,
      });

    return toMasteredCollectionsResponse(collections);
  }

  async createCollection(
    currentUser: AuthenticatedUser,
    dto: CreateMasteredCollectionDto,
  ): Promise<MasteredCollectionDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const title = this.normalizeRequiredText(dto.title, 'Collection title');
    const description =
      dto.description !== undefined
        ? this.normalizeOptionalText(dto.description)
        : undefined;
    const collection =
      await this.masteredCollectionsRepository.createCollection({
        userId: currentUser.id,
        languagePairId: activeLanguagePairId,
        title,
        ...(description ? { description } : {}),
      });

    return toMasteredCollectionDetailResponse(collection);
  }

  async getCollection(
    currentUser: AuthenticatedUser,
    collectionId: string,
  ): Promise<MasteredCollectionDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const collection =
      await this.masteredCollectionsRepository.findCollectionById({
        userId: currentUser.id,
        languagePairId: activeLanguagePairId,
        collectionId,
      });

    if (!collection) {
      throw new NotFoundException('Mastered collection not found');
    }

    return toMasteredCollectionDetailResponse(collection);
  }

  async addWordsToCollection(
    currentUser: AuthenticatedUser,
    collectionId: string,
    dto: AddMasteredCollectionWordsDto,
  ): Promise<MasteredCollectionDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const result =
      await this.masteredCollectionsRepository.addWordsToCollection({
        userId: currentUser.id,
        languagePairId: activeLanguagePairId,
        collectionId,
        userWordIds: dto.userWordIds,
      });

    if (result.status === 'COLLECTION_NOT_FOUND') {
      throw new NotFoundException('Mastered collection not found');
    }

    if (result.status === 'WORDS_NOT_ELIGIBLE') {
      throw new BadRequestException(
        'Only mastered words from the active language pair can be added',
      );
    }

    return toMasteredCollectionDetailResponse(result.collection);
  }

  async removeWordFromCollection(
    currentUser: AuthenticatedUser,
    collectionId: string,
    collectionWordId: string,
  ): Promise<void> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const removed =
      await this.masteredCollectionsRepository.removeWordFromCollection({
        userId: currentUser.id,
        languagePairId: activeLanguagePairId,
        collectionId,
        collectionWordId,
      });

    if (!removed) {
      throw new NotFoundException('Collection word not found');
    }
  }

  async deleteCollection(
    currentUser: AuthenticatedUser,
    collectionId: string,
  ): Promise<void> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const deleted = await this.masteredCollectionsRepository.deleteCollection({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      collectionId,
    });

    if (!deleted) {
      throw new NotFoundException('Mastered collection not found');
    }
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext =
      await this.masteredCollectionsRepository.findUserContext(userId);

    if (!userContext) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (userContext.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const activeLanguagePairId = userContext.profile?.activeLanguagePairId;

    if (!activeLanguagePairId) {
      throw new BadRequestException('Active language pair is not selected');
    }

    const activeUserLanguagePair = userContext.languagePairs.find(
      (userLanguagePair) =>
        userLanguagePair.languagePairId === activeLanguagePairId,
    );

    if (!activeUserLanguagePair) {
      throw new BadRequestException('Active language pair is not available');
    }

    if (!activeUserLanguagePair.isLearning) {
      throw new BadRequestException('Active language pair is not enabled');
    }

    if (!activeUserLanguagePair.languagePair.isActive) {
      throw new BadRequestException('Active language pair is not active');
    }

    return activeLanguagePairId;
  }

  private normalizeRequiredText(value: string, label: string): string {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    if (!normalizedValue) {
      throw new BadRequestException(`${label} must not be empty`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    return normalizedValue || undefined;
  }
}
