const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

export function assertSafeTestDatabaseUrl(
  databaseUrl: string,
  nodeEnv = process.env.NODE_ENV,
) {
  if (nodeEnv !== 'test') {
    return;
  }

  let databaseName: string;

  try {
    const parsedUrl = new URL(databaseUrl);
    databaseName = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, '');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (!databaseName || !TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `Refusing to run tests against database "${databaseName || 'unknown'}". ` +
        'Use a dedicated database whose name contains "test", such as "wordapp_test".',
    );
  }
}
