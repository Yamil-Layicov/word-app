import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Express } from 'express';
import { AppModule } from './app.module';

function configureTrustProxy(
  app: {
    getHttpAdapter: () => {
      getInstance: () => Express;
    };
  },
  configService: ConfigService,
) {
  const trustProxy = configService.get<string>('TRUST_PROXY', '0');

  if (trustProxy === '0' || trustProxy.toLowerCase() === 'false') {
    return;
  }

  const expressInstance = app.getHttpAdapter().getInstance();
  const numericTrustProxy = Number(trustProxy);

  expressInstance.set(
    'trust proxy',
    Number.isInteger(numericTrustProxy) ? numericTrustProxy : trustProxy,
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureTrustProxy(app, configService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = configService.get<string>('PORT', '4000');

  await app.listen(Number(port));
}

bootstrap();
