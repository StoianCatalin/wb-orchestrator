import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {HttpService} from "@nestjs/axios";
import {firstValueFrom} from "rxjs";

@Injectable()
export class OrchestratorService {
  baseUrl: string;

  constructor(private configService: ConfigService, private httpService: HttpService) {
    this.baseUrl = this.configService.get('orchestrator_url');
  }

  async postDownload(documentId: string) {
    const result = await firstValueFrom(this.httpService.post(`${this.baseUrl}/post-download`, { documentId }, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

}
