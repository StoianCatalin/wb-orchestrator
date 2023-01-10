import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {SuitService} from "./suit.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const suitService = app.get(SuitService);
  suitService.run();

}
bootstrap();
