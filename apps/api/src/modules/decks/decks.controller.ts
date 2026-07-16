import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { DecksService } from './decks.service';
import { AddDeckWordsDto } from './dto/add-deck-words.dto';
import { CreateDeckDto } from './dto/create-deck.dto';

@Controller('decks')
@UseGuards(AccessTokenGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Get()
  listDecks(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.decksService.listDecks(currentUser);
  }

  @Post()
  createDeck(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDeckDto,
  ) {
    return this.decksService.createDeck(currentUser, dto);
  }

  @Get(':id')
  getDeck(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') deckId: string,
  ) {
    return this.decksService.getDeck(currentUser, deckId);
  }

  @Post(':id/words')
  addWordsToDeck(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') deckId: string,
    @Body() dto: AddDeckWordsDto,
  ) {
    return this.decksService.addWordsToDeck(currentUser, deckId, dto);
  }

  @Delete(':id/words/:deckCardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWordFromDeck(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') deckId: string,
    @Param('deckCardId') deckCardId: string,
  ) {
    return this.decksService.removeWordFromDeck(
      currentUser,
      deckId,
      deckCardId,
    );
  }
}
