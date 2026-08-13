import { assertSafeTestDatabaseUrl } from './test-database.guard';

describe('assertSafeTestDatabaseUrl', () => {
  it('allows non-test processes to use the configured database', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://wordapp:wordapp@localhost:5432/wordapp',
        'development',
      ),
    ).not.toThrow();
  });

  it('allows a dedicated test database in the test environment', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://wordapp:wordapp@localhost:5432/wordapp_test?schema=public',
        'test',
      ),
    ).not.toThrow();
  });

  it('rejects the development database in the test environment', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://wordapp:wordapp@localhost:5432/wordapp?schema=public',
        'test',
      ),
    ).toThrow('Refusing to run tests against database "wordapp"');
  });

  it('rejects malformed database URLs in the test environment', () => {
    expect(() => assertSafeTestDatabaseUrl('not-a-url', 'test')).toThrow(
      'DATABASE_URL must be a valid PostgreSQL URL',
    );
  });
});
