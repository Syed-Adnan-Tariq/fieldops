import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Parse CORS origins from .env
  const rawCorsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000';
  const corsOrigins = rawCorsOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''));

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 1. Allow non-browser agents (Native React Native/Expo, cURL, Postman)
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');

      // 2. Allow common mobile webview/local origins (Android/iOS Expo, Capacitor, Ionic, WebView)
      const isMobileLocalOrigin =
        normalized === 'file://' ||
        normalized.startsWith('http://localhost') ||
        normalized.startsWith('https://localhost') ||
        normalized.startsWith('http://10.0.2.2') || // Android Emulator loopback
        normalized.startsWith('capacitor://') ||
        normalized.startsWith('ionic://') ||
        normalized.startsWith('exp://'); // Expo Go

      if (isMobileLocalOrigin) {
        return callback(null, true);
      }

      // 3. Allow explicitly configured origins or wildcard '*'
      if (corsOrigins.includes('*') || corsOrigins.includes(normalized)) {
        return callback(null, true);
      }

      logger.warn(`Blocked by CORS: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-device-id', 'x-platform'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Socket.io adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('FieldOps API')
    .setDescription('Field Operations Management Platform API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.APP_PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`FieldOps API running on http://0.0.0.0:${port}`);
  logger.log(`Swagger docs available at http://0.0.0.0:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
