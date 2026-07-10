import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddDeckWordsDto } from './dto/add-deck-words.dto';
import { CreateDeckDto } from './dto/create-deck.dto';
import { toDeckDetailResponse, toDecksResponse } from './decks.mapper';
import { DecksRepository } from './decks.repository';
import type { DeckDetailResponse, DecksResponse } from './decks.types';

@Injectable()
export class DecksService {
  constructor(private readonly decksRepository: DecksRepository) {}

  async listDecks(currentUser: AuthenticatedUser): Promise<DecksResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const decks = await this.decksRepository.findDecks({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
    });

    return toDecksResponse(decks);
  }

  async createDeck(
    currentUser: AuthenticatedUser,
    dto: CreateDeckDto,
  ): Promise<DeckDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const title = this.normalizeRequiredText(dto.title, 'Deck title');
    const description =
      dto.description !== undefined
        ? this.normalizeOptionalText(dto.description)
        : undefined;
    const deck = await this.decksRepository.createDeck({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      title,
      ...(description ? { description } : {}),
      isDefault: dto.isDefault ?? false,
    });

    return toDeckDetailResponse(deck);
  }

  async getDeck(
    currentUser: AuthenticatedUser,
    deckId: string,
  ): Promise<DeckDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const deck = await this.decksRepository.findDeckById({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      deckId,
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return toDeckDetailResponse(deck);
  }

  async addWordsToDeck(
    currentUser: AuthenticatedUser,
    deckId: string,
    dto: AddDeckWordsDto,
  ): Promise<DeckDetailResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );
    const normalizedWords = dto.words.map((word) => {
      const sourceText = this.normalizeRequiredText(
        word.sourceText,
        'Source text',
      );
      const targetText = this.normalizeRequiredText(
        word.targetText,
        'Target text',
      );
      const definition =
        word.definition !== undefined
          ? this.normalizeOptionalText(word.definition)
          : undefined;
      const note =
        word.note !== undefined
          ? this.normalizeOptionalText(word.note)
          : undefined;

      return {
        sourceText,
        targetText,
        sourceNormalized: this.normalizeSearchText(sourceText),
        targetNormalized: this.normalizeSearchText(targetText),
        ...(word.wordType ? { wordType: word.wordType } : {}),
        ...(word.cefrLevel ? { cefrLevel: word.cefrLevel } : {}),
        ...(definition ? { definition } : {}),
        ...(note ? { note } : {}),
      };
    });

    const deck = await this.decksRepository.addWordsToDeck({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      deckId,
      words: normalizedWords,
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return toDeckDetailResponse(deck);
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext = await this.decksRepository.findUserContext(userId);

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

  private normalizeSearchText(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    return normalizedValue || undefined;
  }
}
