import { Module } from '@nestjs/common';
import { SuitService } from './suit.service';
import { ConfigModule } from '@nestjs/config';
import configuration from "@app/common/config/configuration";
import {CommonModule} from "@app/common";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
  ],
  providers: [SuitService],
})
export class AppModule {}
