import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ClockService } from '../../common/time/clock.service';
import { AnswerPracticeDto } from './dto/answer-practice.dto';
import { ListPracticeItemsQueryDto } from './dto/list-practice-items-query.dto';
import {
  toAnswerPracticeResponse,
  toListPracticeItemsResponse,
} from './practice.mapper';
import { PracticeRepository } from './practice.repository';
import type {
  AnswerPracticeResponse,
  ListPracticeItemsResponse,
} from './practice.types';

const DEFAULT_PRACTICE_ITEMS_LIMIT = 20;

@Injectable()
export class PracticeService {
  constructor(
    private readonly practiceRepository: PracticeRepository,
    private readonly clockService: ClockService,
  ) {}

  async listItems(
    currentUser: AuthenticatedUser,
    query: ListPracticeItemsQueryDto,
  ): Promise<ListPracticeItemsResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const searchNormalized =
      query.search !== undefined
        ? this.normalizeOptionalText(query.search)
        : undefined;

    const result = await this.practiceRepository.findPracticeItems({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.isFavorite !== undefined
        ? { isFavorite: query.isFavorite }
        : {}),
      ...(searchNormalized
        ? { searchNormalized: this.normalizeSearchText(searchNormalized) }
        : {}),
      limit: query.limit ?? DEFAULT_PRACTICE_ITEMS_LIMIT,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });

    return toListPracticeItemsResponse(result);
  }

  async answerPractice(
    currentUser: AuthenticatedUser,
    answerPracticeDto: AnswerPracticeDto,
  ): Promise<AnswerPracticeResponse> {
    const activeLanguagePairId = await this.getActiveLanguagePairId(
      currentUser.id,
    );

    const result = await this.practiceRepository.answerPractice({
      userId: currentUser.id,
      languagePairId: activeLanguagePairId,
      userWordId: answerPracticeDto.userWordId,
      practiceMode: answerPracticeDto.practiceMode,
      isCorrect: answerPracticeDto.isCorrect,
      answeredAt: this.clockService.now(),
    });

    if (!result) {
      throw new NotFoundException('Practice item not found');
    }

    return toAnswerPracticeResponse(result);
  }

  private async getActiveLanguagePairId(userId: string): Promise<string> {
    const userContext = await this.practiceRepository.findUserContext(userId);

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

  private normalizeSearchText(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeOptionalText(value: string): string | undefined {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');

    return normalizedValue || undefined;
  }
}
