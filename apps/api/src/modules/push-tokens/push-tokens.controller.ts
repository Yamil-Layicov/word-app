import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushTokensService } from './push-tokens.service';

@Controller('me/push-tokens')
@UseGuards(AccessTokenGuard)
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  register(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokensService.register(currentUser, dto);
  }
}
