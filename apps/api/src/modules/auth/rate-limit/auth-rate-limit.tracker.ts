import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';

const UNKNOWN_IP = 'unknown-ip';

export const getAuthIdentityTracker: ThrottlerGetTrackerFunction = (
  request,
) => {
  const email = getRequestEmail(request);

  if (email) {
    return `email:${email}`;
  }

  return `ip:${getRequestIp(request)}`;
};

function getRequestEmail(request: Record<string, unknown>): string | null {
  const body = request.body;

  if (!isRecord(body) || typeof body.email !== 'string') {
    return null;
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  return normalizedEmail || null;
}

function getRequestIp(request: Record<string, unknown>): string {
  return typeof request.ip === 'string' && request.ip ? request.ip : UNKNOWN_IP;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
