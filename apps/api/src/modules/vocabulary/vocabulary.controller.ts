import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateVocabularyItemDto } from './dto/create-vocabulary-item.dto';
import { ListVocabularyItemsQueryDto } from './dto/list-vocabulary-items-query.dto';
import { UpdateUserVocabularyItemDto } from './dto/update-user-vocabulary-item.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get('items')
  @UseGuards(AccessTokenGuard)
  listItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListVocabularyItemsQueryDto,
  ) {
    return this.vocabularyService.listItems(currentUser, query);
  }

  @Post('items')
  @UseGuards(AccessTokenGuard)
  createItem(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createVocabularyItemDto: CreateVocabularyItemDto,
  ) {
    return this.vocabularyService.createItem(
      currentUser,
      createVocabularyItemDto,
    );
  }

  @Patch('items/:id')
  @UseGuards(AccessTokenGuard)
  updateUserItem(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') vocabularyItemId: string,
    @Body() updateUserVocabularyItemDto: UpdateUserVocabularyItemDto,
  ) {
    return this.vocabularyService.updateUserItem(
      currentUser,
      vocabularyItemId,
      updateUserVocabularyItemDto,
    );
  }
}
