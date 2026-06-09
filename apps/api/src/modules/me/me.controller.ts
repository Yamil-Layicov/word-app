import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('profile')
  @UseGuards(AccessTokenGuard)
  getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.getProfile(currentUser);
  }
}
