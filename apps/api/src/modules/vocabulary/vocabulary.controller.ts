import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateVocabularyItemDto } from './dto/create-vocabulary-item.dto';
import { VocabularyService } from './vocabulary.service';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

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
}
