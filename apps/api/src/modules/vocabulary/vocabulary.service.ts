import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateVocabularyItemDto } from './dto/create-vocabulary-item.dto';
import { ListVocabularyItemsQueryDto } from './dto/list-vocabulary-items-query.dto';
import {
  toListVocabularyItemsResponse,
  toVocabularyItemResponse,
} from './vocabulary.mapper';
import { VocabularyRepository } from './vocabulary.repository';
import type {
  ListVocabularyItemsResponse,
  VocabularyItemResponse,
} from './vocabulary.types';

const DEFAULT_LIST_LIMIT = 20;

@Injectable()
export class VocabularyService {
  constructor(private readonly vocabularyRepository: VocabularyRepository) {}

  async createItem(
    currentUser: AuthenticatedUser,
    createVocabularyItemDto: CreateVocabularyItemDto,
  ): Promise<VocabularyItemResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const sourceText = this.normalizeInputText(
      createVocabularyItemDto.sourceText,
    );
    const targetText = this.normalizeInputText(
      createVocabularyItemDto.targetText,
    );

    const result = await this.vocabularyRepository.createVocabularyItemForUser({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      sourceText,
      targetText,
      sourceNormalized: this.normalizeSearchText(sourceText),
      targetNormalized: this.normalizeSearchText(targetText),
      ...(createVocabularyItemDto.wordType
        ? { wordType: createVocabularyItemDto.wordType }
        : {}),
      ...(createVocabularyItemDto.cefrLevel
        ? { cefrLevel: createVocabularyItemDto.cefrLevel }
        : {}),
      ...(createVocabularyItemDto.definition !== undefined
        ? {
            definition: this.normalizeOptionalText(
              createVocabularyItemDto.definition,
            ),
          }
        : {}),
      ...(createVocabularyItemDto.note !== undefined
        ? {
            note: this.normalizeOptionalText(createVocabularyItemDto.note),
          }
        : {}),
      examples: this.normalizeExamples(createVocabularyItemDto.examples),
    });

    return toVocabularyItemResponse(result);
  }

  async listItems(
    currentUser: AuthenticatedUser,
    query: ListVocabularyItemsQueryDto,
  ): Promise<ListVocabularyItemsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const searchNormalized =
      query.search !== undefined
        ? this.normalizeOptionalText(query.search)
        : undefined;

    const result = await this.vocabularyRepository.findUserVocabularyItems({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.isFavorite !== undefined
        ? { isFavorite: query.isFavorite }
        : {}),
      ...(searchNormalized
        ? { searchNormalized: this.normalizeSearchText(searchNormalized) }
        : {}),
      limit: query.limit ?? DEFAULT_LIST_LIMIT,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });

    return toListVocabularyItemsResponse(result);
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext = await this.vocabularyRepository.findUserContext(userId);

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

  private normalizeInputText(value: string): string {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    if (!normalizedValue) {
      throw new BadRequestException('Text must not be empty');
    }

    return normalizedValue;
  }

  private normalizeSearchText(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    return normalizedValue || undefined;
  }

  private normalizeExamples(
    examples: CreateVocabularyItemDto['examples'],
  ): { sourceSentence: string; targetSentence: string }[] {
    if (!examples) {
      return [];
    }

    return examples.map((example) => ({
      sourceSentence: this.normalizeInputText(example.sourceSentence),
      targetSentence: this.normalizeInputText(example.targetSentence),
    }));
  }
}
