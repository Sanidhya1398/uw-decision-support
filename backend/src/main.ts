import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import * as path from 'path';
import { AppModule } from './app.module';

async function autoSeedIfEmpty() {
  // Open a temporary connection to check if the cases table has data
  const tempDs = new DataSource({
    type: 'sqlite',
    database: 'uw_decision_support.db',
    synchronize: false,
    entities: [],
  });

  let needsSeed = false;
  try {
    await tempDs.initialize();
    const result = await tempDs.query('SELECT COUNT(*) as count FROM cases');
    needsSeed = result[0].count === 0;
  } catch {
    // Table doesn't exist yet (first run) — NestJS will create it via synchronize,
    // but we still need to seed after that, so we'll check again post-boot.
    needsSeed = true;
  } finally {
    await tempDs.destroy().catch(() => {});
  }

  if (needsSeed) {
    console.log('Empty database detected. Running auto-seed...');
    try {
      execSync('npx ts-node src/database/seed.ts', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
      console.log('Auto-seed completed successfully!');
    } catch (e) {
      console.error('Auto-seed failed:', e);
    }
  }
}

async function bootstrap() {
  // Auto-seed before NestJS starts so the DB is populated
  await autoSeedIfEmpty();

  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  });

  // Global validation pipe
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Underwriting Decision Support API')
    .setDescription('API for the Underwriting Decision Support System')
    .setVersion('1.0')
    .addTag('cases', 'Case management endpoints')
    .addTag('risk', 'Risk assessment endpoints')
    .addTag('tests', 'Test recommendation endpoints')
    .addTag('decisions', 'Decision management endpoints')
    .addTag('communications', 'Communication drafting endpoints')
    .addTag('audit', 'Audit trail endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
