import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateVocabularyItemDto } from './dto/create-vocabulary-item.dto';
import { toVocabularyItemResponse } from './vocabulary.mapper';
import { VocabularyRepository } from './vocabulary.repository';
import type { VocabularyItemResponse } from './vocabulary.types';

@Injectable()
export class VocabularyService {
  constructor(private readonly vocabularyRepository: VocabularyRepository) {}

  async createItem(
    currentUser: AuthenticatedUser,
    createVocabularyItemDto: CreateVocabularyItemDto,
  ): Promise<VocabularyItemResponse> {
    const userContext = await this.vocabularyRepository.findUserContext(
      currentUser.id,
    );

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
