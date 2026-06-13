/// <reference types="jest" />

/**
 * Bu fayl e2e test-lərdə təkrarlanan response yoxlama helper-lərini saxlayır.
 *
 * Niyə yaradılır?
 * - auth.e2e-spec.ts, vocabulary.e2e-spec.ts, reviews.e2e-spec.ts və practice.e2e-spec.ts
 *   içində eyni helper-lər təkrar olunurdu.
 * - Bu helper-ləri bir yerə çıxarmaq testləri daha oxunaqlı edir.
 * - Response shape səhv olanda test daha aydın error verir.
 */

export type AuthResponseBody = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Supertest response body-ni object kimi yoxlayır.
 *
 * Niyə lazımdır?
 * - `response.body` runtime-da hər şey ola bilər.
 * - Testdə `any` istifadə etməmək üçün əvvəl object olduğunu yoxlayırıq.
 */
export function expectObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected response body to be an object');
  }

  return value as Record<string, unknown>;
}

/**
 * Response object içindən string field oxuyur.
 *
 * Niyə lazımdır?
 * - `id`, `email`, `accessToken`, `refreshToken` kimi field-lərin həqiqətən string olduğunu yoxlayırıq.
 * - Field yoxdursa və ya string deyilsə test aydın mesajla fail olur.
 */
export function expectStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string {
  const value = object[fieldName];

  if (typeof value !== 'string') {
    throw new Error(`Expected "${fieldName}" to be a string`);
  }

  expect(value.length).toBeGreaterThan(0);

  return value;
}

/**
 * Response object içindən nullable string field oxuyur.
 *
 * Niyə lazımdır?
 * - `definition`, `note`, `lastReviewedAt`, `nextReviewAt` kimi field-lər bəzən string, bəzən null ola bilər.
 */
export function expectNullableStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = object[fieldName];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected "${fieldName}" to be a string or null`);
  }

  return value;
}

/**
 * Response object içindən boolean field oxuyur.
 *
 * Niyə lazımdır?
 * - `isFavorite`, `isActive`, `isCorrect` kimi field-lərin həqiqətən boolean olduğunu yoxlayırıq.
 */
export function expectBooleanField(
  object: Record<string, unknown>,
  fieldName: string,
): boolean {
  const value = object[fieldName];

  if (typeof value !== 'boolean') {
    throw new Error(`Expected "${fieldName}" to be a boolean`);
  }

  return value;
}

/**
 * Response object içindən number field oxuyur.
 *
 * Niyə lazımdır?
 * - `reviewCount`, `correctCount`, `wrongCount`, `totalWords`, `dueWords` kimi field-lərin number olduğunu yoxlayırıq.
 */
export function expectNumberField(
  object: Record<string, unknown>,
  fieldName: string,
): number {
  const value = object[fieldName];

  if (typeof value !== 'number') {
    throw new Error(`Expected "${fieldName}" to be a number`);
  }

  return value;
}

/**
 * Auth response body-ni access/refresh token formatına çevirir.
 *
 * Niyə lazımdır?
 * - Login və refresh endpoint-ləri eyni token response qaytarır.
 * - Hər e2e test faylında eyni accessToken/refreshToken yoxlamasını təkrar yazmırıq.
 */
export function expectAuthResponseBody(value: unknown): AuthResponseBody {
  const body = expectObject(value);

  return {
    accessToken: expectStringField(body, 'accessToken'),
    refreshToken: expectStringField(body, 'refreshToken'),
  };
}
