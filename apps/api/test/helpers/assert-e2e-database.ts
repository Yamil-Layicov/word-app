import { assertSafeTestDatabaseUrl } from '../../src/database/test-database.guard';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in apps/api/.env.test');
}

assertSafeTestDatabaseUrl(databaseUrl, 'test');
