import { Module } from '@nestjs/common';
import { SuitService } from './services/suit.service';
import { ConfigModule } from '@nestjs/config';
import configuration from "@app/common/config/configuration";
import {CommonModule} from "@app/common";
import {HttpModule} from "@nestjs/axios";
import {OrchestratorService} from "./services/orchestrator.service";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
  ],
  providers: [SuitService, OrchestratorService],
})
export class AppModule {}
