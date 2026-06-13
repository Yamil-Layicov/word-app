/// <reference types="jest" />

/**
 * Bu test faylı AuthTokenService üçün unit test-lər saxlayır.
 *
 * Niyə unit test?
 * - Bu service database istifadə etmir.
 * - Refresh token formatı, hash logic-i və access token verify logic-i saf şəkildə yoxlana bilir.
 * - AuthService e2e testlərindən əvvəl token layer-in düzgün işlədiyini qoruyur.
 */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import {
  AuthTokenService,
  type AccessTokenPayload,
} from './auth-token.service';

/**
 * ClockService üçün test versiyasıdır.
 *
 * Niyə lazımdır?
 * - `getRefreshTokenExpiresAt()` testində vaxt deterministic olmalıdır.
 * - Real `new Date()` istifadə etsək test hər run-da dəyişər.
 */
class TestClockService extends ClockService {
  private readonly fixedNow = new Date('2026-06-12T10:00:00.000Z');

  override now(): Date {
    return this.fixedNow;
  }
}

/**
 * AuthTokenService yaratmaq üçün test helper-dir.
 *
 * Niyə lazımdır?
 * - Hər testdə eyni config setup-u təkrarlamırıq.
 * - Lazım olan testlərdə config override etmək asan olur.
 */
function createAuthTokenService(configOverrides: Record<string, string> = {}): {
  service: AuthTokenService;
  jwtService: JwtService;
} {
  const jwtService = new JwtService();

  const configService = new ConfigService({
    JWT_ACCESS_SECRET: 'test_access_secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    REFRESH_TOKEN_HASH_SECRET: 'test_refresh_hash_secret',
    ...configOverrides,
  });

  const service = new AuthTokenService(
    jwtService,
    configService,
    new TestClockService(),
  );

  return {
    service,
    jwtService,
  };
}

