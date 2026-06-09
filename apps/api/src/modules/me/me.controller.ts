import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AddMeLanguagePairDto } from './dto/add-me-language-pair.dto';
import { UpdateActiveLanguagePairDto } from './dto/update-active-language-pair.dto';
import { UpdateMeProfileDto } from './dto/update-me-profile.dto';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('profile')
  @UseGuards(AccessTokenGuard)
  getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getProfile(currentUser);
  }

  @Patch('profile')
  @UseGuards(AccessTokenGuard)
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateMeProfileDto: UpdateMeProfileDto,
  ) {
    return this.meService.updateProfile(currentUser, updateMeProfileDto);
  }

  @Get('language-pairs')
  @UseGuards(AccessTokenGuard)
  getLanguagePairs(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getLanguagePairs(currentUser);
  }

  @Post('language-pairs')
  @UseGuards(AccessTokenGuard)
  addLanguagePair(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() addMeLanguagePairDto: AddMeLanguagePairDto,
  ) {
    return this.meService.addLanguagePair(currentUser, addMeLanguagePairDto);
  }

  @Patch('active-language-pair')
  @UseGuards(AccessTokenGuard)
  updateActiveLanguagePair(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateActiveLanguagePairDto: UpdateActiveLanguagePairDto,
  ) {
    return this.meService.updateActiveLanguagePair(
      currentUser,
      updateActiveLanguagePairDto,
    );
  }
}
