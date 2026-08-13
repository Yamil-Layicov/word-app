import { config } from 'dotenv';

const result = config({
  path: '.env.test',
  override: true,
  quiet: true,
});

if (result.error) {
  throw new Error(
    'Missing apps/api/.env.test. Copy .env.test.example and configure a dedicated test database.',
  );
}

process.env.NODE_ENV = 'test';
