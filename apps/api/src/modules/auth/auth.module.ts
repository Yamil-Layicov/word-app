import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PASSWORD_RESET_EMAIL_GATEWAY } from './password-reset-email.gateway';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import { createPasswordResetEmailGateway } from './password-reset-email.provider';
import { PasswordResetLinkService } from './password-reset-link.service';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordService } from './password.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthTokenService,
    PasswordResetEmailDispatcher,
    PasswordResetLinkService,
    PasswordResetRepository,
    PasswordResetService,
    PasswordResetTokenService,
    PasswordService,
    AccessTokenGuard,
    {
      provide: PASSWORD_RESET_EMAIL_GATEWAY,
      inject: [ConfigService],
      useFactory: createPasswordResetEmailGateway,
    },
  ],
  exports: [AuthTokenService, AccessTokenGuard],
})
export class AuthModule {}
