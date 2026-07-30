import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthRequestContext } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailVerificationService } from './email-verification.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { GoogleAuthService } from './google/google-auth.service';
import { PasswordResetService } from './password-reset.service';
import { AuthRateLimit } from './rate-limit/auth-rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Post('register')
  @AuthRateLimit('registration')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.me(currentUser);
  }

  @Post('login')
  @AuthRateLimit('login')
  login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string | undefined,
  ) {
    const context: AuthRequestContext = {
      userAgent,
      ipAddress,
    };

    return this.authService.login(loginDto, context);
  }

  @Post('google')
  @AuthRateLimit('login')
  @HttpCode(HttpStatus.OK)
  google(
    @Body() googleAuthDto: GoogleAuthDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string | undefined,
  ) {
    const context: AuthRequestContext = {
      userAgent,
      ipAddress,
    };

    return this.googleAuthService.authenticate(googleAuthDto, context);
  }

  @Post('forgot-password')
  @AuthRateLimit('emailDelivery')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.request(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.reset(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('email-verification/request')
  @AuthRateLimit('emailDelivery')
  @HttpCode(HttpStatus.ACCEPTED)
  requestEmailVerification(
    @Body() requestEmailVerificationDto: RequestEmailVerificationDto,
  ) {
    return this.emailVerificationService.request(
      requestEmailVerificationDto.email,
    );
  }

  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.OK)
  confirmEmailVerification(
    @Body() confirmEmailVerificationDto: ConfirmEmailVerificationDto,
  ) {
    return this.emailVerificationService.confirm(
      confirmEmailVerificationDto.token,
    );
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto);
  }
}
