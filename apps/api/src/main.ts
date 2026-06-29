import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  // Cookie parser para leer la cookie de refresh en /auth/refresh.
  app.use(cookieParser());

  // Validación global: descarta propiedades no declaradas (whitelist) y
  // transforma payloads a instancias de DTO. Mensajes en español por DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Los guards globales se registran vía APP_GUARD en app.module.ts para que
  // NestJS gestione sus dependencias (Prisma, Reflector, etc.).

  // Documentación Swagger.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API — Sistema de Gestión de Restaurantes')
    .setDescription(
      'API para la gestión de operaciones de restaurantes en Perú. Soporta múltiples locales.',
    )
    .setVersion('1.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}/api  ·  Docs: /api/docs`);
}

void bootstrap();