describe('AuthTokenService', () => {
  let service: AuthTokenService;
  let jwtService: JwtService;

  /**
   * Hər testdən əvvəl service real JwtService, real ConfigService
   * və deterministic ClockService ilə yenidən yaradılır.
   */
  beforeEach(() => {
    const setup = createAuthTokenService();

    service = setup.service;
    jwtService = setup.jwtService;
  });

  /**
   * Access token yaratmaq və sonra verify etmək əsas auth flow-un nüvəsidir.
   * Bu test JWT payload-un düzgün qorunduğunu yoxlayır.
   */
  it('should generate and verify an access token', async () => {
    const payload: AccessTokenPayload = {
      sub: 'user-id-1',
      email: 'user@example.com',
      role: UserRole.USER,
    };

    const accessToken = await service.generateAccessToken(payload);
    const verifiedPayload = await service.verifyAccessToken(accessToken);

    expect(typeof accessToken).toBe('string');
    expect(accessToken.length).toBeGreaterThan(0);
    expect(verifiedPayload).toMatchObject(payload);
  });

  /**
   * Access token payload-u gözlənilən formatda deyilsə qəbul olunmamalıdır.
   * Bu test `sub`, `email`, `role` olmayan token-lərin rədd edilməsini qoruyur.
   */
  it('should reject an access token with invalid payload shape', async () => {
    const invalidAccessToken = await jwtService.signAsync(
      {
        sub: 'user-id-1',
        email: 'user@example.com',
      },
      {
        secret: 'test_access_secret',
        expiresIn: '15m',
      },
    );

    await expect(service.verifyAccessToken(invalidAccessToken)).rejects.toThrow(
      'Invalid access token payload',
    );
  });

  /**
   * Role sadəcə string olmamalıdır.
   * Bu test `"HACKER"` kimi unknown role-ların rədd edilməsini qoruyur.
   */
  it('should reject an access token with an unknown role', async () => {
    const invalidAccessToken = await jwtService.signAsync(
      {
        sub: 'user-id-1',
        email: 'user@example.com',
        role: 'HACKER',
      },
      {
        secret: 'test_access_secret',
        expiresIn: '15m',
      },
    );

    await expect(service.verifyAccessToken(invalidAccessToken)).rejects.toThrow(
      'Invalid access token payload',
    );
  });

  /**
   * JWT_ACCESS_EXPIRES_IN config-də verilməsə default `15m` işləməlidir.
   * Bu test default config behavior-un gələcəkdə təsadüfən qırılmamasını qoruyur.
   */
  it('should use default access token expiration when config is not provided', async () => {
    const configService = new ConfigService({
      JWT_ACCESS_SECRET: 'test_access_secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
      REFRESH_TOKEN_HASH_SECRET: 'test_refresh_hash_secret',
    });

    const serviceWithDefaultAccessExpiry = new AuthTokenService(
      new JwtService(),
      configService,
      new TestClockService(),
    );

    const accessToken =
      await serviceWithDefaultAccessExpiry.generateAccessToken({
        sub: 'user-id-1',
        email: 'user@example.com',
        role: UserRole.USER,
      });

    expect(typeof accessToken).toBe('string');
    expect(accessToken.length).toBeGreaterThan(0);
  });

  /**
   * Refresh token `sessionId.secret` formatında olmalıdır.
   * sessionId sonradan DB-də AuthSession tapmaq üçün istifadə olunur.
   */
  it('should generate a refresh token in sessionId.secret format', () => {
    const sessionId = service.generateSessionId();
    const refreshToken = service.generateRefreshToken(sessionId);

    const parts = refreshToken.split('.');

    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(sessionId);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]{80,120}$/);
  });

  /**
   * Valid refresh token-dən sessionId çıxarılmalıdır.
   * Bu refresh endpoint-də session lookup üçün lazımdır.
   */
  it('should extract session id from a valid refresh token', () => {
    const sessionId = service.generateSessionId();
    const refreshToken = service.generateRefreshToken(sessionId);

    expect(service.getSessionIdFromRefreshToken(refreshToken)).toBe(sessionId);
  });

  /**
   * Refresh token formatı səhvdirsə sessionId qaytarılmamalıdır.
   * Bu test malformed token-lərin erkən rədd edilməsini qoruyur.
   */
  it.each([
    ['missing dot', 'invalid-token'],
    ['too many parts', 'part.one.two'],
    ['empty session id', '.secret'],
    ['empty secret', '550e8400-e29b-41d4-a716-446655440000.'],
    ['invalid uuid', 'not-a-uuid.validSecretValue'],
    [
      'invalid secret characters',
      '550e8400-e29b-41d4-a716-446655440000.invalid.secret',
    ],
  ])(
    'should return null for invalid refresh token format: %s',
    (_case, token) => {
      expect(service.getSessionIdFromRefreshToken(token)).toBeNull();
    },
  );

  /**
   * Refresh token raw formada DB-də saxlanmamalıdır.
   * Bu test HMAC hash-in yaradıldığını və original token ilə verify olunduğunu yoxlayır.
   */
  it('should hash and verify refresh token hash', () => {
    const sessionId = service.generateSessionId();
    const refreshToken = service.generateRefreshToken(sessionId);

    const hash = service.hashRefreshToken(refreshToken);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(service.verifyRefreshTokenHash(refreshToken, hash)).toBe(true);
  });

  /**
   * Başqa refresh token eyni hash ilə doğrulanmamalıdır.
   * Bu security üçün vacibdir: yalnız exact token qəbul olunmalıdır.
   */
  it('should reject refresh token hash verification for a different token', () => {
    const firstSessionId = service.generateSessionId();
    const secondSessionId = service.generateSessionId();

    const firstRefreshToken = service.generateRefreshToken(firstSessionId);
    const secondRefreshToken = service.generateRefreshToken(secondSessionId);
    const firstHash = service.hashRefreshToken(firstRefreshToken);

    expect(service.verifyRefreshTokenHash(secondRefreshToken, firstHash)).toBe(
      false,
    );
  });

  /**
   * Stored hash formatı səhv uzunluqda olarsa timingSafeEqual çağırılmadan false qayıtmalıdır.
   * Bu test malformed stored hash case-ni qoruyur.
   */
  it('should return false when stored refresh token hash has invalid length', () => {
    const sessionId = service.generateSessionId();
    const refreshToken = service.generateRefreshToken(sessionId);

    expect(service.verifyRefreshTokenHash(refreshToken, 'invalid-hash')).toBe(
      false,
    );
  });

  /**
   * Refresh token expiry config-dəki gün sayına görə hesablanmalıdır.
   * TestClockService fixed now verdiyi üçün nəticə sabitdir.
   */
  it('should calculate refresh token expiration date from config', () => {
    expect(service.getRefreshTokenExpiresAt()).toEqual(
      new Date('2026-06-19T10:00:00.000Z'),
    );
  });

  /**
   * Lazımi config dəyəri yoxdursa service yaradılmamalıdır.
   * Bu test production-da silent misconfiguration riskini azaldır.
   */
  it('should throw when required access secret config is missing', () => {
    const configService = new ConfigService({
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      REFRESH_TOKEN_HASH_SECRET: 'test_refresh_hash_secret',
    });

    expect(
      () =>
        new AuthTokenService(
          new JwtService(),
          configService,
          new TestClockService(),
        ),
    ).toThrow('JWT_ACCESS_SECRET is not defined');
  });
});
