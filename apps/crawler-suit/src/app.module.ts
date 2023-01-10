import { Module } from '@nestjs/common';
import { SuitService } from './suit.service';
import { ConfigModule } from '@nestjs/config';
import configuration from "@app/common/config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
  providers: [SuitService],
})
export class AppModule {}
