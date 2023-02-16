import {Module} from '@nestjs/common';
import {OrchestratorController} from './orchestrator.controller';
import {OrchestratorService} from './orchestrator.service';
import {APP_GUARD} from "@nestjs/core";
import {TrustedSourceGuard} from "./guards/TrustedSource.guard";
import {AiService} from './ai/ai.service';
import {CommonModule} from "@app/common";
import {ConfigModule} from "@nestjs/config";
import configuration from "@app/common/config/configuration";
import {HttpModule} from "@nestjs/axios";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, AiService],
})
export class OrchestratorModule {
}
