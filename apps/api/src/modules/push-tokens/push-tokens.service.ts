import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushTokensRepository } from './push-tokens.repository';

@Injectable()
export class PushTokensService {
  constructor(private readonly pushTokensRepository: PushTokensRepository) {}

  async register(
    currentUser: AuthenticatedUser,
    dto: RegisterPushTokenDto,
  ): Promise<void> {
    const userStatus = await this.pushTokensRepository.findUserStatus(
      currentUser.id,
    );

    if (!userStatus) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (userStatus !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    await this.pushTokensRepository.register({
      userId: currentUser.id,
      token: dto.token,
      platform: dto.platform,
    });
  }
}
