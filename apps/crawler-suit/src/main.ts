import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {SuitService} from "./services/suit.service";

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const suitService = app.get(SuitService);
  suitService.run();

}
bootstrap();
