import { Injectable } from '@nestjs/common';
import {delay} from "@app/common/utils/delay";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class SuitService {
  constructor(private configService: ConfigService) {
  }

  async run() {
    console.log(this.configService.get('scrapper_name'));
    await delay(5000);
    this.run();
  }
}
