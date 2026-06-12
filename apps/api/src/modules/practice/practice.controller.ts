import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AnswerPracticeDto } from './dto/answer-practice.dto';
import { ListPracticeItemsQueryDto } from './dto/list-practice-items-query.dto';
import { PracticeService } from './practice.service';

@Controller('practice')
@UseGuards(AccessTokenGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('items')
  listItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPracticeItemsQueryDto,
  ) {
    return this.practiceService.listItems(currentUser, query);
  }

  @Post('answer')
  answerPractice(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() answerPracticeDto: AnswerPracticeDto,
  ) {
    return this.practiceService.answerPractice(currentUser, answerPracticeDto);
  }
}
