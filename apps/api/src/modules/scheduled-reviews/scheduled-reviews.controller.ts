import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AnswerScheduledReviewDto } from './dto/answer-scheduled-review.dto';
import { GetScheduledReviewBoxParamDto } from './dto/get-scheduled-review-box-param.dto';
import { ScheduleUserWordDto } from './dto/schedule-user-word.dto';
import { ScheduledReviewsService } from './scheduled-reviews.service';

@Controller('scheduled-reviews')
@UseGuards(AccessTokenGuard)
export class ScheduledReviewsController {
  constructor(
    private readonly scheduledReviewsService: ScheduledReviewsService,
  ) {}

  @Get('boxes')
  getBoxes(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.scheduledReviewsService.getBoxes(currentUser);
  }

  @Get()
  getActiveSchedules(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.scheduledReviewsService.getActiveSchedules(currentUser);
  }

  @Get('boxes/:interval')
  getBoxDetail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: GetScheduledReviewBoxParamDto,
  ) {
    return this.scheduledReviewsService.getBoxDetail(currentUser, params);
  }

  @Post()
  scheduleUserWord(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ScheduleUserWordDto,
  ) {
    return this.scheduledReviewsService.scheduleUserWord(currentUser, dto);
  }

  @Patch('boxes/:interval/start')
  startBox(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param() params: GetScheduledReviewBoxParamDto,
  ) {
    return this.scheduledReviewsService.startBox(currentUser, params);
  }

  @Patch(':id/answer')
  answerSchedule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') scheduleId: string,
    @Body() dto: AnswerScheduledReviewDto,
  ) {
    return this.scheduledReviewsService.answerSchedule(
      currentUser,
      scheduleId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelSchedule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') scheduleId: string,
  ) {
    return this.scheduledReviewsService.cancelSchedule(currentUser, scheduleId);
  }
}
