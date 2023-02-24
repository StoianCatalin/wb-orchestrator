import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {HttpService} from "@nestjs/axios";
import * as fs from 'fs';
import * as path from 'path';
import {IDocumentOutgoingDTO} from "@app/common/interfaces/Document";
import {firstValueFrom} from "rxjs";
import * as FormData from 'form-data';

@Injectable()
export class AiService {
  baseUrl: string;

  constructor(private configService: ConfigService, private httpService: HttpService) {
    this.baseUrl = this.configService.get('ocr_url');
  }

  startOCRProcess(document: IDocumentOutgoingDTO) {
    const form_data = new FormData();
    const file = fs.readFileSync(document.storagePath);
    form_data.append('file', file, { filename: `${document.id}.pdf`, contentType: 'application/pdf' });


    return firstValueFrom(this.httpService.post(`${this.baseUrl}/ocr`, form_data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'job_id': document.id,
      }
    }));
  }

  getStatus(documentId: string) {
    return this.httpService.get(`${this.baseUrl}/ocr/${documentId}/status`).toPromise();
  }

  getOCRText(documentId: string) {
    console.log(`${this.baseUrl}/ocr/${documentId}/text`);
    return this.httpService.get(`${this.baseUrl}/ocr/${documentId}/text`).toPromise();
  }

  getOCRQuality(documentId: string) {
    return this.httpService.get(`${this.baseUrl}/ocr/${documentId}/quality`).toPromise();
  }
}
