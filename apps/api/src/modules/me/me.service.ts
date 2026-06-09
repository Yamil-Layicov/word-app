import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { toMeProfileResponse } from './me.mapper';
import { MeRepository } from './me.repository';
import type { MeProfileResponse } from './me.types';

@Injectable()
export class MeService {
  constructor(private readonly meRepository: MeRepository) {}

  async getProfile(currentUser: AuthenticatedUser): Promise<MeProfileResponse> {
    const user = await this.meRepository.findProfileByUserId(currentUser.id);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    return toMeProfileResponse(user);
  }
}
