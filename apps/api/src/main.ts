import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config.type';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });

  await app.listen(port);
  Logger.log(`Territory Rush API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
