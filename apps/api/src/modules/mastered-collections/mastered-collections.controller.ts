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
import { AddMasteredCollectionWordsDto } from './dto/add-mastered-collection-words.dto';
import { CreateMasteredCollectionDto } from './dto/create-mastered-collection.dto';
import { MasteredCollectionsService } from './mastered-collections.service';

@Controller('mastered-collections')
@UseGuards(AccessTokenGuard)
export class MasteredCollectionsController {
  constructor(
    private readonly masteredCollectionsService: MasteredCollectionsService,
  ) {}

  @Get()
  listCollections(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.masteredCollectionsService.listCollections(currentUser);
  }

  @Post()
  createCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateMasteredCollectionDto,
  ) {
    return this.masteredCollectionsService.createCollection(currentUser, dto);
  }

  @Get(':id')
  getCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') collectionId: string,
  ) {
    return this.masteredCollectionsService.getCollection(
      currentUser,
      collectionId,
    );
  }

  @Post(':id/words')
  addWordsToCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') collectionId: string,
    @Body() dto: AddMasteredCollectionWordsDto,
  ) {
    return this.masteredCollectionsService.addWordsToCollection(
      currentUser,
      collectionId,
      dto,
    );
  }

  @Delete(':id/words/:collectionWordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWordFromCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') collectionId: string,
    @Param('collectionWordId') collectionWordId: string,
  ) {
    return this.masteredCollectionsService.removeWordFromCollection(
      currentUser,
      collectionId,
      collectionWordId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') collectionId: string,
  ) {
    return this.masteredCollectionsService.deleteCollection(
      currentUser,
      collectionId,
    );
  }
}
