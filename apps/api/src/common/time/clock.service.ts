import { Injectable } from '@nestjs/common';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }

  addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_IN_MS);
  }
}
